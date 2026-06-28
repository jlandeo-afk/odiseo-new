import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPdfDesignTemplateColumns1718640000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old columns if they exist
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates 
      DROP COLUMN IF EXISTS primary_color,
      DROP COLUMN IF EXISTS font_family,
      DROP COLUMN IF EXISTS show_cover,
      DROP COLUMN IF EXISTS background_url,
      DROP COLUMN IF EXISTS show_pagination,
      DROP COLUMN IF EXISTS show_frame,
      DROP COLUMN IF EXISTS contact_info;
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
      ADD COLUMN IF NOT EXISTS watermark_image_url TEXT,
      ADD COLUMN IF NOT EXISTS primary_title_color VARCHAR(20) NOT NULL DEFAULT '2, 113, 184',
      ADD COLUMN IF NOT EXISTS secondary_title_color VARCHAR(20) NOT NULL DEFAULT '2, 113, 184',
      ADD COLUMN IF NOT EXISTS background_highlight_color VARCHAR(20) NOT NULL DEFAULT '214, 238, 253';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      DROP COLUMN IF EXISTS banner_image_url,
      DROP COLUMN IF EXISTS watermark_image_url,
      DROP COLUMN IF EXISTS primary_title_color,
      DROP COLUMN IF EXISTS secondary_title_color,
      DROP COLUMN IF EXISTS background_highlight_color;
    `);

    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE pdf_design_templates
      ADD COLUMN primary_color VARCHAR(7),
      ADD COLUMN font_family VARCHAR(100),
      ADD COLUMN show_cover BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN background_url TEXT,
      ADD COLUMN show_pagination BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN show_frame BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN contact_info TEXT;
    `);
  }
}
