<template>
  <div class="px-8 py-6 max-w-full">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Catálogo de Cursos</h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          Sincronizado con Banco Global
        </span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.isLoading && store.courses.length === 0" class="space-y-2">
      <div v-for="i in 6" :key="i" class="h-9 bg-gray-100 rounded-md animate-pulse" />
    </div>

    <!-- Table -->
    <CatalogTable v-show="store.courses.length > 0 || !store.isLoading" />

    <!-- Kbd hint -->
    <p class="mt-5 text-xs text-gray-300 flex items-center gap-1.5">
      <kbd class="inline-flex h-4 items-center rounded border border-gray-200 bg-gray-50 px-1 text-[10px] text-gray-400">⌘K</kbd>
      para buscar rápidamente en todos los temas
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCatalogsStore } from '../../features/catalogs/store'
import CatalogTable from '../../features/catalogs/components/CatalogTable.vue'

definePageMeta({
  layout: 'b2b',
  permissions: ['view_catalogs'],
})

const store = useCatalogsStore()
onMounted(() => store.fetchCourses())
</script>
