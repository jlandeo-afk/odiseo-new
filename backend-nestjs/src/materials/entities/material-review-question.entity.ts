import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaterialRequest } from './material-request.entity';

export enum ReviewQuestionStatus {
  FOUND = 'FOUND',
  EMPTY = 'EMPTY',
  REPLACED = 'REPLACED',
  REMOVED = 'REMOVED',
}

@Entity('material_review_questions')
export class MaterialReviewQuestion {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'material_request_id', type: 'uuid' })
  materialRequestId: string;

  @Column({ name: 'question_id', type: 'varchar', length: 36, nullable: true })
  questionId: string | null;

  @Column({ name: 'topic_id', type: 'uuid' })
  topicId: string;

  @Column({ name: 'subtopic_id', type: 'uuid' })
  subtopicId: string;

  @Column({ type: 'integer' })
  position: number;

  @Column({
    type: 'enum',
    enum: ReviewQuestionStatus,
    default: ReviewQuestionStatus.FOUND,
  })
  status: ReviewQuestionStatus;

  @ManyToOne(
    () => MaterialRequest,
    (request) => request.questions,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'material_request_id' })
  materialRequest: MaterialRequest;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
