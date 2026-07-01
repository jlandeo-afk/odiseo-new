import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Between, DataSource, EntityManager, In } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GenerateMaterialDto } from './dto/generate-material.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import { GenerateMaterialJobDto } from './dto/generate-material-job.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestStatus } from './entities/material-status.enum';
import {
  MaterialRequestCourse,
  CourseMaterialStatus,
} from './entities/material-request-course.entity';
import {
  MaterialReviewQuestion,
  ReviewQuestionStatus,
} from './entities/material-review-question.entity';
import { Material } from './entities/material.entity';
import { CycleMaterialTemplate } from '../academic-time/entities/cycle-material-template.entity';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { SyllabusDistribution } from '../syllabus/entities/syllabus-distribution.entity';
import { Company } from '../tenants/entities/tenant.entity';
import { Topic } from '../catalogs/entities/topic.entity';
import { Subtopic } from '../catalogs/entities/subtopic.entity';
import { Question } from '../question-bank/entities/question.entity';
import { PdfDesignTemplate } from './entities/pdf-design-template.entity';
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
    @InjectEntityManager('questionsConnection')
    private readonly questionsEntityManager: EntityManager,
  ) {}

  async generate(dto: GenerateMaterialDto): Promise<any> {
    const tenantId = this.cls.get('companyId') || '7b89-11c2-d344';
    const requestId = uuidv4();

    this.logger.log(`Initiating material generation. Request ID: ${requestId}`);

    return this.tenantService.runInTenant(async (manager) => {
      // 1. Fetch academic template (profile)
      const template = await manager.findOne(CycleMaterialTemplate, {
        where: { id: dto.profile_id },
        relations: ['courses'],
      });
      if (!template) {
        throw new BadRequestException('El perfil seleccionado no existe');
      }

      // Resolve design template
      let designTemplateId = dto.design_template_id || null;
      if (!designTemplateId) {
        const defaultDesign = await manager.findOne(PdfDesignTemplate, {
          where: { tenantId, isDefault: true },
        });
        if (defaultDesign) {
          designTemplateId = defaultDesign.id;
        }
      }

      // 2. Fetch company info for branding
      const company = await manager.findOne(Company, {
        where: { id: tenantId },
      });

      const courseRequests: Partial<MaterialRequestCourse>[] = [];
      const sqsJobs: GenerateMaterialJobDto[] = [];
      const coursesResponseList: { courseId: string; status: string }[] = [];

      // 3. For each course, fetch its syllabus and distributions
      for (const templateCourse of template.courses) {
        const syllabus = await manager.findOne(Syllabus, {
          where: {
            courseId: templateCourse.courseId,
            cycleId: template.cycleId,
            isActive: true,
          },
        });
        if (!syllabus) {
          continue;
        }

        let distributions: SyllabusDistribution[] = [];
        if (template.scope === 'CURRENT_WEEK') {
          distributions = await manager.find(SyllabusDistribution, {
            where: { syllabusId: syllabus.id, weekNumber: dto.week_number },
          });
        } else if (template.scope === 'ACCUMULATIVE') {
          const startWeek = template.accumulationWeeks
            ? Math.max(1, dto.week_number - template.accumulationWeeks + 1)
            : 1;
          distributions = await manager.find(SyllabusDistribution, {
            where: {
              syllabusId: syllabus.id,
              weekNumber: Between(startWeek, dto.week_number),
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
          status: CourseMaterialStatus.PENDING,
        });

        coursesResponseList.push({
          courseId: templateCourse.courseId,
          status: 'PENDING',
        });

        let easyCount = templateCourse.easyCount || 0;
        let mediumCount = templateCourse.mediumCount || 0;
        let hardCount = templateCourse.hardCount || 0;

        // Fallback for old templates without difficulty distribution
        if (easyCount === 0 && mediumCount === 0 && hardCount === 0) {
          const totalQty = templateCourse.questionsQuantity || 35;
          easyCount = Math.floor(totalQty * 0.3);
          hardCount = Math.floor(totalQty * 0.2);
          mediumCount = totalQty - easyCount - hardCount;
        }

        const syllabusPayload = distributions.map((dist, idx) => {
          const baseEasy = Math.floor(easyCount / distributions.length);
          const remEasy = easyCount % distributions.length;
          const easyQty = idx < remEasy ? baseEasy + 1 : baseEasy;

          const baseMedium = Math.floor(mediumCount / distributions.length);
          const remMedium = mediumCount % distributions.length;
          const mediumQty = idx < remMedium ? baseMedium + 1 : baseMedium;

          const baseHard = Math.floor(hardCount / distributions.length);
          const remHard = hardCount % distributions.length;
          const hardQty = idx < remHard ? baseHard + 1 : baseHard;

          return {
            topic_id: dist.topicId,
            subtopic_id: dist.subtopicId,
            quantity: easyQty + mediumQty + hardQty,
            easyCount: easyQty,
            mediumCount: mediumQty,
            hardCount: hardQty,
          };
        }).filter((t) => t.quantity > 0);

        sqsJobs.push({
          job_id: courseRequestId,
          tenant: {
            tenant_id: tenantId,
            commercial_name: company?.commercialName || 'Colegio Odiseo Innova',
            logo_url:
              company?.logoUrl ||
              'https://s3.aws.com/tenant-assets/odiseo-innova.png',
          },
          material_type: 'BALOTARIO',
          course_id: templateCourse.courseId,
          difficulty_level: 'MEDIA',
          syllabus_distribution: syllabusPayload,
          notification: {
            admin_user_id: 'uuid_admin_user',
          },
          design_template_id: designTemplateId,
          material_request_id: requestId,
          cycle_id: template.cycleId,
          week_number: dto.week_number,
          template_name: template.name || 'Material',
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
        profileId: dto.profile_id,
        weekNumber: dto.week_number,
        requiresReview: dto.requires_review,
        status: dto.requires_review
          ? MaterialRequestStatus.REVIEW_REQUIRED
          : MaterialRequestStatus.PROCESSING,
        materialType: 'BALOTARIO',
        designTemplateId,
      });
      await manager.save(mainRequest);

      // 5. Save Course Requests
      for (const cr of courseRequests) {
        const courseRequest = manager.create(MaterialRequestCourse, cr);
        await manager.save(courseRequest);
      }

      // 6. Generate review questions (always pre-generate so they are available in case of curation/warnings)
      let position = 1;
      for (const cr of courseRequests) {
        const syllabus = await manager.findOne(Syllabus, {
          where: {
            courseId: cr.courseId,
            cycleId: template.cycleId,
            isActive: true,
          },
        });
        if (!syllabus) continue;

        // Fetch distributions again to map questions to correct subtopics
        let distributions: SyllabusDistribution[] = [];
        if (template.scope === 'CURRENT_WEEK') {
          distributions = await manager.find(SyllabusDistribution, {
            where: { syllabusId: syllabus.id, weekNumber: dto.week_number },
          });
        } else if (template.scope === 'ACCUMULATIVE') {
          const startWeek = template.accumulationWeeks
            ? Math.max(1, dto.week_number - template.accumulationWeeks + 1)
            : 1;
          distributions = await manager.find(SyllabusDistribution, {
            where: {
              syllabusId: syllabus.id,
              weekNumber: Between(startWeek, dto.week_number),
            },
          });
        }

        const templateCourse = template.courses.find(
          (tc) => tc.courseId === cr.courseId,
        );
        const targetQuantity = templateCourse?.questionsQuantity || 35;

        for (let idx = 0; idx < distributions.length; idx++) {
          const dist = distributions[idx];
          const baseQty = Math.floor(targetQuantity / distributions.length);
          const remainder = targetQuantity % distributions.length;
          const quantity = idx < remainder ? baseQty + 1 : baseQty;

          if (quantity <= 0) continue;

          // Fetch actual questions from database for this subtopic
          const allQuestions = await this.questionsEntityManager.find(
            Question,
            {
              where: {
                subtopicId: String(convertUuidToIntegerId(dist.subtopicId)),
              },
              relations: ['alternatives'],
            },
          );
          // Shuffle in memory and take quantity
          const dbQuestions = allQuestions
            .sort(() => 0.5 - Math.random())
            .slice(0, quantity);

          // Generate review questions per subtopic slot
          for (let i = 0; i < quantity; i++) {
            const dbQ = dbQuestions[i];
            const isVacant = !dbQ;
            const reviewQ = manager.create(MaterialReviewQuestion, {
              id: uuidv4(),
              materialRequestId: requestId,
              questionId: isVacant ? (null as any) : dbQ.id,
              topicId: dist.topicId,
              subtopicId: dist.subtopicId,
              position: position++,
              status: isVacant
                ? ReviewQuestionStatus.EMPTY
                : ReviewQuestionStatus.FOUND,
            });
            await manager.save(reviewQ);
          }
        }
      }

      if (dto.requires_review) {
        this.logger.log(
          `MaterialRequest ${requestId} paused for curation. Review questions generated.`,
        );
      } else {
        // Dispatch BullMQ jobs immediately
        for (const job of sqsJobs) {
          // Update status to PROCESSING since we dispatched it
          await manager.update(MaterialRequestCourse, job.job_id, {
            status: CourseMaterialStatus.PROCESSING,
          });
          await this.materialsQueue.add('generate', job);
        }
        this.logger.log(
          `MaterialRequest ${requestId} dispatched to BullMQ immediately.`,
        );
      }

      return {
        jobId: requestId,
        status: dto.requires_review
          ? MaterialRequestStatus.REVIEW_REQUIRED
          : MaterialRequestStatus.PROCESSING,
        message: dto.requires_review
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
    this.logger.log(
      `Automatic generation requested for course ${dto.course_id}`,
    );
    return 'auto-job-001';
  }

  async updateMaterialStatus(
    statusData: WebhookStatusRequestDto,
  ): Promise<void> {
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
        this.logger.warn(
          `No MaterialRequestCourse found for job_id: ${statusData.job_id}`,
        );
        return;
      }

      let courseStatus: CourseMaterialStatus = CourseMaterialStatus.FAILED;
      if (statusData.status === 'completed') {
        courseStatus = CourseMaterialStatus.COMPLETED;
      } else if (statusData.status === 'completed_with_warnings') {
        courseStatus = CourseMaterialStatus.COMPLETED_WITH_WARNINGS;
      } else if (statusData.status === 'failed') {
        courseStatus = CourseMaterialStatus.FAILED;
      } else if (statusData.status === 'processing') {
        courseStatus = CourseMaterialStatus.PROCESSING;
      }

      // Update course request
      await manager.update(MaterialRequestCourse, courseReq.id, {
        status: courseStatus,
        downloadUrl: statusData.download_url || undefined,
        warnings: (statusData.error_message
          ? { error: statusData.error_message }
          : null) as any,
      });

      this.logger.log(
        `MaterialRequestCourse ${courseReq.id} updated to ${courseStatus}`,
      );

      // Check if all courses in the parent MaterialRequest are complete
      const siblingCourses = await manager.find(MaterialRequestCourse, {
        where: { materialRequestId: courseReq.materialRequestId },
      });

      const allFinished = siblingCourses.every(
        (c) =>
          c.status === CourseMaterialStatus.COMPLETED ||
          c.status === CourseMaterialStatus.COMPLETED_WITH_WARNINGS ||
          c.status === CourseMaterialStatus.FAILED,
      );

      if (allFinished) {
        const hasFailed = siblingCourses.some(
          (c) => c.status === CourseMaterialStatus.FAILED,
        );
        const hasWarnings = siblingCourses.some(
          (c) => c.status === CourseMaterialStatus.COMPLETED_WITH_WARNINGS,
        );

        let finalStatus = MaterialRequestStatus.COMPLETED;
        if (hasFailed) {
          finalStatus = MaterialRequestStatus.FAILED;
        } else if (hasWarnings) {
          finalStatus = MaterialRequestStatus.REVIEW_REQUIRED;
        }

        await manager.update(MaterialRequest, courseReq.materialRequestId, {
          status: finalStatus,
        });
        this.logger.log(
          `Parent MaterialRequest ${courseReq.materialRequestId} final status: ${finalStatus}`,
        );

        // Update logical Material parent status
        const request = await manager.findOne(MaterialRequest, {
          where: { id: courseReq.materialRequestId },
        });
        if (request && request.materialId) {
          await manager.update(Material, request.materialId, {
            status: finalStatus,
          });
          this.logger.log(
            `Parent Material ${request.materialId} status updated to ${finalStatus}`,
          );
        }

        // Dispatch merge job if all courses completed
        if (!hasFailed && siblingCourses.length >= 2) {
          const request = await manager.findOne(MaterialRequest, {
            where: { id: courseReq.materialRequestId },
          });
          if (request) {
            const tenantId = this.cls.get('companyId') || '7b89-11c2-d344';
            await this.materialsQueue.add('merge-pdf', {
              material_request_id: courseReq.materialRequestId,
              tenant_id: tenantId,
            });
            this.logger.log(
              `Merge job dispatched for MaterialRequest ${courseReq.materialRequestId}`,
            );
          }
        }
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
        this.logger.log(
          `MaterialRequest ${id} status auto-transitioned to IN_REVIEW`,
        );
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

      // Fetch questions from external question database
      const questionIds = questions
        .map((q) => q.questionId)
        .filter((qid): qid is string => !!qid);

      let dbQuestions: Question[] = [];
      if (questionIds.length > 0) {
        dbQuestions = await this.questionsEntityManager.find(Question, {
          where: { id: In(questionIds) },
          relations: ['alternatives'],
        });
      }
      const dbQuestionsMap = new Map(dbQuestions.map((q) => [String(q.id), q]));

      const questionsResponse = questions.map((q) => {
        const topic = topicMap.get(q.topicId);
        const subtopic = subtopicMap.get(q.subtopicId);
        const dbQ = q.questionId
          ? dbQuestionsMap.get(String(q.questionId))
          : null;

        return {
          id: q.id,
          questionId: q.questionId,
          courseId: topic?.courseId || '',
          topicName: topic?.name || 'Desconocido',
          subtopicName: subtopic?.name || 'Desconocido',
          position: q.position,
          status: q.status,
          htmlContent: dbQ?.htmlContent || null,
          options: dbQ?.options || [],
        };
      });

      const cycle = await manager.findOne(Cycle, {
        where: { id: request.cycleId },
      });
      const template = await manager.findOne(CycleMaterialTemplate, {
        where: { id: request.profileId },
      });

      return {
        materialId: request.id,
        status: request.status,
        version: request.version,
        weekNumber: request.weekNumber,
        cycleName: cycle?.name || 'Desconocido',
        templateName: template?.name || 'Desconocido',
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
      const hasEmpty = updatedQuestions.some(
        (q) => q.status === ReviewQuestionStatus.EMPTY,
      );

      if (hasEmpty && !dto.continueWithWarnings) {
        throw new BadRequestException('Existen slots vacíos no resueltos');
      }

      // 3. Update parent request status
      request.status = MaterialRequestStatus.PROCESSING;
      request.version += 1;
      await manager.save(request);

      if (request.materialId) {
        await manager.update(Material, request.materialId, {
          status: MaterialRequestStatus.PROCESSING,
        });
        this.logger.log(
          `Parent Material ${request.materialId} status updated to PROCESSING`,
        );
      }

      // Fetch company branding again to build SQS jobs
      const company = await manager.findOne(Company, {
        where: { id: tenantId },
      });

      // 4. Dispatch tasks to SQS for the worker
      for (const courseReq of request.courses) {
        // Update course requests to PROCESSING
        await manager.update(MaterialRequestCourse, courseReq.id, {
          status: CourseMaterialStatus.PROCESSING,
        });

        const syllabus = await manager.findOne(Syllabus, {
          where: {
            courseId: courseReq.courseId,
            cycleId: request.profileId,
            isActive: true,
          },
        });

        // Load distributions for this course in the requested week
        let distributions: SyllabusDistribution[] = [];
        const template = await manager.findOne(CycleMaterialTemplate, {
          where: { id: request.profileId },
        });
        if (template && syllabus) {
          if (template.scope === 'CURRENT_WEEK') {
            distributions = await manager.find(SyllabusDistribution, {
              where: {
                syllabusId: syllabus.id,
                weekNumber: request.weekNumber,
              },
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
          quantity: dist.questionCount,
        }));

        const job = {
          job_id: courseReq.id,
          material_request_id: request.id,
          tenant_id: tenantId,
          cycle_id: request.profileId || template?.cycleId,
          week_number: request.weekNumber,
          template_name: template?.name || 'Material',
          design_template_id: request.designTemplateId,
          tenant: {
            tenant_id: tenantId,
            commercial_name: company?.commercialName || 'Colegio Odiseo Innova',
            logo_url:
              company?.logoUrl ||
              'https://s3.aws.com/tenant-assets/odiseo-innova.png',
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

      this.logger.log(
        `Curation approved for MaterialRequest ${id}. Dispatched jobs to BullMQ.`,
      );

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
        throw new NotFoundException(
          'El curso solicitado no forma parte de esta solicitud de material',
        );
      }

      if (
        (courseReq.status !== CourseMaterialStatus.COMPLETED &&
          courseReq.status !== CourseMaterialStatus.COMPLETED_WITH_WARNINGS) ||
        !courseReq.downloadUrl
      ) {
        throw new BadRequestException(
          'El material aún no está listo o falló su generación',
        );
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
        s3Key: key,
        filename: key.split('/').pop(),
        expiresIn: 3600,
      };
    });
  }

  async updateMergedDownloadUrl(
    materialRequestId: string,
    mergedUrl: string,
  ): Promise<void> {
    return this.tenantService.runInTenant(async (manager) => {
      await manager.update(MaterialRequest, materialRequestId, {
        mergedDownloadUrl: mergedUrl,
      });
      this.logger.log(
        `Merged download URL updated for MaterialRequest ${materialRequestId}`,
      );
    });
  }

  async getCoursesForMerge(materialRequestId: string): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(MaterialRequestCourse, {
        where: { materialRequestId },
      });
    });
  }

  async getMergedDownloadUrl(id: string): Promise<any> {
    return this.tenantService.runInTenant(async (manager) => {
      const request = await manager.findOne(MaterialRequest, {
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('La solicitud de material no existe');
      }

      if (!request.mergedDownloadUrl) {
        throw new BadRequestException(
          'El PDF combinado aún no está disponible',
        );
      }

      let key = request.mergedDownloadUrl;
      if (key.startsWith('http')) {
        try {
          const urlObj = new URL(key);
          const parts = urlObj.pathname.split('/');
          key = parts.slice(2).join('/');
        } catch (e) {
          key = request.mergedDownloadUrl;
        }
      }

      const signedUrl = await this.s3Service.getPresignedDownloadUrl(key, 3600);

      return {
        materialId: id,
        downloadUrl: signedUrl,
        s3Key: key,
        filename: key.split('/').pop(),
        expiresIn: 3600,
      };
    });
  }

  async streamDownload(s3Key: string): Promise<Buffer> {
    return this.s3Service.getObject(s3Key);
  }

  async getHistory(
    cycleIds?: string[],
    weekNumbers?: number[],
    templateIds?: string[],
  ): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      const query = manager
        .createQueryBuilder(Material, 'material')
        .leftJoinAndMapOne(
          'material.latestRequest',
          MaterialRequest,
          'latestRequest',
          'latestRequest.id = material.latest_request_id',
        )
        .leftJoinAndSelect('latestRequest.courses', 'courses')
        .innerJoin(
          CycleMaterialTemplate,
          'template',
          'template.id = material.profile_id',
        )
        .innerJoinAndMapOne(
          'material.cycle',
          Cycle,
          'cycle',
          'cycle.id = material.cycle_id',
        )
        .orderBy('material.updated_at', 'DESC');

      if (cycleIds && cycleIds.length > 0) {
        query.andWhere('material.cycle_id IN (:...cycleIds)', { cycleIds });
      }

      if (weekNumbers && weekNumbers.length > 0) {
        query.andWhere('material.week_number IN (:...weekNumbers)', {
          weekNumbers,
        });
      }

      if (templateIds && templateIds.length > 0) {
        query.andWhere('material.profile_id IN (:...templateIds)', {
          templateIds,
        });
      }

      const materials = await query.getMany();
      return materials.map((m) => ({
        id: m.latestRequestId || m.id, // Compatibility fallback: use latestRequestId as ID for download endpoints
        materialId: m.id, // Real logical Material ID
        tenantId: m.tenantId,
        profileId: m.profileId,
        cycleId: m.cycleId,
        weekNumber: m.weekNumber,
        status: m.status,
        latestRequestId: m.latestRequestId,
        createdAt: m.latestRequest?.createdAt || m.createdAt,
        updatedAt: m.updatedAt,
        cycle: m.cycle,
        courses: m.latestRequest?.courses || [],
        mergedDownloadUrl: m.latestRequest?.mergedDownloadUrl || null,
        requiresReview: m.latestRequest?.requiresReview || false,
      }));
    });
  }

  async getAttempts(materialId: string): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(MaterialRequest, {
        where: { materialId },
        relations: ['courses'],
        order: { createdAt: 'DESC' },
      });
    });
  }
}
