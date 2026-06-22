import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import * as AWS from '@aws-sdk/client-sqs';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { QuestionSelectorService } from './question-selector.service';
import { I_MATERIALS_REPOSITORY } from '../materials/repositories/i-materials.repository';
import type { IMaterialsRepository } from '../materials/repositories/i-materials.repository';
import { MaterialRequestStatus } from '../materials/entities/material-request.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../aws/s3.service';

@Injectable()
export class MaterialsConsumer {
  private readonly logger = new Logger(MaterialsConsumer.name);

  constructor(
    private readonly questionSelector: QuestionSelectorService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly s3Service: S3Service,
    @Inject(I_MATERIALS_REPOSITORY)
    private readonly materialsRepository: IMaterialsRepository,
  ) {}

  @SqsMessageHandler('odiseo-materials-queue', false)
  async handleMessage(message: AWS.Message) {
    try {
      this.logger.log(`Received SQS message: ${message.MessageId}`);
      if (!message.Body) {
        throw new Error('Message body is empty');
      }

      const job: GenerateMaterialJobDto = JSON.parse(message.Body);
      this.logger.log(`Processing job ${job.job_id} for tenant ${job.tenant.tenant_id}`);

      // 1. Select Questions
      const questionsData = await this.questionSelector.selectQuestions(job);

      // 2. Generate PDF using Puppeteer
      const pdfBuffer = await this.pdfGenerator.generatePdf(job, questionsData);

      // 3. Upload to S3
      const s3Key = `materials/${job.tenant.tenant_id}/${job.job_id}.pdf`;
      const downloadUrl = await this.s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf');

      this.logger.log(`Successfully completed job ${job.job_id}. Download URL: ${downloadUrl}`);

      // 4. Update Database (MaterialRequest and MaterialRequestCourse)
      const courseRequest = await this.materialsRepository.findCourseRequest(job.job_id, job.course_id);
      if (courseRequest) {
        await this.materialsRepository.updateCourseStatus(
          courseRequest.id,
          MaterialRequestStatus.COMPLETED, // Reusing status enum, though it might be CourseRequestStatus
          downloadUrl
        );
      }
      
      // Update global request if needed, this would usually be done by checking if all courses are done.
      // For simplicity in this demo worker, we mark the main request as completed too.
      await this.materialsRepository.updateRequestStatus(job.job_id, MaterialRequestStatus.COMPLETED);
    } catch (error) {
      this.logger.error('Failed to process message', error);
      throw error; // Let SQS handle the retry if it fails
    }
  }
}
