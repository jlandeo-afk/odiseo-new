import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { AwsModule } from '../aws/aws.module';
import { MaterialRequest } from './entities/material-request.entity';

@Module({
  imports: [AwsModule, TypeOrmModule.forFeature([MaterialRequest])],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
