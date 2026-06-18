import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cycle } from './cycle.entity';

@Entity({ name: 'cycle_weeks' })
export class CycleWeek {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ name: 'week_number', type: 'integer' })
  weekNumber: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date | string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date | string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string;

  @ManyToOne(() => Cycle, (cycle) => cycle.weeks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;
}
