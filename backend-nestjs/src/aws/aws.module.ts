import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { S3Service } from './s3.service';

@Module({
  providers: [SqsService, S3Service],
  exports: [SqsService, S3Service],
})
export class AwsModule {}
