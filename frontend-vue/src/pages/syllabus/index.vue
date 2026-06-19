<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSyllabusStore } from '../../features/syllabus/store';
import { useAcademicTimeStore } from '../../features/academic-time/store';
import { useCatalogsStore } from '../../features/catalogs/store';
import SyllabusSlideOver from '../../features/syllabus/components/SyllabusSlideOver.vue';
import SyllabusDistributionMatrix from '../../features/syllabus/components/SyllabusDistributionMatrix.vue';
import SyllabusCloneModal from '../../features/syllabus/components/SyllabusCloneModal.vue';

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();

const slideOverRef = ref();
const cloneModalRef = ref();

const selectedCycleId = ref<string>('');

definePageMeta({
  layout: 'b2b',
  permissions: ['view_syllabus'],
});

onMounted(async () => {
  await Promise.all([
    timeStore.fetchCycles(),
    catalogsStore.fetchCourses()
  ]);
  
  if (timeStore.cycles.length > 0) {
    const activeCycle = timeStore.cycles.find(c => c.isActive) || timeStore.cycles[0];
    selectedCycleId.value = activeCycle.id;
  }
});

watch(selectedCycleId, async (newCycleId) => {
  if (newCycleId) {
    store.syllabus = null; 
    await store.fetchSyllabiByCycle(newCycleId);
  }
});

const cycleOptions = computed(() => {
  return timeStore.cycles.map(c => ({
    label: c.name,
    value: c.id
  }));
});

const coursesList = computed(() => {
  return catalogsStore.courses.map(course => {
    const syllabus = store.syllabiList.find(s => s.courseId === course.id);
    return {
      ...course,
      syllabus
    };
  });
});

const openCreate = (courseId?: string) => {
  if (slideOverRef.value) {
    if (courseId) {
      slideOverRef.value.form.courseId = courseId;
    }
    slideOverRef.value.form.cycleId = selectedCycleId.value;
    slideOverRef.value.isOpen = true;
  }
};

const openClone = (courseId?: string) => {
  if (cloneModalRef.value) {
    cloneModalRef.value.isOpen = true;
  }
};

const openSyllabus = (syllabus: any) => {
  store.syllabus = syllabus;
};

const backToList = () => {
  store.syllabus = null;
};
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Gestión de Sílabos</h1>
        <p class="text-sm text-slate-500 mt-1">Configura la distribución semanal de preguntas para tus cursos por ciclo.</p>
      </div>
      <div class="flex items-center gap-4">
        <USelectMenu
          v-model="selectedCycleId"
          :options="cycleOptions"
          value-attribute="value"
          option-attribute="label"
          placeholder="Seleccionar ciclo..."
          class="w-48"
        />
      </div>
    </div>

    <!-- Active Syllabus View -->
    <div v-if="store.syllabus" class="space-y-6">
      <div class="flex items-center gap-4 mb-4">
        <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" @click="backToList">Volver al listado</UButton>
      </div>
      <UAlert color="success" variant="subtle" icon="i-heroicons-check-circle" title="Sílabo Activo" :description="`ID: ${store.syllabus.id} | Curso: ${store.syllabus.courseId}`" />
      <SyllabusDistributionMatrix />
    </div>

    <!-- Course List for Selected Cycle -->
    <div v-else>
      <div class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50 text-sm">
            <thead class="bg-slate-50 dark:bg-[#1e1e2d]/50">
              <tr>
                <th class="px-6 py-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Curso</th>
                <th class="px-6 py-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Estado</th>
                <th class="px-6 py-4 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-if="timeStore.isLoading || catalogsStore.isLoading || store.loading">
                <td colspan="3" class="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Cargando...</td>
              </tr>
              <template v-else>
                <tr v-for="item in coursesList" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-[#36364e] transition-colors group">
                  <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
                    </div>
                    {{ item.name }}
                  </td>
                  <td class="px-6 py-4">
                    <span v-if="item.syllabus" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Planificado
                    </span>
                    <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Sin Configurar
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div v-if="item.syllabus" class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <UButton size="sm" color="neutral" variant="ghost" icon="i-heroicons-document-duplicate" @click="openClone(item.id)">Clonar</UButton>
                      <UButton size="sm" color="primary" variant="soft" icon="i-heroicons-pencil-square" @click="openSyllabus(item.syllabus)">Editar</UButton>
                    </div>
                    <div v-else class="flex justify-end gap-2">
                      <UButton size="sm" color="neutral" variant="ghost" icon="i-heroicons-document-duplicate" @click="openClone(item.id)">Copiar</UButton>
                      <UButton size="sm" color="primary" icon="i-heroicons-plus" @click="openCreate(item.id)">Crear Sílabo</UButton>
                    </div>
                  </td>
                </tr>
                <tr v-if="coursesList.length === 0">
                  <td colspan="3" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <UIcon name="i-heroicons-folder-open" class="w-12 h-12 mx-auto mb-3 opacity-50" />
                    No hay cursos en el catálogo.
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <SyllabusSlideOver ref="slideOverRef" />
    <SyllabusCloneModal ref="cloneModalRef" />
  </div>
</template>
