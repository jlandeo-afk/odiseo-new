import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAcademicTimeRepository } from './repositories/i-academic-time.repository';
import { Cycle } from './entities/cycle.entity';

@Injectable()
export class AcademicTimeUseCase {
  constructor(
    @Inject(IAcademicTimeRepository)
    private readonly academicTimeRepository: IAcademicTimeRepository,
  ) {}

  async getCycles(): Promise<Cycle[]> {
    return this.academicTimeRepository.getCycles();
  }

  async createCycle(name: string, startDate: Date, endDate: Date): Promise<Cycle> {
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }
    return this.academicTimeRepository.createCycle({ name, startDate, endDate });
  }

  async createWeeks(cycleId: string, weeks: any[]): Promise<any> {
    return this.academicTimeRepository.createWeeks(cycleId, weeks);
  }

  async deactivateWeek(weekId: string): Promise<void> {
    // REGLA INMUTABLE: Aplicar soft-delete semántico en lugar de eliminación física
    await this.academicTimeRepository.deactivateWeek(weekId);
  }

  async activateWeek(weekId: string): Promise<void> {
    await this.academicTimeRepository.activateWeek(weekId);
  }
}
