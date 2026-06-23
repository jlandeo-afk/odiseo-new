<template>
  <div class="px-8 py-6 max-w-full space-y-6">
    <!-- 1. Encabezado de la Página -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-700/30 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Tiempo Académico</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gestiona los ciclos académicos y su calendario de semanas. Pausa feriados o vacaciones sin eliminar datos.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="indigo"
          icon="i-heroicons-plus"
          size="md"
          class="font-semibold shadow-sm hover:shadow rounded-xl transition-all duration-200"
          @click="openCreateSlide"
        >
          Nuevo Ciclo
        </UButton>
      </div>
    </div>

    <!-- 2. Panel de Resumen de Estadísticas (Stats Dashboard) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <!-- Ciclos Activos -->
      <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ciclos Activos</span>
            <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {{ activeCyclesCount }} <span class="text-sm font-semibold text-slate-400">/ {{ totalCyclesCount }}</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-500 shadow-sm transition-transform group-hover:scale-110">
            <UIcon name="i-heroicons-calendar" class="w-6 h-6" />
          </div>
        </div>
      </div>
      
      <!-- Semanas Totales -->
      <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Semanas Planificadas</span>
            <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {{ totalWeeksCount }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100/50 dark:border-violet-900/50 flex items-center justify-center text-violet-500 shadow-sm transition-transform group-hover:scale-110">
            <UIcon name="i-heroicons-clock" class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Semanas Activas -->
      <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Semanas Activas</span>
            <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {{ activeWeeksCount }} <span class="text-sm font-semibold text-slate-400" v-if="totalWeeksCount">({{ Math.round((activeWeeksCount / totalWeeksCount) * 100) }}%)</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/50 flex items-center justify-center text-emerald-500 shadow-sm transition-transform group-hover:scale-110">
            <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Barra de Búsqueda y Control Premium -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm">
      <!-- Buscador -->
      <div class="flex-1 max-w-md relative">
        <UInput
          v-model="searchQuery"
          placeholder="Buscar ciclo..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          color="gray"
          variant="outline"
          class="w-full"
          id="cycle-search-input"
          :ui="{ icon: { trailing: { pointer: '' } } }"
        >
          <template #trailing>
            <div class="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono select-none">
              /
            </div>
          </template>
        </UInput>
      </div>

      <!-- Acciones de Matriz -->
      <div class="flex items-center gap-3">
        <UButton
          size="sm"
          color="gray"
          variant="soft"
          class="font-semibold rounded-xl"
          icon="i-heroicons-arrows-pointing-out"
          @click="toggleAllCycles"
        >
          {{ isAllCyclesExpanded ? 'Colapsar Semanas' : 'Expandir Semanas' }}
        </UButton>
      </div>
    </div>

    <!-- 4. Cargando (Skeletons de Bloques de Ciclo) -->
    <div v-if="store.isLoading && store.cycles.length === 0" class="space-y-6">
      <div v-for="i in 2" :key="i" class="bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4 shadow-sm animate-pulse">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1e1e2d] shrink-0" />
            <div class="space-y-1.5">
              <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div class="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
          <div class="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    </div>

    <!-- 5. Matriz de semanas -->
    <WeeksMatrix 
      ref="weeksMatrixRef"
      v-show="store.cycles.length > 0 || !store.isLoading" 
      @edit="openEditSlide" 
    />

    <!-- Slide-over para Crear/Editar Ciclos -->
    <CycleSlideOver v-model="showCreateSlide" :cycleToEdit="selectedCycle" @submit="onSubmitted" />

    <!-- Leyenda / Indicador de Teclado -->
    <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-2 select-none">
      <kbd class="inline-flex h-5 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 text-[10px] font-bold text-slate-400 font-mono shadow-sm">⌘ K</kbd>
      <span>o</span>
      <kbd class="inline-flex h-5 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 text-[10px] font-bold text-slate-400 font-mono shadow-sm">/</kbd>
      <span>para enfocar el buscador de ciclos</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAcademicTimeStore } from '../../features/academic-time/store'
import type { Cycle } from '../../features/academic-time/store'
import WeeksMatrix from '../../features/academic-time/components/WeeksMatrix.vue'
import CycleSlideOver from '../../features/academic-time/components/CycleSlideOver.vue'
import { useToast } from '#imports'
import { watchDebounced } from '@vueuse/core'

definePageMeta({
  layout: 'b2b',
  permissions: ['view_catalogs'],
})

const store = useAcademicTimeStore()
const showCreateSlide = ref(false)
const selectedCycle = ref<Cycle | null>(null)
const searchQuery = ref('')
const toast = useToast()
const weeksMatrixRef = ref<any>(null)

// Conteo de estadísticas globales reactivas
const totalCyclesCount = computed(() => store.cycles.length)
const activeCyclesCount = computed(() => store.cycles.filter(c => c.isActive).length)
const totalWeeksCount = computed(() => store.cycles.reduce((acc, c) => acc + (c.weeks?.length || 0), 0))
const activeWeeksCount = computed(() => store.cycles.reduce((acc, c) => acc + (c.weeks?.filter(w => w.isActive).length || 0), 0))

// Expansión global coordinada
const isAllCyclesExpanded = computed(() => weeksMatrixRef.value?.isAllCyclesExpanded ?? false)

function toggleAllCycles() {
  weeksMatrixRef.value?.toggleAllCycles()
}

// Búsqueda remota con debounce
watchDebounced(
  searchQuery,
  (newVal) => {
    store.fetchCycles(false, newVal)
  },
  { debounce: 400, maxWait: 1000 }
)

// Atajo de teclado global para enfocar el buscador
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k') || (e.key === '/')) {
    const activeEl = document.activeElement
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return
    }
    e.preventDefault()
    const input = document.getElementById('cycle-search-input')
    if (input) (input as HTMLInputElement).focus()
  }
}

onMounted(() => {
  store.fetchCycles()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function openCreateSlide() {
  selectedCycle.value = null
  showCreateSlide.value = true
}

function openEditSlide(cycle: Cycle) {
  selectedCycle.value = cycle
  showCreateSlide.value = true
}

function onSubmitted() {
  toast.add({ 
    title: selectedCycle.value ? 'Ciclo actualizado con éxito' : 'Ciclo creado con éxito', 
    color: 'success', 
    timeout: 2500 
  })
  showCreateSlide.value = false
}
</script>
