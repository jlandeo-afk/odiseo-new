import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CycleWeek {
  id: string;
  cycleId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Cycle {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  daysPerWeek: number;
  totalWeeks: number;
  isActive: boolean;
  weeks: CycleWeek[];
}

export const useAcademicTimeStore = defineStore('academicTime', () => {
  const cycles = ref<Cycle[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCycles() {
    isLoading.value = true
    error.value = null
    try {
      // In dev, use mock or real fetch
      // const response = await $fetch('/api/v1/academic-time/cycles');
      // cycles.value = response as Cycle[];
      await new Promise(r => setTimeout(r, 400))
      cycles.value = [] // Mock empty for now
    } catch (e: any) {
      error.value = e.message || 'Error fetching cycles'
    } finally {
      isLoading.value = false
    }
  }

  async function createCycle(data: { name: string; year: number; startDate: string; daysPerWeek: number; totalWeeks: number }) {
    try {
      // @ts-ignore
      await $fetch('/api/v1/academic-time/cycles', {
        method: 'POST',
        body: data
      })
      await fetchCycles()
    } catch (e: any) {
      throw new Error(e.message || 'Error al crear el ciclo')
    }
  }

  async function toggleCycleVisibility(id: string, isActive: boolean) {
    const cycle = cycles.value.find(c => c.id === id)
    if (!cycle) return
    const prev = cycle.isActive
    cycle.isActive = isActive
    try {
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/cycles/${id}/visibility`, {
        method: 'PATCH',
        body: { isActive }
      })
    } catch {
      cycle.isActive = prev
      throw new Error('No se pudo guardar la visibilidad del ciclo.')
    }
  }

  async function toggleWeekVisibility(id: string, isActive: boolean) {
    let targetWeek: CycleWeek | undefined;
    for (const cycle of cycles.value) {
      targetWeek = cycle.weeks.find(w => w.id === id);
      if (targetWeek) break;
    }
    if (!targetWeek) return
    const prev = targetWeek.isActive
    targetWeek.isActive = isActive
    try {
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/weeks/${id}/visibility`, {
        method: 'PATCH',
        body: { isActive }
      })
    } catch {
      targetWeek.isActive = prev
      throw new Error('No se pudo guardar la visibilidad de la semana.')
    }
  }

  async function deleteCycle(id: string) {
    try {
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/cycles/${id}`, { method: 'DELETE' })
      await fetchCycles()
    } catch (e: any) {
      if (e.status === 409) {
        throw new Error('No se puede eliminar el ciclo porque tiene sílabos asociados. Desactívalo en su lugar.')
      }
      throw new Error('Error al eliminar el ciclo.')
    }
  }

  return { cycles, isLoading, error, fetchCycles, createCycle, toggleCycleVisibility, toggleWeekVisibility, deleteCycle }
})
