export interface Syllabus {
  id: string
  cycleId: string
  courseId: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SyllabusDistribution {
  id: string
  syllabusId: string
  weekNumber: number
  topicId: string
  subtopicId: string
  questionCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateSyllabusPayload {
  cycleId: string
  courseId: string
}

export interface CreateDistributionPayload {
  weekNumber: number
  topicId: string
  subtopicId: string
  questionCount: number
}

export interface UpdateDistributionPayload {
  questionCount: number
}

export interface SyllabusSummary {
  totalQuestions: number
  weeklyQuestions: Record<number, number>
  topicQuestions: Record<string, number>
  distributions: SyllabusDistribution[]
  generatedWeeks: number[]
}

export interface SyllabusWithProgress extends Syllabus {
  totalWeeks: number
  filledWeeks: number[]
}

export interface SyllabusListWithCourse extends SyllabusWithProgress {
  courseName: string
}
