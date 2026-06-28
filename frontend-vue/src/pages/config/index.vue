<script setup lang="ts">
import { ref } from 'vue'
import PdfDesignList from '@/features/materials/components/PdfDesignList.vue'
import PdfDesignForm from '@/features/materials/components/PdfDesignForm.vue'

definePageMeta({ layout: 'b2b', permissions: ['generate_material'] })

type View = 'list' | 'editor'
const currentView = ref<View>('list')
const editingId = ref<string | null>(null)

function openNew() {
  editingId.value = null
  currentView.value = 'editor'
}

function openEdit(id: string) {
  editingId.value = id
  currentView.value = 'editor'
}

function goBack() {
  currentView.value = 'list'
  editingId.value = null
}
</script>

<template>
  <div class="h-screen flex flex-col bg-white dark:bg-[#0f1117]">
    <!-- List View -->
    <template v-if="currentView === 'list'">
      <div class="px-8 pt-6 pb-4 border-b border-slate-200 dark:border-white/5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
              <UIcon name="i-heroicons-paint-brush" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Plantillas de Diseño PDF</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Personaliza la apariencia de los PDFs generados</p>
            </div>
          </div>
          <UButton color="indigo" size="md" icon="i-heroicons-plus" @click="openNew">
            Nueva plantilla
          </UButton>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-8 py-6">
        <PdfDesignList @create="openNew" @edit="openEdit" />
      </div>
    </template>

    <!-- Editor View -->
    <template v-else>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#11131a] shrink-0">
        <div class="flex items-center gap-3">
          <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" @click="goBack" size="sm" />
          <span class="text-sm font-bold text-slate-700 dark:text-slate-300">
            {{ editingId ? 'Editar plantilla' : 'Nueva plantilla' }}
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#0f1117]">
        <PdfDesignForm :design-id="editingId || undefined" @saved="goBack" @cancelled="goBack" />
      </div>
    </template>
  </div>
</template>
