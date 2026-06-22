import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
}

@Entity('questions')
export class Question {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'topic_id', type: 'uuid' })
  topicId: string;

  @Column({ name: 'subtopic_id', type: 'uuid' })
  subtopicId: string;

  @Column({ name: 'difficulty_level', type: 'varchar', length: 50, default: 'MEDIUM' })
  difficultyLevel: string;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent: string;

  @Column({ type: 'jsonb' })
  options: QuestionOption[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
