import { Cycle } from '../entities/cycle.entity';

export const IAcademicTimeRepository = Symbol('IAcademicTimeRepository');

export interface IAcademicTimeRepository {
  getCycles(): Promise<Cycle[]>;
  createCycle(data: any): Promise<void>;
  updateCycleVisibility(id: string, isActive: boolean): Promise<void>;
  updateWeekVisibility(id: string, isActive: boolean): Promise<void>;
  getCycleWithSyllabus(id: string): Promise<any>;
  softDeleteCycle(id: string): Promise<void>;
}
