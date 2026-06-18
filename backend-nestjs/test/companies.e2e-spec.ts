import { INestApplication } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { DataSource } from 'typeorm';
import {
  createTestApp,
  seedTestCompany,
  cleanupTestData,
} from './helpers/test-setup';

describe('Companies Admin E2E (T026)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const companyIds: string[] = [];
  let authCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // Seed an admin company to get a valid JWT for protected endpoints
    const { companyId } = await seedTestCompany(dataSource, {
      subdomain: 'e2e-admin-main',
      commercialName: 'Admin Panel',
      userEmail: 'superadmin@odiseo.com',
      userPassword: 'SuperAdmin123',
      userName: 'Super Admin',
    });
    companyIds.push(companyId);

    // Login to get auth cookie
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-admin-main')
      .send({
        email: 'superadmin@odiseo.com',
        password: 'SuperAdmin123',
        subdomain: 'e2e-admin-main',
      })
      .expect(200);

    authCookie = loginResponse.headers['set-cookie'];
  }, 30000);

  afterAll(async () => {
    // Also clean up any companies created during tests
    const allCreated = await dataSource.query(
      `SELECT id FROM companies WHERE subdomain LIKE 'e2e-%'`,
    );
    const allIds = allCreated.map((r: any) => r.id);
    await cleanupTestData(dataSource, allIds);
    await app.close();
  });

  describe('POST /api/v1/admin/companies', () => {
    it('should create a new company and provision schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/companies')
        .set('Cookie', authCookie)
        .send({
          subdomain: 'e2e-new-colegio',
          commercialName: 'E2E New Colegio',
          logoUrl: 'https://example.com/logo.png',
          primaryColor: '#4caf50',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.subdomain).toBe('e2e-new-colegio');
      expect(response.body.commercialName).toBe('E2E New Colegio');
      expect(response.body.schemaName).toContain('tenant_');

      // Verify the schema was actually created in PostgreSQL
      const schemas = await dataSource.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [`tenant_${response.body.id}`],
      );
      expect(schemas.length).toBe(1);

      // Verify branding returns for the new subdomain
      const brandingResponse = await request(app.getHttpServer())
        .get('/api/v1/tenants/branding?subdomain=e2e-new-colegio')
        .expect(200);

      expect(brandingResponse.body.commercialName).toBe('E2E New Colegio');
      expect(brandingResponse.body.primaryColor).toBe('#4caf50');
    });

    it('should return 409 for duplicate subdomain', async () => {
      // First creation
      await request(app.getHttpServer())
        .post('/api/v1/admin/companies')
        .set('Cookie', authCookie)
        .send({
          subdomain: 'e2e-duplicate-test',
          commercialName: 'Duplicate Test',
        })
        .expect(201);

      // Second creation with same subdomain → 409
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/companies')
        .set('Cookie', authCookie)
        .send({
          subdomain: 'e2e-duplicate-test',
          commercialName: 'Duplicate Again',
        })
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/companies')
        .send({
          subdomain: 'e2e-unauthorized',
          commercialName: 'Unauthorized',
        })
        .expect(401);
    });

    it('should validate subdomain format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/companies')
        .set('Cookie', authCookie)
        .send({
          subdomain: 'INVALID SUBDOMAIN!',
          commercialName: 'Bad Subdomain',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/tenants/branding', () => {
    it('should return default branding for unknown subdomain (EC-001)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenants/branding?subdomain=totally-unknown')
        .expect(200);

      expect(response.body.commercialName).toBe('Odiseo B2B Default');
      expect(response.body.primaryColor).toBe('#6366f1');
      expect(response.body.logoUrl).toBeNull();
    });

    it('should return correct branding for known subdomain', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenants/branding?subdomain=e2e-admin-main')
        .expect(200);

      expect(response.body.commercialName).toBe('Admin Panel');
    });
  });
});
