import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from './course.entity';
import { Subtopic } from './subtopic.entity';

@Entity('topics')
export class Topic {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'core_name' })
  coreName: string;

  @Column({ name: 'local_alias', nullable: true })
  localAlias: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => Course, course => course.topics)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => Subtopic, subtopic => subtopic.topic)
  subtopics: Subtopic[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
