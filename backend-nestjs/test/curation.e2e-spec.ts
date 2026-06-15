/**
 * T037 [US4] — Backend Integration Tests: Curation Endpoints
 *
 * Pruebas E2E para los endpoints de curaduría manual:
 * PUT /:jobId/questions/:questionId/remove
 * PUT /:jobId/questions/:questionId/regenerate
 * PUT /:jobId/complete
 * PUT /:jobId/autocomplete
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MaterialsModule } from '../src/materials/materials.module';
import { SqsService } from '../src/aws/sqs.service';

describe('Curation Endpoints (E2E)', () => {
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

  const JOB_ID = 'job-curation-001';
  const QUESTION_ID = 'q-curation-001';

  describe('PUT /:jobId/questions/:questionId/remove', () => {
    it('should return 200 with success message', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/questions/${QUESTION_ID}/remove`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Question removed successfully');
    });
  });

  describe('PUT /:jobId/questions/:questionId/regenerate', () => {
    it('should return 200 with new question data', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/questions/${QUESTION_ID}/regenerate`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.question).toBeDefined();
      expect(response.body.question).toHaveProperty('content');
    });
  });

  describe('PUT /:jobId/complete', () => {
    it('should return 200 confirming manual curation complete', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/complete`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manual curation completed');
    });
  });

  describe('PUT /:jobId/autocomplete', () => {
    it('should return 200 confirming auto curation complete', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/autocomplete`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Auto curation completed');
    });
  });

  describe('Sequential curation flow', () => {
    it('should handle full curation workflow: remove → regenerate → complete', async () => {
      // Step 1: Remove a question
      await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/questions/q-001/remove`)
        .expect(HttpStatus.OK);

      // Step 2: Regenerate another question
      const regenRes = await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/questions/q-002/regenerate`)
        .expect(HttpStatus.OK);

      expect(regenRes.body.question).toBeDefined();

      // Step 3: Complete manual curation
      await request(app.getHttpServer())
        .put(`/api/v1/materials/${JOB_ID}/complete`)
        .expect(HttpStatus.OK);
    });
  });
});
