import { Course } from '../entities/course.entity';
import { Topic } from '../entities/topic.entity';

export const ICatalogRepository = Symbol('ICatalogRepository');

export interface ICatalogRepository {
  /**
   * Obtiene la jerarquía completa de catálogos (Cursos > Temas > Subtemas)
   * que estén activos para la UI.
   */
  getActiveHierarchy(): Promise<Course[]>;

  /**
   * Obtiene la jerarquía completa sin importar su estado, para administración local.
   */
  getFullHierarchy(): Promise<Course[]>;

  /**
   * Actualiza la visibilidad y/o el alias local de un Tema.
   */
  updateTopicLocalData(topicId: string, data: { localAlias?: string | null; isActive?: boolean }): Promise<void>;

  /**
   * Método reservado para el Consumer SQS (Raw SQL).
   * Inserta o actualiza masivamente un array de temas usando ON CONFLICT.
   */
  upsertTopicsFromCore(topics: Array<{ id: string; coreName: string; courseId: string }>): Promise<void>;
}
