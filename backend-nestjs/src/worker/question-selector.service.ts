import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';
import { QuestionBankService } from '../question-bank/question-bank.service';
import { MaterialRequestCourse } from '../materials/entities/material-request-course.entity';
import { MaterialReviewQuestion, ReviewQuestionStatus } from '../materials/entities/material-review-question.entity';
import { Question } from '../question-bank/entities/question.entity';
import { Topic } from '../catalogs/entities/topic.entity';
import { TenantService } from '../database/tenant.service';

@Injectable()
export class QuestionSelectorService {
  private readonly logger = new Logger(QuestionSelectorService.name);

  constructor(
    private readonly tenantService: TenantService,
    @InjectEntityManager('questionsConnection') private readonly questionsEntityManager: EntityManager,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async selectQuestions(job: GenerateMaterialJobDto): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      this.logger.log(`Selecting questions for job ${job.job_id}...`);

      // 1. Find the parent request of this course request to check if it was curated
      const courseReq = await manager.findOne(MaterialRequestCourse, {
        where: { id: job.job_id },
      });

      if (courseReq) {
        // 2. Fetch all review questions for this parent request that belong to this course and are approved
        const reviewQuestions = await manager.createQueryBuilder(MaterialReviewQuestion, 'mrq')
          .innerJoin(Topic, 't', 't.id = mrq.topic_id')
          .where('mrq.material_request_id = :materialRequestId', { materialRequestId: courseReq.materialRequestId })
          .andWhere('t.course_id = :courseId', { courseId: job.course_id })
          .andWhere('mrq.status IN (:...statuses)', { statuses: [ReviewQuestionStatus.FOUND, ReviewQuestionStatus.REPLACED] })
          .orderBy('mrq.position', 'ASC')
          .getMany();

        if (reviewQuestions.length > 0) {
          this.logger.log(`Found ${reviewQuestions.length} curated questions for request ${courseReq.materialRequestId}`);
          
          // 3. Load the actual questions from the database using the curated questionIds
          const questionIds = reviewQuestions
            .map((q) => q.questionId)
            .filter((id): id is string => !!id);

          if (questionIds.length > 0) {
            const dbQuestions = await this.questionsEntityManager.find(Question, {
              where: { id: In(questionIds) },
              relations: ['alternatives'],
            });

            const questionMap = new Map(dbQuestions.map((q) => [q.id, q]));
            const selectedQuestions: any[] = [];

            for (const mrq of reviewQuestions) {
              if (!mrq.questionId) continue;
              const q = questionMap.get(mrq.questionId);
              if (q) {
                selectedQuestions.push({
                  topic_id: q.topicId,
                  subtopic_id: q.subtopicId,
                  question_text: q.htmlContent,
                  options: q.options,
                });
              }
            }

            return selectedQuestions;
          }
        }
      }

      // 3. Fallback: If no curation questions were found, choose randomly
      this.logger.log(`No curated questions found for job ${job.job_id}. Falling back to random selection.`);
      let selectedQuestions: any[] = [];
      
      for (const dist of job.syllabus_distribution) {
        const dbQuestions = await this.questionBankService.getRandomQuestions(
          dist.subtopic_id,
          dist.weight,
          job.tenant.tenant_id
        );

        const formatted = dbQuestions.map(q => ({
          topic_id: q.topicId,
          subtopic_id: q.subtopicId,
          question_text: q.htmlContent,
          options: q.options
        }));

        selectedQuestions = selectedQuestions.concat(formatted);
      }
      
      return selectedQuestions;
    });
  }
}
