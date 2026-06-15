/**
 * T017 [US1] — Backend Integration Tests: POST /api/v1/materials/generate
 *
 * Pruebas E2E para el endpoint de generación de materiales.
 * Valida retorno HTTP 202, estructura de respuesta, y validaciones de negocio.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MaterialsModule } from '../src/materials/materials.module';
import { SqsService } from '../src/aws/sqs.service';

describe('POST /api/v1/materials/generate (E2E)', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 202 Accepted with job_id for valid BALOTARIO request', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/generate')
      .send({
        material_type: 'BALOTARIO',
        course_id: 'uuid-algebra',
        difficulty_level: 'AVANZADO',
      })
      .expect(HttpStatus.ACCEPTED);

    expect(response.body).toHaveProperty('status', 'processing');
    expect(response.body).toHaveProperty('job_id');
    expect(typeof response.body.job_id).toBe('string');
    expect(response.body.job_id.length).toBeGreaterThan(0);
    expect(mockSqsService.sendGenerateMaterialJob).toHaveBeenCalledTimes(1);
  });

  it('should return 202 Accepted for valid EXAMEN with exam_areas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/materials/generate')
      .send({
        material_type: 'EXAMEN',
        course_id: 'uuid-algebra',
        difficulty_level: 'INTERMEDIO',
        exam_areas: ['uuid_area_A', 'uuid_area_B'],
      })
      .expect(HttpStatus.ACCEPTED);

    expect(response.body.status).toBe('processing');
    expect(mockSqsService.sendGenerateMaterialJob).toHaveBeenCalledTimes(1);

    // Validate SQS payload structure
    const payload = mockSqsService.sendGenerateMaterialJob.mock.calls[0][0];
    expect(payload.material_type).toBe('EXAMEN');
    expect(payload.exam_areas).toHaveLength(2);
  });

  it('should return 400 for EXAMEN without exam_areas (CR-002)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/materials/generate')
      .send({
        material_type: 'EXAMEN',
        course_id: 'uuid-algebra',
        difficulty_level: 'BASICO',
        // Missing exam_areas
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockSqsService.sendGenerateMaterialJob).not.toHaveBeenCalled();
  });

  it('should include tenant metadata in SQS payload (FR-010)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/materials/generate')
      .send({
        material_type: 'BALOTARIO',
        course_id: 'uuid-trig',
        difficulty_level: 'AVANZADO',
      })
      .expect(HttpStatus.ACCEPTED);

    const payload = mockSqsService.sendGenerateMaterialJob.mock.calls[0][0];
    expect(payload.tenant).toBeDefined();
    expect(payload.tenant.tenant_id).toBeDefined();
    expect(payload.tenant.commercial_name).toBeDefined();
  });
});
