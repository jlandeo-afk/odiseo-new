import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import { AwsModule } from '../aws/aws.module';
import { MaterialsConsumer } from './materials.consumer';
import { PdfGeneratorService } from './pdf-generator.service';
import { QuestionSelectorService } from './question-selector.service';
import { QuestionBankModule } from '../question-bank/question-bank.module';

@Module({
  imports: [
    AwsModule,
    QuestionBankModule,
    SqsModule.register({
      consumers: [
        {
          name: 'odiseo-materials-queue',
          queueUrl: process.env.AWS_SQS_QUEUE_URL || 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/odiseo-materials-queue',
          region: process.env.AWS_REGION || 'us-east-1',
        },
      ],
      producers: [],
    }),
  ],
  providers: [
    MaterialsConsumer,
    PdfGeneratorService,
    QuestionSelectorService,
  ],
})
export class WorkerModule {}
