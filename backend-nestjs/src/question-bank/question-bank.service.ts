import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Question } from './entities/question.entity';
import { MaterialReviewQuestion } from '../materials/entities/material-review-question.entity';
import { convertUuidToIntegerId } from '../database/uuid-converter';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(
    @InjectRepository(Question, 'questionsConnection')
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(MaterialReviewQuestion)
    private readonly reviewRepository: Repository<MaterialReviewQuestion>,
  ) {}

  /**
   * Extrae preguntas aleatorias excluyendo las ya usadas en el ciclo actual.
   * Implementa un Fallback en caso de que el banco se agote.
   */
  async getRandomQuestions(
    subtopicId: string,
    limit: number,
    tenantId: string,
    cycleId?: string, // En un entorno real se usaría para cruzar con el material_request y filtrar por ciclo
  ): Promise<Question[]> {
    this.logger.debug(
      `Buscando ${limit} preguntas para el subtema ${subtopicId}`,
    );

    const numericSubtopicId = convertUuidToIntegerId(subtopicId);

    // Get list of already used question IDs
    const usedQuestionIds = await this.reviewRepository
      .createQueryBuilder('mrq')
      .select('mrq.question_id')
      .where('mrq.question_id IS NOT NULL')
      .getRawMany();

    const usedIdsList = usedQuestionIds.map((row) => row.question_id);

    // Priority 1: Get random IDs of unused questions
    const unusedIdsQb = this.questionRepository
      .createQueryBuilder('q')
      .select('q.id', 'id')
      .where(
        'q.id IN (SELECT question_id FROM odiseo.question_subtopic WHERE subtopic_id = :subtopicId AND fl_status = true)',
        { subtopicId: numericSubtopicId },
      )
      .andWhere('q.fl_status = true');

    if (usedIdsList.length > 0) {
      unusedIdsQb.andWhere('q.id NOT IN (:...usedIdsList)', { usedIdsList });
    }

    const unusedIdRows = await unusedIdsQb
      .orderBy('RANDOM()')
      .limit(limit)
      .getRawMany();
    let selectedIds = unusedIdRows.map((row) => row.id);

    // Priority 2 (Fallback): Agotamiento del Banco
    if (selectedIds.length < limit) {
      const missingCount = limit - selectedIds.length;
      this.logger.warn(
        `Banco agotado para subtema ${subtopicId}. Faltan ${missingCount} preguntas. Relajando regla de no-repetición.`,
      );

      const fallbackIdsQb = this.questionRepository
        .createQueryBuilder('q')
        .select('q.id', 'id')
        .where(
          'q.id IN (SELECT question_id FROM odiseo.question_subtopic WHERE subtopic_id = :subtopicId AND fl_status = true)',
          { subtopicId: numericSubtopicId },
        )
        .andWhere('q.fl_status = true');

      if (selectedIds.length > 0) {
        fallbackIdsQb.andWhere('q.id NOT IN (:...selectedIds)', {
          selectedIds,
        });
      }

      const fallbackIdRows = await fallbackIdsQb
        .orderBy('RANDOM()')
        .limit(missingCount)
        .getRawMany();
      selectedIds = [...selectedIds, ...fallbackIdRows.map((row) => row.id)];
    }

    if (selectedIds.length === 0) {
      return [];
    }

    // Retrieve full question entities with alternatives for selected IDs
    return this.questionRepository.find({
      where: { id: In(selectedIds) },
      relations: ['alternatives'],
    });
  }
}
