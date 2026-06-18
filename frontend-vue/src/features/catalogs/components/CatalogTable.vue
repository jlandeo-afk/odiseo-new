<template>
  <!-- Data-Dense Catalog Table (Linear-like) -->
  <div class="w-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="localSearch"
          size="sm"
          placeholder="Filtrar temas..."
          :ui="{ base: 'text-sm' }"
          class="w-60"
        />
        <USelect
          v-model="filterStatus"
          :items="statusOptions"
          size="sm"
          class="w-32"
        />
      </div>
      <p class="text-xs text-gray-400">
        {{ visibleCount }} temas de {{ totalCount }} totales
      </p>
    </div>

    <!-- Table -->
    <div class="border border-gray-100 rounded-lg overflow-hidden">
      <table class="w-full table-dense">
        <thead class="bg-gray-50/70 border-b border-gray-100">
          <tr>
            <th class="text-left w-12 text-center">#</th>
            <th class="text-left">Nombre de Tema (Banco Global)</th>
            <th class="text-left w-32">Curso</th>
            <th class="text-center w-24">Visible</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="course in filteredCourses" :key="course.id">
            <!-- Course row header -->
            <tr class="bg-gray-50/50 border-b border-gray-100">
              <td colspan="4" class="px-3 py-1.5">
                <div class="flex items-center gap-2">
                  <button
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                    @click="toggleCourse(course.id)"
                  >
                    <svg
                      class="w-3 h-3 transition-transform duration-150"
                      :class="expanded.has(course.id) ? 'rotate-90' : ''"
                      fill="currentColor" viewBox="0 0 20 20"
                    >
                      <path d="M6 6l8 4-8 4V6z"/>
                    </svg>
                  </button>
                  <span class="text-xs font-semibold text-gray-700">
                    {{ course.name }}
                  </span>
                  <span class="text-xs text-gray-400">({{ course.topics?.length || 0 }} temas)</span>
                </div>
              </td>
            </tr>

            <!-- Topic rows -->
            <template v-if="expanded.has(course.id)">
              <tr v-if="loadingCourses.has(course.id)">
                <td colspan="4" class="px-6 py-4">
                  <div class="space-y-3">
                    <USkeleton class="h-4 w-[250px]" />
                    <USkeleton class="h-4 w-[200px]" />
                    <USkeleton class="h-4 w-[300px]" />
                  </div>
                </td>
              </tr>
              <tr
                v-else
                v-for="topic in filteredTopics(course)"
                :key="topic.id"
                class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                :class="{ 'optimistic-pending': pendingTopics.has(topic.id) }"
              >
                <td class="text-center text-gray-300 text-xs pl-6">·</td>

                <!-- Name (read-only) -->
                <td class="py-1">
                  <span class="text-sm text-gray-900 font-medium" :class="!topic.isActive && 'opacity-40 line-through'">
                    {{ topic.name }}
                  </span>
                </td>

                <!-- Course badge -->
                <td>
                  <span class="text-[11px] text-gray-400 truncate block max-w-[120px]">
                    {{ course.name }}
                  </span>
                </td>

                <!-- Visibility toggle -->
                <td class="text-center py-1">
                  <button
                    class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus:outline-none"
                    :class="topic.isActive ? 'bg-blue-500' : 'bg-gray-200'"
                    @click="onToggleActive(topic)"
                  >
                    <span
                      class="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200"
                      :class="topic.isActive ? 'translate-x-3.5' : 'translate-x-0.5'"
                    />
                  </button>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>

      <div v-if="filteredCourses.length === 0" class="py-16 text-center">
        <p class="text-sm text-gray-400">No hay resultados para "{{ localSearch }}"</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCatalogsStore } from '../store'
import type { CatalogCourse, CatalogTopic } from '../store/index'
import { watchDebounced } from '@vueuse/core'

const store = useCatalogsStore()
const toast = useToast()

const localSearch = ref('')
const filterStatus = ref('all')
const pendingTopics = ref(new Set<string>())
const loadingCourses = ref(new Set<string>())
const expanded = ref(new Set<string>())

// Server-side search with debounce
watchDebounced(localSearch, (val) => {
  store.fetchCourses(val)
}, { debounce: 400 })

const statusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Visibles', value: 'active' },
  { label: 'Ocultos', value: 'inactive' },
]

const filteredCourses = computed(() => {
  return store.courses.map(course => ({
    ...course,
    topics: (course.topics || []).filter(t => {
      const matchStatus = filterStatus.value === 'all' ||
        (filterStatus.value === 'active' ? t.isActive : !t.isActive)
      return matchStatus
    })
  }))
})

function filteredTopics(course: CatalogCourse) {
  return course.topics || []
}

const totalCount = computed(() =>
  store.courses.reduce((acc, c) => acc + (c.topicsCount || 0), 0)
)
const visibleCount = computed(() =>
  filteredCourses.value.flatMap(c => c.topics || []).length
)

async function toggleCourse(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
    const course = store.courses.find(c => c.id === id)
    if (course && course.topics.length === 0 && (course.topicsCount || 0) > 0) {
      loadingCourses.value.add(id)
      await store.fetchCourseTopics(id)
      loadingCourses.value.delete(id)
    }
  }
}

async function onToggleActive(topic: CatalogTopic) {
  pendingTopics.value.add(topic.id)
  try {
    await store.toggleVisibility(topic.id, !topic.isActive)
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  } finally {
    pendingTopics.value.delete(topic.id)
  }
}
</script>
