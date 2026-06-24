import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from './question.entity';

@Entity({ schema: 'odiseo', name: 'alternative' })
export class Alternative {
  @PrimaryColumn('bigint')
  id: string;

  @Column({ name: 'description', type: 'text' })
  text: string;

  @Column({ name: 'question_id', type: 'bigint' })
  questionId: string;

  @ManyToOne(() => Question, (question) => question.alternatives)
  @JoinColumn({ name: 'question_id' })
  question: Question;
}
