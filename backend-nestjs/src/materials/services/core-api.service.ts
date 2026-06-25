import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

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

  // Mocked extraction since Core API isn't fully implemented in this phase
  async fetchQuestions(
    topicId: string,
    subtopicId: string,
    quantity: number,
    excludeIds: string[],
    retries = 3
  ): Promise<ExtractedQuestion[]> {
    this.logger.log(`Fetching ${quantity} questions for topic ${topicId}, subtopic ${subtopicId}. Excluded: ${excludeIds.length}`);
    
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const questions: ExtractedQuestion[] = [];
      // Simular que a veces no hay suficientes preguntas (pool exhausted)
      const available = Math.random() > 0.8 ? quantity - 1 : quantity;

      for (let i = 0; i < available; i++) {
        questions.push({
          id: uuidv4(),
          topicId,
          subtopicId,
          content: `<p>Pregunta simulada de prueba para el subtema ${subtopicId} (${i+1}/${quantity})</p>`,
          options: ['A) 10', 'B) 20', 'C) 30', 'D) 40'],
        });
      }

      return questions;
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(`Failed to fetch questions. Retrying... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchQuestions(topicId, subtopicId, quantity, excludeIds, retries - 1);
      }
      throw new Error(`Failed to fetch questions after retries: ${error.message}`);
    }
  }
}
