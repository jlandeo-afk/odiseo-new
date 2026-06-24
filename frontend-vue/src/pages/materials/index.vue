<template>
  <div class="px-6 md:px-10 py-8 max-w-[100vw] space-y-6 overflow-hidden min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#111827] dark:to-[#1e1b4b] text-slate-900 dark:text-white">
    <!-- Top Nav / Header Area -->
    <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-20">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-indigo-55 dark:bg-indigo-950/45 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400 shadow-sm shrink-0">
          <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Monitor de Generación
          </h1>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            Centro avanzado de curaduría y seguimiento de materiales académicos en tiempo real.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- View mode toggle -->
        <div class="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-inner mr-2">
          <button
            @click="currentViewMode = 'kanban'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="currentViewMode === 'kanban' 
              ? 'bg-white dark:bg-[#1a1b2e] text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/5' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
            Kanban
          </button>
          <button
            @click="currentViewMode = 'list'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="currentViewMode === 'list' 
              ? 'bg-white dark:bg-[#1a1b2e] text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/5' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          >
            <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
            Listado
          </button>
        </div>

        <UButton
          color="gray"
          variant="soft"
          icon="i-heroicons-arrow-path-rounded-square"
          @click="fetchHistory"
          class="text-slate-600 font-bold dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
        >
          Actualizar
        </UButton>

        <UButton
          color="indigo"
          icon="i-heroicons-plus"
          @click="openMatrixModal"
          class="shadow-md font-bold tracking-wide rounded-xl"
        >
          Solicitar Material
        </UButton>
      </div>
    </div>

    <!-- Advanced Glassmorphism Filters -->
    <div class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5 shadow-sm relative z-20">
      <!-- Ciclos -->
      <div class="flex-1 w-full">
        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Ciclos Académicos</label>
        <USelectMenu
          v-model="selectedCycleIds"
          :items="timeStore.cycles"
          value-key="id"
          label-key="name"
          placeholder="Seleccionar ciclos..."
          multiple
          class="w-full"
          :search-input="true"
        >
           <template #label>
            <span v-if="selectedCycleIds.length" class="truncate font-bold text-slate-800 dark:text-slate-200">{{ selectedCycleIds.length }} ciclos seleccionados</span>
            <span v-else class="text-slate-500 dark:text-slate-400">Seleccionar ciclos...</span>
          </template>
        </USelectMenu>
      </div>
      
      <!-- Semanas -->
      <div class="w-full md:w-56">
        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Semanas (Filtro)</label>
        <USelectMenu
          v-model="selectedWeeks"
          :items="availableWeeksOptions"
          value-key="value"
          label-key="label"
          placeholder="Todas las semanas"
          multiple
          class="w-full"
        >
           <template #label>
            <span v-if="selectedWeeks.length" class="truncate font-bold text-slate-800 dark:text-slate-200">{{ selectedWeeks.length }} semanas</span>
            <span v-else class="text-slate-500 dark:text-slate-400">Todas las semanas</span>
          </template>
        </USelectMenu>
      </div>

      <!-- Plantillas -->
      <div class="w-full md:w-72">
        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Plantillas Específicas</label>
        <USelectMenu
          v-model="selectedTemplateIds"
          :items="availableTemplates"
          value-key="id"
          label-key="name"
          placeholder="Todas las plantillas"
          multiple
          class="w-full"
          :disabled="availableTemplates.length === 0"
        >
           <template #label>
            <span v-if="selectedTemplateIds.length" class="truncate font-bold text-slate-800 dark:text-slate-200">{{ selectedTemplateIds.length }} plantillas</span>
            <span v-else class="text-slate-500 dark:text-slate-400">Todas las plantillas</span>
          </template>
        </USelectMenu>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && materials.length === 0" class="flex gap-6 overflow-x-hidden pt-4 relative z-10">
      <div v-for="i in 4" :key="i" class="w-[340px] shrink-0 h-[600px] bg-white dark:bg-[#2b2b3f] rounded-3xl animate-pulse border border-slate-200 dark:border-slate-700/50" />
    </div>

    <!-- Empty state -->
    <div v-else-if="materials.length === 0" class="py-24 text-center bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm mt-4 relative z-10">
      <div class="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-5 shadow-sm">
        <UIcon name="i-heroicons-funnel" class="w-8 h-8 text-slate-400 dark:text-slate-550" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1.5 tracking-tight">Workspace Limpio</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
        Modifica tus filtros en la parte superior para cargar el pipeline de generación de materiales.
      </p>
    </div>

    <!-- Kanban Board Layout -->
    <div v-else-if="currentViewMode === 'kanban'" class="flex gap-8 overflow-x-auto pb-10 pt-4 w-full snap-x custom-scrollbar relative z-10">
      
      <!-- Column: Pending & Processing -->
      <MaterialBoardColumn
        title="EN COLA / PROCESANDO"
        icon="i-heroicons-bolt"
        iconClass="text-blue-500 dark:text-blue-400"
        bgClass="bg-blue-50/20 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30"
        :items="generatingMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: In Review -->
      <MaterialBoardColumn
        title="REQUIERE CURADURÍA"
        icon="i-heroicons-eye"
        iconClass="text-fuchsia-500 dark:text-fuchsia-400"
        bgClass="bg-fuchsia-50/20 dark:bg-fuchsia-950/10 border-fuchsia-200 dark:border-fuchsia-900/30"
        :items="reviewMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: Completed -->
      <MaterialBoardColumn
        title="LISTO / PUBLICADO"
        icon="i-heroicons-check-badge"
        iconClass="text-emerald-500 dark:text-emerald-400"
        bgClass="bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30"
        :items="completedMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: Failed -->
      <MaterialBoardColumn
        title="FALLIDOS / EXCEPCIONES"
        icon="i-heroicons-exclamation-triangle"
        iconClass="text-rose-500 dark:text-rose-400"
        bgClass="bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30"
        :items="failedMaterials"
        @clickCard="handleCardClick"
      />
      
      <!-- Spacer for final scrolling margin -->
      <div class="w-4 shrink-0"></div>
    </div>

    <!-- Table/List Layout as Premium Cards List -->
    <div v-else-if="currentViewMode === 'list'" class="space-y-3.5 relative z-10">
      <!-- Headers -->
      <div class="hidden lg:grid grid-cols-12 px-6 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
        <div class="col-span-2">Identificador</div>
        <div class="col-span-2">Ciclo Académico</div>
        <div class="col-span-2">Semana</div>
        <div class="col-span-2">Cursos Solicitados</div>
        <div class="col-span-2">Estado General</div>
        <div class="col-span-2 text-right">Fecha / Acciones</div>
      </div>

      <!-- Card Rows -->
      <div
        v-for="req in materials"
        :key="req.id"
        class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 group cursor-pointer"
        @click="handleCardClick(req)"
      >
        <!-- Identificador -->
        <div class="col-span-12 lg:col-span-2 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
            <UIcon name="i-heroicons-document-text" class="w-4.5 h-4.5" />
          </div>
          <span class="font-bold text-slate-700 dark:text-slate-200 font-mono text-xs">#{{ req.id.slice(0, 8) }}</span>
        </div>

        <!-- Ciclo -->
        <div class="col-span-12 sm:col-span-4 lg:col-span-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
          {{ req.cycle?.name || 'Ciclo Académico' }}
        </div>

        <!-- Semana -->
        <div class="col-span-12 sm:col-span-4 lg:col-span-2">
          <span class="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-650 dark:text-slate-350 border border-slate-200/40 dark:border-slate-750/30">
            Semana {{ req.weekNumber }}
          </span>
        </div>

        <!-- Cursos Solicitados -->
        <div class="col-span-12 sm:col-span-4 lg:col-span-2">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="course in req.courses"
              :key="course.courseId"
              class="px-2 py-0.5 rounded-md text-[9px] font-bold border"
              :class="{
                'bg-emerald-50 text-emerald-750 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20': course.status === 'COMPLETED',
                'bg-rose-50 text-rose-755 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-500/20': course.status === 'FAILED',
                'bg-blue-50 text-blue-755 border-blue-100 dark:bg-blue-500/10 dark:text-blue-450 dark:border-blue-500/20 animate-pulse': course.status === 'PROCESSING',
                'bg-amber-50 text-amber-755 border-amber-100 dark:bg-amber-500/10 dark:text-amber-450 dark:border-amber-500/20': course.status === 'PENDING'
              }"
            >
              {{ getCourseShortName(course.courseId) }}
            </span>
          </div>
        </div>

        <!-- Estado General -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :class="statusColorClass(req.status)"></span>
            <span class="text-xs uppercase tracking-wider font-black" :class="statusTextClass(req.status)">
              {{ statusLabel(req.status) }}
            </span>
          </div>
        </div>

        <!-- Fecha / Acción -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 text-right">
          <span class="text-[11px] text-slate-450 dark:text-slate-500 font-semibold lg:hidden">Fecha:</span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold mr-1 hidden lg:inline">
            {{ formatDate(req.createdAt) }}
          </span>
          <UButton
            size="xs"
            color="indigo"
            variant="soft"
            icon="i-heroicons-eye"
            class="rounded-lg font-bold"
            @click.stop="handleCardClick(req)"
          >
            Detalle
          </UButton>
        </div>
      </div>
    </div>

    <!-- Matrix Generator Slideover -->
    <MaterialMatrixGenerator
      ref="matrixGeneratorRef"
      @success="handleGenerateSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useAcademicTimeStore } from '@/features/academic-time/store';
