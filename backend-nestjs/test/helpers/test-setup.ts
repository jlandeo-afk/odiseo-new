import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Company } from '../../src/tenants/entities/tenant.entity';
import * as bcrypt from 'bcrypt';

/**
 * Creates and initializes a NestJS test application with real database.
 * Uses the odiseo database with proper test isolation.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app;
}

/**
 * Seeds a test company in public.companies and provisions its schema
 * with a test user.
 */
export async function seedTestCompany(
  dataSource: DataSource,
  data: {
    subdomain: string;
    commercialName: string;
    primaryColor?: string;
    userEmail: string;
    userPassword: string;
    userName: string;
  },
): Promise<{ companyId: string; schemaName: string }> {
  // Insert company into public.companies
  const companyResult = await dataSource.query(
    `INSERT INTO companies (subdomain, commercial_name, primary_color, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [data.subdomain, data.commercialName, data.primaryColor || '#6366f1'],
  );
  const companyId = companyResult[0].id;
  const schemaName = `tenant_${companyId}`;

  // Create tenant schema
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  // Create tables in tenant schema
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      company_id UUID NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS "${schemaName}".roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS "${schemaName}".permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS "${schemaName}".model_has_roles (
      role_id UUID NOT NULL REFERENCES "${schemaName}".roles(id) ON DELETE CASCADE,
      model_id UUID NOT NULL,
      model_type VARCHAR(100) NOT NULL DEFAULT 'User',
      PRIMARY KEY (role_id, model_id, model_type)
    );

    CREATE TABLE IF NOT EXISTS "${schemaName}".role_has_permissions (
      role_id UUID NOT NULL REFERENCES "${schemaName}".roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES "${schemaName}".permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  // Seed admin role and permissions
  await dataSource.query(`
    INSERT INTO "${schemaName}".roles (name, guard_name) VALUES ('admin', 'web');

    INSERT INTO "${schemaName}".permissions (name, guard_name) VALUES
      ('view_catalogs', 'web'),
      ('generate_material', 'web');

    INSERT INTO "${schemaName}".role_has_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM "${schemaName}".roles r, "${schemaName}".permissions p
      WHERE r.name = 'admin';
  `);

  // Create test user
  const passwordHash = await bcrypt.hash(data.userPassword, 10);
  const userResult = await dataSource.query(
    `INSERT INTO "${schemaName}".users (email, password_hash, name, company_id, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [data.userEmail, passwordHash, data.userName, companyId],
  );

  // Assign admin role to user
  await dataSource.query(
    `INSERT INTO "${schemaName}".model_has_roles (role_id, model_id, model_type)
     SELECT r.id, $1, 'User' FROM "${schemaName}".roles r WHERE r.name = 'admin'`,
    [userResult[0].id],
  );

  return { companyId, schemaName };
}

/**
 * Cleans up test data: drops tenant schemas and removes companies.
 */
export async function cleanupTestData(
  dataSource: DataSource,
  companyIds: string[],
): Promise<void> {
  for (const id of companyIds) {
    await dataSource.query(`DROP SCHEMA IF EXISTS "tenant_${id}" CASCADE`);
  }
  if (companyIds.length > 0) {
    await dataSource.query(`DELETE FROM companies WHERE id = ANY($1)`, [
      companyIds,
    ]);
  }
}
