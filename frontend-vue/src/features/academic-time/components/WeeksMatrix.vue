<template>
  <!-- Academic Time Matrix - Full-width Data-Density -->
  <div class="w-full space-y-6">
    <div
      v-for="cycle in store.cycles"
      :key="cycle.id"
      class="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white dark:bg-[#2b2b3f] shadow-sm"
    >
      <!-- Cycle header -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 dark:bg-[#1e1e2d]/50 border-b border-slate-200 dark:border-slate-700/50">
        <div class="flex items-center gap-3">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ cycle.name }}</h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400">
              {{ cycle.startDate }} → {{ cycle.endDate }}
            </span>
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              {{ getCycleDaysText(cycle.daysPerWeek) }}
            </span>
          </div>
          <UButton
            size="xs"
            :color="cycle.isActive ? 'emerald' : 'gray'"
            variant="soft"
            :icon="cycle.isActive ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'"
            @click="onToggleCycleVisibility(cycle)"
          >
            {{ cycle.isActive ? 'Activo' : 'Archivado' }}
          </UButton>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400">
              {{ activeWeekCount(cycle) }}/{{ cycle.weeks.length }} semanas
            </span>
            <div class="w-20 h-1.5 bg-slate-200 dark:bg-[#1e1e2d] rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                :style="{ width: `${(activeWeekCount(cycle) / cycle.weeks.length) * 100}%` }"
              />
            </div>
          </div>
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            :icon="expandedCycles.has(cycle.id) ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
            @click="toggleCycleExpand(cycle.id)"
          >
            {{ expandedCycles.has(cycle.id) ? 'Ocultar Semanas' : 'Ver Semanas' }}
          </UButton>
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            icon="i-heroicons-document-text"
            :to="`/academic-time/cycles/${cycle.id}/materials`"
          >
            Ver Materiales
          </UButton>
          <UButton 
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-pencil-square"
            @click="onEditCycle(cycle)"
            title="Editar Ciclo"
          />
          <UButton 
            size="xs"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            @click="onDeleteCycle(cycle.id)"
            title="Eliminar Ciclo"
          />
        </div>
      </div>

      <!-- Weeks grid -->
      <div v-if="expandedCycles.has(cycle.id)" class="p-6 bg-slate-50/30 dark:bg-[#1e1e2d]/20 border-t border-slate-100 dark:border-slate-800">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <button
            v-for="week in cycle.weeks"
            :key="week.id"
            class="relative flex flex-col rounded-xl border text-left cursor-pointer select-none overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-[#2b2b3f] group"
            :class="weekCellClass(week)"
            :title="week.isActive ? `Semana ${week.weekNumber} — click para desactivar` : `Semana ${week.weekNumber} — click para reactivar`"
            @click="onToggleWeek(week)"
          >
            <!-- Loading Overlay -->
            <div v-if="pendingWeeks.has(week.id)" class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-[#2b2b3f]/60 z-10 backdrop-blur-[1px]">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-indigo-500" />
            </div>

            <!-- Calendar "Header" -->
            <div 
              class="px-3 py-2.5 flex items-center justify-between border-b transition-colors"
              :class="week.isActive 
                ? 'bg-indigo-50/80 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20' 
                : 'bg-slate-50 border-slate-200 dark:bg-[#252536] dark:border-slate-700'"
            >
              <div class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5" :class="week.isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'" />
                <span class="text-[10px] font-bold uppercase tracking-wider" :class="week.isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'">
                  Semana {{ week.weekNumber }}
                </span>
              </div>
              <UIcon 
                :name="week.isActive ? 'i-heroicons-check-circle-20-solid' : 'i-heroicons-minus-circle-20-solid'" 
                class="w-4 h-4"
                :class="week.isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'"
              />
            </div>

            <!-- Calendar "Body" -->
            <div class="p-3.5 flex-1 flex flex-col justify-center items-center relative overflow-hidden bg-white dark:bg-[#2b2b3f]" :class="!week.isActive && 'opacity-70 grayscale-[30%]'">
              <div class="text-[13px] font-semibold tracking-tight" :class="week.isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'">
                {{ formatDayWithShortName(week.startDate) }} - {{ formatDayWithShortName(week.endDate) }}
              </div>
              <div class="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                {{ formatMonthRange(week.startDate, week.endDate) }}
              </div>

              <!-- Hover Action Overlay -->
              <div class="absolute inset-0 bg-white/95 dark:bg-[#2b2b3f]/95 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center">
                <span
                  class="text-xs font-bold transition-transform transform translate-y-1 group-hover:translate-y-0 duration-200 flex items-center gap-1"
                  :class="week.isActive ? 'text-rose-500' : 'text-emerald-500'"
                >
                  <UIcon :name="week.isActive ? 'i-heroicons-pause-circle' : 'i-heroicons-play-circle'" class="w-4 h-4" />
                  {{ week.isActive ? 'Pausar' : 'Activar' }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Infinite Scroll Trigger -->
    <div ref="loadMoreTrigger" class="h-10 flex items-center justify-center">
      <span v-if="store.isLoading && store.cycles.length > 0" class="text-sm text-gray-400">Cargando más ciclos...</span>
    </div>

    <div v-if="store.cycles.length === 0 && !store.isLoading" class="py-20 text-center">
      <p class="text-sm text-gray-400">No hay ciclos académicos configurados aún.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAcademicTimeStore } from '../store'
import type { Cycle, CycleWeek } from '../store/index'
import { useIntersectionObserver } from '@vueuse/core'

const store = useAcademicTimeStore()
const toast = useToast()

const emit = defineEmits<{
  'edit': [cycle: Cycle]
}>()

const pendingWeeks = ref(new Set<string>())
const expandedCycles = ref(new Set<string>())
const loadMoreTrigger = ref<HTMLElement | null>(null)

const targetIsVisible = ref(false)

// Infinite scroll trigger logic
useIntersectionObserver(
  loadMoreTrigger,
  ([{ isIntersecting }]) => {
    targetIsVisible.value = isIntersecting
    if (isIntersecting && store.hasMore && !store.isLoading && !store.error) {
      store.fetchCycles(true)
    }
  },
  { threshold: 0.1 }
)

// In case the screen is large and 1 page doesn't push the trigger out of view,
// fetch more as soon as loading finishes and it's still visible
watch(() => store.isLoading, (loading) => {
  if (!loading && targetIsVisible.value && store.hasMore && !store.error) {
    store.fetchCycles(true)
  }
})

function toggleCycleExpand(id: string) {
  if (expandedCycles.value.has(id)) expandedCycles.value.delete(id)
  else expandedCycles.value.add(id)
}

function activeWeekCount(cycle: Cycle) {
  return cycle.weeks.filter(w => w.isActive).length
}

function getCycleDaysText(days: number) {
  if (days === 1) return 'Solo Lunes'
  if (days === 2) return 'Lunes a Martes'
  if (days === 3) return 'Lunes a Miércoles'
  if (days === 4) return 'Lunes a Jueves'
  if (days === 5) return 'Lunes a Viernes'
  if (days === 6) return 'Lunes a Sábado'
  if (days === 7) return 'Lunes a Domingo'
  return `${days} días por sem.`
}

function formatDayWithShortName(dateStr: string) {
  if (!dateStr) return '?'
  const date = new Date(dateStr + 'T00:00:00Z')
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const dayName = days[date.getUTCDay()]
  const [, , day] = dateStr.split('-')
  return `${dayName} ${day}`
}

function formatMonthRange(start: string, end: string) {
  if (!start) return ''
  const [, sMonth] = start.split('-')
  
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const sMonthName = months[parseInt(sMonth, 10) - 1]
  
  if (!end) return sMonthName
  
  const [, eMonth] = end.split('-')
  const eMonthName = months[parseInt(eMonth, 10) - 1]
  
  if (sMonth === eMonth) {
    return sMonthName
  } else {
    return `${sMonthName} - ${eMonthName}`
  }
}

function weekCellClass(week: CycleWeek) {
  if (pendingWeeks.value.has(week.id)) return 'border-indigo-200 dark:border-indigo-500/30 opacity-70 pointer-events-none'
  if (week.isActive) return 'border-indigo-200/60 dark:border-indigo-500/30 hover:border-indigo-400 hover:shadow-md dark:hover:border-indigo-400 shadow-sm'
  return 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 week-cell--inactive bg-slate-50 dark:bg-[#1e1e2d]'
}

async function onToggleWeek(week: CycleWeek) {
  pendingWeeks.value.add(week.id)
  try {
    await store.toggleWeekVisibility(week.id, !week.isActive)
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  } finally {
    pendingWeeks.value.delete(week.id)
  }
}

async function onToggleCycleVisibility(cycle: Cycle) {
  try {
    await store.toggleCycleVisibility(cycle.id, !cycle.isActive)
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  }
}

async function onDeleteCycle(cycleId: string) {
  if (!confirm('¿Estás seguro de eliminar este ciclo?')) return;
  try {
    await store.deleteCycle(cycleId)
    toast.add({ title: 'Ciclo eliminado', color: 'success', timeout: 2000 })
  } catch (e: any) {
    toast.add({ title: e.message, color: 'error', timeout: 3000 })
  }
}

function onEditCycle(cycle: Cycle) {
  emit('edit', cycle)
}
</script>
