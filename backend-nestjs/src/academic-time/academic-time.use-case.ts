import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { IAcademicTimeRepository } from './repositories/i-academic-time.repository';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AcademicTimeUseCase {
  constructor(
    @Inject(IAcademicTimeRepository)
    private readonly repository: IAcademicTimeRepository,
  ) {}

  async getCycles() {
    return this.repository.getCycles();
  }

  async createCycle(dto: {
    name: string;
    year: number;
    startDate: string;
    daysPerWeek: number;
    totalWeeks: number;
  }) {
    const { name, year, startDate, daysPerWeek, totalWeeks } = dto;
    const start = new Date(startDate);

    // Calculate total days for the entire cycle
    // If a cycle has 2 weeks, and daysPerWeek is 7, total days = 14
    // end_date = start + (totalWeeks * daysPerWeek - 1) days
    const totalDays = totalWeeks * daysPerWeek;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + totalDays - 1);

    const cycleId = uuidv4();
    const cycle = {
      id: cycleId,
      name,
      year,
      startDate: start.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      daysPerWeek,
      totalWeeks,
      weeks: [] as any[],
    };

    // Generate weeks
    let currentWeekStart = new Date(start);
    for (let i = 1; i <= totalWeeks; i++) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + daysPerWeek - 1);

      cycle.weeks.push({
        id: uuidv4(),
        cycleId,
        weekNumber: i,
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: currentWeekEnd.toISOString().split('T')[0],
        isActive: true,
      });

      // Next week starts the day after this week ends
      currentWeekStart = new Date(currentWeekEnd);
      currentWeekStart.setDate(currentWeekStart.getDate() + 1);
    }

    await this.repository.createCycle(cycle);
    return { id: cycleId };
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
}
