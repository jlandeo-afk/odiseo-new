<template>
  <!-- Academic Time Matrix - Full-width Data-Density -->
  <div class="w-full space-y-6">
    <div
      v-for="cycle in store.cycles"
      :key="cycle.id"
      class="border border-gray-100 rounded-lg overflow-hidden"
    >
      <!-- Cycle header -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <h3 class="text-sm font-semibold text-gray-900">{{ cycle.name }}</h3>
          <span class="text-xs text-gray-400">
            {{ cycle.startDate }} → {{ cycle.endDate }}
          </span>
          <button
            class="text-[10px] px-2 py-0.5 rounded text-white transition-colors"
            :class="cycle.isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'"
            @click="onToggleCycleVisibility(cycle)"
          >
            {{ cycle.isActive ? 'Activo' : 'Inactivo' }}
          </button>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">
              {{ activeWeekCount(cycle) }}/{{ cycle.weeks.length }} semanas
            </span>
            <div class="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all duration-300"
                :style="{ width: `${(activeWeekCount(cycle) / cycle.weeks.length) * 100}%` }"
              />
            </div>
          </div>
          <button 
            @click="onDeleteCycle(cycle.id)"
            class="text-xs text-red-500 hover:text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      <!-- Weeks grid -->
      <div class="p-4">
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
            <span v-if="pendingWeeks.has(week.id)" class="absolute inset-0 flex items-center justify-center bg-white/60 rounded">
              <svg class="w-3 h-3 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </span>

            <span class="text-[10px] font-semibold" :class="week.isActive ? 'text-gray-700' : 'text-gray-300'">
              S{{ week.weekNumber }}
            </span>
            <span class="text-[9px] leading-tight mt-0.5 block" :class="week.isActive ? 'text-gray-400' : 'text-gray-200'">
              {{ formatShortDate(week.startDate) }}
            </span>

            <span
              v-if="!week.isActive"
              class="absolute top-0.5 right-0.5 text-[8px] text-orange-400 font-medium"
            >✦</span>

            <span
              class="absolute -bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] transition-opacity whitespace-nowrap"
              :class="week.isActive ? 'text-orange-400' : 'text-emerald-500'"
            >
              {{ week.isActive ? 'Ocultar' : 'Mostrar' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.cycles.length === 0" class="py-20 text-center">
      <p class="text-sm text-gray-400">No hay ciclos académicos configurados aún.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAcademicTimeStore } from '../store'
import type { Cycle, CycleWeek } from '../store/index'

const store = useAcademicTimeStore()
const toast = useToast()

const pendingWeeks = ref(new Set<string>())

function activeWeekCount(cycle: Cycle) {
  return cycle.weeks.filter(w => w.isActive).length
}

function formatShortDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function weekCellClass(week: CycleWeek) {
  if (pendingWeeks.value.has(week.id)) return 'border-blue-200 bg-blue-50 opacity-60 pointer-events-none'
  if (week.isActive) return 'border-blue-100 bg-blue-50/50 hover:border-blue-300 hover:bg-blue-100/50'
  return 'border-gray-100 bg-gray-50/40 hover:border-orange-200 hover:bg-orange-50/30 week-cell--inactive'
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
