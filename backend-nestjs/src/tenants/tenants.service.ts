import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Company } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Find a company by subdomain. Returns null if not found.
   */
  async findBySubdomain(subdomain: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { subdomain, isActive: true },
    });
  }

  /**
   * Creates a new company and provisions its tenant schema.
   * 1. Insert into public.companies
   * 2. CREATE SCHEMA tenant_<company_id>
   * 3. Run base migrations for tenant tables
   * 4. Seed V1 admin role with all permissions
   */
  async createCompany(data: {
    subdomain: string;
    commercialName: string;
    logoUrl?: string;
    primaryColor?: string;
  }): Promise<Company> {
    // Check for duplicate subdomain
    const existing = await this.companyRepository.findOne({
      where: { subdomain: data.subdomain },
    });
    if (existing) {
      throw new ConflictException(
        `The subdomain '${data.subdomain}' is already registered`,
      );
    }

    // Create company record
    const company = this.companyRepository.create({
      subdomain: data.subdomain,
      commercialName: data.commercialName,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor || '#6366f1',
    });
    const saved = await this.companyRepository.save(company);

    // Provision tenant schema
    const schemaName = `tenant_${saved.id}`;
    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Create tenant tables inside the new schema
    await this.dataSource.query(`
      SET LOCAL search_path TO "${schemaName}";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        company_id UUID NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS model_has_roles (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        model_id UUID NOT NULL,
        model_type VARCHAR(100) NOT NULL DEFAULT 'User',
        PRIMARY KEY (role_id, model_id, model_type)
      );

      CREATE TABLE IF NOT EXISTS role_has_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    // Seed V1 admin role with all permissions
    await this.dataSource.query(`
      SET LOCAL search_path TO "${schemaName}";

      INSERT INTO roles (name, guard_name) VALUES ('admin', 'web')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO permissions (name, guard_name) VALUES
        ('view_catalogs', 'web'),
        ('edit_catalogs', 'web'),
        ('view_materials', 'web'),
        ('generate_material', 'web'),
        ('review_material', 'web'),
        ('view_syllabus', 'web'),
        ('edit_syllabus', 'web'),
        ('manage_academic_time', 'web')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO role_has_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING;
    `);

    return saved;
  }
}
