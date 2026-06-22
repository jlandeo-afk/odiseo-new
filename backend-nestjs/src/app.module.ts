import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { DatabaseModule } from './database/database.module';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from '@nestjs/config';
import { TenantMiddleware } from './database/tenant.middleware';
import { CatalogsModule } from './catalogs/catalogs.module';
import { AcademicTimeModule } from './academic-time/academic-time.module';
import { SyllabusModule } from './syllabus/syllabus.module';
import { MaterialsModule } from './materials/materials.module';
import { WorkerModule } from './worker/worker.module';
import { QuestionBankModule } from './question-bank/question-bank.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    CatalogsModule,
    AcademicTimeModule,
    SyllabusModule,
    MaterialsModule,
    WorkerModule,
    QuestionBankModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
