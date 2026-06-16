import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqsModule } from '@ssut/nestjs-sqs';
import { CatalogsController } from './catalogs.controller';
import { CatalogUseCase } from './catalog.use-case';
import { ICatalogRepository } from './repositories/i-catalog.repository';
import { CatalogRepositoryImpl } from './repositories/catalog.repository';
import { Course } from './entities/course.entity';
import { Topic } from './entities/topic.entity';
import { Subtopic } from './entities/subtopic.entity';
import { SqsCatalogConsumer } from './sqs-catalog.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Topic, Subtopic]),
    SqsModule.register({
      consumers: [
        {
          name: 'catalog-sync-queue',
          queueUrl: 'http://localhost:4566/000000000000/catalog-sync-queue',
          region: 'us-east-1',
        },
      ],
      producers: [],
    }),
  ],
  controllers: [CatalogsController],
  providers: [
    CatalogUseCase,
    SqsCatalogConsumer,
    {
      provide: ICatalogRepository,
      useClass: CatalogRepositoryImpl,
    },
  ],
})
export class CatalogsModule {}
