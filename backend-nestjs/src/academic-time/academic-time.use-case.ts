import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { IAcademicTimeRepository } from './repositories/i-academic-time.repository';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AcademicTimeUseCase {
  constructor(
    @Inject(IAcademicTimeRepository)
    private readonly repository: IAcademicTimeRepository,
  ) {}

  async getCycles(limit?: number, offset?: number, search?: string) {
    return this.repository.getCycles(limit, offset, search);
  }

  async createCycle(dto: {
    name: string;
    year: number;
    startDate: string;
    daysPerWeek: number;
    totalWeeks: number;
  }) {
    const { name, year, startDate, daysPerWeek, totalWeeks } = dto;
    
    const startParts = startDate.split('-');
    const start = new Date(Date.UTC(+startParts[0], +startParts[1] - 1, +startParts[2]));

    const cycleId = uuidv4();
    const cycle = {
      id: cycleId,
      name,
      year,
      startDate: start.toISOString().split('T')[0],
      endDate: '', // Will be assigned from the last week
      daysPerWeek,
      totalWeeks,
      weeks: [] as any[],
    };

    for (let i = 1; i <= totalWeeks; i++) {
      const currentWeekStart = new Date(start);
      currentWeekStart.setUTCDate(start.getUTCDate() + (i - 1) * 7);

      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setUTCDate(currentWeekStart.getUTCDate() + (daysPerWeek - 1));

      cycle.weeks.push({
        id: uuidv4(),
        cycleId,
        weekNumber: i,
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: currentWeekEnd.toISOString().split('T')[0],
        isActive: true,
      });
    }

    if (cycle.weeks.length > 0) {
      cycle.endDate = cycle.weeks[cycle.weeks.length - 1].endDate;
    }

    await this.repository.createCycle(cycle);
    return { id: cycleId };
  }

  async updateCycle(id: string, dto: {
    name: string;
    year: number;
    startDate: string;
    daysPerWeek: number;
    totalWeeks: number;
  }) {
    const { name, year, startDate, daysPerWeek, totalWeeks } = dto;
    
    // Check if cycle has active syllabus relations
    const existingCycle = await this.repository.getCycleWithSyllabus(id);
    if (!existingCycle) {
      throw new Error('Cycle not found');
    }

    const needsRecalculation = 
      existingCycle.startDate !== startDate || 
      existingCycle.daysPerWeek !== daysPerWeek || 
      existingCycle.totalWeeks !== totalWeeks;

    if (needsRecalculation && existingCycle.hasSyllabus) {
      throw new ConflictException(
        'Cannot update cycle dates or weeks because it has active syllabus relationships.',
      );
    }

    const cycleUpdate: any = {
      name,
      year,
      startDate,
      daysPerWeek,
      totalWeeks,
    };

    if (needsRecalculation) {
      const startParts = startDate.split('-');
      const start = new Date(Date.UTC(+startParts[0], +startParts[1] - 1, +startParts[2]));
      
      cycleUpdate.weeks = [];
      for (let i = 1; i <= totalWeeks; i++) {
        const currentWeekStart = new Date(start);
        currentWeekStart.setUTCDate(start.getUTCDate() + (i - 1) * 7);

        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setUTCDate(currentWeekStart.getUTCDate() + (daysPerWeek - 1));

        cycleUpdate.weeks.push({
          id: uuidv4(),
          cycleId: id,
          weekNumber: i,
          startDate: currentWeekStart.toISOString().split('T')[0],
          endDate: currentWeekEnd.toISOString().split('T')[0],
          isActive: true,
        });
      }

      if (cycleUpdate.weeks.length > 0) {
        cycleUpdate.endDate = cycleUpdate.weeks[cycleUpdate.weeks.length - 1].endDate;
      }
    }

    await this.repository.updateCycle(id, cycleUpdate);
    return { success: true };
  }

  async toggleCycleVisibility(id: string, isActive: boolean) {
    await this.repository.updateCycleVisibility(id, isActive);
  }

  async toggleWeekVisibility(id: string, isActive: boolean) {
    await this.repository.updateWeekVisibility(id, isActive);
  }

  async deleteCycle(id: string) {
    const cycle = await this.repository.getCycleWithSyllabus(id);
    if (cycle && cycle.hasSyllabus) {
      throw new ConflictException(
        'Cannot delete cycle because it has active syllabus relationships. Please deactivate it instead.',
      );
    }
    await this.repository.softDeleteCycle(id);
  }

  // --- Material Templates ---

  async getTemplates(cycleId: string) {
    return this.repository.getTemplatesByCycle(cycleId);
  }

  async createTemplate(cycleId: string, dto: any) {
    // Optionally check if cycle exists
    const cycle = await this.repository.getCycleWithSyllabus(cycleId);
    if (!cycle) {
      throw new Error('Cycle not found');
    }

    const templateId = uuidv4();
    const templateData = {
      id: templateId,
      cycleId,
      name: dto.name,
      scope: dto.scope,
      accumulationWeeks: dto.accumulationWeeks ?? null,
      courses: dto.courses?.map((c: any) => ({
        id: uuidv4(),
        courseId: c.courseId,
        questionsQuantity: c.questionsQuantity,
      })) || [],
    };

    await this.repository.createTemplate(templateData);
    return { id: templateId };
  }

  async updateTemplate(cycleId: string, templateId: string, dto: any) {
    // Note: In a real scenario, we might verify template belongs to cycleId
    const templateData: any = {};
    if (dto.name !== undefined) templateData.name = dto.name;
    if (dto.scope !== undefined) templateData.scope = dto.scope;
    if (dto.accumulationWeeks !== undefined) templateData.accumulationWeeks = dto.accumulationWeeks;

    if (dto.courses) {
      templateData.courses = dto.courses.map((c: any) => ({
        id: uuidv4(),
        courseId: c.courseId,
        questionsQuantity: c.questionsQuantity,
      }));
    }

    await this.repository.updateTemplate(templateId, templateData);
    return { success: true };
  }

  async deleteTemplate(cycleId: string, templateId: string) {
    await this.repository.deleteTemplate(templateId);
    return { success: true };
  }
}
