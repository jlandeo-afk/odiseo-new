import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Topic } from './topic.entity';

@Entity('courses')
export class Course {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'core_name' })
  coreName: string;

  @Column({ name: 'local_alias', nullable: true })
  localAlias: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Topic, topic => topic.course)
  topics: Topic[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
