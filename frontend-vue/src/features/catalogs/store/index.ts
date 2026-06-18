import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CatalogSubtopic {
  id: string;
  name: string;
}

export interface CatalogTopic {
  id: string;
  name: string;
  isActive: boolean;
  subtopics: CatalogSubtopic[];
}

export interface CatalogCourse {
  id: string;
  name: string;
  topics: CatalogTopic[];
}

export const useCatalogsStore = defineStore('catalogs', () => {
  const courses = ref<CatalogCourse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Flattened list for Command Palette search
  const allTopics = computed(() =>
    courses.value.flatMap(c =>
      (c.topics || []).map(t => ({
        ...t,
        courseName: c.name
      }))
    )
  )

  async function fetchCourses() {
    isLoading.value = true
    error.value = null
    try {
      // In dev, use fetch API - Replace mock when backend is ready
      // const response = await $fetch('/api/v1/catalogs');
      // courses.value = response as CatalogCourse[];
      await new Promise(r => setTimeout(r, 400))
      courses.value = getMockData()
    } catch (e: any) {
      error.value = e.message || 'Error fetching catalogs'
    } finally {
      isLoading.value = false
    }
  }

  // Optimistic UI: update topic immediately, revert on error
  async function toggleVisibility(topicId: string, isActive: boolean) {
    // 1. Find topic and snapshot previous state
    let targetTopic: CatalogTopic | undefined;
    for (const course of courses.value) {
      targetTopic = course.topics.find(t => t.id === topicId);
      if (targetTopic) break;
    }
    
    if (!targetTopic) return

    const prevIsActive = targetTopic.isActive

    // 2. Apply immediately (optimistic)
    targetTopic.isActive = isActive

    try {
      // 3. Persist
      // @ts-ignore - Assuming $fetch is available globally in Nuxt
      await $fetch(`/api/v1/catalogs/topics/${topicId}/visibility`, {
        method: 'PATCH',
        body: { isActive }
      })
    } catch {
      // 4. Revert on error
      targetTopic.isActive = prevIsActive
      throw new Error('No se pudo guardar el cambio de visibilidad. Intenta nuevamente.')
    }
  }

  return { courses, allTopics, isLoading, error, fetchCourses, toggleVisibility }
})

// --- Mock data for development ---
function getMockData(): CatalogCourse[] {
  return [
    {
      id: 'c1', name: 'Matemáticas',
      topics: [
        { id: 't1', name: 'Álgebra Lineal', isActive: true,
          subtopics: [
            { id: 's1', name: 'Matrices' },
            { id: 's2', name: 'Vectores' },
          ]
        },
        { id: 't2', name: 'Cálculo Diferencial', isActive: true, subtopics: [] },
        { id: 't3', name: 'Geometría del Espacio', isActive: false, subtopics: [] },
      ]
    },
    {
      id: 'c2', name: 'Ciencias',
      topics: [
        { id: 't4', name: 'Física Cuántica', isActive: true, subtopics: [] },
        { id: 't5', name: 'Química Orgánica', isActive: true, subtopics: [] },
      ]
    },
    {
      id: 'c3', name: 'Lenguaje',
      topics: [
        { id: 't6', name: 'Comprensión Lectora', isActive: true, subtopics: [] },
      ]
    }
  ]
}
