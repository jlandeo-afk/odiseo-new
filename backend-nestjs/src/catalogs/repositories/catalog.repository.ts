import { Injectable } from '@nestjs/common';
import { ICatalogRepository } from './i-catalog.repository';
import { Course } from '../entities/course.entity';
import { Topic } from '../entities/topic.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class CatalogRepositoryImpl implements ICatalogRepository {
  constructor(private readonly tenantService: TenantService) {}

  async getActiveHierarchy(): Promise<Course[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(Course, {
        where: { isActive: true },
        relations: ['topics', 'topics.subtopics'],
      });
    });
  }

  async getFullHierarchy(): Promise<Course[]> {
    return this.tenantService.runInTenant(async (manager) => {
      return manager.find(Course, {
        relations: ['topics', 'topics.subtopics'],
      });
    });
  }

  async updateTopicLocalData(topicId: string, data: { localAlias?: string | null; isActive?: boolean }): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      await manager.update(Topic, topicId, {
        ...(data.localAlias !== undefined && { localAlias: data.localAlias }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      });
    });
  }

  async upsertTopicsFromCore(topics: Array<{ id: string; coreName: string; courseId: string }>): Promise<void> {
    if (!topics || topics.length === 0) return;

    await this.tenantService.runInTenant(async (manager) => {
      // Using Raw SQL for bulk upsert to preserve localAlias
      const values = topics.map(t => `('${t.id}', '${t.coreName}', '${t.courseId}', true)`).join(',');
      
      const query = `
        INSERT INTO topics (id, core_name, course_id, is_active)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE 
        SET core_name = EXCLUDED.core_name, updated_at = NOW();
      `;
      
      await manager.query(query);
    });
  }
}
