import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { AuthModule } from '../src/auth/auth.module';
import { TenantsModule } from '../src/tenants/tenants.module';
import { TenantsModule } from '../src/tenants/tenants.module';

describe('B2B Auth Isolation (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, TenantsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should authenticate Admin Colegio A on subdomain "colegio"', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@colegio.com',
        password: 'password123',
        subdomain: 'colegio'
      })
      .expect(HttpStatus.OK);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.companyId).toBe('uuid-company-A');
    expect(response.body.user.roles).toContain('super-admin');
  });

  it('should REJECT Admin Colegio A on subdomain "escuela" (Tenant Isolation)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@colegio.com',
        password: 'password123',
        subdomain: 'escuela' // Trying to login to Tenant B
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should load branding for "escuela"', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/tenants/branding?subdomain=escuela')
      .expect(HttpStatus.OK);

    expect(response.body.commercialName).toBe('Escuela B');
    expect(response.body.primaryColor).toBe('#e53935');
  });

  it('should return default branding for unknown subdomain', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/tenants/branding?subdomain=unknown')
      .expect(HttpStatus.OK);

    expect(response.body.commercialName).toBe('Odiseo B2B Default');
  });
});
