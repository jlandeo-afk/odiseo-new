<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSyllabusStore } from '../../features/syllabus/store';
import { useAcademicTimeStore } from '../../features/academic-time/store';
import { useCatalogsStore } from '../../features/catalogs/store';
import SyllabusSlideOver from '../../features/syllabus/components/SyllabusSlideOver.vue';
import SyllabusDistributionMatrix from '../../features/syllabus/components/SyllabusDistributionMatrix.vue';


definePageMeta({
  layout: 'b2b',
  permissions: ['view_syllabus'],
});

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();

const slideOverRef = ref<any>();


// v-model holds the UUID directly (using value-key="id")
const selectedCycleId = ref<string>('');

onMounted(async () => {
  await Promise.all([
    timeStore.fetchCycles(),
    catalogsStore.fetchCourses(),
  ]);

  if (timeStore.cycles.length > 0) {
    const activeCycle = timeStore.cycles.find(c => c.isActive) ?? timeStore.cycles[0];
    selectedCycleId.value = activeCycle.id;
  }
});

watch(selectedCycleId, async (newCycleId) => {
  if (newCycleId) {
    store.syllabus = null;
    await store.fetchSyllabiByCycle(newCycleId);
  }
});

// Items passed directly as cycle objects; value-key="id" keeps v-model as UUID
const cycleItems = computed(() => timeStore.cycles);

const selectedCycleName = computed(() => {
  const found = timeStore.cycles.find(c => c.id === selectedCycleId.value);
  return found?.name ?? '';
});

const syllabusesList = computed(() => {
  return store.syllabiList.map(syllabus => {
    const course = catalogsStore.courses.find(c => c.id === syllabus.courseId);
    return {
      ...syllabus,
      courseName: course ? course.name : 'Curso Desconocido'
    };
  });
});

function openCreate(courseId?: string) {
  if (slideOverRef.value) {
    if (courseId) slideOverRef.value.form.courseId = courseId;
    slideOverRef.value.form.cycleId = selectedCycleId.value;
    slideOverRef.value.isOpen = true;
  }
}



function openSyllabus(syllabus: any) {
  store.syllabus = syllabus;
}

function backToList() {
  store.syllabus = null;
}
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">

    <!-- Page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Gestión de Sílabos</h1>
        <p class="text-sm text-slate-500 mt-1">Configura la distribución semanal de preguntas para tus cursos por ciclo.</p>
      </div>

      <!-- Cycle selector and Add Syllabus button -->
      <div class="flex items-center gap-4">
        <USelectMenu
          v-model="selectedCycleId"
          :items="cycleItems"
          value-key="id"
          label-key="name"
          placeholder="Seleccionar ciclo..."
          class="w-56"
          :search-input="false"
        />
        <UButton v-if="!store.syllabus" color="primary" icon="i-heroicons-plus" @click="openCreate()">
          Crear Sílabo
        </UButton>
      </div>
    </div>

    <!-- ── Active Syllabus → Distribution Matrix ── -->
    <div v-if="store.syllabus" class="space-y-4">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" @click="backToList">
          Volver al listado
        </UButton>
        <span class="text-sm text-slate-500 dark:text-slate-400">
          Ciclo: <strong class="text-slate-700 dark:text-slate-200">{{ selectedCycleName }}</strong>
        </span>
      </div>
      <SyllabusDistributionMatrix />
    </div>

    <!-- ── Course List ── -->
    <div v-else>
      <div class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50 text-sm">
            <thead class="bg-slate-50 dark:bg-[#1e1e2d]/50">
              <tr>
                <th class="px-6 py-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Curso</th>
                <th class="px-6 py-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Estado Sílabo</th>
                <th class="px-6 py-4 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">

              <!-- Loading -->
              <tr v-if="timeStore.isLoading || catalogsStore.isLoading || store.loading">
                <td colspan="3" class="px-6 py-10 text-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                </td>
              </tr>

              <template v-else>
                <tr
                  v-for="item in syllabusesList"
                  :key="item.id"
                  class="hover:bg-slate-50 dark:hover:bg-[#36364e] transition-colors group"
                >
                  <!-- Course name -->
                  <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
                      </div>
                      {{ item.courseName }}
                    </div>
                  </td>

                  <!-- Status badge -->
                  <td class="px-6 py-4">
                    <span
                      v-if="item.isActive"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    >✓ Planificado</span>
                    <span
                      v-else
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                    >Archivado</span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                      <UButton
                        size="sm"
                        :color="item.isActive ? 'error' : 'success'"
                        variant="soft"
                        :icon="item.isActive ? 'i-heroicons-archive-box-arrow-down' : 'i-heroicons-arrow-path'"
                        @click="store.toggleSyllabusVisibility(item.id, !item.isActive)"
                      >
                        {{ item.isActive ? 'Archivar' : 'Activar' }}
                      </UButton>

                      <UButton size="sm" color="primary" variant="soft" icon="i-heroicons-pencil-square" @click="openSyllabus(item)">Editar</UButton>
                    </div>
                  </td>
                </tr>

                <!-- Empty state (No syllabuses for this cycle) -->
                <tr v-if="syllabusesList.length === 0">
                  <td colspan="3" class="px-6 py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-[#1e1e2d]/30">
                    <UIcon name="i-heroicons-document-plus" class="w-12 h-12 mx-auto mb-4 opacity-40 text-indigo-500" />
                    <p class="text-base font-medium text-slate-700 dark:text-slate-300">No hay sílabos configurados</p>
                    <p class="mt-1 text-sm max-w-sm mx-auto">Para comenzar a planificar este ciclo, crea un nuevo sílabo vinculando un curso del catálogo.</p>
                    <UButton color="primary" icon="i-heroicons-plus" class="mt-5" @click="openCreate()">Crear Primer Sílabo</UButton>
                  </td>
                </tr>
              </template>

            </tbody>
          </table>
        </div>
      </div>
    </div>

    <SyllabusSlideOver ref="slideOverRef" />
  </div>
</template>
