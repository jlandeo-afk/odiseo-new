import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { I_MATERIALS_REPOSITORY, type IMaterialsRepository } from '../repositories/i-materials.repository';
import { GenerateMaterialDto } from '../dto/generate-material.dto';
import { MaterialRequestStatus } from '../entities/material-request.entity';
import { CourseMaterialStatus } from '../entities/material-request-course.entity';
import { CycleMaterialTemplate } from '../../academic-time/entities/cycle-material-template.entity';
import { PdfDesignTemplate } from '../entities/pdf-design-template.entity';

@Injectable()
export class GenerateMaterialUseCase {
  constructor(
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepo: IMaterialsRepository,
    @InjectQueue('materials-queue')
    private readonly materialsQueue: Queue,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async execute(tenantId: string, userId: string, dto: GenerateMaterialDto): Promise<any> {
    // 1. Fetch template info for naming
    const template = await this.entityManager.findOne(CycleMaterialTemplate, {
      where: { id: dto.profile_id },
      relations: ['courses'],
    });
    const templateName = template?.name || 'Material';
    const cycleId = template?.cycleId || uuidv4();

    // 2. Mock distributions per course
    const mockDistributions = (dto.courses || template?.courses || []).map((course: any) => {
      return {
        course_id: course.course_id || course.courseId,
        topics: [
          { topic_id: 't1', subtopic_id: 'st1', quantity: 5 },
        ],
        exclude_question_ids: [] as string[],
      };
    });

    // 3. Trazabilidad: Obtener exclusiones estrictas por cycle_id para cada curso (Spec 005)
    for (const dist of mockDistributions) {
      const usedQuestions = await this.materialsRepo.getUsedQuestionsInCycle(cycleId, dist.course_id);
      dist.exclude_question_ids = usedQuestions;
    }

    const initialStatus = dto.requires_review
      ? MaterialRequestStatus.REVIEW_REQUIRED
      : MaterialRequestStatus.PROCESSING;

    // 4. Resolver plantilla de diseño por defecto si no se especificó una
    let designTemplateId = dto.design_template_id || null;
    if (!designTemplateId) {
      const defaultDesign = await this.entityManager.findOne(PdfDesignTemplate, {
        where: { tenantId, isDefault: true },
      });
      if (defaultDesign) {
        designTemplateId = defaultDesign.id;
      }
    }

    // Crear el registro en base de datos en estado inicial
    const materialRequest = await this.materialsRepo.createRequest({
      tenantId,
      profileId: dto.profile_id,
      cycleId,
      weekNumber: dto.week_number,
      requiresReview: dto.requires_review,
      designTemplateId,
      createdBy: userId,
      status: initialStatus,
    });

    const coursesToCreate = mockDistributions.map((c: any) => ({
      materialRequestId: materialRequest.id,
      courseId: c.course_id,
      status: CourseMaterialStatus.PENDING,
    }));
    const createdCourses = await this.materialsRepo.createCourses(coursesToCreate);

    for (const dist of mockDistributions) {
      const dbCourse = createdCourses.find(c => c.courseId === dist.course_id);
      if (dbCourse) {
        (dist as any).course_request_id = dbCourse.id;
      }
    }

    // 5. Encolar el trabajo en BullMQ
    const jobPayload = {
      material_request_id: materialRequest.id,
      tenant_id: tenantId,
      cycle_id: cycleId,
      week_number: dto.week_number,
      template_name: templateName,
      design_template_id: designTemplateId,
      requires_review: dto.requires_review,
      material_type: dto.exam_areas ? 'EXAMEN' : 'BALOTARIO',
      distributions: mockDistributions,
      exam_areas: dto.exam_areas,
    };

    if (!dto.requires_review) {
      await this.materialsQueue.add('generate-pdf', jobPayload);
    }

    return {
      message: dto.requires_review 
        ? 'Solicitud pausada para revisión intermedia.'
        : 'Solicitud de generación encolada exitosamente',
      data: {
        material_request_id: materialRequest.id,
        status: initialStatus,
        estimated_completion: dto.requires_review ? null : '60s',
      },
    };
  }
}
