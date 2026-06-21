<template>
  <div class="flex flex-col bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden min-h-[360px] ring-1 ring-black/[0.02]">

    <div v-if="store.isLoadingProfiles" class="flex items-center justify-center flex-1 py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-slate-300" />
    </div>

    <div v-else-if="!templates || templates.length === 0" class="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
      <div class="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-document-duplicate" class="w-8 h-8 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">No hay plantillas configuradas</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        Empieza creando una plantilla base para definir cuántas preguntas de cada curso irán en los exámenes.
      </p>
      <NuxtLink
        :to="`/academic-time/cycles/${cycleId}/materials/new`"
        class="mt-6 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-md transition-colors"
      >
        Crear mi primera plantilla
      </NuxtLink>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-6 lg:p-8">
      <div class="flex justify-end mb-6">
        <NuxtLink
          :to="`/academic-time/cycles/${cycleId}/materials/new`"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
        >
          <span class="text-lg leading-none mb-0.5">+</span>
          Nueva Plantilla
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="template in templates"
          :key="template.id"
          class="group relative flex flex-col p-5 bg-white dark:bg-[#252536] border border-slate-200 dark:border-slate-700/60 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200"
        >
          <div class="flex items-start justify-between mb-3">
            <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <NuxtLink :to="`/academic-time/cycles/${cycleId}/materials/${template.id}`" class="focus:outline-none">
                <span class="absolute inset-0" aria-hidden="true"></span>
                {{ template.name }}
              </NuxtLink>
            </h4>
            <button
              @click.prevent.stop="handleDelete(template.id)"
              class="relative z-10 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              title="Eliminar"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
            </button>
          </div>

          <div class="mt-auto space-y-2.5">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 text-slate-400" />
              <span>{{
                template.scope === 'CURRENT_WEEK'
                  ? 'Semana actual'
                  : template.scope === 'FULL_ACCUMULATIVE'
                  ? 'Acumulativo (todo el ciclo)'
                  : `Acumulativo (${template.accumulationWeeks} sem)`
              }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-slate-400" />
              <span><strong class="text-slate-700 dark:text-slate-300">{{ template.courses.length }}</strong> cursos participan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAcademicTimeStore } from '@/features/academic-time/store'

const props = defineProps<{ cycleId: string }>()

const store = useAcademicTimeStore()

const templates = computed(() => store.templatesByCycle[props.cycleId] ?? [])

onMounted(async () => {
  await store.fetchTemplates(props.cycleId)
})

async function handleDelete(templateId: string) {
  if (!confirm('¿Seguro que deseas eliminar esta plantilla? Los exámenes generados con ella no se borrarán.')) return
  try {
    await store.deleteTemplate(props.cycleId, templateId)
  } catch (e) {
    console.error(e)
    alert('Error al eliminar.')
  }
}
</script>
