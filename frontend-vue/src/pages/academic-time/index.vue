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
      <button
        class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20"
        @click="showCreateSlide = true"
      >
        <span class="text-lg leading-none mb-0.5">+</span>
        Nuevo Ciclo
      </button>
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
    <WeeksMatrix v-show="store.cycles.length > 0 || !store.isLoading" />

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
