import { Injectable } from '@nestjs/common';
import { IAcademicTimeRepository } from './i-academic-time.repository';
import { Cycle } from '../entities/cycle.entity';
import { CycleWeek } from '../entities/cycle-week.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class AcademicTimeRepositoryImpl implements IAcademicTimeRepository {
  constructor(private readonly tenantService: TenantService) {}

  async getCycles(): Promise<Cycle[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(Cycle, {
        relations: ['weeks'],
        order: { startDate: 'DESC', weeks: { weekNumber: 'ASC' } }
      });
    });
  }

  async createCycle(data: Partial<Cycle>): Promise<Cycle> {
    return this.tenantService.runInTenant(async (manager) => {
      const cycle = manager.create(Cycle, data);
      return manager.save(cycle);
    });
  }

  async createWeeks(cycleId: string, weeksData: Partial<CycleWeek>[]): Promise<CycleWeek[]> {
    return this.tenantService.runInTenant(async (manager) => {
      const weeks = weeksData.map(w => manager.create(CycleWeek, { ...w, cycleId }));
      return manager.save(weeks);
    });
  }

  async deactivateWeek(weekId: string): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(CycleWeek, weekId, { isActive: false });
    });
  }

  async activateWeek(weekId: string): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(CycleWeek, weekId, { isActive: true });
    });
  }
}
