import { Injectable } from '@nestjs/common';
import { IMaterialsRepository } from './i-materials.repository';
import { MaterialRequest } from '../entities/material-request.entity';
import { MaterialRequestCourse } from '../entities/material-request-course.entity';
import { MaterialReviewQuestion } from '../entities/material-review-question.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class MaterialsRepositoryImpl implements IMaterialsRepository {
  constructor(private readonly tenantService: TenantService) {}

  async createRequest(request: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return this.tenantService.runInTenant(async (manager) => {
      const newReq = manager.create(MaterialRequest, request);
      return await manager.save(newReq);
    });
  }

  async findRequestById(id: string): Promise<MaterialRequest | null> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.findOne(MaterialRequest, {
        where: { id },
        relations: ['courses', 'questions'],
      });
    });
  }

  async updateRequestStatus(id: string, status: any): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(MaterialRequest, id, { status });
    });
  }

  async createCourseRequest(courseRequest: Partial<MaterialRequestCourse>): Promise<MaterialRequestCourse> {
    return this.tenantService.runInTenant(async (manager) => {
      const newCourseReq = manager.create(MaterialRequestCourse, courseRequest);
      return await manager.save(newCourseReq);
    });
  }

  async findCourseRequest(requestId: string, courseId: string): Promise<MaterialRequestCourse | null> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.findOne(MaterialRequestCourse, {
        where: { materialRequestId: requestId, courseId },
      });
    });
  }

  async findCourseRequestById(id: string): Promise<MaterialRequestCourse | null> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.findOne(MaterialRequestCourse, {
        where: { id },
      });
    });
  }

  async updateCourseStatus(id: string, status: any, downloadUrl?: string, warnings?: any): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      const updateData: any = { status };
      if (downloadUrl !== undefined) {
        updateData.downloadUrl = downloadUrl;
      }
      if (warnings !== undefined) {
        updateData.warnings = warnings;
      }
      await manager.update(MaterialRequestCourse, id, updateData);
    });
  }

  async createReviewQuestion(question: Partial<MaterialReviewQuestion>): Promise<MaterialReviewQuestion> {
    return this.tenantService.runInTenant(async (manager) => {
      const newQ = manager.create(MaterialReviewQuestion, question);
      return await manager.save(newQ);
    });
  }

  async findQuestionsByRequest(requestId: string): Promise<MaterialReviewQuestion[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return await manager.find(MaterialReviewQuestion, {
        where: { materialRequestId: requestId },
        order: { position: 'ASC' },
      });
    });
  }

  async updateReviewQuestionStatus(id: string, status: any, questionId?: string): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      const updateData: any = { status };
      if (questionId !== undefined) {
        updateData.questionId = questionId;
      }
      await manager.update(MaterialReviewQuestion, id, updateData);
    });
  }
}
