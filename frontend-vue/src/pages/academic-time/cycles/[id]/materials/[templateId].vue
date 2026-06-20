<template>
  <div class="px-4 sm:px-6 lg:px-8 py-8 max-w-[90rem] mx-auto h-[calc(100vh-64px)] flex flex-col">
    <!-- Breadcrumbs -->
    <nav class="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 shrink-0" aria-label="Breadcrumb">
      <NuxtLink to="/academic-time" class="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Tiempo Académico</NuxtLink>
      <svg class="w-4 h-4 mx-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      <span class="text-slate-900 dark:text-slate-200 truncate max-w-[200px]">{{ cycleName }}</span>
      <svg class="w-4 h-4 mx-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      <NuxtLink :to="`/academic-time/cycles/${cycleId}/materials`" class="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Plantillas</NuxtLink>
      <svg class="w-4 h-4 mx-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      <span class="text-indigo-600 dark:text-indigo-400 font-semibold">{{ isNew ? 'Nueva Plantilla' : form.name }}</span>
    </nav>
    <!-- Header (Mockup inspired: breadcrumbs + title only, save button moved to settings sidebar) -->
    <div class="flex items-start justify-between gap-4 mb-6 shrink-0">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {{ isNew ? 'Crear Plantilla de Material' : 'Configurar Plantilla: ' + form.name }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Estructura de evaluación y matriz de distribución de preguntas del ciclo académico.
        </p>
      </div>
    </div>
    <!-- Main Content Area (Layout adaptado al Dashboard Mockup pero simplificado) -->
    <div class="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col gap-6 min-h-0 pb-10 lg:pb-0">
      <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <!-- Left Column: Template Settings & Stats (2/5) -->
        <div class="lg:col-span-2 flex flex-col gap-6 min-h-0">
          <!-- Template Settings (Sidebar style) -->
          <div class="bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-850 pb-3">Configuración de Plantilla</h3>
            
            <!-- Template Name -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nombre de la Plantilla</label>
              <UInput v-model="form.name" placeholder="Ej. Examen Mensual Tipo A" class="w-full" size="lg" />
            </div>

            <!-- Temporal Scope -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Alcance Temporal</label>
              <select v-model="form.scope" class="w-full text-sm border-slate-200 rounded-md dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3">
                <option value="CURRENT_WEEK">Semana Actual (Temas en curso)</option>
                <option value="ACCUMULATIVE">Acumulativo (Repaso semanas atrás)</option>
                <option value="FULL_ACCUMULATIVE">Acumulativo Completo (Semana 1 a la actual)</option>
              </select>
            </div>

            <!-- Accumulation Weeks if scope is ACCUMULATIVE -->
            <div v-if="form.scope === 'ACCUMULATIVE'" class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <span class="text-xs font-bold text-slate-650 dark:text-slate-400">Semanas de acumulación:</span>
              <div class="flex items-center gap-3">
                <UInput type="number" v-model.number="form.accumulationWeeks" min="2" class="w-24" />
                <span class="text-xs text-slate-500 dark:text-slate-400">Semanas hacia atrás</span>
              </div>
            </div>

            <!-- Action buttons inside the Settings Sidebar -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <button
                @click="saveTemplate"
                :disabled="!isFormValid || isSaving"
                class="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-indigo-600 dark:bg-indigo-650 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/10"
              >
                <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                {{ isSaving ? 'Guardando cambios...' : 'Guardar Cambios' }}
              </button>
              
              <NuxtLink 
                :to="`/academic-time/cycles/${cycleId}/materials`" 
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar y regresar
              </NuxtLink>
            </div>
          </div>

          <!-- Allocated Stats Card (Allocated box in mockup) -->
          <div class="bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h4 class="text-xs font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">Métricas de la Plantilla</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Preguntas Totales</span>
                <span class="text-2xl font-black text-slate-800 dark:text-slate-100 block mt-1">
                  {{ totalQuestionsAllocated }}
                </span>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Cursos Activos</span>
                <span class="text-2xl font-black text-slate-800 dark:text-slate-100 block mt-1">
                  {{ activeCourses.length }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <!-- Right Column: Active Courses only (3/5) -->
        <div class="lg:col-span-3 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#252536] flex items-center justify-between shrink-0">
            <div>
              <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Cursos en la Plantilla</h3>
              <p class="text-xs text-slate-550 dark:text-slate-400 mt-1">Establece la cantidad de preguntas y arrastra para ordenar la secuencia del examen.</p>
            </div>
            
            <button @click="isAddCourseModalOpen = !isAddCourseModalOpen"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border border-indigo-100 dark:border-slate-700 shadow-sm">
              <UIcon :name="isAddCourseModalOpen ? 'i-heroicons-check' : 'i-heroicons-plus'" class="w-4 h-4" />
              {{ isAddCourseModalOpen ? 'Listo' : 'Agregar Cursos' }}
            </button>
          </div>

          <!-- Split pane container -->
          <div class="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            
            <!-- Left Pane: Active Courses -->
            <div class="flex-1 overflow-y-auto p-6 space-y-3 min-w-0">
              <div v-if="isCatalogsLoading" class="p-8 flex justify-center">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-slate-455" />
              </div>

              <div v-else-if="activeCourses.length === 0" class="h-full flex flex-col items-center justify-center text-center py-20">
                <div class="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-4">
                  <UIcon name="i-heroicons-folder-open" class="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No hay cursos activos</p>
                <p class="text-xs text-slate-400 mt-1 max-w-xs">Haz clic en "Agregar Cursos" para seleccionar los participantes del catálogo.</p>
                
                <button @click="isAddCourseModalOpen = true"
                        class="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/10">
                  <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                  Agregar Cursos
                </button>
              </div>

              <TransitionGroup v-else name="course-list" tag="div" class="space-y-2">
                <div v-for="(c, index) in activeCourses" :key="c.courseId"
                     draggable="true"
                     @dragstart="onDragStart($event, index)"
                     @dragover.prevent
                     @drop="onDrop($event, index)"
                     @dragend="onDragEnd"
                     class="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#252536]/40 border border-slate-200/80 dark:border-slate-700 rounded-xl hover:border-indigo-350 dark:hover:border-indigo-500/25 shadow-sm transition-all duration-200 gap-4 cursor-move"
                     :class="{ 'opacity-30 scale-[0.98] border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20': draggingIndex === index }">
                  
                  <!-- Left: Drag Icon + Position Index + Course Name -->
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <UIcon name="i-heroicons-ellipsis-vertical" class="w-5 h-5 text-slate-300 dark:text-slate-600 cursor-grab shrink-0" />
                    
                    <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-150/60 dark:bg-slate-800/80 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-slate-200/40 dark:border-slate-700/60 shadow-sm">
                      {{ index + 1 }}
                    </span>

                    <div class="min-w-0 flex-1">
                      <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {{ c.courseName }}
                      </h4>
                    </div>
                  </div>

                  <!-- Right: Controls (Direct adjust) + Delete -->
                  <div class="flex items-center gap-4 shrink-0">
                    <!-- Adjuster Buttons (Direct Input controls) -->
                    <div class="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-inner">
                      <button @click="decrementCourse(c)"
                              class="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-750 transition-colors">
                        <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
                      </button>
                      <input type="number" 
                             v-model.number="c.questionsQuantity" 
                             min="1" 
                             max="100" 
                             class="w-12 bg-transparent text-center text-xs font-extrabold text-slate-800 dark:text-slate-200 border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <button @click="incrementCourse(c)"
                              class="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-505 hover:text-slate-755 transition-colors">
                        <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <!-- Delete Button -->
                    <button @click="removeCourse(c)"
                            class="p-2 text-slate-405 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all">
                      <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </TransitionGroup>
            </div>

            <!-- Right Pane: Catalog / Available Courses -->
            <div v-if="isAddCourseModalOpen" 
                 class="w-full md:w-80 shrink-0 bg-slate-50/50 dark:bg-slate-900/10 p-6 flex flex-col min-h-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Catálogo de Cursos</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">Selecciona los cursos a incluir en la plantilla.</p>
                </div>
              </div>

              <div class="relative mb-3">
                <UInput v-model="searchQuery" 
                        icon="i-heroicons-magnifying-glass" 
                        placeholder="Buscar curso..." 
                        size="sm" 
                        class="w-full" />
              </div>

              <div class="flex-1 overflow-y-auto space-y-2 pr-1">
                <div v-if="isCatalogsLoading" class="py-8 flex justify-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-slate-400" />
                </div>

                <div v-else-if="filteredAvailableCourses.length === 0" class="py-12 text-center text-xs text-slate-400">
                  No hay cursos disponibles.
                </div>

                <div v-else v-for="c in filteredAvailableCourses" :key="c.courseId"
                     class="flex items-center justify-between p-2.5 bg-white dark:bg-[#252536]/40 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/20 dark:hover:border-indigo-400/20 transition-all duration-200">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" :title="c.courseName">
                    {{ c.courseName }}
                  </span>
                  <button @click="addCourse(c)"
                          class="flex items-center gap-0.5 px-2.5 py-1 text-[10px] font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border border-indigo-100 dark:border-slate-700">
                    <UIcon name="i-heroicons-plus" class="w-3 h-3" />
                    Añadir
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAcademicTimeStore } from '@/features/academic-time/store'
import { useCatalogsStore } from '@/features/catalogs/store'

definePageMeta({
  layout: 'b2b',
  permissions: ['view_catalogs'],
})

const route = useRoute()
const router = useRouter()
const store = useAcademicTimeStore()
const catalogsStore = useCatalogsStore()

const cycleId = computed(() => route.params.id as string)
const templateId = computed(() => route.params.templateId as string)
const isNew = computed(() => templateId.value === 'new')

const cycle = computed(() => store.cycles.find(c => c.id === cycleId.value))
const cycleName = computed(() => cycle.value ? cycle.value.name : 'Configuración de Ciclo')

const isSaving = ref(false)
const isCatalogsLoading = ref(true)
const isAddCourseModalOpen = ref(false)
const draggingIndex = ref<number | null>(null)

const form = ref({
  name: '',
  scope: 'CURRENT_WEEK' as 'CURRENT_WEEK' | 'ACCUMULATIVE' | 'FULL_ACCUMULATIVE',
  accumulationWeeks: null as number | null,
  courses: [] as { courseId: string, courseName: string, questionsQuantity: number, isActive: boolean }[]
})

const searchQuery = ref('')

const activeCourses = computed(() => {
  return form.value.courses.filter(c => c.isActive)
})

const availableCourses = computed(() => {
  return form.value.courses.filter(c => !c.isActive)
})

const filteredAvailableCourses = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return availableCourses.value
  return availableCourses.value.filter(c => c.courseName.toLowerCase().includes(query))
})

