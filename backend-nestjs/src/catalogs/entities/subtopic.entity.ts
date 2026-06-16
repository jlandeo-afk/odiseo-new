import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Topic } from './topic.entity';

@Entity('subtopics')
export class Subtopic {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'core_name' })
  coreName: string;

  @Column({ name: 'local_alias', nullable: true })
  localAlias: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'topic_id' })
  topicId: string;

  @ManyToOne(() => Topic, topic => topic.subtopics)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
