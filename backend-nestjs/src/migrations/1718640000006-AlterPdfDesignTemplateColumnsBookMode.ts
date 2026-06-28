import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPdfDesignTemplateColumnsBookMode1718640000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates 
      DROP COLUMN IF EXISTS logo_url,
      DROP COLUMN IF EXISTS company_info,
      DROP COLUMN IF EXISTS margin_left,
      DROP COLUMN IF EXISTS margin_right,
      DROP COLUMN IF EXISTS header_text,
      DROP COLUMN IF EXISTS footer_text;
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      ADD COLUMN IF NOT EXISTS margin_inside VARCHAR(20) NOT NULL DEFAULT '1cm',
      ADD COLUMN IF NOT EXISTS margin_outside VARCHAR(20) NOT NULL DEFAULT '1cm',
      ADD COLUMN IF NOT EXISTS is_book_mode BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS header_config JSONB,
      ADD COLUMN IF NOT EXISTS footer_config JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      DROP COLUMN IF EXISTS margin_inside,
      DROP COLUMN IF EXISTS margin_outside,
      DROP COLUMN IF EXISTS is_book_mode,
      DROP COLUMN IF EXISTS header_config,
      DROP COLUMN IF EXISTS footer_config;
    `);

    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      ADD COLUMN logo_url TEXT,
      ADD COLUMN company_info TEXT,
      ADD COLUMN margin_left VARCHAR(20) NOT NULL DEFAULT '1cm',
      ADD COLUMN margin_right VARCHAR(20) NOT NULL DEFAULT '1cm',
      ADD COLUMN header_text TEXT,
      ADD COLUMN footer_text TEXT;
    `);
  }
}
