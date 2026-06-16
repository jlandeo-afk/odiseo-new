import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as requestModule from 'supertest';
const request = requestModule.default || requestModule;
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from '../src/tenants/entities/tenant.entity';
import { User } from '../src/auth/entities/user.entity';

describe('B2B Auth Isolation (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockTenantRepo = {
      findOne: jest.fn().mockImplementation(async ({ where: { subdominio } }) => {
        if (subdominio === 'colegio') {
          return {
            subdominio: 'colegio',
            companyId: 'uuid-company-A',
            commercialName: 'Colegio A',
            primaryColor: '#1e88e5',
            logoUrl: 'https://via.placeholder.com/150/1e88e5/ffffff?text=ColegioA',
          };
        }
        if (subdominio === 'escuela') {
          return {
            subdominio: 'escuela',
            companyId: 'uuid-company-B',
            commercialName: 'Escuela B',
            primaryColor: '#e53935',
            logoUrl: 'https://via.placeholder.com/150/e53935/ffffff?text=EscuelaB',
          };
        }
        return null;
      }),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Tenant))
      .useValue(mockTenantRepo)
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepo)
      .compile();

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
