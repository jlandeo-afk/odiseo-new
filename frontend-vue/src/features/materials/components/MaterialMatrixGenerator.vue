<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useToast } from '#imports';
import { useRouter } from 'vue-router';
import { useAcademicTimeStore } from '@/features/academic-time/store';
import { useMaterialsStore } from '../store/materials';
import { usePdfDesignsStore } from '../store/pdfDesigns';
import { useCatalogsStore } from '@/features/catalogs/store';
import MaterialReviewList from '@/features/materials/components/MaterialReviewList.vue';
import PdfDesignSelector from '@/features/materials/components/PdfDesignSelector.vue';

const emit = defineEmits(['success']);

const router = useRouter();
const academicStore = useAcademicTimeStore();
const materialsStore = useMaterialsStore();
const catalogsStore = useCatalogsStore();
const pdfDesignsStore = usePdfDesignsStore();
const toast = useToast();

const isOpen = ref(false);
const selectedCycleId = ref('');
const selectedTemplateId = ref('');
const selectedWeek = ref<number | null>(null);
const selectedDesignId = ref<string | null>(null);

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
    // Fetch design templates
    await pdfDesignsStore.fetchDesigns();
    // Preselect default design
    const defaultDesign = pdfDesignsStore.designs.find(d => d.isDefault);
    selectedDesignId.value = defaultDesign?.id || null;
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

let pollingTimer: any = null;

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function startPolling(cycleId: string) {
  if (!pollingTimer) {
    pollingTimer = setInterval(async () => {
      if (isOpen.value) {
        await fetchCycleHistory(cycleId);
      } else {
        stopPolling();
      }
    }, 5000);
  }
}

onUnmounted(() => {
  stopPolling();
});

watch(isOpen, (newVal) => {
  if (!newVal) {
    stopPolling();
  } else if (selectedCycleId.value) {
    // If opened and there are processing items, might need to resume polling, handled by fetchCycleHistory
    fetchCycleHistory(selectedCycleId.value);
  }
});

async function fetchCycleHistory(cycleId: string) {
  try {
    const history = await materialsStore.fetchHistory({ cycleIds: [cycleId] });
    cycleHistory.value = history || [];
    
    // Si hay items procesando, activar el polling
    const hasProcessing = cycleHistory.value.some(h => h.status === 'PROCESSING');
    if (hasProcessing) {
      startPolling(cycleId);
    } else {
      stopPolling();
    }
  } catch (err) {
    console.error('Failed to load history for matrix:', err);
    cycleHistory.value = [];
    stopPolling();
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
    const coursesPayload = selectedTemplate.value?.courses.map(c => ({ course_id: c.courseId })) || [];
    const result = await materialsStore.generateMaterial({
      profile_id: selectedTemplateId.value,
      week_number: selectedWeek.value,
      requires_review: false,
      courses: coursesPayload,
      design_template_id: selectedDesignId.value || undefined,
    });
    await fetchCycleHistory(selectedCycleId.value);
    // Let them see success or generate another week
    toast.add({ title: `Semana ${selectedWeek.value}`, description: 'Generación iniciada. El worker está procesando.', color: 'success', timeout: 3000 });
    emit('success', result);
  } catch (e: any) {
    console.error('Error generating material:', e);
    // Extraemos el mensaje de error del backend (si existe en e.data.message o fallback)
    generateError.value = materialsStore.error || e?.data?.message || e?.message || 'Error desconocido al intentar generar.';
  }
};

const openWithContext = async (cycleId: string, templateId?: string, weekNumber?: number) => {
  isProgrammaticChange = true;
  if (cycles.value.length === 0) {
    await academicStore.fetchCycles();
  }
  selectedCycleId.value = cycleId;
  isOpen.value = true;
  // Ensure templates and history are fetched before selecting the intersection
  await academicStore.fetchTemplates(cycleId);
  await fetchCycleHistory(cycleId);
  if (templateId && weekNumber) {
    selectIntersection(templateId, weekNumber);
  }
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

const allCoursesCompleted = computed(() => {
  if (!currentRequest.value?.courses) return false;
  const courses = currentRequest.value.courses;
  return courses.length >= 2 && courses.every((c: any) => c.status === 'COMPLETED');
});

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
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getCourseName(course.courseId)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.add({ title: 'Error', description: 'No se pudo obtener el enlace de descarga', color: 'red', timeout: 3000 });
    }
  } catch (err) {
    console.error('Error fetching download URL:', err);
    toast.add({ title: 'Error', description: 'Ocurrió un error al obtener la descarga del PDF.', color: 'red', timeout: 3000 });
  }
};

