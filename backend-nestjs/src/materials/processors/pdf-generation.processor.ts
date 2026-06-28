import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { CoreApiService, ExtractedQuestion } from '../services/core-api.service';
import { PdfGeneratorService, DesignTemplateConfig } from '../services/pdf-generator.service';
import { S3Service } from '../../aws/s3.service';
import { MaterialsService } from '../materials.service';
import { ClsService } from 'nestjs-cls';
import { I_MATERIALS_REPOSITORY, type IMaterialsRepository } from '../repositories/i-materials.repository';
import { CourseMaterialStatus } from '../entities/material-request-course.entity';
import { PdfDesignTemplate } from '../entities/pdf-design-template.entity';
import { PDFDocument } from 'pdf-lib';
import { MaterialReviewQuestion, ReviewQuestionStatus } from '../entities/material-review-question.entity';
import { Topic } from '../../catalogs/entities/topic.entity';
import { Question } from '../../question-bank/entities/question.entity';

@Processor('materials-queue')
export class PdfGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(
    private readonly coreApiService: CoreApiService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly s3Service: S3Service,
    private readonly materialsService: MaterialsService,
    private readonly cls: ClsService,
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepo: IMaterialsRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @InjectEntityManager('questionsConnection')
    private readonly questionsEntityManager: EntityManager,
  ) {
    super();
  }

  private async loadDesignTemplate(tenantId: string, designTemplateId?: string): Promise<DesignTemplateConfig | null> {
    if (!designTemplateId) return null;
    try {
      const schemaName = 'tenant_' + tenantId;
      const design = await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
        return this.entityManager.findOne(PdfDesignTemplate, { where: { id: designTemplateId } });
      });
      if (!design) return null;
      return {
        bannerImageUrl: design.bannerImageUrl,
        watermarkImageUrl: design.watermarkImageUrl,
        coverImageUrl: design.coverImageUrl,
        showCover: design.showCover,
        primaryTitleColor: design.primaryTitleColor,
        secondaryTitleColor: design.secondaryTitleColor,
        backgroundHighlightColor: design.backgroundHighlightColor,
        marginTop: design.marginTop,
        marginBottom: design.marginBottom,
        marginInside: design.marginInside,
        marginOutside: design.marginOutside,
        isBookMode: design.isBookMode,
        fontFamily: design.fontFamily,
        borderRadius: design.borderRadius,
        blocksConfig: design.blocksConfig,
        headerConfig: design.headerConfig,
        footerConfig: design.footerConfig,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to load design template ${designTemplateId}: ${err.message}`);
      return null;
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'generate-pdf') {
      return this.handleGeneratePdf(job.data);
    }

    if (job.name === 'generate') {
      return this.handleGenerateSingleCourse(job.data);
    }

    if (job.name === 'merge-pdf') {
      return this.handleMergePdf(job.data);
    }

    return {};
  }

  private async handleGeneratePdf(data: any) {
    const { tenant_id, cycle_id, material_request_id, requires_review, distributions, tenant, week_number, template_name, design_template_id } = data;
    const tenantMock = tenant || { commercial_name: 'Odiseo', logo_url: '' };
    const design = await this.loadDesignTemplate(tenant_id, design_template_id);
    if (design) {
      this.logger.log(`Applying design template ${design_template_id} for request ${material_request_id}`);
    }
    const results: { courseId: string; pdfBuffer: Buffer; warnings: string[] }[] = [];

    for (const dist of distributions) {
      const courseId = dist.course_id;
      let allQuestions: ExtractedQuestion[] = [];
      let missingDesglose: string[] = [];

      try {
        // Try to load curated review questions first
        let reviewQuestions: MaterialReviewQuestion[] = [];
        const schemaName = 'tenant_' + tenant_id;
        await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
          reviewQuestions = await this.entityManager.createQueryBuilder(MaterialReviewQuestion, 'mrq')
            .innerJoin(Topic, 't', 't.id = CAST(mrq.topic_id AS uuid)')
            .where('mrq.material_request_id = CAST(:materialRequestId AS uuid)', { materialRequestId: material_request_id })
            .andWhere('t.course_id = CAST(:courseId AS uuid)', { courseId })
            .orderBy('mrq.position', 'ASC')
            .getMany();
        });

        if (reviewQuestions.length > 0) {
          this.logger.log(`Found ${reviewQuestions.length} review questions in DB for request ${material_request_id} course ${courseId}`);
          
          const questionIds = reviewQuestions
            .map((q) => q.questionId)
            .filter((id): id is string => !!id);

          let questionMap = new Map<string, Question>();
          if (questionIds.length > 0) {
            const dbQuestions = await this.questionsEntityManager.find(Question, {
              where: { id: In(questionIds) },
              relations: ['alternatives'],
            });
            questionMap = new Map(dbQuestions.map((q) => [q.id, q]));
          }

          for (const mrq of reviewQuestions) {
            if (mrq.status === ReviewQuestionStatus.EMPTY) {
              missingDesglose.push(`Falta pregunta de subtema ${mrq.subtopicId}`);
            } else if (mrq.status === ReviewQuestionStatus.REMOVED) {
              missingDesglose.push(`Pregunta descartada en subtema ${mrq.subtopicId}`);
            } else {
              if (mrq.questionId) {
                const q = questionMap.get(mrq.questionId);
                if (q) {
                  allQuestions.push({
                    id: q.id,
                    topicId: q.topicId,
                    subtopicId: q.subtopicId,
                    content: q.htmlContent,
                    options: q.options.map(opt => `${opt.label}) ${opt.text}`),
                  });
                } else {
                  missingDesglose.push(`Falta reactivo con ID ${mrq.questionId} en posición ${mrq.position}`);
                }
              } else {
                missingDesglose.push(`Falta pregunta de subtema ${mrq.subtopicId}`);
              }
            }
          }
        } else {
          // Fallback: fetch random questions from mock/bank
          for (const topic of dist.topics) {
            const qs = await this.coreApiService.fetchQuestions(
              topic.topic_id,
              topic.subtopic_id,
              topic.quantity,
              dist.exclude_question_ids,
            );
            allQuestions = allQuestions.concat(qs);
            if (qs.length < topic.quantity) {
              missingDesglose.push(`Faltan ${topic.quantity - qs.length} de subtema ${topic.subtopic_id}`);
            }
          }
        }

        const pdfBuffer = await this.pdfGeneratorService.generatePdf(tenantMock, courseId, allQuestions, design, week_number, template_name);

        const safeName = `${template_name || 'Material'}_Semana${week_number || ''}_${courseId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const s3Key = `materials/${tenant_id}/${cycle_id}/${material_request_id}/${safeName}.pdf`;
        const downloadUrl = await this.s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf');

        const status = missingDesglose.length > 0
          ? CourseMaterialStatus.COMPLETED_WITH_WARNINGS
          : CourseMaterialStatus.COMPLETED;

        if (dist.course_request_id) {
          await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
            await this.materialsService.updateMaterialStatus({
              job_id: dist.course_request_id,
              status: status === CourseMaterialStatus.COMPLETED ? 'completed' : 'completed_with_warnings',
              download_url: downloadUrl,
              error_message: missingDesglose.length > 0 ? missingDesglose.join(', ') : undefined,
            });
          });
        }

        results.push({ courseId, pdfBuffer, warnings: missingDesglose });

      } catch (error: any) {
        this.logger.error(`Error generating PDF for course ${courseId}: ${error.message}`);

        if (dist.course_request_id) {
          const schemaName = 'tenant_' + tenant_id;
          await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
            await this.materialsService.updateMaterialStatus({
              job_id: dist.course_request_id,
              status: 'failed',
              error_message: error.message,
            });
          });
        }

        throw error;
      }
    }

    // Generate merged PDF after all courses are processed
    if (results.length > 1) {
      try {
        const mergedPdf = await PDFDocument.create();
        for (const result of results) {
          const pdfDoc = await PDFDocument.load(result.pdfBuffer);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        }
        const mergedBuffer = Buffer.from(await mergedPdf.save());

        const safeName = `${template_name || 'Material'}_Semana${week_number || ''}_Completo`.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const mergedKey = `materials/${tenant_id}/${cycle_id}/${material_request_id}/${safeName}.pdf`;
        const mergedUrl = await this.s3Service.uploadBuffer(mergedKey, mergedBuffer, 'application/pdf');

        const schemaName = 'tenant_' + tenant_id;
        await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
          await this.materialsService.updateMergedDownloadUrl(material_request_id, mergedUrl);
        });

        this.logger.log(`Merged PDF uploaded for request ${material_request_id}: ${mergedUrl}`);
      } catch (error: any) {
        this.logger.error(`Failed to generate merged PDF: ${error.message}`);
      }
    }

    return { processed: results.length };
  }

  private async handleGenerateSingleCourse(data: any) {
    const { tenant_id, cycle_id, material_request_id, requires_review, distributions, tenant, week_number, template_name, design_template_id } = data;
    const tenantMock = tenant || { commercial_name: 'Odiseo', logo_url: '' };
    const design = await this.loadDesignTemplate(tenant_id, design_template_id);
    const dist = data.distributions?.[0] || {
      course_id: data.course_id,
      topics: data.syllabus_distribution || [],
      exclude_question_ids: [],
      course_request_id: data.job_id,
    };
    const courseId = dist.course_id;
    let allQuestions: ExtractedQuestion[] = [];
    let missingDesglose: string[] = [];

    try {
      // Try to load curated review questions first
      let reviewQuestions: MaterialReviewQuestion[] = [];
      const schemaName = 'tenant_' + tenant_id;
      await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
        reviewQuestions = await this.entityManager.createQueryBuilder(MaterialReviewQuestion, 'mrq')
          .innerJoin(Topic, 't', 't.id = CAST(mrq.topic_id AS uuid)')
          .where('mrq.material_request_id = CAST(:materialRequestId AS uuid)', { materialRequestId: material_request_id })
          .andWhere('t.course_id = CAST(:courseId AS uuid)', { courseId })
          .orderBy('mrq.position', 'ASC')
          .getMany();
      });

      if (reviewQuestions.length > 0) {
        this.logger.log(`Found ${reviewQuestions.length} review questions in DB for single course request ${material_request_id} course ${courseId}`);
        
        const questionIds = reviewQuestions
          .map((q) => q.questionId)
          .filter((id): id is string => !!id);

        let questionMap = new Map<string, Question>();
        if (questionIds.length > 0) {
          const dbQuestions = await this.questionsEntityManager.find(Question, {
            where: { id: In(questionIds) },
            relations: ['alternatives'],
          });
          questionMap = new Map(dbQuestions.map((q) => [q.id, q]));
        }

        for (const mrq of reviewQuestions) {
          if (mrq.status === ReviewQuestionStatus.EMPTY) {
            missingDesglose.push(`Falta pregunta de subtema ${mrq.subtopicId}`);
          } else if (mrq.status === ReviewQuestionStatus.REMOVED) {
            missingDesglose.push(`Pregunta descartada en subtema ${mrq.subtopicId}`);
          } else {
            if (mrq.questionId) {
              const q = questionMap.get(mrq.questionId);
              if (q) {
                allQuestions.push({
                  id: q.id,
                  topicId: q.topicId,
                  subtopicId: q.subtopicId,
                  content: q.htmlContent,
                  options: q.options.map(opt => `${opt.label}) ${opt.text}`),
                });
              } else {
                missingDesglose.push(`Falta reactivo con ID ${mrq.questionId} en posición ${mrq.position}`);
              }
            } else {
              missingDesglose.push(`Falta pregunta de subtema ${mrq.subtopicId}`);
            }
          }
        }
      } else {
        // Fallback: fetch random questions from mock/bank
        if (dist.topics && dist.topics.length > 0) {
          for (const topic of dist.topics) {
            const qs = await this.coreApiService.fetchQuestions(
              topic.topic_id,
              topic.subtopic_id,
              topic.quantity,
              dist.exclude_question_ids,
            );
            allQuestions = allQuestions.concat(qs);
            if (qs.length < topic.quantity) {
              missingDesglose.push(`Faltan ${topic.quantity - qs.length} de subtema ${topic.subtopic_id}`);
            }
          }
        }
      }

      const pdfBuffer = await this.pdfGeneratorService.generatePdf(tenantMock, courseId, allQuestions, design, week_number, template_name);

      const safeName = `${template_name || 'Material'}_Semana${week_number || ''}_${courseId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const s3Key = `materials/${tenant_id}/${cycle_id}/${material_request_id}/${safeName}.pdf`;
      const downloadUrl = await this.s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf');

      const status = missingDesglose.length > 0
        ? CourseMaterialStatus.COMPLETED_WITH_WARNINGS
        : CourseMaterialStatus.COMPLETED;

      if (dist.course_request_id) {
        await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
          await this.materialsService.updateMaterialStatus({
            job_id: dist.course_request_id,
            status: status === CourseMaterialStatus.COMPLETED ? 'completed' : 'completed_with_warnings',
            download_url: downloadUrl,
            error_message: missingDesglose.length > 0 ? missingDesglose.join(', ') : undefined,
          });
        });
      }

      return { course_id: courseId, download_url: downloadUrl, status };

    } catch (error: any) {
      this.logger.error(`Error generating PDF for course ${courseId}: ${error.message}`);

      if (dist.course_request_id) {
        const schemaName = 'tenant_' + tenant_id;
        await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
          await this.materialsService.updateMaterialStatus({
            job_id: dist.course_request_id,
            status: 'failed',
            error_message: error.message,
          });
        });
      }

      throw error;
    }
  }

  private async handleMergePdf(data: any) {
    const { material_request_id, tenant_id } = data;

    try {
      const schemaName = 'tenant_' + tenant_id;
      const courseRequests = await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
        return this.materialsService.getCoursesForMerge(material_request_id);
      });

      const completedCourses = courseRequests.filter(
        (c: any) => c.status === CourseMaterialStatus.COMPLETED && c.downloadUrl,
      );

      if (completedCourses.length < 2) return;

      const mergedPdf = await PDFDocument.create();

      for (const course of completedCourses) {
        try {
          let key = course.downloadUrl;
          if (key.startsWith('http')) {
            const urlObj = new URL(key);
            const parts = urlObj.pathname.split('/');
            key = parts.slice(2).join('/');
          }
          const pdfBuffer = await this.s3Service.getObject(key);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        } catch (err: any) {
          this.logger.warn(`Skipping course ${course.courseId} for merge: ${err.message}`);
        }
      }

      const mergedBuffer = Buffer.from(await mergedPdf.save());
      const mergedKey = `materials/${tenant_id}/merged/${material_request_id}/Completo.pdf`;
      const mergedUrl = await this.s3Service.uploadBuffer(mergedKey, mergedBuffer, 'application/pdf');

      await this.cls.runWith({ tenantSchema: schemaName } as any, async () => {
        await this.materialsService.updateMergedDownloadUrl(material_request_id, mergedUrl);
      });

      this.logger.log(`Merge complete for request ${material_request_id}`);
    } catch (error: any) {
      this.logger.error(`Merge failed for request ${material_request_id}: ${error.message}`);
    }
  }
}
