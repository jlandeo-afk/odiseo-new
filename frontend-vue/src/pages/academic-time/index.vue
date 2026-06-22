<template>
  <div class="px-8 py-6 max-w-full">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Tiempo Académico</h1>
        <p class="text-sm text-slate-500 mt-1">
          Gestiona los ciclos y semanas. Marca feriados sin eliminar registros.
        </p>
      </div>
      <div class="flex items-center gap-4">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Buscar ciclo..."
          class="w-64"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openCreateSlide"
        >
          Nuevo Ciclo
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading && store.cycles.length === 0" class="space-y-4">
      <div v-for="i in 2" :key="i" class="border border-gray-100 rounded-lg overflow-hidden">
        <div class="h-10 bg-gray-50 border-b border-gray-100 animate-pulse" />
        <div class="p-4 grid grid-cols-8 gap-1.5">
          <div v-for="j in 8" :key="j" class="h-14 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Weeks matrix -->
    <WeeksMatrix v-show="store.cycles.length > 0 || !store.isLoading" @edit="openEditSlide" />

    <!-- Slide-over (non-blocking) -->
    <CycleSlideOver v-model="showCreateSlide" :cycleToEdit="selectedCycle" @submit="onSubmitted" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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

onMounted(() => store.fetchCycles())

watchDebounced(
  searchQuery,
  (newVal) => {
    store.fetchCycles(false, newVal)
  },
  { debounce: 400, maxWait: 1000 }
)

function openCreateSlide() {
  selectedCycle.value = null
  showCreateSlide.value = true
}

function openEditSlide(cycle: Cycle) {
  selectedCycle.value = cycle
  showCreateSlide.value = true
}

function onSubmitted() {
  toast.add({ title: selectedCycle.value ? 'Ciclo actualizado con éxito' : 'Ciclo creado con éxito', color: 'success', timeout: 2500 })
  showCreateSlide.value = false
}
</script>
