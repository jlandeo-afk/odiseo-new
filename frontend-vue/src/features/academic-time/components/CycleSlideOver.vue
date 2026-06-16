<template>
  <!-- Slide-over for creating a new Cycle (non-blocking) -->
  <Transition name="backdrop-fade">
    <div v-if="modelValue" class="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" @click="$emit('update:modelValue', false)" />
  </Transition>

  <Transition name="slideover">
    <div
      v-if="modelValue"
      class="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-sm font-semibold text-gray-900">Nuevo Ciclo Académico</h2>
          <p class="text-xs text-gray-400 mt-0.5">Las semanas se asignarán dentro del rango de fechas</p>
        </div>
        <button
          class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          @click="$emit('update:modelValue', false)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="flex-1 px-6 py-5 space-y-5">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Nombre del ciclo *</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="ej. Ciclo Verano 2027"
            class="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-gray-300"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Fecha inicio *</label>
            <input
              v-model="form.startDate"
              type="date"
              class="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-gray-700"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Fecha fin *</label>
            <input
              v-model="form.endDate"
              type="date"
              class="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-gray-700"
            />
          </div>
        </div>

        <!-- Preview -->
        <div v-if="estimatedWeeks > 0" class="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
          <p class="text-xs text-blue-600 font-medium">Estimado: {{ estimatedWeeks }} semanas</p>
          <p class="text-xs text-blue-400 mt-0.5">Basado en el rango de fechas seleccionado</p>
        </div>

        <div v-if="error" class="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
          <p class="text-xs text-red-600">{{ error }}</p>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          @click="$emit('update:modelValue', false)"
        >
          Cancelar
        </button>
        <button
          class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-2"
          :disabled="!isFormValid || isSubmitting"
          @click="onSubmit"
        >
          <svg v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Crear ciclo
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAcademicTimeStore } from '../store'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': []
}>()

const store = useAcademicTimeStore()
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  name: '',
  startDate: '',
  endDate: ''
})

const estimatedWeeks = computed(() => {
  if (!form.startDate || !form.endDate) return 0
  const start = new Date(form.startDate)
  const end = new Date(form.endDate)
  const diff = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(0, diff)
})

const isFormValid = computed(() =>
  form.name.trim() &&
  form.startDate &&
  form.endDate &&
  form.startDate < form.endDate
)

async function onSubmit() {
  if (!isFormValid.value) return
  isSubmitting.value = true
  error.value = null
  try {
    await store.createCycle({ name: form.name, startDate: form.startDate, endDate: form.endDate })
    emit('created')
    emit('update:modelValue', false)
    form.name = ''
    form.startDate = ''
    form.endDate = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 200ms ease;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.slideover-enter-active,
.slideover-leave-active {
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.slideover-enter-from,
.slideover-leave-to {
  transform: translateX(100%);
}
</style>
