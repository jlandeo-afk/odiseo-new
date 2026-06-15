/**
 * T030 [US3] — Backend Integration Tests: Webhook Endpoint
 *
 * Pruebas E2E para el endpoint interno POST /api/v1/materials/webhook/status
 * que recibe las actualizaciones de estado desde el Worker FastAPI.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MaterialsModule } from '../src/materials/materials.module';
import { SqsService } from '../src/aws/sqs.service';

describe('POST /api/v1/materials/webhook/status (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MaterialsModule],
    })
      .overrideProvider(SqsService)
      .useValue({ sendGenerateMaterialJob: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 for valid COMPLETED status update', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({
        job_id: 'job-ws-001',
        status: 'COMPLETED',
        download_url: 'https://s3.aws.com/materials/examen.pdf',
      })
      .expect(HttpStatus.OK);

    expect(response.body.success).toBe(true);
  });

  it('should return 200 for valid FAILED status update', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({
        job_id: 'job-ws-002',
        status: 'FAILED',
        error_message: 'PDF generation timed out',
      })
      .expect(HttpStatus.OK);

    expect(response.body.success).toBe(true);
  });

  it('should return 400 when job_id is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({ status: 'COMPLETED' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 400 when status is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/materials/webhook/status')
      .send({ job_id: 'job-ws-003' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should handle rapid successive webhook calls without errors', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      request(app.getHttpServer())
        .post('/api/v1/materials/webhook/status')
        .send({
          job_id: `job-rapid-${i}`,
          status: i % 2 === 0 ? 'COMPLETED' : 'FAILED',
          download_url: i % 2 === 0 ? `https://s3.aws.com/materials/${i}.pdf` : undefined,
          error_message: i % 2 !== 0 ? 'Error' : undefined,
        }),
    );

    const responses = await Promise.all(promises);
    responses.forEach(res => {
      expect(res.status).toBe(HttpStatus.OK);
    });
  });
});
