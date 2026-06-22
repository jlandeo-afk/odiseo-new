import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { MaterialReviewQuestion } from '../materials/entities/material-review-question.entity';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(
    @InjectRepository(Question)
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
    cycleId?: string // En un entorno real se usaría para cruzar con el material_request y filtrar por ciclo
  ): Promise<Question[]> {
    this.logger.debug(`Buscando ${limit} preguntas para el subtema ${subtopicId}`);

    // Query Base: Seleccionar preguntas del subtema
    const qb = this.questionRepository.createQueryBuilder('q')
      .where('q.subtopic_id = :subtopicId', { subtopicId });

    // TODO: La subquery debería idealmente enlazar "material_review_questions" -> "material_requests" -> "cycles"
    // Para simplificar esta implementación base, filtraremos excluyendo simplemente las preguntas ya presentes
    // en material_review_questions para este tenantId en peticiones activas.
    // Como material_review_questions no tiene tenant_id directamente, lo asumo a través de subconsultas si es necesario,
    // o para propósitos demostrativos excluimos todos los IDs globalmente.
    
    // Aquí usamos una exclusión simple simulando el Filtro de Historial
    const usedQuestionIds = await this.reviewRepository.createQueryBuilder('mrq')
      .select('mrq.question_id')
      .where('mrq.question_id IS NOT NULL')
      .getRawMany();

    const usedIdsList = usedQuestionIds.map(row => row.question_id);

    // Prioridad 1: Preguntas NO usadas
    if (usedIdsList.length > 0) {
      qb.andWhere('q.id NOT IN (:...usedIdsList)', { usedIdsList });
    }

    qb.orderBy('RANDOM()').take(limit);

    let questions = await qb.getMany();

    // Prioridad 2 (Fallback): Agotamiento del Banco
    if (questions.length < limit) {
      this.logger.warn(`Banco agotado para subtema ${subtopicId}. Faltan ${limit - questions.length} preguntas. Relajando regla de no-repetición.`);
      
      const missingCount = limit - questions.length;
      const fallbackQb = this.questionRepository.createQueryBuilder('q')
        .where('q.subtopic_id = :subtopicId', { subtopicId });
      
      if (questions.length > 0) {
        const foundIds = questions.map(q => q.id);
        fallbackQb.andWhere('q.id NOT IN (:...foundIds)', { foundIds });
      }

      fallbackQb.orderBy('RANDOM()').take(missingCount);
      const fallbackQuestions = await fallbackQb.getMany();
      
      questions = [...questions, ...fallbackQuestions];
    }

    return questions;
  }
}
