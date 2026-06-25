import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { CoreApiService, ExtractedQuestion } from '../services/core-api.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { S3Service } from '../../aws/s3.service';
import { I_MATERIALS_REPOSITORY, IMaterialsRepository } from '../repositories/i-materials.repository';
import { CourseRequestStatus } from '../entities/material-request-course.entity';

@Processor('materials-queue')
export class PdfGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(
    private readonly coreApiService: CoreApiService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly s3Service: S3Service,
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepo: IMaterialsRepository,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`);

    if (job.name === 'generate-pdf' || job.name === 'generate') {
      return this.handleGeneratePdf(job.data);
    }

    return {};
  }

  private async handleGeneratePdf(data: any) {
    const { tenant_id, cycle_id, material_request_id, requires_review, distributions, tenant } = data;
    const tenantMock = tenant || { commercial_name: 'Odiseo', logo_url: '' };

    for (const dist of distributions) {
      const courseId = dist.course_id;
      let allQuestions: ExtractedQuestion[] = [];
      let missingDesglose: string[] = [];

      try {
        // 1. Fetch questions from Core API
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

        // 2. Generate PDF using Playwright
        const pdfBuffer = await this.pdfGeneratorService.generatePdf(tenantMock, courseId, allQuestions);

        // 3. Upload to S3
        const s3Key = `materials/${tenant_id}/${cycle_id}/${material_request_id}/${courseId}.pdf`;
        const downloadUrl = await this.s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf');

        // 4. Update Course Request Status
        const status = missingDesglose.length > 0 
          ? CourseRequestStatus.COMPLETED_WITH_WARNINGS 
          : CourseRequestStatus.COMPLETED;

        // Since we don't have the courseRequestId directly mapped in mock job, we'd normally update the DB here.
        // For now we'll just log success. 
        // Emitting WebSocket would happen here or via a webhook endpoint.
        
        this.logger.log(`Generated PDF for course ${courseId}. URL: ${downloadUrl}. Status: ${status}`);
        
        return {
          course_id: courseId,
          download_url: downloadUrl,
          status,
          warnings: missingDesglose.length > 0 ? { error: missingDesglose.join(', ') } : null,
        };

      } catch (error) {
        this.logger.error(`Error generating PDF for course ${courseId}: ${error.message}`);
        throw error; // Let BullMQ retry
      }
    }
  }
}
