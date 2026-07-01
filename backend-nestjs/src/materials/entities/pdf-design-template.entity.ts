import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pdf_design_templates')
@Index('idx_tenant_default', ['tenantId'], {
  unique: true,
  where: '"is_default" = true',
})
export class PdfDesignTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  tenantId: string | null;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'banner_image_url', nullable: true, type: 'text' })
  bannerImageUrl: string | null;

  @Column({ name: 'watermark_image_url', nullable: true, type: 'text' })
  watermarkImageUrl: string | null;

  @Column({ name: 'cover_image_url', nullable: true, type: 'text' })
  coverImageUrl: string | null;

  @Column({ name: 'show_cover', default: false })
  showCover: boolean;

  @Column({
    name: 'primary_title_color',
    type: 'varchar',
    length: 20,
    default: '2, 113, 184',
  })
  primaryTitleColor: string;

  @Column({
    name: 'secondary_title_color',
    type: 'varchar',
    length: 20,
    default: '2, 113, 184',
  })
  secondaryTitleColor: string;

  @Column({
    name: 'background_highlight_color',
    type: 'varchar',
    length: 20,
    default: '214, 238, 253',
  })
  backgroundHighlightColor: string;

  @Column({ name: 'margin_top', type: 'varchar', length: 20, default: '3cm' })
  marginTop: string;

  @Column({
    name: 'margin_bottom',
    type: 'varchar',
    length: 20,
    default: '1.5cm',
  })
  marginBottom: string;

  @Column({
    name: 'margin_inside',
    type: 'varchar',
    length: 20,
    default: '1cm',
  })
  marginInside: string;

  @Column({
    name: 'margin_outside',
    type: 'varchar',
    length: 20,
    default: '1cm',
  })
  marginOutside: string;

  @Column({ name: 'is_book_mode', default: false })
  isBookMode: boolean;

  @Column({
    name: 'font_family',
    type: 'varchar',
    length: 50,
    default: 'Arial',
  })
  fontFamily: string;

  @Column({
    name: 'border_radius',
    type: 'varchar',
    length: 20,
    default: '4px',
  })
  borderRadius: string;

  @Column({
    name: 'content_font_size',
    type: 'varchar',
    length: 20,
    default: '11pt',
  })
  contentFontSize: string;

  @Column({
    name: 'content_text_color',
    type: 'varchar',
    length: 20,
    default: '#000000',
  })
  contentTextColor: string;

  @Column({ name: 'blocks_config', type: 'jsonb', nullable: true })
  blocksConfig: any | null;

  @Column({ name: 'header_config', type: 'jsonb', nullable: true })
  headerConfig: any | null;

  @Column({ name: 'footer_config', type: 'jsonb', nullable: true })
  footerConfig: any | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
