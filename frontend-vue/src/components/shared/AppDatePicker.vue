<template>
  <UPopover>
    <UButton 
      variant="outline" 
      icon="i-heroicons-calendar" 
      class="w-full justify-start text-left font-normal border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1e1e2d] text-slate-700 dark:text-slate-300" 
      :label="formattedDate || 'Seleccionar fecha'" 
    />
    <template #content>
      <div class="p-3 w-[260px] bg-white dark:bg-[#2b2b3f] rounded-lg shadow-xl ring-1 ring-slate-200 dark:ring-slate-700/50 select-none">
        <!-- Calendar Header -->
        <div class="flex items-center justify-between mb-3">
          <UButton icon="i-heroicons-chevron-left" variant="ghost" size="xs" color="neutral" @click="prevMonth" class="hover:bg-slate-100 dark:hover:bg-slate-800" />
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
            {{ monthName }} {{ currentYear }}
          </span>
          <UButton icon="i-heroicons-chevron-right" variant="ghost" size="xs" color="neutral" @click="nextMonth" class="hover:bg-slate-100 dark:hover:bg-slate-800" />
        </div>
        <!-- Days Header -->
        <div class="grid grid-cols-7 gap-1 mb-2 text-center">
          <span v-for="day in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="day" class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {{ day }}
          </span>
        </div>
        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1">
          <div v-for="blank in blankDays" :key="'blank-' + blank" class="h-8"></div>
          <button
            v-for="day in daysInMonth"
            :key="day"
            @click="selectDate(day)"
            class="h-8 w-8 rounded-md flex items-center justify-center text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            :class="[
              isSelected(day) 
                ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                : isToday(day)
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            ]"
          >
            {{ day }}
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const currentDate = ref(new Date())

// If initial value exists, set the calendar to that month
watch(() => props.modelValue, (val) => {
  if (val) {
    const [y, m, d] = val.split('-')
    if (y && m) {
      currentDate.value = new Date(Number(y), Number(m) - 1, 1)
    }
  }
}, { immediate: true })

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthName = computed(() => {
  return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(currentDate.value)
})

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

const blankDays = computed(() => {
  // 0 = Sunday, 1 = Monday. We want Monday to be 0 for the grid.
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1).getDay()
  return firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
})

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function selectDate(day: number) {
  const y = currentYear.value
  const m = String(currentMonth.value + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}-${d}`)
}

function isSelected(day: number) {
  if (!props.modelValue) return false
  const [y, m, d] = props.modelValue.split('-')
  return Number(y) === currentYear.value && Number(m) === currentMonth.value + 1 && Number(d) === day
}

function isToday(day: number) {
  const today = new Date()
  return today.getFullYear() === currentYear.value && today.getMonth() === currentMonth.value && today.getDate() === day
}

const formattedDate = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
})
</script>
