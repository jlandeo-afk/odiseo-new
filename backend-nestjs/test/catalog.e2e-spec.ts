import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Topic } from '../src/catalogs/entities/topic.entity';
import { SqsCatalogConsumer } from '../src/catalogs/sqs-catalog.consumer';
import { ICatalogRepository } from '../src/catalogs/repositories/i-catalog.repository';

describe('Catalog SQS Sync Isolation (E2E)', () => {
  let app: INestApplication;
  let consumer: SqsCatalogConsumer;
  let mockCatalogRepository: any;

  beforeAll(async () => {
    mockCatalogRepository = {
      upsertTopicsFromCore: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ICatalogRepository)
      .useValue(mockCatalogRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    consumer = moduleFixture.get<SqsCatalogConsumer>(SqsCatalogConsumer);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('el mensaje SQS debería invocar upsertTopicsFromCore en el repositorio híbrido', async () => {
    const fakeMessage = {
      Body: JSON.stringify({
        eventType: 'TopicsSynced',
        data: [{ id: 't1', coreName: 'Nuevo Nombre Núcleo', courseId: 'c1' }],
      }),
    };

    // Simulando el hook de SQS
    await consumer.handleCatalogSync(fakeMessage as any);

    // Se afirma que el repositorio fue llamado aislando el local_alias
    expect(mockCatalogRepository.upsertTopicsFromCore).toHaveBeenCalledWith([
      { id: 't1', coreName: 'Nuevo Nombre Núcleo', courseId: 'c1' },
    ]);
  });
});
