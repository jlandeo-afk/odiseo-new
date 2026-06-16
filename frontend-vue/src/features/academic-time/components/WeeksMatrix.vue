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
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">
            {{ activeWeekCount(cycle) }}/{{ cycle.weeks.length }} semanas activas
          </span>
          <!-- Mini progress bar -->
          <div class="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 rounded-full transition-all duration-300"
              :style="{ width: `${(activeWeekCount(cycle) / cycle.weeks.length) * 100}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Weeks grid (full-width, hiper-compact) -->
      <div class="p-4">
        <div class="grid gap-1.5" :style="`grid-template-columns: repeat(${Math.min(cycle.weeks.length, 12)}, minmax(0, 1fr))`">
          <button
            v-for="week in cycle.weeks"
            :key="week.id"
            class="week-cell relative group flex flex-col items-center justify-center rounded border text-center cursor-pointer select-none"
            :class="weekCellClass(week)"
            style="min-height: 56px; padding: 4px 2px;"
            :title="week.isActive ? `Semana ${week.weekNumber} — click para marcar como feriado` : `Semana ${week.weekNumber} (Feriado) — click para reactivar`"
            @click="onToggleWeek(cycle.id, week)"
          >
            <!-- Pending spinner overlay -->
            <span v-if="week._pending" class="absolute inset-0 flex items-center justify-center bg-white/60 rounded">
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

            <!-- Inactive badge -->
            <span
              v-if="!week.isActive"
              class="absolute top-0.5 right-0.5 text-[8px] text-orange-400 font-medium"
            >✦</span>

            <!-- Hover action hint -->
            <span
              class="absolute -bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] transition-opacity whitespace-nowrap"
              :class="week.isActive ? 'text-orange-400' : 'text-emerald-500'"
            >
              {{ week.isActive ? 'Feriado' : 'Activar' }}
            </span>
          </button>
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-4 mt-3">
          <span class="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span class="w-3 h-3 rounded-sm border border-blue-200 bg-blue-50 inline-block"/>
            Semana activa
          </span>
          <span class="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span class="w-3 h-3 rounded-sm border border-gray-200 bg-gray-50 inline-block week-cell--inactive"/>
            Feriado/Vacación
          </span>
        </div>
      </div>
    </div>

    <div v-if="store.cycles.length === 0" class="py-20 text-center">
      <p class="text-sm text-gray-400">No hay ciclos académicos configurados aún.</p>
      <p class="text-xs text-gray-300 mt-1">Usa el botón "Nuevo Ciclo" para comenzar.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAcademicTimeStore } from '../store'
import type { Cycle, CycleWeek } from '../types'
import { useToast } from '#imports'

const store = useAcademicTimeStore()
const toast = useToast()

function activeWeekCount(cycle: Cycle) {
  return cycle.weeks.filter(w => w.isActive).length
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function weekCellClass(week: CycleWeek) {
  if (week._error) return 'border-red-200 bg-red-50 animate-pulse'
  if (week._pending) return 'border-blue-200 bg-blue-50 opacity-60 pointer-events-none'
  if (week.isActive) return 'border-blue-100 bg-blue-50/50 hover:border-blue-300 hover:bg-blue-100/50'
  return 'border-gray-100 bg-gray-50/40 hover:border-orange-200 hover:bg-orange-50/30 week-cell--inactive'
}

async function onToggleWeek(cycleId: string, week: CycleWeek) {
  try {
    await store.toggleWeek(cycleId, week.id)
  } catch (e: any) {
    toast.add({ title: 'Error al actualizar la semana', color: 'error', timeout: 3000 })
  }
}
</script>
