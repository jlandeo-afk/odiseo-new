import { Injectable, Logger } from '@nestjs/common';
import { QuestionBankService } from '../../question-bank/question-bank.service';

export interface ExtractedQuestion {
  id: string;
  topicId: string;
  subtopicId: string;
  content: string;
  options: string[];
}

@Injectable()
export class CoreApiService {
  private readonly logger = new Logger(CoreApiService.name);

  constructor(private readonly questionBankService: QuestionBankService) {}

  async fetchQuestions(
    topicId: string,
    subtopicId: string,
    quantity: number,
    excludeIds: string[],
    tenantId?: string,
    cycleId?: string,
  ): Promise<ExtractedQuestion[]> {
    this.logger.log(
      `Fetching ${quantity} questions for topic ${topicId}, subtopic ${subtopicId}. Excluded: ${excludeIds.length}`,
    );

    const activeTenantId = tenantId || '7b89-11c2-d344';
    const dbQuestions = await this.questionBankService.getRandomQuestions(
      subtopicId,
      quantity,
      activeTenantId,
      cycleId,
    );

    const filteredQuestions = dbQuestions.filter(
      (q) => !excludeIds.includes(q.id),
    );

    return filteredQuestions.map((q) => ({
      id: q.id,
      topicId: q.topicId || topicId,
      subtopicId: q.subtopicId || subtopicId,
      content: q.htmlContent,
      options: q.options.map((opt) => `${opt.label}) ${opt.text}`),
    }));
  }
}
