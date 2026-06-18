import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ClsService } from 'nestjs-cls';
import { ICatalogRepository } from './repositories/i-catalog.repository';

@Injectable()
export class CatalogUseCase {
  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly cls: ClsService,
  ) {}

  /**
   * Retorna los catálogos listos para ser mostrados en la UI.
   * Internamente hace el JOIN con la tabla de visibilidad.
   */
  async getCourses(search?: string): Promise<any[]> {
    const tenantId = this.cls.get('tenantSchema') || 'public';
    const cacheKey = `catalogs:courses:${tenantId}:${search || 'all'}`;
    
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.catalogRepository.getCourses(search);
    const result = courses.map((course: any) => ({
      id: course.id,
      name: course.name,
      topicsCount: parseInt(course.topics_count, 10) || 0,
    }));

    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  async getCourseTopics(courseId: string, search?: string): Promise<any[]> {
    const tenantId = this.cls.get('tenantSchema') || 'public';
    const cacheKey = `catalogs:topics:${tenantId}:${courseId}:${search || 'all'}`;

    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const topics = await this.catalogRepository.getCourseTopics(courseId, search);
    
    await this.cacheManager.set(cacheKey, topics);
    return topics;
  }

  /**
   * Actualiza la visibilidad de un Topic insertando en la tabla tenant
   */
  async updateTopicVisibility(
    topicId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.catalogRepository.updateTopicLocalVisibility(topicId, isActive);
    
    // Invalidar caché del tenant
    const tenantId = this.cls.get('tenantSchema') || 'public';
    
    // In a real Redis setup with wildcard deletion, we would use a pattern.
    // Since we are using basic cache-manager, we might just clear everything
    // or specifically clear the topics cache for this tenant if we know the courseId.
    // We'll reset the entire cache store as a simple multi-tenant invalidation
    // for this demo, but ideally we'd delete `catalogs:topics:${tenantId}:*`
    await this.cacheManager.clear();
  }
}
