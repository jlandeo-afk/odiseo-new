// =====================================================
// Feature: Academic Time - Types
// =====================================================

export interface Cycle {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  weeks: CycleWeek[]
}

export interface CycleWeek {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  isActive: boolean
  cycleId: string
  // Optimistic UI flag - not persisted
  _pending?: boolean
  _error?: boolean
}

export interface CreateCyclePayload {
  name: string
  startDate: string
  endDate: string
}
