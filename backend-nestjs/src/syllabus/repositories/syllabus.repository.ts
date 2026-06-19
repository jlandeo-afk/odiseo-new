import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISyllabusRepository } from './i-syllabus.repository';
import { Syllabus } from '../entities/syllabus.entity';
import { SyllabusDistribution } from '../entities/syllabus-distribution.entity';

@Injectable()
export class SyllabusRepositoryImpl implements ISyllabusRepository {
  constructor(
    @InjectRepository(Syllabus)
    private readonly syllabusRepo: Repository<Syllabus>,
    @InjectRepository(SyllabusDistribution)
    private readonly distributionRepo: Repository<SyllabusDistribution>
  ) {}

  async createSyllabus(syllabus: Partial<Syllabus>): Promise<Syllabus> {
    const newSyllabus = this.syllabusRepo.create(syllabus);
    return await this.syllabusRepo.save(newSyllabus);
  }

  async findById(id: string): Promise<Syllabus | null> {
    return await this.syllabusRepo.findOne({ where: { id, isActive: true } });
  }

  async findByCourseAndCycle(courseId: string, cycleId: string): Promise<Syllabus | null> {
    return await this.syllabusRepo.findOne({ 
      where: { courseId, cycleId, isActive: true } 
    });
  }

  async findByCycle(cycleId: string): Promise<Syllabus[]> {
    return await this.syllabusRepo.find({
      where: { cycleId, isActive: true }
    });
  }

  async createDistribution(distribution: Partial<SyllabusDistribution>): Promise<SyllabusDistribution> {
    const newDist = this.distributionRepo.create(distribution);
    return await this.distributionRepo.save(newDist);
  }

  async updateDistribution(id: string, requestedQuantity: number): Promise<void> {
    await this.distributionRepo.update({ id }, { requestedQuantity });
  }

  async deleteDistribution(id: string): Promise<void> {
    await this.distributionRepo.delete({ id });
  }

  async getSummaryBySyllabus(syllabusId: string): Promise<SyllabusDistribution[]> {
    return await this.distributionRepo.find({ where: { syllabusId }});
  }
}
