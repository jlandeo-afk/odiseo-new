import { Injectable, Logger, BadRequestException, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Between, DataSource, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GenerateMaterialDto } from './dto/generate-material.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import { GenerateMaterialJobDto } from './dto/generate-material-job.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { MaterialRequest, MaterialRequestStatus } from './entities/material-request.entity';
import { MaterialRequestCourse, CourseRequestStatus } from './entities/material-request-course.entity';
import { MaterialReviewQuestion, ReviewQuestionStatus } from './entities/material-review-question.entity';
import { CycleMaterialTemplate } from '../academic-time/entities/cycle-material-template.entity';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { SyllabusDistribution } from '../syllabus/entities/syllabus-distribution.entity';
import { Company } from '../tenants/entities/tenant.entity';
import { Topic } from '../catalogs/entities/topic.entity';
import { Subtopic } from '../catalogs/entities/subtopic.entity';
import { Question } from '../question-bank/entities/question.entity';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { I_MATERIALS_REPOSITORY } from './repositories/i-materials.repository';
import type { IMaterialsRepository } from './repositories/i-materials.repository';
import { TenantService } from '../database/tenant.service';
import { S3Service } from '../aws/s3.service';
import { Cycle } from '../academic-time/entities/cycle.entity';
import { convertUuidToIntegerId } from '../database/uuid-converter';
@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectQueue('materials-queue') private readonly materialsQueue: Queue,
    private readonly cls: ClsService,
    private readonly tenantService: TenantService,
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepo: IMaterialsRepository,
    private readonly s3Service: S3Service,
    @InjectEntityManager('questionsConnection') private readonly questionsEntityManager: EntityManager,
  ) { }

  async generate(dto: GenerateMaterialDto): Promise<any> {
    const tenantId = this.cls.get('companyId') || '7b89-11c2-d344';
    const requestId = uuidv4();

    this.logger.log(`Initiating material generation. Request ID: ${requestId}`);

    return this.tenantService.runInTenant(async (manager) => {
      // 1. Fetch academic template (profile)
      const template = await manager.findOne(CycleMaterialTemplate, {
        where: { id: dto.profileId },
        relations: ['courses'],
      });
      if (!template) {
        throw new BadRequestException('El perfil seleccionado no existe');
      }

      // 2. Fetch company info for branding
      const company = await manager.findOne(Company, { where: { id: tenantId } });

      const courseRequests: Partial<MaterialRequestCourse>[] = [];
      const sqsJobs: GenerateMaterialJobDto[] = [];
      const coursesResponseList: { courseId: string; status: string }[] = [];

      // 3. For each course, fetch its syllabus and distributions
      for (const templateCourse of template.courses) {
        const syllabus = await manager.findOne(Syllabus, {
          where: { courseId: templateCourse.courseId, cycleId: template.cycleId, isActive: true },
        });
        if (!syllabus) {
          continue;
        }

        let distributions: SyllabusDistribution[] = [];
        if (template.scope === 'CURRENT_WEEK') {
          distributions = await manager.find(SyllabusDistribution, {
            where: { syllabusId: syllabus.id, weekNumber: dto.weekNumber },
          });
        } else if (template.scope === 'ACCUMULATIVE') {
          const startWeek = template.accumulationWeeks
            ? Math.max(1, dto.weekNumber - template.accumulationWeeks + 1)
            : 1;
          distributions = await manager.find(SyllabusDistribution, {
            where: {
              syllabusId: syllabus.id,
              weekNumber: Between(startWeek, dto.weekNumber),
            },
          });
        }

        if (distributions.length === 0) {
          continue;
        }

        const courseRequestId = uuidv4();
        courseRequests.push({
          id: courseRequestId,
          materialRequestId: requestId,
          courseId: templateCourse.courseId,
          status: CourseRequestStatus.PENDING,
        });

        coursesResponseList.push({
          courseId: templateCourse.courseId,
          status: 'PENDING',
        });

        const syllabusPayload = distributions.map((dist) => ({
          topic_id: dist.topicId,
          subtopic_id: dist.subtopicId,
          weight: dist.weight,
        }));

        sqsJobs.push({
          job_id: courseRequestId,
          tenant: {
            tenant_id: tenantId,
            commercial_name: company?.commercialName || 'Colegio Odiseo Innova',
            logo_url: company?.logoUrl || 'https://s3.aws.com/tenant-assets/odiseo-innova.png',
          },
          material_type: 'BALOTARIO',
          course_id: templateCourse.courseId,
          difficulty_level: 'MEDIA',
          syllabus_distribution: syllabusPayload,
          notification: {
            admin_user_id: 'uuid_admin_user',
          },
        });
      }

      if (courseRequests.length === 0) {
        throw new BadRequestException(
          'No hay distribución de sílabo configurada para la semana seleccionada',
        );
      }

      // 4. Save Main Request
      const mainRequest = manager.create(MaterialRequest, {
        id: requestId,
        tenantId,
        profileId: dto.profileId,
        weekNumber: dto.weekNumber,
        requiresReview: dto.requiresReview,
        status: dto.requiresReview
          ? MaterialRequestStatus.REVIEW_REQUIRED
          : MaterialRequestStatus.PROCESSING,
        materialType: 'BALOTARIO',
      });
      await manager.save(mainRequest);

      // 5. Save Course Requests
      for (const cr of courseRequests) {
        const courseRequest = manager.create(MaterialRequestCourse, cr);
        await manager.save(courseRequest);
      }

      // 6. If requiresReview, generate mock review questions and pause SQS
      if (dto.requiresReview) {
        let position = 1;
        for (const cr of courseRequests) {
          const syllabus = await manager.findOne(Syllabus, {
            where: { courseId: cr.courseId, cycleId: template.cycleId, isActive: true },
          });
          if (!syllabus) continue;

          // Fetch distributions again to map questions to correct subtopics
          let distributions: SyllabusDistribution[] = [];
          if (template.scope === 'CURRENT_WEEK') {
            distributions = await manager.find(SyllabusDistribution, {
              where: { syllabusId: syllabus.id, weekNumber: dto.weekNumber },
            });
          } else if (template.scope === 'ACCUMULATIVE') {
            const startWeek = template.accumulationWeeks
              ? Math.max(1, dto.weekNumber - template.accumulationWeeks + 1)
              : 1;
            distributions = await manager.find(SyllabusDistribution, {
              where: {
                syllabusId: syllabus.id,
                weekNumber: Between(startWeek, dto.weekNumber),
              },
            });
          }

          for (const dist of distributions) {
            // Fetch actual questions from database for this subtopic
            const allQuestions = await this.questionsEntityManager.find(Question, {
              where: { subtopicId: String(convertUuidToIntegerId(dist.subtopicId)) },
              relations: ['alternatives'],
            });
            // Shuffle in memory and take 2
            const dbQuestions = allQuestions
              .sort(() => 0.5 - Math.random())
              .slice(0, 2);

            // Generate 2 review questions per subtopic slot
            for (let i = 0; i < 2; i++) {
              const dbQ = dbQuestions[i];
              const isVacant = !dbQ;
              const reviewQ = manager.create(MaterialReviewQuestion, {
                id: uuidv4(),
                materialRequestId: requestId,
                questionId: isVacant ? null : dbQ.id,
                topicId: dist.topicId,
                subtopicId: dist.subtopicId,
                position: position++,
                status: isVacant ? ReviewQuestionStatus.EMPTY : ReviewQuestionStatus.FOUND,
              });
              await manager.save(reviewQ);
            }
          }
        }
        this.logger.log(`MaterialRequest ${requestId} paused for curation. Review questions generated.`);
      } else {
        // Dispatch BullMQ jobs immediately
        for (const job of sqsJobs) {
          // Update status to PROCESSING since we dispatched it
          await manager.update(MaterialRequestCourse, job.job_id, {
            status: CourseRequestStatus.PROCESSING,
          });
          await this.materialsQueue.add('generate', job);
        }
        this.logger.log(`MaterialRequest ${requestId} dispatched to BullMQ immediately.`);
      }

      return {
        jobId: requestId,
        status: dto.requiresReview ? MaterialRequestStatus.REVIEW_REQUIRED : MaterialRequestStatus.PROCESSING,
        message: dto.requiresReview
          ? 'La solicitud requiere revisión intermedia antes de compilar.'
          : 'Solicitud de material encolada exitosamente',
        courses: coursesResponseList,
      };
    });
  }

  async generateMaterial(dto: {
    course_id: string;
    material_type: string;
    difficulty_level: string;
  }): Promise<any> {
    this.logger.log(`Automatic generation requested for course ${dto.course_id}`);
    return 'auto-job-001';
  }

  async updateMaterialStatus(statusData: WebhookStatusRequestDto): Promise<void> {
    if (!statusData.job_id || !statusData.status) {
      throw new BadRequestException('job_id and status are required');
    }
    this.logger.log(
      `Received internal webhook update for job ${statusData.job_id}: ${statusData.status}`,
    );

    await this.tenantService.runInTenant(async (manager) => {
      // Find course request by ID
      const courseReq = await manager.findOne(MaterialRequestCourse, {
        where: { id: statusData.job_id },
      });
      if (!courseReq) {
        this.logger.warn(`No MaterialRequestCourse found for job_id: ${statusData.job_id}`);
        return;
      }

      let courseStatus: CourseRequestStatus = CourseRequestStatus.FAILED;
      if (statusData.status === 'completed') {
        courseStatus = CourseRequestStatus.COMPLETED;
      } else if (statusData.status === 'failed') {
        courseStatus = CourseRequestStatus.FAILED;
      } else if (statusData.status === 'processing') {
        courseStatus = CourseRequestStatus.PROCESSING;
      }

      // Update course request
      await manager.update(MaterialRequestCourse, courseReq.id, {
        status: courseStatus,
        downloadUrl: statusData.download_url || null,
        warnings: (statusData.error_message ? { error: statusData.error_message } : null) as any,
      });

      this.logger.log(`MaterialRequestCourse ${courseReq.id} updated to ${courseStatus}`);

      // Check if all courses in the parent MaterialRequest are complete
      const siblingCourses = await manager.find(MaterialRequestCourse, {
        where: { materialRequestId: courseReq.materialRequestId },
      });

      const allFinished = siblingCourses.every(
        (c) => c.status === CourseRequestStatus.COMPLETED || c.status === CourseRequestStatus.FAILED,
      );

      if (allFinished) {
        const hasFailed = siblingCourses.some((c) => c.status === CourseRequestStatus.FAILED);
        const finalStatus = hasFailed ? MaterialRequestStatus.FAILED : MaterialRequestStatus.COMPLETED;

        await manager.update(MaterialRequest, courseReq.materialRequestId, {
          status: finalStatus,
        });
        this.logger.log(`Parent MaterialRequest ${courseReq.materialRequestId} final status: ${finalStatus}`);
      }
    });
  }

  async getReviewData(id: string): Promise<any> {
    return this.tenantService.runInTenant(async (manager) => {
      const request = await manager.findOne(MaterialRequest, {
        where: { id },
        relations: ['courses'],
      });
      if (!request) {
        throw new NotFoundException('La solicitud de material no existe');
      }

      // Automatically transition status to IN_REVIEW if current status is REVIEW_REQUIRED
      if (request.status === MaterialRequestStatus.REVIEW_REQUIRED) {
        request.status = MaterialRequestStatus.IN_REVIEW;
        await manager.save(request);
        this.logger.log(`MaterialRequest ${id} status auto-transitioned to IN_REVIEW`);
      }

      const questions = await manager.find(MaterialReviewQuestion, {
        where: { materialRequestId: id },
        order: { position: 'ASC' },
      });

      // Load all topics and subtopics to resolve names in memory
      const topics = await manager.find(Topic);
      const subtopics = await manager.find(Subtopic);

      const topicMap = new Map(topics.map((t) => [t.id, t]));
      const subtopicMap = new Map(subtopics.map((s) => [s.id, s]));

      const questionsResponse = questions.map((q) => {
        const topic = topicMap.get(q.topicId);
        const subtopic = subtopicMap.get(q.subtopicId);
        return {
          id: q.id,
          questionId: q.questionId,
          courseId: topic?.courseId || '',
          topicName: topic?.name || 'Desconocido',
          subtopicName: subtopic?.name || 'Desconocido',
          position: q.position,
          status: q.status,
        };
      });

      return {
        materialId: request.id,
        status: request.status,
        version: request.version,
        questions: questionsResponse,
      };
    });
  }

  async approveCuration(id: string, dto: ApproveReviewDto): Promise<any> {
    const tenantId = this.cls.get('companyId') || '7b89-11c2-d344';

    return this.tenantService.runInTenant(async (manager) => {
      const request = await manager.findOne(MaterialRequest, {
        where: { id },
        relations: ['courses'],
      });
      if (!request) {
        throw new NotFoundException('La solicitud de material no existe');
      }

      // Optimistic locking concurrency check (T023)
      if (request.version !== dto.version) {
        throw new ConflictException(
          'El material ya está siendo revisado por otro administrador o su estado ha cambiado',
        );
      }

      // 1. Process replacements
      for (const replacement of dto.replacements) {
        await manager.update(
          MaterialReviewQuestion,
          { id: replacement.reviewQuestionId, materialRequestId: id },
          {
            questionId: replacement.questionId,
            status: ReviewQuestionStatus.REPLACED,
          },
        );
      }

      // 2. Process removals
      for (const removalId of dto.removals) {
        await manager.update(
          MaterialReviewQuestion,
          { id: removalId, materialRequestId: id },
          {
            status: ReviewQuestionStatus.REMOVED,
          },
        );
      }

      // Check for unresolved empty slots
      const updatedQuestions = await manager.find(MaterialReviewQuestion, {
        where: { materialRequestId: id },
      });
      const hasEmpty = updatedQuestions.some((q) => q.status === ReviewQuestionStatus.EMPTY);

      if (hasEmpty && !dto.continueWithWarnings) {
        throw new BadRequestException('Existen slots vacíos no resueltos');
      }

      // 3. Update parent request status
      request.status = MaterialRequestStatus.PROCESSING;
      request.version += 1;
      await manager.save(request);

      // Fetch company branding again to build SQS jobs
      const company = await manager.findOne(Company, { where: { id: tenantId } });

      // 4. Dispatch tasks to SQS for the worker
      for (const courseReq of request.courses) {
        // Update course requests to PROCESSING
        await manager.update(MaterialRequestCourse, courseReq.id, {
          status: CourseRequestStatus.PROCESSING,
        });

        const syllabus = await manager.findOne(Syllabus, {
          where: { courseId: courseReq.courseId, cycleId: request.profileId, isActive: true },
        });

        // Load distributions for this course in the requested week
        let distributions: SyllabusDistribution[] = [];
        const template = await manager.findOne(CycleMaterialTemplate, {
          where: { id: request.profileId },
        });
        if (template && syllabus) {
          if (template.scope === 'CURRENT_WEEK') {
            distributions = await manager.find(SyllabusDistribution, {
              where: { syllabusId: syllabus.id, weekNumber: request.weekNumber },
            });
          } else if (template.scope === 'ACCUMULATIVE') {
            const startWeek = template.accumulationWeeks
              ? Math.max(1, request.weekNumber - template.accumulationWeeks + 1)
              : 1;
            distributions = await manager.find(SyllabusDistribution, {
              where: {
                syllabusId: syllabus.id,
                weekNumber: Between(startWeek, request.weekNumber),
              },
            });
          }
        }

        const syllabusPayload = distributions.map((dist) => ({
          topic_id: dist.topicId,
          subtopic_id: dist.subtopicId,
          weight: dist.weight,
        }));

        const job: GenerateMaterialJobDto = {
          job_id: courseReq.id,
          tenant: {
            tenant_id: tenantId,
            commercial_name: company?.commercialName || 'Colegio Odiseo Innova',
            logo_url: company?.logoUrl || 'https://s3.aws.com/tenant-assets/odiseo-innova.png',
          },
          material_type: 'BALOTARIO',
          course_id: courseReq.courseId,
          difficulty_level: 'MEDIA',
          syllabus_distribution: syllabusPayload,
          notification: {
            admin_user_id: 'uuid_admin_user',
          },
        };

        await this.materialsQueue.add('generate', job);
      }

      this.logger.log(`Curation approved for MaterialRequest ${id}. Dispatched jobs to BullMQ.`);

      return {
        status: MaterialRequestStatus.PROCESSING,
        message: 'Generación de PDFs iniciada',
      };
    });
  }

  async getDownloadUrl(id: string, courseId: string): Promise<any> {
    return this.tenantService.runInTenant(async (manager) => {
      const courseReq = await manager.findOne(MaterialRequestCourse, {
        where: { materialRequestId: id, courseId },
      });

      if (!courseReq) {
        throw new NotFoundException('El curso solicitado no forma parte de esta solicitud de material');
      }

      if (courseReq.status !== CourseRequestStatus.COMPLETED || !courseReq.downloadUrl) {
        throw new BadRequestException('El material aún no está listo o falló su generación');
      }

      let key = courseReq.downloadUrl;
      if (key.startsWith('http')) {
        try {
          const urlObj = new URL(key);
          const parts = urlObj.pathname.split('/');
          key = parts.slice(2).join('/');
        } catch (e) {
          // Fallback if parsing fails
          key = courseReq.downloadUrl;
        }
      }

      const signedUrl = await this.s3Service.getPresignedDownloadUrl(key, 3600);

      return {
        materialId: id,
        courseId,
        downloadUrl: signedUrl,
        expiresIn: 3600,
      };
    });
  }

  async getHistory(cycleIds?: string[], weekNumbers?: number[], templateIds?: string[]): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      const query = manager.createQueryBuilder(MaterialRequest, 'request')
        .leftJoinAndSelect('request.courses', 'courses')
        .innerJoin(CycleMaterialTemplate, 'template', 'template.id = request.profile_id')
        .innerJoinAndMapOne('request.cycle', Cycle, 'cycle', 'cycle.id = template.cycle_id')
        .orderBy('request.created_at', 'DESC');

      if (cycleIds && cycleIds.length > 0) {
        query.andWhere('template.cycle_id IN (:...cycleIds)', { cycleIds });
      }

      if (weekNumbers && weekNumbers.length > 0) {
        query.andWhere('request.week_number IN (:...weekNumbers)', { weekNumbers });
      }

      if (templateIds && templateIds.length > 0) {
        query.andWhere('template.id IN (:...templateIds)', { templateIds });
      }

      return await query.getMany();
    });
  }
}
