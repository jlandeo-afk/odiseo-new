import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsController } from './catalogs.controller';
import { CatalogUseCase } from './catalog.use-case';
import { ICatalogRepository } from './repositories/i-catalog.repository';
import { CatalogRepositoryImpl } from './repositories/catalog.repository';
import { Course } from './entities/course.entity';
import { Topic } from './entities/topic.entity';
import { Subtopic } from './entities/subtopic.entity';
import { CatalogCronService } from './catalog.cron';

const providers: any[] = [
  CatalogUseCase,
  CatalogCronService,
  {
    provide: ICatalogRepository,
    useClass: CatalogRepositoryImpl,
  },
];

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Topic, Subtopic]), ConfigModule],
  controllers: [CatalogsController],
  providers,
})
export class CatalogsModule {}
