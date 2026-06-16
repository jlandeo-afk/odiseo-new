import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CatalogCourse, TopicPatch } from '../types'

export const useCatalogsStore = defineStore('catalogs', () => {
  const courses = ref<CatalogCourse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Flattened list for Command Palette search
  const allTopics = computed(() =>
    courses.value.flatMap(c =>
      (c.topics || []).map(t => ({
        ...t,
        courseName: c.localAlias || c.coreName
      }))
    )
  )

  async function fetchCourses() {
    isLoading.value = true
    error.value = null
    try {
      // In dev, use mock data - replace with $fetch('/api/v1/catalogs')
      await new Promise(r => setTimeout(r, 400))
      courses.value = getMockData()
    } catch (e: any) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // Optimistic UI: update topic immediately, revert on error
  async function patchTopic(courseId: string, topicId: string, patch: TopicPatch) {
    // 1. Find topic and snapshot previous state
    const course = courses.value.find(c => c.id === courseId)
    const topic = course?.topics?.find(t => t.id === topicId)
    if (!topic) return

    const prev = { localAlias: topic.localAlias, isActive: topic.isActive }

    // 2. Apply immediately (optimistic)
    if (patch.localAlias !== undefined) topic.localAlias = patch.localAlias
    if (patch.isActive !== undefined) topic.isActive = patch.isActive

    try {
      // 3. Persist
      await $fetch(`/api/v1/catalogs/topics/${topicId}`, {
        method: 'PATCH',
        body: patch
      })
    } catch {
      // 4. Revert on error
      topic.localAlias = prev.localAlias
      topic.isActive = prev.isActive
      throw new Error('No se pudo guardar el cambio. Intenta nuevamente.')
    }
  }

  return { courses, allTopics, isLoading, error, fetchCourses, patchTopic }
})

// --- Mock data for development ---
function getMockData(): CatalogCourse[] {
  return [
    {
      id: 'c1', coreName: 'Matemáticas', localAlias: null, isActive: true,
      topics: [
        { id: 't1', coreName: 'Álgebra Lineal', localAlias: 'Álgebra I', isActive: true, courseId: 'c1',
          subtopics: [
            { id: 's1', coreName: 'Matrices', localAlias: null, isActive: true, topicId: 't1' },
            { id: 's2', coreName: 'Vectores', localAlias: null, isActive: true, topicId: 't1' },
          ]
        },
        { id: 't2', coreName: 'Cálculo Diferencial', localAlias: null, isActive: true, courseId: 'c1', subtopics: [] },
        { id: 't3', coreName: 'Geometría del Espacio', localAlias: null, isActive: false, courseId: 'c1', subtopics: [] },
      ]
    },
    {
      id: 'c2', coreName: 'Ciencias', localAlias: 'Ciencias Naturales', isActive: true,
      topics: [
        { id: 't4', coreName: 'Física Cuántica', localAlias: null, isActive: true, courseId: 'c2', subtopics: [] },
        { id: 't5', coreName: 'Química Orgánica', localAlias: null, isActive: true, courseId: 'c2', subtopics: [] },
      ]
    },
    {
      id: 'c3', coreName: 'Lenguaje', localAlias: 'Comunicación', isActive: true,
      topics: [
        { id: 't6', coreName: 'Comprensión Lectora', localAlias: null, isActive: true, courseId: 'c3', subtopics: [] },
      ]
    }
  ]
}
