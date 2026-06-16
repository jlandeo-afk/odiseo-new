import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICatalogRepository } from './repositories/i-catalog.repository';
import { Course } from './entities/course.entity';

@Injectable()
export class CatalogUseCase {
  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  /**
   * Retorna los catálogos listos para ser mostrados en la UI (activos).
   * Se procesa la jerarquía aplicando las reglas de alias.
   */
  async getUIHierarchy(): Promise<any[]> {
    const courses = await this.catalogRepository.getActiveHierarchy();
    
    // Mapeo simple a DTO (esto abstrae aún más a la UI de las entidades)
    return courses.map(course => ({
      id: course.id,
      name: course.localAlias || course.coreName,
      topics: course.topics?.filter(t => t.isActive).map(topic => ({
        id: topic.id,
        name: topic.localAlias || topic.coreName,
        subtopics: topic.subtopics?.filter(s => s.isActive).map(subtopic => ({
          id: subtopic.id,
          name: subtopic.localAlias || subtopic.coreName,
        })) || []
      })) || []
    }));
  }

  /**
   * Retorna toda la jerarquía para la vista de Administración de Tenant
   */
  async getAdminHierarchy(): Promise<Course[]> {
    return this.catalogRepository.getFullHierarchy();
  }

  /**
   * Actualiza propiedades locales de un Topic
   */
  async updateTopicLocalInfo(topicId: string, localAlias?: string, isActive?: boolean): Promise<void> {
    await this.catalogRepository.updateTopicLocalData(topicId, { localAlias, isActive });
  }
}
