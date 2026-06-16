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
            <th class="text-left">Nombre Original (Banco Global)</th>
            <th class="text-left">Alias Local del Colegio</th>
            <th class="text-left w-24">Curso</th>
            <th class="text-center w-20">Visible</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="course in filteredCourses" :key="course.id">
            <!-- Course row header -->
            <tr class="bg-gray-50/50 border-b border-gray-100">
              <td colspan="5" class="px-3 py-1.5">
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
                    {{ course.localAlias || course.coreName }}
                  </span>
                  <span class="text-xs text-gray-400">({{ course.topics?.length || 0 }} temas)</span>
                </div>
              </td>
            </tr>

            <!-- Topic rows with AutoAnimate -->
            <template v-if="expanded.has(course.id)">
              <tr
                v-for="topic in filteredTopics(course)"
                :key="topic.id"
                class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                :class="{ 'optimistic-pending': pendingTopics.has(topic.id) }"
              >
                <td class="text-center text-gray-300 text-xs pl-6">·</td>

                <!-- Core name (read-only) -->
                <td>
                  <span class="text-gray-900" :class="!topic.isActive && 'opacity-40 line-through'">
                    {{ topic.coreName }}
                  </span>
                </td>

                <!-- Alias input (editable) -->
                <td class="py-1">
                  <input
                    :value="topic.localAlias || ''"
                    type="text"
                    :placeholder="topic.coreName"
                    class="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-300 outline-none rounded px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-blue-200 focus:border-blue-300 border border-transparent hover:border-gray-200 transition-all"
                    @blur="onAliasBlur(course.id, topic, $event)"
                  />
                </td>

                <!-- Course badge -->
                <td>
                  <span class="text-[11px] text-gray-400 truncate block max-w-[100px]">
                    {{ course.localAlias || course.coreName }}
                  </span>
                </td>

                <!-- Visibility toggle -->
                <td class="text-center">
                  <button
                    class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus:outline-none"
                    :class="topic.isActive ? 'bg-blue-500' : 'bg-gray-200'"
                    @click="onToggleActive(course.id, topic)"
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
import type { CatalogCourse, CatalogTopic } from '../types'
import { useToast } from '#imports'

const store = useCatalogsStore()
const toast = useToast()

const localSearch = ref('')
const filterStatus = ref('all')
const pendingTopics = ref(new Set<string>())
const expanded = ref(new Set<string>(store.courses.map(c => c.id)))

const statusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Visibles', value: 'active' },
  { label: 'Ocultos', value: 'inactive' },
]

const filteredCourses = computed(() => {
  return store.courses.filter(c => c.isActive).map(course => ({
    ...course,
    topics: (course.topics || []).filter(t => {
      const matchSearch = !localSearch.value ||
        (t.localAlias || t.coreName).toLowerCase().includes(localSearch.value.toLowerCase())
      const matchStatus = filterStatus.value === 'all' ||
        (filterStatus.value === 'active' ? t.isActive : !t.isActive)
      return matchSearch && matchStatus
    })
  })).filter(c => c.topics.length > 0)
})

function filteredTopics(course: CatalogCourse) {
  return course.topics || []
}

const totalCount = computed(() =>
  store.courses.flatMap(c => c.topics || []).length
)
const visibleCount = computed(() =>
  filteredCourses.value.flatMap(c => c.topics || []).length
)

function toggleCourse(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

async function onAliasBlur(courseId: string, topic: CatalogTopic, event: FocusEvent) {
  const newAlias = (event.target as HTMLInputElement).value.trim() || null
  if (newAlias === topic.localAlias) return

  pendingTopics.value.add(topic.id)
  try {
    await store.patchTopic(courseId, topic.id, { localAlias: newAlias })
    toast.add({ title: 'Alias guardado', color: 'success', timeout: 2000 })
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  } finally {
    pendingTopics.value.delete(topic.id)
  }
}

async function onToggleActive(courseId: string, topic: CatalogTopic) {
  pendingTopics.value.add(topic.id)
  try {
    await store.patchTopic(courseId, topic.id, { isActive: !topic.isActive })
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  } finally {
    pendingTopics.value.delete(topic.id)
  }
}
</script>
