<template>
  <div class="px-6 md:px-10 py-8 max-w-[100vw] space-y-6 overflow-hidden min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#111827] dark:to-[#1e1b4b] text-slate-900 dark:text-white">
    <!-- Top Nav / Header Area -->
    <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-20">
      <div>
        <h1 class="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-slate-400">
          Monitor de Generación
        </h1>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl font-medium tracking-wide">
          Centro avanzado de curaduría y seguimiento de materiales académicos.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          color="gray"
          variant="soft"
          icon="i-heroicons-arrow-path-rounded-square"
          @click="fetchHistory"
          class="text-slate-600 font-semibold dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Actualizar
        </UButton>
        <UButton
          color="indigo"
          icon="i-heroicons-squares-2x2"
          @click="openMatrixModal"
          class="shadow-[0_0_15px_rgba(79,70,229,0.5)] font-bold tracking-wide"
        >
          Solicitar Material
        </UButton>

      </div>
    </div>

    <!-- Advanced Glassmorphism Filters -->
    <div class="bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5 shadow-sm dark:shadow-2xl relative z-20">
      <!-- Ciclos -->
      <div class="flex-1 w-full">
        <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Ciclos Académicos</label>
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
        <label class="block text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-2">Semanas (Filtro)</label>
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
        <label class="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Plantillas Específicas</label>
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
      <div v-for="i in 4" :key="i" class="w-[340px] shrink-0 h-[600px] bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl animate-pulse border border-slate-200 dark:border-white/10" />
    </div>

    <!-- Empty state -->
    <div v-else-if="materials.length === 0" class="py-32 text-center bg-white/80 dark:bg-white/5 backdrop-blur-3xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl mt-4 relative z-10">
      <div class="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-200 dark:border-white/10">
        <UIcon name="i-heroicons-funnel" class="w-10 h-10 text-slate-400 dark:text-white/50" />
      </div>
      <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide">Workspace Limpio</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
        Modifica tus filtros en la parte superior para cargar el pipeline de generación.
      </p>
    </div>

    <!-- Kanban Board Layout -->
    <div v-else class="flex gap-8 overflow-x-auto pb-10 pt-4 w-full snap-x custom-scrollbar relative z-10">
      
      <!-- Column: Pending & Processing -->
      <MaterialBoardColumn
        title="EN COLA / PROCESANDO"
        icon="i-heroicons-bolt"
        iconClass="text-blue-400"
        bgClass="bg-gradient-to-b from-blue-900/20 to-transparent border-blue-500/20"
        :items="generatingMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: In Review -->
      <MaterialBoardColumn
        title="REQUIERE CURADURÍA"
        icon="i-heroicons-eye"
        iconClass="text-fuchsia-400"
        bgClass="bg-gradient-to-b from-fuchsia-900/20 to-transparent border-fuchsia-500/20"
        :items="reviewMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: Completed -->
      <MaterialBoardColumn
        title="LISTO / PUBLICADO"
        icon="i-heroicons-check-badge"
        iconClass="text-emerald-400"
        bgClass="bg-gradient-to-b from-emerald-900/20 to-transparent border-emerald-500/20"
        :items="completedMaterials"
        @clickCard="handleCardClick"
      />

      <!-- Column: Failed -->
      <MaterialBoardColumn
        title="FALLIDOS / EXCEPCIONES"
        icon="i-heroicons-exclamation-triangle"
        iconClass="text-rose-400"
        bgClass="bg-gradient-to-b from-rose-900/20 to-transparent border-rose-500/20"
        :items="failedMaterials"
        @clickCard="handleCardClick"
      />
      
      <!-- Spacer for final scrolling margin -->
      <div class="w-4 shrink-0"></div>
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
const matrixGeneratorRef = ref<any>(null);

const loading = computed(() => materialsStore.isLoading);

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

const pendingReviewRequest = computed(() => reviewMaterials.value.length > 0 ? reviewMaterials.value[0] : null);

// LocalStorage Persistence for Filters
const saveFiltersToLocal = () => {
  localStorage.setItem('materials_selected_cycles', JSON.stringify(selectedCycleIds.value));
  localStorage.setItem('materials_selected_weeks', JSON.stringify(selectedWeeks.value));
  localStorage.setItem('materials_selected_templates', JSON.stringify(selectedTemplateIds.value));
};

const loadFiltersFromLocal = () => {
  try {
    const savedCycles = localStorage.getItem('materials_selected_cycles');
    if (savedCycles) selectedCycleIds.value = JSON.parse(savedCycles);
    
    const savedWeeks = localStorage.getItem('materials_selected_weeks');
    if (savedWeeks) selectedWeeks.value = JSON.parse(savedWeeks);

    const savedTemplates = localStorage.getItem('materials_selected_templates');
    if (savedTemplates) selectedTemplateIds.value = JSON.parse(savedTemplates);
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

// Watch Cycle changes to fetch related templates and clean up orphaned templates
watch(selectedCycleIds, async (newCycles, oldCycles) => {
  if (newCycles.length > 0) {
    // Fetch templates for the newly added cycles
    const toFetch = newCycles.filter(c => !timeStore.templatesByCycle[c]);
    await Promise.all(toFetch.map(cid => timeStore.fetchTemplates(cid)));
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
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.4);
}
</style>
