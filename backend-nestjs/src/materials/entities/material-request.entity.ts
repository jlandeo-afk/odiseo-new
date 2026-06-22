import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MaterialRequestCourse } from './material-request-course.entity';
import { MaterialReviewQuestion } from './material-review-question.entity';

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
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'week_number', type: 'integer' })
  weekNumber: number;

  @Column({ name: 'material_type', type: 'varchar', default: 'BALOTARIO' })
  materialType: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.PENDING,
  })
  status: MaterialRequestStatus;

  @Column({ name: 'requires_review', type: 'boolean', default: true })
  requiresReview: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(
    () => MaterialRequestCourse,
    (course) => course.materialRequest,
    { cascade: true }
  )
  courses: MaterialRequestCourse[];

  @OneToMany(
    () => MaterialReviewQuestion,
    (question) => question.materialRequest,
    { cascade: true }
  )
  questions: MaterialReviewQuestion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
