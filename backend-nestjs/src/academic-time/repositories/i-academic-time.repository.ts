import { Cycle } from '../entities/cycle.entity';
import { CycleWeek } from '../entities/cycle-week.entity';

export const IAcademicTimeRepository = Symbol('IAcademicTimeRepository');

export interface IAcademicTimeRepository {
  getCycles(): Promise<Cycle[]>;
  createCycle(data: Partial<Cycle>): Promise<Cycle>;
  
  createWeeks(cycleId: string, weeksData: Partial<CycleWeek>[]): Promise<CycleWeek[]>;
  
  /**
   * Desactivación lógica de una semana (vacaciones/feriado)
   */
  deactivateWeek(weekId: string): Promise<void>;
  
  /**
   * Reactivación de una semana
   */
  activateWeek(weekId: string): Promise<void>;
}
