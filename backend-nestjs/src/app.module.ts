import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AwsModule } from './aws/aws.module';
import { MaterialsModule } from './materials/materials.module';

@Module({
  imports: [ScheduleModule.forRoot(), AwsModule, MaterialsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
