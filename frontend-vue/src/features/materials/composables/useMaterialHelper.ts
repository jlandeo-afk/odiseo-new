// src/features/materials/composables/useMaterialHelper.ts
import { computed } from 'vue';
import { useAcademicTimeStore } from '@/features/academic-time/store';

export function useMaterialHelper() {
  const timeStore = useAcademicTimeStore();

  /**
   * Returns a string like "14 oct al 20 oct" for a given cycle and week number.
   * Uses the academic time store to resolve the week dates.
   */
  function getWeekDates(cycleId: string | undefined, weekNumber: number): string {
    if (!cycleId) return '';
    const cycle = timeStore.cycles.find(c => c.id === cycleId);
    if (!cycle || !cycle.weeks) return '';
    const week = cycle.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) return '';
    const start = new Date(week.startDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const end = new Date(week.endDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    return `${start} al ${end}`;
  }

  /**
   * Calculates progress for a list of courses.
   * Returns total, completed (including warnings) and percentage.
   */
  function computeProgress(courses: any[] = []): { total: number; completed: number; percentage: number } {
    const total = courses.length;
    const completed = courses.filter(c => c.status === 'COMPLETED' || c.status === 'COMPLETED_WITH_WARNINGS').length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, percentage };
  }

  return { getWeekDates, computeProgress };
}
