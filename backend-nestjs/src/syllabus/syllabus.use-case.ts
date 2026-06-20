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
    const currentDistributions = await this.syllabusRepo.getSummaryBySyllabus(syllabusId);
    
    const weekTotal = currentDistributions
      .filter(d => d.weekNumber === dto.weekNumber)
      .reduce((sum, d) => sum + d.requestedQuantity, 0);

    if (weekTotal + dto.requestedQuantity > 100) {
      throw new BadRequestException('La cantidad máxima de preguntas por semana no puede exceder 100.');
    }

    return await this.syllabusRepo.createDistribution({
      syllabusId,
      weekNumber: dto.weekNumber,
      topicId: dto.topicId,
      subtopicId: dto.subtopicId,
      requestedQuantity: dto.requestedQuantity
    });
  }

  async updateDistributionQuantity(distId: string, syllabusId: string, quantity: number) {
    await this.syllabusRepo.updateDistribution(distId, quantity);
  }

  async deleteDistribution(distId: string) {
    await this.syllabusRepo.deleteDistribution(distId);
  }

  async getSummary(syllabusId: string) {
    const distributions = await this.syllabusRepo.getSummaryBySyllabus(syllabusId);
    
    const summary = {
      totalQuestions: 0,
      weeklyTotals: {} as Record<number, number>,
      topicTotals: {} as Record<string, number>,
      distributions
    };

    for (const dist of distributions) {
      summary.totalQuestions += dist.requestedQuantity;
      summary.weeklyTotals[dist.weekNumber] = (summary.weeklyTotals[dist.weekNumber] || 0) + dist.requestedQuantity;
      summary.topicTotals[dist.topicId] = (summary.topicTotals[dist.topicId] || 0) + dist.requestedQuantity;
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
        requestedQuantity: dist.requestedQuantity
      });
    }

    return await this.getSummary(syllabusId);
  }

  async archiveSyllabus(id: string, isActive: boolean) {
    await this.syllabusRepo.updateVisibility(id, isActive);
  }
}
