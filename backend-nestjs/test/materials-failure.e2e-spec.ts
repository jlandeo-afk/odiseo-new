/**
 * T023 [US2] — Backend Integration Tests: Core API Failure Simulation
 *
 * Pruebas E2E que simulan la falla del Core API (reactivos insuficientes)
 * y validan que el backend gestiona correctamente el webhook de error.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MaterialsModule } from '../src/materials/materials.module';
import { SqsService } from '../src/aws/sqs.service';

describe('Material Generation Failure Flow (E2E)', () => {
  let app: INestApplication;
  const mockSqsService = {
    sendGenerateMaterialJob: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MaterialsModule],
    })
      .overrideProvider(SqsService)
      .useValue(mockSqsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept the webhook status update for a failed job', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({
        job_id: 'job-fail-001',
        status: 'FAILED',
        error_message:
          'No hay suficientes reactivos disponibles para los filtros seleccionados.',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({ success: true });
  });

  it('should return 400 when webhook is missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({
        // Missing job_id and status
      })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should accept the webhook status update for a completed job with download_url', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({
        job_id: 'job-success-001',
        status: 'COMPLETED',
        download_url: 'https://s3.example.com/materials/exam.pdf',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({ success: true });
  });
});
