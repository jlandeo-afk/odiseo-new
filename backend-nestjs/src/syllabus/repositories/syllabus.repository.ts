import { Injectable } from '@nestjs/common';
import { ISyllabusRepository } from './i-syllabus.repository';
import { Syllabus } from '../entities/syllabus.entity';
import { SyllabusDistribution } from '../entities/syllabus-distribution.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class SyllabusRepositoryImpl implements ISyllabusRepository {
  constructor(private readonly tenantService: TenantService) {}

  async createSyllabus(syllabus: Partial<Syllabus>): Promise<Syllabus> {
    return this.tenantService.runInTenant(async (manager) => {
      const newSyllabus = manager.create(Syllabus, syllabus);
      return await manager.save(newSyllabus);
    });
  }

  async findById(id: string): Promise<Syllabus | null> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.findOne(Syllabus, { where: { id, isActive: true } });
    });
  }

  async findByCourseAndCycle(
    courseId: string,
    cycleId: string,
  ): Promise<Syllabus | null> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.findOne(Syllabus, {
        where: { courseId, cycleId, isActive: true },
      });
    });
  }

  async findByCycle(cycleId: string): Promise<Syllabus[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(Syllabus, { where: { cycleId } });
    });
  }

  async updateVisibility(id: string, isActive: boolean): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(Syllabus, id, { isActive });
    });
  }

  async createDistribution(
    distribution: Partial<SyllabusDistribution>,
  ): Promise<SyllabusDistribution> {
    return this.tenantService.runInTenant(async (manager) => {
      const newDist = manager.create(SyllabusDistribution, distribution);
      return await manager.save(newDist);
    });
  }

  async updateDistribution(id: string, weight: number): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(SyllabusDistribution, { id }, { weight });
    });
  }

  async deleteDistribution(id: string): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.delete(SyllabusDistribution, { id });
    });
  }

  async getSummaryBySyllabus(
    syllabusId: string,
  ): Promise<SyllabusDistribution[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.find(SyllabusDistribution, {
        where: { syllabusId },
      });
    });
  }
}
