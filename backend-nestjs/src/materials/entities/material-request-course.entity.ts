import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaterialRequest } from './material-request.entity';

export enum CourseRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_WARNINGS = 'COMPLETED_WITH_WARNINGS',
  FAILED = 'FAILED',
}

@Entity('material_request_courses')
export class MaterialRequestCourse {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'material_request_id', type: 'uuid' })
  materialRequestId: string;

  @Column({ name: 'course_id', type: 'varchar', length: 36 })
  courseId: string;

  @Column({
    type: 'enum',
    enum: CourseRequestStatus,
    default: CourseRequestStatus.PENDING,
  })
  status: CourseRequestStatus;

  @Column({ name: 'download_url', type: 'text', nullable: true })
  downloadUrl: string | null;

  @Column({ name: 'warnings', type: 'jsonb', nullable: true })
  warnings: any | null;

  @ManyToOne(
    () => MaterialRequest,
    (request) => request.courses,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'material_request_id' })
  materialRequest: MaterialRequest;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
