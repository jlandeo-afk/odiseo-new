import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaterialRequest } from './material-request.entity';
import { MaterialRequestStatus } from './material-status.enum';

@Entity('materials')
export class Material {
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

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.PENDING,
  })
  status: MaterialRequestStatus;

  @Column({ name: 'latest_request_id', nullable: true, type: 'uuid' })
  latestRequestId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MaterialRequest, (request) => request.material, {
    cascade: true,
  })
  requests: MaterialRequest[];

  @ManyToOne(() => MaterialRequest, { nullable: true })
  @JoinColumn({ name: 'latest_request_id' })
  latestRequest: MaterialRequest | null;

  cycle?: any;
}