import { useMaterialsStore } from '@/features/materials/store/materials';
import { useCatalogsStore } from '@/features/catalogs/store';
import MaterialBoardColumn from '@/features/materials/components/MaterialBoardColumn.vue';
import MaterialMatrixGenerator from '@/features/materials/components/MaterialMatrixGenerator.vue';

definePageMeta({
  layout: 'b2b',
  permissions: ['generate_material']
});

const materials = ref<any[]>([]);
const authStore = useAuthStore();
const timeStore = useAcademicTimeStore();
const materialsStore = useMaterialsStore();
const catalogsStore = useCatalogsStore();
const matrixGeneratorRef = ref<any>(null);

const currentViewMode = ref<'kanban' | 'list'>('kanban');

const loading = computed(() => materialsStore.isLoading);

function getCourseShortName(courseId: string): string {
  const course = catalogsStore.courses.find(c => c.id === courseId);
  return course ? course.name : courseId.slice(0, 4).toUpperCase();
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'En Cola',
    PROCESSING: 'Procesando',
    REVIEW_REQUIRED: 'Curaduría',
    IN_REVIEW: 'En Revisión',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
  };
  return labels[status] || status;
}

function statusColorClass(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]';
    case 'PROCESSING': return 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]';
    case 'REVIEW_REQUIRED':
    case 'IN_REVIEW': return 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.6)]';
    case 'COMPLETED': return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]';
    case 'FAILED': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]';
    default: return 'bg-slate-400';
  }
}

