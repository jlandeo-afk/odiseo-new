<template>
  <!-- Data-Dense Catalog Cards (Modern Accordion Style) -->
  <div class="w-full">
    <!-- Accordion Cards List -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <div v-if="filteredCourses.length === 0" class="py-16 text-center bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p class="text-sm text-slate-500 dark:text-slate-400">No se encontraron cursos con "{{ localSearch }}"</p>
      </div>

      <div
        v-else
        v-for="course in filteredCourses"
        :key="course.id"
        class="bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-200"
        :class="expanded.has(course.id) ? 'ring-1 ring-indigo-500/20 border-indigo-500/30' : 'hover:border-slate-300 dark:hover:border-slate-600'"
      >
        <!-- Course Header (Clickable) -->
        <button
          @click="toggleCourse(course.id)"
          class="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-[#1e1e2d]/50 hover:bg-slate-50 dark:hover:bg-[#1e1e2d] transition-colors outline-none text-left"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
              <UIcon name="i-heroicons-folder" class="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">{{ course.name }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span class="font-medium text-slate-700 dark:text-slate-300">{{ course.topics?.length || 0 }}</span> temas disponibles
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Progress mini bar -->
            <div v-if="course.topics?.length > 0" class="hidden sm:flex items-center gap-2 mr-4">
              <div class="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-emerald-500 rounded-full" 
                  :style="{ width: `${(course.topics.filter(t => t.isActive).length / course.topics.length) * 100}%` }"
                ></div>
              </div>
              <span class="text-[10px] text-slate-400 font-medium w-8 text-right">
                {{ Math.round((course.topics.filter(t => t.isActive).length / course.topics.length) * 100) }}%
              </span>
            </div>

            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#36364e] text-slate-500 dark:text-slate-400 transition-transform duration-300"
                 :class="expanded.has(course.id) ? 'rotate-180 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : ''">
              <UIcon name="i-heroicons-chevron-down" class="w-5 h-5" />
            </div>
          </div>
        </button>

        <!-- Topics Body -->
        <div v-if="expanded.has(course.id)" class="border-t border-slate-100 dark:border-slate-700/50">
          <div v-if="loadingCourses.has(course.id)" class="p-6 space-y-4">
            <USkeleton class="h-12 w-full dark:bg-slate-700/50 rounded-xl" />
            <USkeleton class="h-12 w-full dark:bg-slate-700/50 rounded-xl" />
          </div>
          
          <div v-else class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="topic in filteredTopics(course)"
              :key="topic.id"
              class="flex flex-col p-3 rounded-xl border transition-colors group"
              :class="[
                topic.isActive 
                  ? 'bg-white dark:bg-[#36364e]/50 border-slate-200 dark:border-slate-600' 
                  : 'bg-slate-50/50 dark:bg-[#1e1e2d]/30 border-slate-100 dark:border-slate-700/30 opacity-70',
                { 'opacity-50 pointer-events-none': pendingTopics.has(topic.id) }
              ]"
            >
              <!-- Topic Header Row (Name + Toggle) -->
              <div class="flex items-start justify-between gap-3 w-full">
                <h4 class="text-sm font-medium line-clamp-2 flex-1 min-w-0" :title="topic.name" :class="topic.isActive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500 line-through'">
                  {{ topic.name }}
                </h4>
                
                <div class="shrink-0 flex items-center mt-0.5">
                  <!-- Active State: Subtle Icon Button (less noise) -->
                  <UButton
                    v-if="topic.isActive"
                    size="xs"
                    color="emerald"
                    variant="soft"
                    icon="i-heroicons-eye"
                    class="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    title="Ocultar tema"
                    @click.stop="onToggleActive(topic)"
                  />
                  
                  <!-- Inactive State: Explicit Badge -->
                  <UButton
                    v-else
                    size="xs"
                    color="gray"
                    variant="soft"
                    icon="i-heroicons-eye-slash"
                    title="Mostrar tema"
                    @click.stop="onToggleActive(topic)"
                  >
                    Oculto
                  </UButton>
                </div>
              </div>
              
              <!-- Subtopics Row (Full Width) -->
              <div v-if="topic.subtopics && topic.subtopics.length > 0" class="mt-2.5 ml-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700/50 space-y-1.5 w-full">
                <div v-for="sub in topic.subtopics" :key="sub.id" class="text-xs flex items-start gap-1.5 w-full" :class="topic.isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600 line-through'">
                  <UIcon name="i-heroicons-minus-small" class="w-3 h-3 shrink-0 mt-[1px]" />
                  <span class="line-clamp-2 flex-1 min-w-0" :title="sub.name">{{ sub.name }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="filteredTopics(course).length === 0" class="col-span-full py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              No hay temas que coincidan con la búsqueda.
            </div>
          </div>
        </div>
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
