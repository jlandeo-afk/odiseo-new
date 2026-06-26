import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, VersionColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MaterialRequestCourse } from './material-request-course.entity';
import { MaterialReviewQuestion } from './material-review-question.entity';
import { PdfDesignTemplate } from './pdf-design-template.entity';

export enum MaterialRequestStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  PROCESSING = 'PROCESSING',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_WARNINGS = 'COMPLETED_WITH_WARNINGS',
  FAILED = 'FAILED',
}

@Entity('material_requests')
export class MaterialRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ name: 'week_number', type: 'int' })
  weekNumber: number;

  @Column({ type: 'enum', enum: MaterialRequestStatus, default: MaterialRequestStatus.PENDING })
  status: MaterialRequestStatus;

  @Column({ name: 'requires_review', default: false })
  requiresReview: boolean;

  @Column({ name: 'design_template_id', nullable: true, type: 'uuid' })
  designTemplateId: string | null;

  @ManyToOne(() => PdfDesignTemplate, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'design_template_id' })
  designTemplate: PdfDesignTemplate | null;

  @Column({ name: 'merged_download_url', nullable: true, type: 'text' })
  mergedDownloadUrl: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => MaterialRequestCourse, (course) => course.materialRequest, { cascade: true })
  courses: MaterialRequestCourse[];

  @OneToMany(() => MaterialReviewQuestion, (question) => question.materialRequest, { cascade: true })
  reviewQuestions: MaterialReviewQuestion[];
}