const totalQuestionsAllocated = computed(() => {
  return activeCourses.value.reduce((sum, c) => sum + (Number(c.questionsQuantity) || 0), 0)
})

function addCourse(course: any) {
  course.questionsQuantity = 5 // Default: 5 questions
  course.isActive = true
}

function removeCourse(course: any) {
  course.questionsQuantity = 0
  course.isActive = false
}

function incrementCourse(course: any) {
  course.questionsQuantity = (Number(course.questionsQuantity) || 0) + 1
}

function decrementCourse(course: any) {
  const current = Number(course.questionsQuantity) || 0
  if (current > 1) {
    course.questionsQuantity = current - 1
  } else {
    removeCourse(course)
  }
}

function onDragStart(event: DragEvent, index: number) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

function onDrop(event: DragEvent, targetIndex: number) {
  draggingIndex.value = null
  const sourceStr = event.dataTransfer?.getData('text/plain')
  if (sourceStr === undefined || sourceStr === '') return
  const sourceIndex = parseInt(sourceStr, 10)
  if (isNaN(sourceIndex) || sourceIndex === targetIndex) return

  const sourceItem = activeCourses.value[sourceIndex]
  const targetItem = activeCourses.value[targetIndex]

  // Find actual indexes in form.value.courses array
  const realSourceIdx = form.value.courses.findIndex(c => c.courseId === sourceItem.courseId)
  const realTargetIdx = form.value.courses.findIndex(c => c.courseId === targetItem.courseId)

  if (realSourceIdx !== -1 && realTargetIdx !== -1) {
    const [movedItem] = form.value.courses.splice(realSourceIdx, 1)
    const newTargetIdx = form.value.courses.findIndex(c => c.courseId === targetItem.courseId)
    if (newTargetIdx !== -1) {
      form.value.courses.splice(newTargetIdx, 0, movedItem)
    } else {
      form.value.courses.splice(realTargetIdx, 0, movedItem)
    }
  }
}

