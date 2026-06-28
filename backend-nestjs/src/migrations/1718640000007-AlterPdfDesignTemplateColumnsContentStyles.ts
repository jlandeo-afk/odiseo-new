import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPdfDesignTemplateColumnsContentStyles1718640000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pdf_design_templates" ADD "content_font_size" character varying(20) DEFAULT '11pt'`
    );
    await queryRunner.query(
      `ALTER TABLE "pdf_design_templates" ADD "content_text_color" character varying(20) DEFAULT '#000000'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pdf_design_templates" DROP COLUMN "content_text_color"`
    );
    await queryRunner.query(
      `ALTER TABLE "pdf_design_templates" DROP COLUMN "content_font_size"`
    );
  }
}
