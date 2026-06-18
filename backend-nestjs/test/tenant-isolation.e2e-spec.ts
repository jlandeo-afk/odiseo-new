import { INestApplication } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { DataSource } from 'typeorm';
import {
  createTestApp,
  seedTestCompany,
  cleanupTestData,
} from './helpers/test-setup';

describe('Tenant Isolation E2E (T009)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const companyIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // Create Tenant A
    const { companyId: idA } = await seedTestCompany(dataSource, {
      subdomain: 'e2e-iso-tenant-a',
      commercialName: 'Isolation Tenant A',
      userEmail: 'user-a@tenant-a.com',
      userPassword: 'PasswordA123',
      userName: 'User Tenant A',
    });
    companyIds.push(idA);

    // Create Tenant B
    const { companyId: idB } = await seedTestCompany(dataSource, {
      subdomain: 'e2e-iso-tenant-b',
      commercialName: 'Isolation Tenant B',
      userEmail: 'user-b@tenant-b.com',
      userPassword: 'PasswordB123',
      userName: 'User Tenant B',
    });
    companyIds.push(idB);
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(dataSource, companyIds);
    await app.close();
  });

  it('should login user-A on tenant-A successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-iso-tenant-a')
      .send({
        email: 'user-a@tenant-a.com',
        password: 'PasswordA123',
        subdomain: 'e2e-iso-tenant-a',
      })
      .expect(200);

    expect(response.body.user.email).toBe('user-a@tenant-a.com');
  });

  it('should login user-B on tenant-B successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-iso-tenant-b')
      .send({
        email: 'user-b@tenant-b.com',
        password: 'PasswordB123',
        subdomain: 'e2e-iso-tenant-b',
      })
      .expect(200);

    expect(response.body.user.email).toBe('user-b@tenant-b.com');
  });

  it('should REJECT user-A trying to login on tenant-B (cross-tenant isolation)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-iso-tenant-b')
      .send({
        email: 'user-a@tenant-a.com',
        password: 'PasswordA123',
        subdomain: 'e2e-iso-tenant-b',
      })
      .expect(401);
  });

  it('should REJECT user-B trying to login on tenant-A (cross-tenant isolation)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-iso-tenant-a')
      .send({
        email: 'user-b@tenant-b.com',
        password: 'PasswordB123',
        subdomain: 'e2e-iso-tenant-a',
      })
      .expect(401);
  });

  it('should verify data isolation: user-A session cannot access tenant-B data', async () => {
    // Login as user-A
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-subdomain', 'e2e-iso-tenant-a')
      .send({
        email: 'user-a@tenant-a.com',
        password: 'PasswordA123',
        subdomain: 'e2e-iso-tenant-a',
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    // Verify /auth/me returns user-A's company, not user-B's
    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .set('x-subdomain', 'e2e-iso-tenant-a')
      .expect(200);

    expect(meResponse.body.user.companyId).toBe(companyIds[0]);
    expect(meResponse.body.user.companyId).not.toBe(companyIds[1]);
  });
});
