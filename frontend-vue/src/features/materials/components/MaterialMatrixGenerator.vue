<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAcademicTimeStore } from '@/features/academic-time/store';
import { useMaterialsStore } from '../store/materials';
import { useCatalogsStore } from '@/features/catalogs/store';
import MaterialReviewList from '@/features/materials/components/MaterialReviewList.vue';

const emit = defineEmits(['success']);

const router = useRouter();
const academicStore = useAcademicTimeStore();
const materialsStore = useMaterialsStore();
const catalogsStore = useCatalogsStore();

const isOpen = ref(false);
const selectedCycleId = ref('');
const selectedTemplateId = ref('');
const selectedWeek = ref<number | null>(null);

const cycleHistory = ref<any[]>([]);
const showCoursesList = ref(false);
const isReviewModalOpen = ref(false);

let isProgrammaticChange = false;

const cycles = computed(() => academicStore.cycles);
const templates = computed(() => academicStore.templatesByCycle[selectedCycleId.value] ?? []);

// Reset courses list when templates or week changes
watch([selectedTemplateId, selectedWeek], () => {
  showCoursesList.value = false;
});

// Pre-fill cycles if not loaded
watch(isOpen, async (newVal) => {
  if (newVal) {
    if (cycles.value.length === 0) {
      await academicStore.fetchCycles();
    }
    if (catalogsStore.courses.length === 0) {
      await catalogsStore.fetchCourses();
    }
    // Try to set a default cycle if none is selected
    if (!selectedCycleId.value && cycles.value.length > 0) {
      const active = cycles.value.find(c => c.isActive);
      selectedCycleId.value = active ? active.id : cycles.value[0].id;
    }
  }
});

// Watch cycle changes to load templates and history
watch(selectedCycleId, async (newCycle) => {
  if (newCycle) {
    await academicStore.fetchTemplates(newCycle);
    if (!isProgrammaticChange) {
      selectedTemplateId.value = '';
      selectedWeek.value = null;
    }
    await fetchCycleHistory(newCycle);
  }
});

async function fetchCycleHistory(cycleId: string) {
  try {
    const history = await materialsStore.fetchHistory({ cycleIds: [cycleId] });
    cycleHistory.value = history || [];
  } catch (err) {
    console.error('Failed to load history for matrix:', err);
    cycleHistory.value = [];
  }
}

const weekStatusMap = computed(() => {
  const map: Record<string, string> = {};
  // Sort history ascending so the latest request overwrites previous ones
  const sortedHistory = [...cycleHistory.value].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  sortedHistory.forEach(req => {
    if (req.profileId && req.weekNumber) {
      const key = `${req.profileId}_${req.weekNumber}`;
      map[key] = req.status;
    }
  });
  return map;
});

const currentCycle = computed(() => cycles.value.find(c => c.id === selectedCycleId.value));
const weeksCount = computed(() => currentCycle.value?.totalWeeks || 16);
const weeksList = computed(() => Array.from({ length: weeksCount.value }, (_, i) => i + 1));

const selectedTemplate = computed(() => templates.value.find(t => t.id === selectedTemplateId.value));

const selectIntersection = (templateId: string, week: number) => {
  selectedTemplateId.value = templateId;
  selectedWeek.value = week;
};

const generateError = ref<string | null>(null);

const handleGenerate = async () => {
  if (!selectedTemplateId.value || !selectedWeek.value) return;
  
  generateError.value = null; // reset previous errors
  try {
    const result = await materialsStore.generateMaterial({
      profileId: selectedTemplateId.value,
      weekNumber: selectedWeek.value,
      requiresReview: true,
    });
    // Let them see success or generate another week
    alert(`Generación iniciada para la Semana ${selectedWeek.value}. El worker está procesando.`);
    emit('success', result);
  } catch (e: any) {
    console.error('Error generating material:', e);
    // Extraemos el mensaje de error del backend (si existe en e.data.message o fallback)
    generateError.value = materialsStore.error || e?.data?.message || e?.message || 'Error desconocido al intentar generar.';
  }
};

const openWithContext = async (cycleId: string, templateId: string, weekNumber: number) => {
  isProgrammaticChange = true;
  if (cycles.value.length === 0) {
    await academicStore.fetchCycles();
  }
  selectedCycleId.value = cycleId;
  isOpen.value = true;
  // Ensure templates and history are fetched before selecting the intersection
  await academicStore.fetchTemplates(cycleId);
  await fetchCycleHistory(cycleId);
  selectIntersection(templateId, weekNumber);
  await nextTick();
  isProgrammaticChange = false;
};

