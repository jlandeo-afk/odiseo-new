import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialsCron } from './materials.cron';
import { AwsModule } from '../aws/aws.module';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestCourse } from './entities/material-request-course.entity';
import { MaterialReviewQuestion } from './entities/material-review-question.entity';
import { I_MATERIALS_REPOSITORY } from './repositories/i-materials.repository';
import { MaterialsRepositoryImpl } from './repositories/materials.repository';

@Module({
  imports: [
    AwsModule,
    TypeOrmModule.forFeature([
      MaterialRequest,
      MaterialRequestCourse,
      MaterialReviewQuestion,
    ]),
  ],
  controllers: [MaterialsController],
  providers: [
    MaterialsService,
    MaterialsCron,
    {
      provide: I_MATERIALS_REPOSITORY,
      useClass: MaterialsRepositoryImpl,
    },
  ],
  exports: [MaterialsService, I_MATERIALS_REPOSITORY],
})
export class MaterialsModule {}
