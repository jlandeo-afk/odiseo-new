import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMaterialsRepository } from './i-materials.repository';
import { MaterialRequest } from '../entities/material-request.entity';
import { MaterialRequestCourse } from '../entities/material-request-course.entity';
import { MaterialReviewQuestion } from '../entities/material-review-question.entity';
import { MaterialQuestionUsage } from '../entities/material-question-usage.entity';

@Injectable()
export class MaterialsRepository implements IMaterialsRepository {
  constructor(
    @InjectRepository(MaterialRequest)
    private requestRepo: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestCourse)
    private courseRepo: Repository<MaterialRequestCourse>,
    @InjectRepository(MaterialReviewQuestion)
    private reviewRepo: Repository<MaterialReviewQuestion>,
    @InjectRepository(MaterialQuestionUsage)
    private usageRepo: Repository<MaterialQuestionUsage>,
  ) {}

  async createRequest(
    request: Partial<MaterialRequest>,
  ): Promise<MaterialRequest> {
    const entity = this.requestRepo.create(request);
    return this.requestRepo.save(entity);
  }

  async getRequestById(id: string): Promise<MaterialRequest | null> {
    return this.requestRepo.findOne({
      where: { id },
      relations: ['courses', 'reviewQuestions'],
    });
  }

  async updateRequestStatus(id: string, status: any): Promise<void> {
    await this.requestRepo.update(id, { status });
  }

  async createCourses(
    courses: Partial<MaterialRequestCourse>[],
  ): Promise<MaterialRequestCourse[]> {
    const entities = this.courseRepo.create(courses);
    return this.courseRepo.save(entities);
  }

  async updateCourse(
    courseId: string,
    data: Partial<MaterialRequestCourse>,
  ): Promise<void> {
    await this.courseRepo.update(courseId, data);
  }

  async saveReviewQuestions(
    questions: Partial<MaterialReviewQuestion>[],
  ): Promise<void> {
    const entities = this.reviewRepo.create(questions);
    await this.reviewRepo.save(entities);
  }

  async getReviewQuestions(
    requestId: string,
  ): Promise<MaterialReviewQuestion[]> {
    return this.reviewRepo.find({
      where: { materialRequestId: requestId },
      order: { position: 'ASC' },
    });
  }

  async saveQuestionUsage(
    usages: Partial<MaterialQuestionUsage>[],
  ): Promise<void> {
    const entities = this.usageRepo.create(usages);
    await this.usageRepo.save(entities);
  }

  async getUsedQuestionsInCycle(
    cycleId: string,
    courseId: string,
  ): Promise<string[]> {
    const usages = await this.usageRepo.find({
      where: { cycleId, courseId },
      select: ['questionId'],
    });
    return usages.map((u) => u.questionId);
  }
}