function statusTextClass(status: string) {
  switch (status) {
    case 'PENDING': return 'text-amber-500';
    case 'PROCESSING': return 'text-blue-500';
    case 'REVIEW_REQUIRED':
    case 'IN_REVIEW': return 'text-fuchsia-500';
    case 'COMPLETED': return 'text-emerald-500';
    case 'FAILED': return 'text-rose-500';
    default: return 'text-slate-500';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Filters State
const selectedCycleIds = ref<string[]>([]);
const selectedWeeks = ref<number[]>([]);
const selectedTemplateIds = ref<string[]>([]);

const availableWeeksOptions = Array.from({ length: 40 }, (_, i) => ({ value: i + 1, label: `Semana ${i + 1}` }));

// Compute all available templates from the selected cycles
const availableTemplates = computed(() => {
  const list: any[] = [];
  for (const cid of selectedCycleIds.value) {
    const cycleTemplates = timeStore.templatesByCycle[cid];
    if (cycleTemplates) {
      cycleTemplates.forEach(t => {
        // Find the cycle name to append for clarity
        const cname = timeStore.cycles.find(c => c.id === cid)?.name || 'Ciclo';
        list.push({
          id: t.id,
          name: `${t.name} (${cname})`
        });
      });
    }
  }
  return list;
});

// Kanban Board Computed Properties
const generatingMaterials = computed(() => materials.value.filter(m => ['PENDING', 'PROCESSING'].includes(m.status)));
const reviewMaterials = computed(() => materials.value.filter(m => ['REVIEW_REQUIRED', 'IN_REVIEW'].includes(m.status)));
const completedMaterials = computed(() => materials.value.filter(m => ['COMPLETED', 'COMPLETED_WITH_WARNINGS'].includes(m.status)));
const failedMaterials = computed(() => materials.value.filter(m => m.status === 'FAILED'));

// LocalStorage Persistence for Filters
const saveFiltersToLocal = () => {
  localStorage.setItem('materials_selected_cycles', JSON.stringify(selectedCycleIds.value));
  localStorage.setItem('materials_selected_weeks', JSON.stringify(selectedWeeks.value));
  localStorage.setItem('materials_selected_templates', JSON.stringify(selectedTemplateIds.value));
};

const loadFiltersFromLocal = () => {
  try {
    const savedCycles = localStorage.getItem('materials_selected_cycles');
    if (savedCycles) {
      const parsed = JSON.parse(savedCycles);
      if (Array.isArray(parsed)) {
        // Only keep cycle IDs that actually exist in the current database list
        selectedCycleIds.value = parsed.filter((id: string) => 
          timeStore.cycles.some(c => c.id === id)
        );
      }
    }
    
    const savedWeeks = localStorage.getItem('materials_selected_weeks');
    if (savedWeeks) selectedWeeks.value = JSON.parse(savedWeeks);

    const savedTemplates = localStorage.getItem('materials_selected_templates');
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
      if (Array.isArray(parsed)) {
        selectedTemplateIds.value = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse local filters', e);
  }
};

async function fetchHistory() {
  const query = {
    cycleIds: selectedCycleIds.value.length ? selectedCycleIds.value : undefined,
    templateIds: selectedTemplateIds.value.length ? selectedTemplateIds.value : undefined,
    weekNumbers: selectedWeeks.value.length ? selectedWeeks.value : undefined,
  };
  
  try {
    const history = await materialsStore.fetchHistory(query);
    materials.value = history;
  } catch (error) {
    console.error('Error fetching materials history:', error);
  }
}

watch(selectedCycleIds, async (newCycles, oldCycles) => {
  if (newCycles.length > 0) {
    // Fetch templates for the newly added cycles
    const toFetch = newCycles.filter(c => !timeStore.templatesByCycle[c]);
    await Promise.all(toFetch.map(cid => timeStore.fetchTemplates(cid)));

    // Clean up template selections that don't belong to any active cycle templates
    selectedTemplateIds.value = selectedTemplateIds.value.filter(id => 
      availableTemplates.value.some(t => t.id === id)
    );
  }
  
  // Clean up selected templates that belong to cycles no longer selected
  if (oldCycles) {
    const removedCycles = oldCycles.filter(c => !newCycles.includes(c));
    removedCycles.forEach(cid => {
      const orphanTemplates = timeStore.templatesByCycle[cid] || [];
      const orphanIds = orphanTemplates.map((t: any) => t.id);
      selectedTemplateIds.value = selectedTemplateIds.value.filter(id => !orphanIds.includes(id));
    });
  }
});

watch([selectedCycleIds, selectedWeeks, selectedTemplateIds], () => {
  saveFiltersToLocal();
  fetchHistory();
}, { deep: true });

onMounted(async () => {
  await timeStore.fetchCycles();
  if (catalogsStore.courses.length === 0) {
    await catalogsStore.fetchCourses();
  }
  loadFiltersFromLocal();

  // Fallback to active cycle if no filters saved
  if (selectedCycleIds.value.length === 0 && timeStore.cycles.length > 0) {
    const activeCycle = timeStore.cycles.find(c => c.isActive) ?? timeStore.cycles[0];
    selectedCycleIds.value = [activeCycle.id];
  } else {
    // If cycles were loaded from cache, ensure templates are fetched before running history
    await Promise.all(selectedCycleIds.value.map(cid => timeStore.fetchTemplates(cid)));
    fetchHistory();
  }

  // Poll status every 8 seconds for real-time dashboard responsiveness
  const interval = setInterval(fetchHistory, 8000);
  onUnmounted(() => clearInterval(interval));
});

function openMatrixModal() {
  if (matrixGeneratorRef.value) {
    matrixGeneratorRef.value.isOpen = true;
  }
}

function handleGenerateSuccess() {
  fetchHistory();
}

function handleCardClick(request: any) {
  if (matrixGeneratorRef.value) {
    const cycleId = request.cycle?.id || selectedCycleIds.value[0];
    const templateId = request.profileId;
    matrixGeneratorRef.value.openWithContext(cycleId, templateId, request.weekNumber);
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #475569;
}
</style>
