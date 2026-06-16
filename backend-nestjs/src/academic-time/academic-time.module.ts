import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicTimeController } from './academic-time.controller';
import { AcademicTimeUseCase } from './academic-time.use-case';
import { IAcademicTimeRepository } from './repositories/i-academic-time.repository';
import { AcademicTimeRepositoryImpl } from './repositories/academic-time.repository';
import { Cycle } from './entities/cycle.entity';
import { CycleWeek } from './entities/cycle-week.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cycle, CycleWeek])],
  controllers: [AcademicTimeController],
  providers: [
    AcademicTimeUseCase,
    {
      provide: IAcademicTimeRepository,
      useClass: AcademicTimeRepositoryImpl,
    },
  ],
})
export class AcademicTimeModule {}
