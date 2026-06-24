import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AwsModule } from '../aws/aws.module';
import { MaterialsConsumer } from './materials.consumer';
import { PdfGeneratorService } from './pdf-generator.service';
import { QuestionSelectorService } from './question-selector.service';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [
    AwsModule,
    QuestionBankModule,
    MaterialsModule,
    BullModule.registerQueue({
      name: 'materials-queue',
    }),
  ],
  providers: [
    MaterialsConsumer,
    PdfGeneratorService,
    QuestionSelectorService,
  ],
})
export class WorkerModule {}
