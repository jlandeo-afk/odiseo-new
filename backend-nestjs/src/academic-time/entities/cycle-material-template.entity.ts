import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cycle } from './cycle.entity';
import { CycleMaterialTemplateCourse } from './cycle-material-template-course.entity';

@Entity({ name: 'cycle_material_templates' })
export class CycleMaterialTemplate {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  scope: string; // 'CURRENT_WEEK' | 'ACCUMULATIVE'

  @Column({ name: 'accumulation_weeks', type: 'integer', nullable: true })
  accumulationWeeks: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Cycle, (cycle) => cycle.id)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;

  @OneToMany(() => CycleMaterialTemplateCourse, (course) => course.template, {
    cascade: true,
  })
  courses: CycleMaterialTemplateCourse[];
}
