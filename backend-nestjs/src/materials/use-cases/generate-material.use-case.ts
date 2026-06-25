import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { I_MATERIALS_REPOSITORY, type IMaterialsRepository } from '../repositories/i-materials.repository';
import { GenerateMaterialDto } from '../dto/generate-material.dto';
import { MaterialRequestStatus } from '../entities/material-request.entity';
import { CourseMaterialStatus } from '../entities/material-request-course.entity';

@Injectable()
export class GenerateMaterialUseCase {
  constructor(
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepo: IMaterialsRepository,
    @InjectQueue('materials-queue')
    private readonly materialsQueue: Queue,
  ) {}

  async execute(tenantId: string, userId: string, dto: GenerateMaterialDto): Promise<any> {
    // 1. Aquí se obtendría el profile_id para sacar el cycle_id.
    // (Por ahora usaremos un mock cycle_id hasta que se integre con Spec 002)
    const cycleId = uuidv4(); 
    
    // 2. Validación de syllabus vs perfil (Round-Robin).
    // Esto conectará con Spec 003. Generamos distribución mock para avanzar con el flujo de PDF.
    const mockDistributions = dto.courses.map((course) => {
      return {
        course_id: course.course_id,
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

    // 4. Crear el registro en base de datos en estado inicial
    const materialRequest = await this.materialsRepo.createRequest({
      tenantId,
      profileId: dto.profile_id,
      cycleId,
      weekNumber: dto.week_number,
      requiresReview: dto.requires_review,
      createdBy: userId,
      status: initialStatus,
    });

    const coursesToCreate = dto.courses.map((c) => ({
      materialRequestId: materialRequest.id,
      courseId: c.course_id,
      status: CourseMaterialStatus.PENDING,
    }));
    const createdCourses = await this.materialsRepo.createCourses(coursesToCreate);

    // Mapear el id del course_request recién creado a cada distribución para que el worker pueda actualizar la base de datos
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
