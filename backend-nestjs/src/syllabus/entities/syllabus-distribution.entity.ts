import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Check } from 'typeorm';
import { Syllabus } from './syllabus.entity';

@Entity('syllabus_distribution')
@Unique('UQ_syllabus_week_topic_subtopic', ['syllabusId', 'weekNumber', 'topicId', 'subtopicId'])
@Check(`"requested_quantity" > 0`)
@Check(`"requested_quantity" <= 100`)
export class SyllabusDistribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'syllabus_id', type: 'uuid' })
  syllabusId: string;

  @ManyToOne(() => Syllabus, syllabus => syllabus.distributions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'syllabus_id' })
  syllabus: Syllabus;

  @Column({ name: 'week_number', type: 'int' })
  weekNumber: number;

  @Column({ name: 'topic_id', type: 'uuid' })
  topicId: string;

  @Column({ name: 'subtopic_id', type: 'uuid' })
  subtopicId: string;

  @Column({ name: 'requested_quantity', type: 'int' })
  requestedQuantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
