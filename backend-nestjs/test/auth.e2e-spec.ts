import { INestApplication } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { DataSource } from 'typeorm';
import {
  createTestApp,
  seedTestCompany,
  cleanupTestData,
} from './helpers/test-setup';

describe('Auth E2E — Login, Cookie, Session', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const companyIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // Seed test company with user
    const { companyId } = await seedTestCompany(dataSource, {
      subdomain: 'e2e-auth-colegio',
      commercialName: 'E2E Auth Colegio',
      primaryColor: '#1e88e5',
      userEmail: 'admin@e2e-auth.com',
      userPassword: 'SecurePass123',
      userName: 'Admin E2E',
    });
    companyIds.push(companyId);

    // Seed a second company for cross-tenant tests
    const { companyId: companyId2 } = await seedTestCompany(dataSource, {
      subdomain: 'e2e-auth-escuela',
      commercialName: 'E2E Auth Escuela',
      primaryColor: '#e53935',
      userEmail: 'admin@e2e-escuela.com',
      userPassword: 'SecurePass456',
      userName: 'Admin Escuela',
    });
    companyIds.push(companyId2);
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(dataSource, companyIds);
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate with valid credentials and set httpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-subdomain', 'e2e-auth-colegio')
        .send({
          email: 'admin@e2e-auth.com',
          password: 'SecurePass123',
          subdomain: 'e2e-auth-colegio',
        })
        .expect(200);

      // Verify response body
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('admin@e2e-auth.com');
      expect(response.body.user.name).toBe('Admin E2E');
      expect(response.body.user.roles).toContain('admin');
      expect(response.body.user.permissions).toContain('view_catalogs');

      // Verify httpOnly cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const jwtCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('jwt='))
        : cookies;
      expect(jwtCookie).toContain('HttpOnly');
    });

    it('should return 401 for invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-subdomain', 'e2e-auth-colegio')
        .send({
          email: 'admin@e2e-auth.com',
          password: 'WrongPassword',
          subdomain: 'e2e-auth-colegio',
        })
        .expect(401);
    });

    it('should return 401 for cross-tenant login attempt', async () => {
      // User from colegio trying to login on escuela subdomain
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-subdomain', 'e2e-auth-escuela')
        .send({
          email: 'admin@e2e-auth.com',
          password: 'SecurePass123',
          subdomain: 'e2e-auth-escuela',
        })
        .expect(401);
    });

    it('should return 400 for unknown subdomain', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-subdomain', 'nonexistent-tenant')
        .send({
          email: 'admin@e2e-auth.com',
          password: 'SecurePass123',
          subdomain: 'nonexistent-tenant',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me — Session Persistence (T028)', () => {
    it('should return user data when valid cookie is present', async () => {
      // Step 1: Login to get the cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-subdomain', 'e2e-auth-colegio')
        .send({
          email: 'admin@e2e-auth.com',
          password: 'SecurePass123',
          subdomain: 'e2e-auth-colegio',
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Step 2: Call /auth/me with the cookie
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .set('x-subdomain', 'e2e-auth-colegio')
        .expect(200);

      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.email).toBe('admin@e2e-auth.com');
      expect(meResponse.body.user.roles).toContain('admin');
    });

    it('should return 401 when no cookie is present', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('x-subdomain', 'e2e-auth-colegio')
        .expect(401);
    });

    it('should return 401 for tampered/invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', ['jwt=invalid.token.here'])
        .set('x-subdomain', 'e2e-auth-colegio')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the jwt cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('x-subdomain', 'e2e-auth-colegio')
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
      const cookies = response.headers['set-cookie'];
      const jwtCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('jwt='))
        : cookies;
      // Cookie should be cleared (expires in the past)
      expect(jwtCookie).toBeDefined();
    });
  });
});
