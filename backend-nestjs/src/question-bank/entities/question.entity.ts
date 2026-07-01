import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Alternative } from './alternative.entity';

export interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
}

@Entity({ schema: 'odiseo', name: 'question' })
export class Question {
  @PrimaryColumn('bigint')
  id: string;

  @Column({ name: 'topic_id', type: 'bigint' })
  topicId: string;

  @Column({ name: 'subtopic_id', type: 'bigint' })
  subtopicId: string;

  @Column({ name: 'answer_id', type: 'bigint', nullable: true })
  answerId: string;

  @Column({ name: 'level_id', type: 'smallint', nullable: true })
  levelId: number;

  @Column({ name: 'description', type: 'text' })
  htmlContent: string;

  @OneToMany(() => Alternative, (alternative) => alternative.question)
  alternatives: Alternative[];

  get options(): QuestionOption[] {
    if (!this.alternatives) return [];

    const sorted = [...this.alternatives].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );

    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    return sorted.map((alt, index) => ({
      label: labels[index] || String.fromCharCode(65 + index),
      text: alt.text,
      is_correct: String(alt.id) === String(this.answerId),
    }));
  }
}
