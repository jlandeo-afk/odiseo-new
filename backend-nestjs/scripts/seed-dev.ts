import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL database...');

    // 1. Check if the 'colegio' company already exists
    const checkCompanyRes = await client.query(
      `SELECT * FROM public.companies WHERE subdomain = $1`,
      ['colegio']
    );

    let companyId: string;
    if (checkCompanyRes.rows.length > 0) {
      companyId = checkCompanyRes.rows[0].id;
      console.log(`ℹ️ Company 'colegio' already exists with ID: ${companyId}`);
    } else {
      // Insert new company
      const insertCompanyRes = await client.query(
        `INSERT INTO public.companies (subdomain, commercial_name, primary_color, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        ['colegio', 'Colegio Odiseo', '#6366f1']
      );
      companyId = insertCompanyRes.rows[0].id;
      console.log(`✅ Created company 'colegio' with ID: ${companyId}`);
    }

    const schemaName = `tenant_${companyId}`;

    // 2. Create tenant schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`✅ Created schema: ${schemaName}`);

    // 3. Create tenant tables
    await client.query(`
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
    console.log(`✅ Tenant tables provisioned successfully.`);

    // 4. Seed admin role & permissions
    await client.query(`
      INSERT INTO "${schemaName}".roles (name, guard_name) 
      VALUES ('admin', 'web')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO "${schemaName}".permissions (name, guard_name) VALUES
        ('view_catalogs', 'web'),
        ('edit_catalogs', 'web'),
        ('view_materials', 'web'),
        ('generate_material', 'web'),
        ('review_material', 'web'),
        ('view_syllabus', 'web'),
        ('edit_syllabus', 'web'),
        ('manage_academic_time', 'web')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO "${schemaName}".role_has_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM "${schemaName}".roles r, "${schemaName}".permissions p
        WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING;
    `);
    console.log(`✅ Admin role and permissions seeded.`);

    // 5. Seed default admin user
    const email = 'admin@colegio.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const checkUserRes = await client.query(
      `SELECT * FROM "${schemaName}".users WHERE email = $1`,
      [email]
    );

    let userId: string;
    if (checkUserRes.rows.length > 0) {
      userId = checkUserRes.rows[0].id;
      console.log(`ℹ️ User '${email}' already exists.`);
    } else {
      const insertUserRes = await client.query(
        `INSERT INTO "${schemaName}".users (email, password_hash, name, company_id, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [email, passwordHash, 'Administrador Colegio', companyId]
      );
      userId = insertUserRes.rows[0].id;
      console.log(`✅ Created user '${email}'`);
    }

    // Assign admin role to user
    await client.query(
      `INSERT INTO "${schemaName}".model_has_roles (role_id, model_id, model_type)
       SELECT r.id, $1, 'User' FROM "${schemaName}".roles r WHERE r.name = 'admin'
       ON CONFLICT DO NOTHING`,
      [userId]
    );
    console.log(`✅ Assigned 'admin' role to user '${email}'.`);

    console.log('\n🎉 DEVELOPMENT SEED COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('Use the following details to log in to the system:');
    console.log('----------------------------------------------------');
    console.log(`URL:        http://colegio.localhost:3001/login`);
    console.log(`Email:      ${email}`);
    console.log(`Password:   ${password}`);
    console.log(`Subdomain:  colegio`);
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
  }
}

seed();