const currentRequest = computed(() => {
  if (!selectedTemplateId.value || !selectedWeek.value) return null;
  const matches = cycleHistory.value.filter(
    req => req.profileId === selectedTemplateId.value && req.weekNumber === selectedWeek.value
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
});

const getCourseName = (courseId: string) => {
  const course = catalogsStore.courses.find(c => c.id === courseId);
  return course ? course.name : courseId;
};

const handleAuditQuestions = () => {
  if (currentRequest.value) {
    isReviewModalOpen.value = true;
  }
};

const handleReviewApproved = (result: any) => {
  isReviewModalOpen.value = false;
  isOpen.value = false;
  emit('success', result);
};

const downloadPdf = async (course: any) => {
  if (!currentRequest.value) return;
  try {
    const result = await materialsStore.fetchDownloadUrl(currentRequest.value.id, course.courseId);
    if (result && result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    } else {
      alert('No se pudo obtener el enlace de descarga');
    }
  } catch (err) {
    console.error('Error fetching download URL:', err);
    alert('Ocurrió un error al obtener la descarga del PDF.');
  }
};

defineExpose({ isOpen, openWithContext });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm z-40" @click="isOpen = false" />
    </Transition>

    <Transition
      enter-active-class="transform transition ease-in-out duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition ease-in-out duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div v-if="isOpen" class="fixed inset-y-0 right-0 w-full max-w-4xl bg-white dark:bg-[#11111a] shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-white/5">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#11111a]">
      <!-- HEADER -->
      <div class="px-6 py-5 bg-white dark:bg-[#1a1a24] border-b border-slate-200 dark:border-white/5 shadow-sm z-10">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
              <UIcon name="i-heroicons-squares-2x2" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Matriz de Solicitud de Materiales</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Audita y lanza compilaciones masivas por semana.</p>
            </div>
          </div>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
        </div>

        <div class="mt-6 flex flex-col md:flex-row items-center gap-4">
          <div class="w-full md:w-96 relative">
            <label class="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Ciclo Operativo</label>
            <USelectMenu
              v-model="selectedCycleId"
              :items="cycles"
              value-key="id"
              label-key="name"
              placeholder="Seleccionar ciclo..."
              class="w-full shadow-sm"
              size="lg"
            >
              <template #label>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ currentCycle?.name || 'Seleccionar...' }}</span>
              </template>
            </USelectMenu>
          </div>
        </div>
      </div>

      <!-- BODY: MATRIX -->
      <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <div v-if="!selectedCycleId" class="py-20 text-center">
          <UIcon name="i-heroicons-arrow-down-circle" class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 class="text-lg font-bold text-slate-500">Selecciona un Ciclo</h3>
        </div>
        
        <div v-else-if="templates.length === 0" class="py-20 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto text-amber-400 mb-4 opacity-50" />
          <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Este ciclo no tiene Plantillas configuradas</h3>
          <p class="text-sm text-slate-500 mt-2">Ve a la configuración del ciclo para añadir plantillas.</p>
        </div>

        <!-- Matrix Layout -->
        <div v-else class="space-y-6">
          <div v-for="template in templates" :key="template.id" class="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 flex justify-between items-center">
              <div>
                <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <UIcon name="i-heroicons-document-duplicate" class="w-4 h-4 text-indigo-500" />
                  {{ template.name }}
                </h4>
                <p class="text-xs text-slate-500 mt-0.5 ml-6">{{ template.courses.length }} cursos participan</p>
              </div>
            </div>
            
            <div class="p-5">
              <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Semanas del Ciclo</h5>
              <div class="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                <button
                  v-for="week in weeksList"
                  :key="week"
                  @click="selectIntersection(template.id, week)"
                  class="relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200"
                  :class="[
                    selectedTemplateId === template.id && selectedWeek === week
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105 z-10'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20',
                    weekStatusMap[`${template.id}_${week}`] === 'COMPLETED' ? 'ring-2 ring-emerald-500/50' : '',
                    weekStatusMap[`${template.id}_${week}`] === 'FAILED' ? 'ring-2 ring-rose-500/50' : '',
                    weekStatusMap[`${template.id}_${week}`] === 'REVIEW_REQUIRED' ? 'ring-2 ring-fuchsia-500/50' : '',
                    weekStatusMap[`${template.id}_${week}`] === 'PROCESSING' ? 'ring-2 ring-blue-400/50 animate-pulse' : '',
                  ]"
                >
                  <span v-if="weekStatusMap[`${template.id}_${week}`]" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" 
                    :class="{
                      'bg-emerald-500': weekStatusMap[`${template.id}_${week}`] === 'COMPLETED',
                      'bg-rose-500': weekStatusMap[`${template.id}_${week}`] === 'FAILED',
                      'bg-fuchsia-500': weekStatusMap[`${template.id}_${week}`] === 'REVIEW_REQUIRED',
                      'bg-amber-400': weekStatusMap[`${template.id}_${week}`] === 'PENDING',
                      'bg-blue-400': weekStatusMap[`${template.id}_${week}`] === 'PROCESSING',
                    }">
                  </span>
                  <span class="text-[9px] uppercase font-bold opacity-80">Sem</span>
                  <span class="text-base font-black leading-none mt-1">{{ week }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER: DETAIL PANEL -->
      <transition
        enter-active-class="transition ease-out duration-300 transform"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200 transform"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div v-if="selectedTemplate && selectedWeek" class="bg-white dark:bg-[#1a1a24] border-t border-slate-200 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 shrink-0">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                  Semana {{ selectedWeek }} <span class="text-slate-400">·</span> {{ selectedTemplate.name }}
                  <span v-if="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`]" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                    :class="{
                      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED',
                      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'FAILED',
                      'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED',
                      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING',
                      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PENDING'
                    }">
                    {{ weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' ? 'Completado' : 
                       weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'FAILED' ? 'Fallido' :
                       weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED' ? 'Curaduría Req.' :
                       weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'En Proceso' :
                       'Pendiente' }}
                  </span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Auditoría previa y ejecución del worker AI/DB.</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch gap-4">
              <!-- Left: Generate -->
              <div class="flex-1 flex flex-col gap-2">
                <button
                  @click="handleGenerate"
                  :disabled="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING'"
                  class="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl text-white transition-all shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' 
                    ? 'bg-slate-400 dark:bg-slate-700 shadow-none' 
                    : weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' || weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30'
                      : 'bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-indigo-600/30'"
                >
                  <UIcon :name="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'i-heroicons-arrow-path' : 'i-heroicons-rocket-launch'" 
                         class="w-8 h-8 mb-2 transition-transform" 
                         :class="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'animate-spin' : 'group-hover:-translate-y-1'" />
                  <span class="font-black tracking-wide">
                    {{ weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'GENERANDO...' : 
                       weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' || weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED' ? 'RE-LANZAR COMPILACIÓN' : 
                       'LANZAR COMPILACIÓN' }}
                  </span>
                  <span class="text-[10px] opacity-80 mt-1 uppercase tracking-widest">{{ selectedTemplate.courses.length }} Peticiones en paralelo</span>
                </button>
                
                <!-- Error Alert Box -->
                <div v-if="generateError" class="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-lg flex gap-2 items-start animate-pulse">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
                  <p class="font-medium leading-tight">{{ generateError }}</p>
                </div>
              </div>

              <!-- Right: Audits -->
              <div class="flex-1 flex flex-col gap-3">
                <button
                  :disabled="!currentRequest"
                  @click="handleAuditQuestions"
                  class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors group w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <UIcon name="i-heroicons-magnifying-glass-circle" class="w-5 h-5" />
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Auditar Preguntas AI</div>
                    <div class="text-[10px] text-slate-500 font-medium">Ver faltantes y estado de cobertura</div>
                  </div>
                </button>

                <button
                  :disabled="!currentRequest"
                  @click="showCoursesList = !showCoursesList"
                  class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 transition-colors group w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div class="w-8 h-8 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 group-hover:scale-110 transition-transform">
                    <UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5" />
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Ver Cursos & PDFs</div>
                    <div class="text-[10px] text-slate-500 font-medium">Separación y descarga de archivos</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Courses List Panel -->
            <div v-if="showCoursesList && currentRequest" class="mt-6 border-t border-slate-200 dark:border-white/5 pt-5 space-y-4">
              <h4 class="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Listado de Cursos y Archivos</h4>
              <div class="space-y-3">
                <div
                  v-for="course in currentRequest.courses"
                  :key="course.courseId"
                  class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm"
                >
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-850 dark:text-slate-200">
                      {{ getCourseName(course.courseId) }}
                    </span>
                    <span class="text-xs text-slate-500 mt-0.5">
                      ID: {{ course.courseId }}
                    </span>
                  </div>

                  <div class="flex items-center gap-3">
                    <!-- Status Badge -->
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                      :class="{
                        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20': course.status === 'COMPLETED',
                        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20': course.status === 'FAILED',
                        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse': course.status === 'PROCESSING',
                        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20': course.status === 'PENDING'
                      }"
                    >
                      {{ course.status === 'COMPLETED' ? 'Listo' : 
                         course.status === 'FAILED' ? 'Fallido' :
                         course.status === 'PROCESSING' ? 'En Proceso' : 'Pendiente' }}
                    </span>

                    <!-- Download Button -->
                    <UButton
                      v-if="course.status === 'COMPLETED'"
                      size="xs"
                      color="indigo"
                      icon="i-heroicons-arrow-down-tray"
                      @click="downloadPdf(course)"
                    >
                      Descargar
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
      </div>
      </div>
    </Transition>

    <!-- Curation Audit Modal (Custom overlay with high z-index) -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isReviewModalOpen"
        class="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md z-[300]"
      />
    </Transition>

    <Transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transform transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isReviewModalOpen"
        class="fixed inset-0 z-[310] flex items-center justify-center p-4 sm:p-6 md:p-10 pointer-events-none"
      >
        <div class="bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/5 pointer-events-auto relative">
          <!-- Floating X Close Button (outside card corner) -->
          <button
            type="button"
            class="absolute -top-12 right-0 lg:-right-12 lg:top-0 z-20 p-2 rounded-xl bg-slate-900/50 hover:bg-slate-900/75 text-white dark:bg-white/10 dark:hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center backdrop-blur-sm shadow-xl"
            aria-label="Cerrar modal"
            @click="isReviewModalOpen = false"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
            <MaterialReviewList
              v-if="isReviewModalOpen && currentRequest"
              :key="currentRequest.id"
              :materialId="currentRequest.id"
              @approved="handleReviewApproved"
              @cancel="isReviewModalOpen = false"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