function onDragEnd() {
  draggingIndex.value = null
}

onMounted(async () => {
  if (store.cycles.length === 0) store.fetchCycles()
  
  isCatalogsLoading.value = true
  try {
    await Promise.all([
      !isNew.value ? store.fetchTemplates(cycleId.value) : Promise.resolve(),
      catalogsStore.fetchCourses()
    ])
    
    // Inicializar Formulario
    const template = !isNew.value ? store.templatesByCycle[cycleId.value]?.find(p => p.id === templateId.value) : null;
    
    // Rellenar cuadrícula Zero-Click
    const templateCourses = template?.courses || []
    const activeMap = new Map(templateCourses.map(tc => [tc.courseId, tc.questionsQuantity]))
    const allCourses: any[] = []
    
    // 1. Añadir cursos activos en su orden guardado
    templateCourses.forEach(tc => {
      const catCourse = catalogsStore.courses.find(c => c.id === tc.courseId)
      if (catCourse) {
        allCourses.push({
          courseId: catCourse.id,
          courseName: catCourse.name,
          questionsQuantity: tc.questionsQuantity,
          isActive: true
        })
      }
    })
    
    // 2. Añadir el resto de cursos del catálogo
    catalogsStore.courses.forEach(catCourse => {
      if (!activeMap.has(catCourse.id)) {
        allCourses.push({
          courseId: catCourse.id,
          courseName: catCourse.name,
          questionsQuantity: 0,
          isActive: false
        })
      }
    })

    if (template) {
      form.value = {
        name: template.name,
        scope: template.scope,
        accumulationWeeks: template.accumulationWeeks,
        courses: allCourses
      }
    } else {
      form.value.courses = allCourses
    }
  } catch (e) {
    console.error(e)
  } finally {
    isCatalogsLoading.value = false
  }
})

