<script setup lang="ts">
import { onMounted } from 'vue'
import { useToast } from '#imports'
import { usePdfDesignsStore } from '../store/pdfDesigns'

const store = usePdfDesignsStore()
const toast = useToast()

const emit = defineEmits<{
  edit: [id: string]
  create: []
}>()

onMounted(() => {
  store.fetchDesigns()
})

async function handleDelete(design: { id: string; name: string; isDefault: boolean }) {
  if (design.isDefault) {
    toast.add({ title: 'No se puede eliminar la plantilla por defecto', color: 'red', timeout: 3000 })
    return
  }
  const confirmed = await confirm(`¿Eliminar "${design.name}"?`)
  if (!confirmed) return
  try {
    await store.deleteDesign(design.id)
    toast.add({ title: 'Plantilla eliminada', color: 'success', timeout: 2000 })
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || 'No se pudo eliminar'
    toast.add({ title: msg, color: 'red', timeout: 4000 })
  }
}
</script>

<template>
  <div v-if="store.isLoading && store.designs.length === 0" class="space-y-3">
    <USkeleton v-for="n in 3" :key="n" class="h-20 rounded-xl" />
  </div>

  <div v-else-if="store.designs.length === 0"
    class="py-16 text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
    <UIcon name="i-heroicons-paint-brush" class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
    <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No hay plantillas de diseño</p>
    <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Crea la primera para personalizar tus PDFs.</p>
  </div>

  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div v-for="design in store.designs" :key="design.id"
      class="group relative flex flex-col bg-white dark:bg-[#18181e] rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200 overflow-hidden cursor-pointer"
      @click="emit('edit', design.id)">

      <!-- Color accent bar -->
      <div class="h-1.5 w-full shrink-0" :style="{ background: design.primaryColor || '#6366f1' }" />

      <div class="flex items-start gap-4 p-5">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
          :style="{ background: design.primaryColor || '#6366f1' }">
          {{ design.name.charAt(0).toUpperCase() }}
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{{ design.name }}</span>
            <UBadge v-if="design.isDefault" size="xs" color="indigo" variant="solid">Default</UBadge>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-if="design.logoUrl" class="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              <UIcon name="i-heroicons-check" class="w-3 h-3 text-emerald-500" /> Logo
            </span>
            <span v-if="design.showCover" class="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              Portada
            </span>
            <span v-if="design.headerText" class="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              Encabezado
            </span>
          </div>
        </div>

        <UButton color="gray" variant="ghost" icon="i-heroicons-trash"
          :disabled="design.isDefault"
          size="sm"
          class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1"
          :title="design.isDefault ? 'No se puede eliminar la plantilla por defecto' : 'Eliminar'"
          @click.stop="handleDelete(design)" />
      </div>
    </div>
  </div>
</template>
