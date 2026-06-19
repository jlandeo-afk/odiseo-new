import { Syllabus } from '../entities/syllabus.entity';
import { SyllabusDistribution } from '../entities/syllabus-distribution.entity';

export const I_SYLLABUS_REPOSITORY = 'ISyllabusRepository';

export interface ISyllabusRepository {
  createSyllabus(syllabus: Partial<Syllabus>): Promise<Syllabus>;
  findById(id: string): Promise<Syllabus | null>;
  findByCourseAndCycle(courseId: string, cycleId: string): Promise<Syllabus | null>;
  
  createDistribution(distribution: Partial<SyllabusDistribution>): Promise<SyllabusDistribution>;
  updateDistribution(id: string, requestedQuantity: number): Promise<void>;
  deleteDistribution(id: string): Promise<void>;
  
  getSummaryBySyllabus(syllabusId: string): Promise<any>;
}
