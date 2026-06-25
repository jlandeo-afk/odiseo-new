import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialsCron } from './materials.cron';
import { GenerateMaterialUseCase } from './use-cases/generate-material.use-case';
import { CoreApiService } from './services/core-api.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { PdfGenerationProcessor } from './processors/pdf-generation.processor';
import { AwsModule } from '../aws/aws.module';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestCourse } from './entities/material-request-course.entity';
import { MaterialReviewQuestion } from './entities/material-review-question.entity';
import { MaterialQuestionUsage } from './entities/material-question-usage.entity';
import { I_MATERIALS_REPOSITORY } from './repositories/i-materials.repository';
import { MaterialsRepository } from './repositories/materials.repository';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    AwsModule,
    BullModule.registerQueue({
      name: 'materials-queue',
    }),
    BullBoardModule.forFeature({
      name: 'materials-queue',
      adapter: BullMQAdapter,
    }),
    TypeOrmModule.forFeature([
      MaterialRequest,
      MaterialRequestCourse,
      MaterialReviewQuestion,
      MaterialQuestionUsage,
    ]),
  ],
  controllers: [MaterialsController],
  providers: [
    MaterialsService,
    MaterialsCron,
    GenerateMaterialUseCase,
    CoreApiService,
    PdfGeneratorService,
    PdfGenerationProcessor,
    {
      provide: I_MATERIALS_REPOSITORY,
      useClass: MaterialsRepository,
    },
  ],
  exports: [MaterialsService, I_MATERIALS_REPOSITORY],
})
export class MaterialsModule {}
