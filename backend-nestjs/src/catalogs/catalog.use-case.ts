import { Injectable, Inject } from '@nestjs/common';
import { ICatalogRepository } from './repositories/i-catalog.repository';

@Injectable()
export class CatalogUseCase {
  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  /**
   * Retorna los catálogos listos para ser mostrados en la UI.
   * Internamente hace el JOIN con la tabla de visibilidad.
   */
  async getHierarchy(): Promise<any[]> {
    const courses = await this.catalogRepository.getActiveHierarchy();

    // Mapeo simple a DTO. Subtopics hereda el isActive del Topic.
    return courses.map((course: any) => ({
      id: course.id,
      name: course.name,
      topics: (course.topics || []).map((topic: any) => ({
        id: topic.id,
        name: topic.name,
        isActive: topic.isActive,
        subtopics: (topic.subtopics || []).map((subtopic: any) => ({
          id: subtopic.id,
          name: subtopic.name,
        })),
      })),
    }));
  }

  /**
   * Actualiza la visibilidad de un Topic insertando en la tabla tenant
   */
  async updateTopicVisibility(
    topicId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.catalogRepository.updateTopicLocalVisibility(topicId, isActive);
  }
}
