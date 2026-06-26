import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('pdf_design_templates')
@Index('idx_tenant_default', ['tenantId'], { unique: true, where: '"is_default" = true' })
export class PdfDesignTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'logo_url', nullable: true, type: 'text' })
  logoUrl: string | null;

  @Column({ name: 'primary_color', nullable: true, type: 'varchar', length: 7 })
  primaryColor: string | null;

  @Column({ name: 'font_family', nullable: true, type: 'varchar', length: 100 })
  fontFamily: string | null;

  @Column({ name: 'header_text', nullable: true, type: 'text' })
  headerText: string | null;

  @Column({ name: 'footer_text', nullable: true, type: 'text' })
  footerText: string | null;

  @Column({ name: 'show_cover', default: true })
  showCover: boolean;

  @Column({ name: 'background_url', nullable: true, type: 'text' })
  backgroundUrl: string | null;

  @Column({ name: 'show_pagination', default: true })
  showPagination: boolean;

  @Column({ name: 'show_frame', default: true })
  showFrame: boolean;

  @Column({ name: 'contact_info', nullable: true, type: 'text' })
  contactInfo: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
