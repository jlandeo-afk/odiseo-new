import { Injectable, Logger } from '@nestjs/common';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';
import { QuestionBankService } from '../question-bank/question-bank.service';

@Injectable()
export class QuestionSelectorService {
  private readonly logger = new Logger(QuestionSelectorService.name);

  constructor(private readonly questionBankService: QuestionBankService) {}

  async selectQuestions(job: GenerateMaterialJobDto): Promise<any[]> {
    this.logger.log(`Selecting questions for job ${job.job_id}...`);
    
    let selectedQuestions: any[] = [];
    
    for (const dist of job.syllabus_distribution) {
      const dbQuestions = await this.questionBankService.getRandomQuestions(
        dist.subtopic_id,
        dist.weight,
        job.tenant.tenant_id
      );

      // Map the DB questions to the format needed by the PDF generator
      const formatted = dbQuestions.map(q => ({
        topic_id: q.topicId,
        subtopic_id: q.subtopicId,
        question_text: q.htmlContent,
        options: q.options
      }));

      selectedQuestions = selectedQuestions.concat(formatted);
    }
    
    return selectedQuestions;
  }
}