const isFormValid = computed(() => {
  if (!form.value.name.trim()) return false
  if (form.value.scope === 'ACCUMULATIVE' && (!form.value.accumulationWeeks || form.value.accumulationWeeks < 2)) return false
  const hasAtLeastOneActive = activeCourses.value.length > 0
  if (!hasAtLeastOneActive) return false
  
  // All active courses must have a valid number > 0
  return activeCourses.value.every(c => {
    const qty = Number(c.questionsQuantity)
    return !isNaN(qty) && qty > 0
  })
})

async function saveTemplate() {
  if (!isFormValid.value) return
  isSaving.value = true
  try {
    const validCourses = activeCourses.value.map(c => ({
      courseId: c.courseId,
      questionsQuantity: Number(c.questionsQuantity)
    }))

    const payload = {
      name: form.value.name,
      scope: form.value.scope,
      accumulationWeeks: form.value.scope === 'ACCUMULATIVE' ? form.value.accumulationWeeks : undefined,
      courses: validCourses
    }
    
    if (!isNew.value) {
      await store.updateTemplate(cycleId.value, templateId.value, payload)
    } else {
      await store.createTemplate(cycleId.value, payload)
    }
    
    // Redirigir de vuelta a la lista
    router.push(`/academic-time/cycles/${cycleId.value}/materials`)
  } catch (e: any) {
    console.error(e)
    const errorMsg = e.data?.message || e.message || JSON.stringify(e);
    alert('Error al guardar el tipo de material: ' + (Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg))
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.course-list-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
