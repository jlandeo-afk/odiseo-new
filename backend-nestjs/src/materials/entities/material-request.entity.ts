import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum MaterialRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('material_requests')
export class MaterialRequest {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ name: 'material_type', type: 'varchar', length: 50 })
  materialType: string;

  @Column({ name: 'course_id', type: 'varchar', length: 36 })
  courseId: string;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.PENDING,
  })
  status: MaterialRequestStatus;

  @Column({ name: 'download_url', type: 'text', nullable: true })
  downloadUrl: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