const downloadMergedPdf = async () => {
  if (!currentRequest.value) return;
  try {
    const result = await materialsStore.fetchMergedDownloadUrl(currentRequest.value.id);
    if (result && result.downloadUrl) {
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || 'Completo.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.add({ title: 'Error', description: 'El PDF combinado aún no está disponible', color: 'red', timeout: 3000 });
    }
  } catch (err) {
    console.error('Error fetching merged download URL:', err);
    toast.add({ title: 'Error', description: 'Ocurrió un error al obtener la descarga del PDF combinado.', color: 'red', timeout: 3000 });
  }
};

defineExpose({ isOpen, openWithContext });
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm z-40"
        @click="isOpen = false" />
    </Transition>

    <Transition enter-active-class="transform transition ease-in-out duration-350" enter-from-class="translate-x-full"
      enter-to-class="translate-x-0" leave-active-class="transform transition ease-in-out duration-350"
      leave-from-class="translate-x-0" leave-to-class="translate-x-full">
      <div v-if="isOpen"
        class="fixed inset-y-0 right-0 w-full max-w-6xl bg-white dark:bg-[#11111a] shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-white/5">
        <div class="flex flex-col h-full bg-slate-50 dark:bg-[#11111a]">
          <!-- HEADER -->
          <div
            class="px-6 py-5 bg-white dark:bg-[#1a1a24] border-b border-slate-200 dark:border-white/5 shadow-sm z-10">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
                  <UIcon name="i-heroicons-squares-2x2" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Matriz de Solicitud de
                    Materiales</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Audita y genera documentos
                    masivos por semana.</p>
                </div>
              </div>
              <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
            </div>
            <div class="mt-6 flex flex-col md:flex-row items-center gap-4">
              <div class="w-full md:w-96 relative">
                <label class="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Ciclo
                  Operativo</label>
                <USelectMenu v-model="selectedCycleId" :items="cycles" value-key="id" label-key="name"
                  :search-input="false" :ui="{ content: 'z-[9999]' }" placeholder="Seleccionar ciclo..." class="w-full shadow-sm" size="lg">
                  <template #default>
                    {{ currentCycle ? currentCycle.name : 'Seleccionar ciclo...' }}
                  </template>
                </USelectMenu>
              </div>
            </div>
          </div>

          <!-- BODY + DETAIL SPLIT -->
          <div class="flex-1 flex flex-col lg:flex-row min-h-0">
            <!-- MATRIX -->
            <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div v-if="!selectedCycleId" class="py-20 text-center">
                <UIcon name="i-heroicons-arrow-down-circle"
                  class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 class="text-lg font-bold text-slate-500">Selecciona un Ciclo</h3>
              </div>

              <!-- Skeleton while templates load -->
              <div v-else-if="selectedCycleId && academicStore.isLoading && templates.length === 0" class="space-y-6">
                <div v-for="n in 2" :key="n"
                  class="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div class="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
                    <USkeleton class="h-4 w-48 mb-2 rounded-lg" />
                    <USkeleton class="h-3 w-28 rounded-md" />
                  </div>
                  <div class="p-5">
                    <USkeleton class="h-3 w-28 mb-3 rounded-md" />
                    <div class="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                      <USkeleton v-for="i in 16" :key="i" class="h-14 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="templates.length === 0" class="py-20 text-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto text-amber-400 mb-4 opacity-50" />
                <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Este ciclo no tiene Plantillas
                  configuradas</h3>
                <p class="text-sm text-slate-500 mt-2">Ve a la configuración del ciclo para añadir plantillas.</p>
              </div>

              <!-- Matrix Layout -->
              <div v-else class="space-y-6">
                <div v-for="template in templates" :key="template.id"
                  class="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div
                    class="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 flex justify-between items-center">
                    <div>
                      <h4 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <UIcon name="i-heroicons-document-duplicate" class="w-4 h-4 text-indigo-500" />
                        {{ template.name }}
                      </h4>
                      <p class="text-xs text-slate-500 mt-0.5 ml-6">{{ template.courses.length }} cursos participan</p>
                    </div>
                  </div>

                  <div class="p-5">
                    <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Semanas del Ciclo
                    </h5>
                    <div class="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                      <button v-for="week in weeksList" :key="week" @click="selectIntersection(template.id, week)"
                        class="relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200"
                        :class="[
                          selectedTemplateId === template.id && selectedWeek === week
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105 z-10'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20',
                          weekStatusMap[`${template.id}_${week}`] === 'COMPLETED' ? 'ring-2 ring-emerald-500/50' : '',
                          weekStatusMap[`${template.id}_${week}`] === 'FAILED' ? 'ring-2 ring-rose-500/50' : '',
                          weekStatusMap[`${template.id}_${week}`] === 'REVIEW_REQUIRED' ? 'ring-2 ring-fuchsia-500/50' : '',
                          weekStatusMap[`${template.id}_${week}`] === 'PROCESSING' ? 'ring-2 ring-blue-400/50 animate-pulse' : '',
                        ]">
                        <span v-if="weekStatusMap[`${template.id}_${week}`]"
                          class="absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#1a1a24]" :class="{
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

            <!-- DETAIL PANEL -->
            <transition enter-active-class="transition ease-out duration-300"
              enter-from-class="translate-x-8 opacity-0" enter-to-class="translate-x-0 opacity-100"
              leave-active-class="transition ease-in duration-200" leave-from-class="translate-x-0 opacity-100"
              leave-to-class="translate-x-8 opacity-0">
              <div v-if="selectedTemplate && selectedWeek"
                class="w-full lg:w-80 shrink-0 bg-white dark:bg-[#1a1a24] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 overflow-y-auto">
                <div class="p-5 space-y-5">
                  <!-- Header -->
                  <div class="flex items-start gap-3">
                    <div
                      class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                      <UIcon name="i-heroicons-bolt" class="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          Semana {{ selectedWeek }}
                        </h3>
                        <span v-if="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`]"
                          class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0"
                          :class="{
                            'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED',
                            'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'FAILED',
                            'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED',
                            'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING',
                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20': weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PENDING'
                          }">
                          {{ weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' ? 'Completado' :
                            weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'FAILED' ? 'Fallido' :
                              weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED' ? 'Req. Revisión'
                                :
                                weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'En Proceso' :
                                  'Pendiente' }}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ selectedTemplate.name }}</p>
                    </div>
                  </div>

                  <!-- Generate Button -->
                  <button @click="handleGenerate"
                    :disabled="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING'"
                    class="w-full flex flex-col items-center justify-center p-4 rounded-xl text-white transition-all shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING'
                      ? 'bg-slate-400 dark:bg-slate-700 shadow-none'
                      : weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' || weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30'
                        : 'bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-indigo-600/30'">
                    <UIcon
                      :name="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'i-heroicons-arrow-path' : 'i-heroicons-rocket-launch'"
                      class="w-7 h-7 mb-1.5 transition-transform"
                      :class="weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'animate-spin' : 'group-hover:-translate-y-0.5'" />
                    <span class="font-black tracking-wide text-sm">
                      {{ weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'PROCESSING' ? 'GENERANDO...' :
                        weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'COMPLETED' ||
                          weekStatusMap[`${selectedTemplate.id}_${selectedWeek}`] === 'REVIEW_REQUIRED' ?
                          'VOLVER A GENERAR' :
                          'GENERAR AHORA' }}
                    </span>
                    <span class="text-[9px] opacity-80 mt-0.5 uppercase tracking-widest">{{
                      selectedTemplate.courses.length }}
                      Cursos</span>
                  </button>

                  <!-- Error Alert Box -->
                  <div v-if="generateError"
                    class="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-lg flex gap-2 items-start">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
                    <p class="font-medium leading-tight">{{ generateError }}</p>
                  </div>

                  <!-- Design Selector -->
                  <div class="border-t border-slate-200 dark:border-white/5 pt-4">
                    <PdfDesignSelector v-model="selectedDesignId" />
                  </div>

                  <!-- Actions -->
                  <button :disabled="!currentRequest" @click="handleAuditQuestions"
                    class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors group w-full disabled:opacity-50 disabled:cursor-not-allowed">
                    <div
                      class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                      <UIcon name="i-heroicons-magnifying-glass-circle" class="w-5 h-5" />
                    </div>
                    <div class="text-left">
                      <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Revisar Preguntas</div>
                      <div class="text-[10px] text-slate-500 font-medium">Ver faltantes y estado de cobertura</div>
                    </div>
                  </button>

                  <button :disabled="!currentRequest" @click="showCoursesList = !showCoursesList"
                    class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 transition-colors group w-full disabled:opacity-50 disabled:cursor-not-allowed">
                    <div
                      class="w-8 h-8 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 group-hover:scale-110 transition-transform">
                      <UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5" />
                    </div>
                    <div class="text-left">
                      <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Ver Cursos & PDFs</div>
                      <div class="text-[10px] text-slate-500 font-medium">Separación y descarga de archivos</div>
                    </div>
                  </button>

                  <!-- Courses List -->
                  <div v-if="showCoursesList && currentRequest" class="border-t border-slate-200 dark:border-white/5 pt-4 space-y-3">
                    <h4 class="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Cursos y Archivos</h4>
                    <div class="space-y-2">
                      <div v-for="course in currentRequest.courses" :key="course.courseId"
                        class="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <div class="min-w-0">
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {{ getCourseName(course.courseId) }}
                          </span>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border" :class="{
                            'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20': course.status === 'COMPLETED',
                            'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20': course.status === 'FAILED',
                            'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse': course.status === 'PROCESSING',
                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20': course.status === 'PENDING'
                          }">
                            {{ course.status === 'COMPLETED' ? 'Listo' :
                              course.status === 'FAILED' ? 'Fallido' :
                                course.status === 'PROCESSING' ? 'En Proceso' : 'Pendiente' }}
                          </span>

                          <UButton v-if="course.status === 'COMPLETED'" size="xs" color="indigo"
                            icon="i-heroicons-arrow-down-tray" @click="downloadPdf(course)" />
                        </div>
                      </div>
                    </div>
                    <div v-if="allCoursesCompleted" class="pt-3 border-t border-slate-200 dark:border-white/5">
                      <button @click="downloadMergedPdf"
                        class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20">
                        <UIcon name="i-heroicons-document-arrow-down" class="w-4 h-4" />
                        Descargar PDF Combinado (Todos los cursos)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Curation Audit Modal -->
    <Transition name="modal-backdrop">
      <div v-if="isReviewModalOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" @click="isReviewModalOpen = false" />
    </Transition>

    <Transition name="modal-card">
      <div v-if="isReviewModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 pointer-events-none">
        <div
          class="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/5 pointer-events-auto relative">
          <div class="flex items-start justify-between px-6 pt-5 pb-0 shrink-0">
            <div />
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="isReviewModalOpen = false" />
          </div>
          <div class="overflow-y-auto custom-scrollbar flex-1 px-6 pb-6">
            <MaterialReviewList v-if="isReviewModalOpen && currentRequest" :key="currentRequest.id"
              :materialId="currentRequest.id" @approved="handleReviewApproved" @cancel="isReviewModalOpen = false" />
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

.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 200ms ease;
}
.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-card-enter-active {
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-card-leave-active {
  transition: all 200ms ease-in;
}
.modal-card-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
.modal-card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
