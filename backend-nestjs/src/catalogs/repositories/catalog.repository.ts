import { Injectable } from '@nestjs/common';
import { ICatalogRepository } from './i-catalog.repository';
import { Course } from '../entities/course.entity';
import { TenantService } from '../../database/tenant.service';

@Injectable()
export class CatalogRepositoryImpl implements ICatalogRepository {
  constructor(private readonly tenantService: TenantService) {}

  async getActiveHierarchy(): Promise<any[]> {
    return this.tenantService.runInTenant(async (manager) => {
      // Usar Raw SQL para armar la jerarquía porque combinamos public y tenant schema
      const query = `
        SELECT 
          c.id AS course_id, c.name AS course_name,
          t.id AS topic_id, t.name AS topic_name,
          COALESCE(ttv.is_active, true) AS is_active,
          s.id AS subtopic_id, s.name AS subtopic_name
        FROM public.courses c
        LEFT JOIN public.topics t ON t.course_id = c.id
        LEFT JOIN tenant_topic_visibility ttv ON ttv.topic_id = t.id
        LEFT JOIN public.subtopics s ON s.topic_id = t.id
        ORDER BY c.name, t.name, s.name;
      `;
      const rows = await manager.query(query);

      // Agrupar filas en Course > Topic > Subtopic
      const coursesMap = new Map();

      for (const row of rows) {
        if (!coursesMap.has(row.course_id)) {
          coursesMap.set(row.course_id, {
            id: row.course_id,
            name: row.course_name,
            topics: new Map(),
          });
        }

        const course = coursesMap.get(row.course_id);
        if (row.topic_id) {
          if (!course.topics.has(row.topic_id)) {
            course.topics.set(row.topic_id, {
              id: row.topic_id,
              name: row.topic_name,
              isActive: row.is_active,
              subtopics: [],
            });
          }

          if (row.subtopic_id) {
            course.topics.get(row.topic_id).subtopics.push({
              id: row.subtopic_id,
              name: row.subtopic_name,
            });
          }
        }
      }

      return Array.from(coursesMap.values()).map((c) => ({
        ...c,
        topics: Array.from(c.topics.values()),
      }));
    });
  }

  async getFullHierarchy(): Promise<Course[]> {
    return []; // Not used in this iteration
  }

  async updateTopicLocalVisibility(
    topicId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.tenantService.runInTenant(async (manager) => {
      // Upsert in tenant_topic_visibility
      const query = `
        INSERT INTO tenant_topic_visibility (topic_id, is_active, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (topic_id) DO UPDATE 
        SET is_active = EXCLUDED.is_active, updated_at = NOW();
      `;
      await manager.query(query, [topicId, isActive]);
    });
  }

  async upsertCatalogs(payload: any): Promise<void> {
    // This updates the public schema.
    // We run it with the global entity manager (without switching tenant schema)
    // Or we just specify the public schema in the query.
    await this.tenantService.runInTenant(async (manager) => {
      if (!payload || !payload.courses) return;

      const courses = payload.courses;
      if (courses.length === 0) return;

      const coursesValues = courses
        .map((c: any) => `('${c.id}', '${c.name.replace(/'/g, "''")}')`)
        .join(',');
      await manager.query(`
        INSERT INTO public.courses (id, name)
        VALUES ${coursesValues}
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, updated_at = NOW();
      `);

      const topics: string[] = [];
      const subtopics: string[] = [];

      courses.forEach((c: any) => {
        if (c.topics) {
          c.topics.forEach((t: any) => {
            topics.push(
              `('${t.id}', '${c.id}', '${t.name.replace(/'/g, "''")}')`,
            );
            if (t.subtopics) {
              t.subtopics.forEach((s: any) => {
                subtopics.push(
                  `('${s.id}', '${t.id}', '${s.name.replace(/'/g, "''")}')`,
                );
              });
            }
          });
        }
      });

      if (topics.length > 0) {
        await manager.query(`
          INSERT INTO public.topics (id, course_id, name)
          VALUES ${topics.join(',')}
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, updated_at = NOW();
        `);
      }

      if (subtopics.length > 0) {
        await manager.query(`
          INSERT INTO public.subtopics (id, topic_id, name)
          VALUES ${subtopics.join(',')}
          ON CONFLICT (id) DO UPDATE 
          SET name = EXCLUDED.name, updated_at = NOW();
        `);
      }
    });
  }
}
