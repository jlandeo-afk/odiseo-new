import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cycle, CreateCyclePayload } from '../types'

export const useAcademicTimeStore = defineStore('academicTime', () => {
  const cycles = ref<Cycle[]>([])
  const isLoading = ref(false)

  async function fetchCycles() {
    isLoading.value = true
    try {
      await new Promise(r => setTimeout(r, 400))
      cycles.value = getMockCycles()
    } finally {
      isLoading.value = false
    }
  }

  async function createCycle(payload: CreateCyclePayload) {
    // Optimistic insert
    const tempId = `temp-${Date.now()}`
    const optimisticCycle: Cycle = {
      id: tempId,
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isActive: true,
      weeks: []
    }
    cycles.value.unshift(optimisticCycle)

    try {
      const created = await $fetch<Cycle>('/api/v1/academic-time/cycles', {
        method: 'POST',
        body: payload
      })
      // Replace temp with real
      const idx = cycles.value.findIndex(c => c.id === tempId)
      if (idx !== -1) cycles.value[idx] = created
    } catch {
      // Revert
      cycles.value = cycles.value.filter(c => c.id !== tempId)
      throw new Error('No se pudo crear el ciclo.')
    }
  }

  // Optimistic soft-delete for a week
  async function toggleWeek(cycleId: string, weekId: string) {
    const cycle = cycles.value.find(c => c.id === cycleId)
    const week = cycle?.weeks.find(w => w.id === weekId)
    if (!week) return

    const prevState = week.isActive
    week.isActive = !prevState
    week._pending = true

    try {
      const endpoint = prevState
        ? `/api/v1/academic-time/weeks/${weekId}` // DELETE → deactivate
        : `/api/v1/academic-time/weeks/${weekId}/restore`
      await $fetch(endpoint, { method: prevState ? 'DELETE' : 'PATCH' })
    } catch {
      week.isActive = prevState
      week._error = true
      setTimeout(() => { if (week) week._error = false }, 1500)
    } finally {
      if (week) week._pending = false
    }
  }

  return { cycles, isLoading, fetchCycles, createCycle, toggleWeek }
})

function getMockCycles(): Cycle[] {
  return [
    {
      id: 'cy1', name: 'Ciclo Verano 2026', startDate: '2026-01-10',
      endDate: '2026-03-10', isActive: true,
      weeks: [
        { id: 'w1', weekNumber: 1, startDate: '2026-01-10', endDate: '2026-01-16', isActive: true, cycleId: 'cy1' },
        { id: 'w2', weekNumber: 2, startDate: '2026-01-17', endDate: '2026-01-23', isActive: true, cycleId: 'cy1' },
        { id: 'w3', weekNumber: 3, startDate: '2026-01-24', endDate: '2026-01-30', isActive: false, cycleId: 'cy1' },
        { id: 'w4', weekNumber: 4, startDate: '2026-01-31', endDate: '2026-02-06', isActive: true, cycleId: 'cy1' },
        { id: 'w5', weekNumber: 5, startDate: '2026-02-07', endDate: '2026-02-13', isActive: true, cycleId: 'cy1' },
        { id: 'w6', weekNumber: 6, startDate: '2026-02-14', endDate: '2026-02-20', isActive: true, cycleId: 'cy1' },
        { id: 'w7', weekNumber: 7, startDate: '2026-02-21', endDate: '2026-02-27', isActive: false, cycleId: 'cy1' },
        { id: 'w8', weekNumber: 8, startDate: '2026-02-28', endDate: '2026-03-06', isActive: true, cycleId: 'cy1' },
      ]
    },
    {
      id: 'cy2', name: 'Ciclo Otoño 2026', startDate: '2026-03-20',
      endDate: '2026-06-10', isActive: true,
      weeks: [
        { id: 'w9', weekNumber: 1, startDate: '2026-03-20', endDate: '2026-03-26', isActive: true, cycleId: 'cy2' },
        { id: 'w10', weekNumber: 2, startDate: '2026-03-27', endDate: '2026-04-02', isActive: true, cycleId: 'cy2' },
        { id: 'w11', weekNumber: 3, startDate: '2026-04-03', endDate: '2026-04-09', isActive: false, cycleId: 'cy2' },
        { id: 'w12', weekNumber: 4, startDate: '2026-04-10', endDate: '2026-04-16', isActive: true, cycleId: 'cy2' },
      ]
    }
  ]
}
