import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { IAcademicTimeRepository } from './i-academic-time.repository';
import { Cycle } from '../entities/cycle.entity';
import { CycleWeek } from '../entities/cycle-week.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class AcademicTimeRepositoryImpl implements IAcademicTimeRepository {
  constructor(private readonly tenantService: TenantService) {}

  async getCycles(limit: number = 20, offset: number = 0): Promise<{ data: Cycle[], total: number }> {
    return this.tenantService.runInTenant(async (manager) => {
      const [data, total] = await manager.findAndCount(Cycle, {
        relations: ['weeks'],
        where: { deletedAt: IsNull() },
        order: { startDate: 'DESC', weeks: { weekNumber: 'ASC' } },
        take: limit,
        skip: offset,
      });
      return { data, total };
    });
  }

  async createCycle(data: any): Promise<void> {
    return this.tenantService.runInTenant(async (manager) => {
      const { weeks, ...cycleData } = data;
      const cycle = manager.create(Cycle, cycleData);
      await manager.save(cycle);

      const cycleWeeks = weeks.map((w: any) => manager.create(CycleWeek, w));
      await manager.save(cycleWeeks);
    });
  }

  async updateCycleVisibility(id: string, isActive: boolean): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(Cycle, id, { isActive });
    });
  }

  async updateWeekVisibility(id: string, isActive: boolean): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(CycleWeek, id, { isActive });
    });
  }

  async getCycleWithSyllabus(id: string): Promise<any> {
    return this.tenantService.runInTenant(async (manager) => {
      const cycle = await manager.findOne(Cycle, { where: { id } });
      if (!cycle) return null;

      // Mock relation check: If there were a syllabuses table
      // const count = await manager.count(Syllabus, { where: { cycleId: id } });
      const hasSyllabus = false; // Mocked for now

      return { ...cycle, hasSyllabus };
    });
  }

  async softDeleteCycle(id: string): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.softDelete(Cycle, id);
      await manager.softDelete(CycleWeek, { cycle: { id } });
    });
  }
}
