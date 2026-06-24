import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { QuestionSelectorService } from './question-selector.service';
import { I_MATERIALS_REPOSITORY } from '../materials/repositories/i-materials.repository';
import type { IMaterialsRepository } from '../materials/repositories/i-materials.repository';
import { MaterialRequestStatus } from '../materials/entities/material-request.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../aws/s3.service';
import { ClsService } from 'nestjs-cls';

@Processor('materials-queue')
@Injectable()
export class MaterialsConsumer extends WorkerHost {
  private readonly logger = new Logger(MaterialsConsumer.name);

  constructor(
    private readonly questionSelector: QuestionSelectorService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly s3Service: S3Service,
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepository: IMaterialsRepository,
    private readonly cls: ClsService,
  ) {
    super();
  }

  async process(job: Job<GenerateMaterialJobDto>): Promise<any> {
    return this.cls.run(async () => {
      const jobData = job.data;
      try {
        this.logger.log(`Received BullMQ job: ${job.id}`);
        this.logger.log(`Processing job ${jobData.job_id} for tenant ${jobData.tenant.tenant_id}`);

        // Set the schema in CLS context so that repositories and services can resolve it!
        const schema = `tenant_${jobData.tenant.tenant_id}`;
        this.cls.set('tenantSchema', schema);
        this.cls.set('companyId', jobData.tenant.tenant_id);

        // 1. Select Questions
        const questionsData = await this.questionSelector.selectQuestions(jobData);

        // 2. Generate PDF using Playwright
        const pdfBuffer = await this.pdfGenerator.generatePdf(jobData, questionsData);

        // 3. Upload to S3
        const s3Key = `materials/${jobData.tenant.tenant_id}/${jobData.job_id}.pdf`;
        const downloadUrl = await this.s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf');

        this.logger.log(`Successfully completed job ${jobData.job_id}. Download URL: ${downloadUrl}`);

        // 4. Update Database (MaterialRequest and MaterialRequestCourse)
        const courseRequest = await this.materialsRepository.findCourseRequest(jobData.job_id, jobData.course_id);
        if (courseRequest) {
          await this.materialsRepository.updateCourseStatus(
            courseRequest.id,
            MaterialRequestStatus.COMPLETED,
            downloadUrl
          );
        }
        
        // Update global request if needed, this would usually be done by checking if all courses are done.
        // For simplicity in this demo worker, we mark the main request as completed too.
        await this.materialsRepository.updateRequestStatus(jobData.job_id, MaterialRequestStatus.COMPLETED);
      } catch (error) {
        this.logger.error(`Failed to process job ${job.id}`, error);
        
        try {
          // Set the schema in CLS context just in case the error happened before it was set
          const schema = `tenant_${jobData.tenant.tenant_id}`;
          this.cls.set('tenantSchema', schema);
          this.cls.set('companyId', jobData.tenant.tenant_id);

          const courseRequest = await this.materialsRepository.findCourseRequest(jobData.job_id, jobData.course_id);
          if (courseRequest) {
            await this.materialsRepository.updateCourseStatus(
              courseRequest.id,
              MaterialRequestStatus.FAILED
            );
          }
          await this.materialsRepository.updateRequestStatus(jobData.job_id, MaterialRequestStatus.FAILED);
        } catch (dbError) {
          this.logger.error(`Failed to update job status to FAILED in DB`, dbError);
        }

        throw error; // Let BullMQ handle retries if configured
      }
    });
  }
}
