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
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ cycle.startDate }} → {{ cycle.endDate }}
          </span>
          <button
            class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border focus:outline-none"
            :class="cycle.isActive 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20' 
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'"
            @click="onToggleCycleVisibility(cycle)"
          >
            <UIcon :name="cycle.isActive ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'" class="w-3.5 h-3.5" />
            <span>{{ cycle.isActive ? 'Activo' : 'Archivado' }}</span>
          </button>
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
          <button
            @click="toggleCycleExpand(cycle.id)"
            class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
          >
            {{ expandedCycles.has(cycle.id) ? 'Ocultar Semanas' : 'Ver Semanas' }}
          </button>
          <button 
            @click="onDeleteCycle(cycle.id)"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 ml-2 rounded-md transition-colors"
            title="Eliminar Ciclo"
          >
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Weeks grid -->
      <div v-if="expandedCycles.has(cycle.id)" class="p-5">
        <div class="grid gap-1.5" :style="`grid-template-columns: repeat(${Math.min(cycle.weeks.length, 12)}, minmax(0, 1fr))`">
          <button
            v-for="week in cycle.weeks"
            :key="week.id"
            class="week-cell relative group flex flex-col items-center justify-center rounded border text-center cursor-pointer select-none"
            :class="weekCellClass(week)"
            style="min-height: 56px; padding: 4px 2px;"
            :title="week.isActive ? `Semana ${week.weekNumber} — click para desactivar` : `Semana ${week.weekNumber} — click para reactivar`"
            @click="onToggleWeek(week)"
          >
            <span v-if="pendingWeeks.has(week.id)" class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-[#2b2b3f]/60 rounded">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-indigo-500" />
            </span>

            <span class="text-[10px] font-semibold" :class="week.isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500 line-through'">
              S{{ week.weekNumber }}
            </span>
            <span class="text-[9px] leading-tight mt-0.5 block font-medium" :class="week.isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'">
              {{ formatShortDate(week.startDate) }}
            </span>

            <span
              v-if="!week.isActive"
              class="absolute top-0.5 right-0.5 text-[8px] text-slate-400 dark:text-slate-600 font-medium"
            >
              <UIcon name="i-heroicons-no-symbol" class="w-2.5 h-2.5" />
            </span>

            <span
              class="absolute -bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] font-bold transition-opacity whitespace-nowrap"
              :class="week.isActive ? 'text-rose-500' : 'text-emerald-500'"
            >
              {{ week.isActive ? 'Pausar' : 'Activar' }}
            </span>
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

function formatShortDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function weekCellClass(week: CycleWeek) {
  if (pendingWeeks.value.has(week.id)) return 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 opacity-50 pointer-events-none'
  if (week.isActive) return 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-500/30 dark:bg-indigo-500/10 hover:border-indigo-400 hover:bg-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20'
  return 'border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-[#1e1e2d]/50 hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-[#1e1e2d] week-cell--inactive'
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
</script>
