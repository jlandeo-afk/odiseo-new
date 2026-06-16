import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cycle } from './cycle.entity';

@Entity('cycle_weeks')
export class CycleWeek {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'week_number' })
  weekNumber: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  /**
   * REGLA INMUTABLE:
   * Las semanas marcadas como inactivas (vacaciones/feriados) NO deben ser eliminadas con DELETE.
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'cycle_id' })
  cycleId: string;

  @ManyToOne(() => Cycle, cycle => cycle.weeks)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
