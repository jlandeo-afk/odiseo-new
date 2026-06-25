import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MaterialRequest } from './material-request.entity';

export enum CourseMaterialStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_WARNINGS = 'COMPLETED_WITH_WARNINGS',
  FAILED = 'FAILED',
}

@Entity('material_request_courses')
export class MaterialRequestCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_request_id', type: 'uuid' })
  materialRequestId: string;

  @Column({ name: 'course_id' })
  courseId: string;

  @Column({ type: 'enum', enum: CourseMaterialStatus, default: CourseMaterialStatus.PENDING })
  status: CourseMaterialStatus;

  @Column({ name: 'download_url', nullable: true })
  downloadUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  warnings: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => MaterialRequest, (request) => request.courses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_request_id' })
  materialRequest: MaterialRequest;
}
