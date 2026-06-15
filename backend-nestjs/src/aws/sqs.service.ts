import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';

@Injectable()
export class SqsService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly logger = new Logger(SqsService.name);

  constructor() {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_SQS_ENDPOINT || 'http://localhost:4566',
    });
    this.queueUrl = process.env.AWS_SQS_QUEUE_URL || 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/odiseo-materials-queue';
  }

  async sendGenerateMaterialJob(job: GenerateMaterialJobDto): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(job),
    });

    try {
      const response = await this.sqsClient.send(command);
      this.logger.log(`Message sent to SQS successfully. MessageId: ${response.MessageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send message to SQS: ${error.message}`, error.stack);
      throw error;
    }
  }
}
