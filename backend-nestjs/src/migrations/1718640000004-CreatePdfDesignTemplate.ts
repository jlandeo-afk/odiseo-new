import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePdfDesignTemplate1718640000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pdf_design_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7),
        font_family VARCHAR(100),
        header_text TEXT,
        footer_text TEXT,
        show_cover BOOLEAN NOT NULL DEFAULT TRUE,
        background_url TEXT,
        show_pagination BOOLEAN NOT NULL DEFAULT TRUE,
        show_frame BOOLEAN NOT NULL DEFAULT TRUE,
        contact_info TEXT,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_default
      ON pdf_design_templates (tenant_id)
      WHERE is_default = true;
    `);

    await queryRunner.query(`
      ALTER TABLE material_requests
      ADD COLUMN IF NOT EXISTS design_template_id UUID
      REFERENCES pdf_design_templates(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE material_requests DROP COLUMN IF EXISTS design_template_id;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tenant_default;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pdf_design_templates;`);
  }
}
