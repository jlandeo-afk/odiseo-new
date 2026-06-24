import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { Alternative } from './entities/alternative.entity';
import { QuestionBankService } from './question-bank.service';
import { MaterialReviewQuestion } from '../materials/entities/material-review-question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Alternative], 'questionsConnection'),
    TypeOrmModule.forFeature([MaterialReviewQuestion]),
  ],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
