import { Injectable, Inject, ConflictException, BadRequestException } from '@nestjs/common';
import { I_SYLLABUS_REPOSITORY } from './repositories/i-syllabus.repository';
import type { ISyllabusRepository } from './repositories/i-syllabus.repository';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { CreateDistributionDto } from './dto/create-distribution.dto';

@Injectable()
export class SyllabusUseCase {
  constructor(
    @Inject(I_SYLLABUS_REPOSITORY)
    private readonly syllabusRepo: ISyllabusRepository
  ) {}

  async create(dto: CreateSyllabusDto) {
    const existing = await this.syllabusRepo.findByCourseAndCycle(dto.courseId, dto.cycleId);
    if (existing) {
      throw new ConflictException('Ya existe un sílabo para este curso y ciclo. Por favor edite el existente.');
    }

    return await this.syllabusRepo.createSyllabus({
      courseId: dto.courseId,
      cycleId: dto.cycleId,
      name: 'Nuevo Sílabo',
      isActive: true
    });
  }

  async findByCycle(cycleId: string) {
    return await this.syllabusRepo.findByCycle(cycleId);
  }

  async addDistribution(syllabusId: string, dto: CreateDistributionDto) {
    return await this.syllabusRepo.createDistribution({
      syllabusId,
      weekNumber: dto.weekNumber,
      topicId: dto.topicId,
      subtopicId: dto.subtopicId,
      weight: dto.weight
    });
  }

  async updateDistributionWeight(distId: string, syllabusId: string, weight: number) {
    await this.syllabusRepo.updateDistribution(distId, weight);
  }

  async deleteDistribution(distId: string) {
    await this.syllabusRepo.deleteDistribution(distId);
  }

  async getSummary(syllabusId: string) {
    const distributions = await this.syllabusRepo.getSummaryBySyllabus(syllabusId);
    
    const summary = {
      totalWeight: 0,
      weeklyWeights: {} as Record<number, number>,
      topicWeights: {} as Record<string, number>,
      distributions
    };

    for (const dist of distributions) {
      summary.totalWeight += dist.weight;
      summary.weeklyWeights[dist.weekNumber] = (summary.weeklyWeights[dist.weekNumber] || 0) + dist.weight;
      summary.topicWeights[dist.topicId] = (summary.topicWeights[dist.topicId] || 0) + dist.weight;
    }

    return summary;
  }

  async cloneSyllabus(syllabusId: string, sourceSyllabusId: string) {
    const sourceDistributions = await this.syllabusRepo.getSummaryBySyllabus(sourceSyllabusId);
    
    // Clean existing
    const currentDistributions = await this.syllabusRepo.getSummaryBySyllabus(syllabusId);
    for (const dist of currentDistributions) {
      await this.syllabusRepo.deleteDistribution(dist.id);
    }

    // Copy new
    for (const dist of sourceDistributions) {
      await this.syllabusRepo.createDistribution({
        syllabusId,
        weekNumber: dist.weekNumber,
        topicId: dist.topicId,
        subtopicId: dist.subtopicId,
        weight: dist.weight
      });
    }

    return await this.getSummary(syllabusId);
  }

  async archiveSyllabus(id: string, isActive: boolean) {
    await this.syllabusRepo.updateVisibility(id, isActive);
  }
}
