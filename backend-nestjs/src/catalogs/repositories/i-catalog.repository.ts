import { Course } from '../entities/course.entity';

export const ICatalogRepository = Symbol('ICatalogRepository');

export interface ICatalogRepository {
  /**
   * Obtiene la jerarquía completa de catálogos (Cursos > Temas > Subtemas)
   * interceptada con la visibilidad del tenant actual.
   */
  getActiveHierarchy(): Promise<Course[]>;

  /**
   * Obtiene la lista de cursos paginada o completa (son pocos)
   */
  getCourses(search?: string): Promise<Course[]>;

  /**
   * Obtiene los temas y subtemas de un curso específico,
   * interceptado con la visibilidad del tenant actual.
   */
  getCourseTopics(courseId: string, search?: string): Promise<any[]>;

  /**
   * Actualiza la visibilidad de un Tema insertando o actualizando
   * el registro en tenant_topic_visibility.
   */
  updateTopicLocalVisibility(topicId: string, isActive: boolean): Promise<void>;

  /**
   * Realiza un bulk upsert de courses, topics y subtopics en el esquema public.
   */
  upsertCatalogs(payload: any): Promise<void>;
}
