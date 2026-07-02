export interface CycleWeek {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  isActive: boolean
  cycleId: string
}

export interface Cycle {
  id: string
  name: string
  year: number
  startDate: string
  endDate: string
  daysPerWeek: number
  totalWeeks: number
  isActive: boolean
  weeks: CycleWeek[]
}

export interface CreateCyclePayload {
  name: string
  year: number
  startDate: string
  daysPerWeek: number
  totalWeeks: number
}

export interface CycleMaterialTemplateCourse {
  id?: string
  courseId: string
  questionsQuantity: number
  easyCount: number
  mediumCount: number
  hardCount: number
}

export interface CycleMaterialTemplate {
  id: string
  cycleId: string
  name: string
  scope: 'CURRENT_WEEK' | 'ACCUMULATIVE' | 'FULL_ACCUMULATIVE'
  accumulationWeeks: number | null
  courses: CycleMaterialTemplateCourse[]
}
