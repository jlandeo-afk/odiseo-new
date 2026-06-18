<template>
  <div class="px-8 py-6 max-w-full">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Tiempo Académico</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          Gestiona los ciclos y semanas. Marca feriados sin eliminar registros.
        </p>
      </div>
      <button
        class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
        @click="showCreateSlide = true"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Nuevo Ciclo
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="border border-gray-100 rounded-lg overflow-hidden">
        <div class="h-10 bg-gray-50 border-b border-gray-100 animate-pulse" />
        <div class="p-4 grid grid-cols-8 gap-1.5">
          <div v-for="j in 8" :key="j" class="h-14 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Weeks matrix -->
    <WeeksMatrix v-else />

    <!-- Slide-over (non-blocking) -->
    <CycleSlideOver v-model="showCreateSlide" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAcademicTimeStore } from '../../features/academic-time/store'
import WeeksMatrix from '../../features/academic-time/components/WeeksMatrix.vue'
import CycleSlideOver from '../../features/academic-time/components/CycleSlideOver.vue'
import { useToast } from '#imports'

definePageMeta({
  layout: 'b2b',
  permissions: ['view_catalogs'],
})

const store = useAcademicTimeStore()
const showCreateSlide = ref(false)
const toast = useToast()

onMounted(() => store.fetchCycles())

function onCreated() {
  toast.add({ title: 'Ciclo creado con éxito', color: 'success', timeout: 2500 })
}
</script>
