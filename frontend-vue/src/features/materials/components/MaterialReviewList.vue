<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useMaterialsStore } from '../store/materials';
import { useCatalogsStore } from '@/features/catalogs/store';

const props = defineProps<{
  materialId: string;
  initialCourseId?: string;
}>();

const emit = defineEmits(['approved', 'cancel']);

const store = useMaterialsStore();
const catalogsStore = useCatalogsStore();

const continueWithWarnings = ref(false);
const localReplacements = ref<Record<string, string>>({}); // reviewQuestionId -> newQuestionId
const localRemovals = ref<Set<string>>(new Set()); // set of reviewQuestionId
const activeReplacingId = ref<string | null>(null);
const replacementInputVal = ref('');

const activeTab = ref<'all' | 'empty' | 'replaced' | 'removed'>('all');
const searchQuery = ref('');
const selectedCourseId = ref(props.initialCourseId || 'all');

watch(() => props.initialCourseId, (newVal) => {
  selectedCourseId.value = newVal || 'all';
});
const currentPage = ref(1);
const itemsPerPage = 10;

onMounted(async () => {
  await store.fetchReviewData(props.materialId);
  if (catalogsStore.courses.length === 0) {
    await catalogsStore.fetchCourses();
  }
});

const reviewData = computed(() => store.currentReview);

const getCourseName = (courseId: string) => {
  const course = catalogsStore.courses.find(c => c.id === courseId);
  return course ? course.name : courseId;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_REVIEW: 'En Revisión',
    PROCESSING: 'Procesando',
    REVIEW_REQUIRED: 'Revisión Requerida',
    COMPLETED: 'Completado',
    COMPLETED_WITH_WARNINGS: 'Completado con Advertencias',
    FAILED: 'Fallido',
  };
  return labels[status] || status;
};

const uniqueCourses = computed(() => {
  if (!reviewData.value) return [];
  const ids = [...new Set(reviewData.value.questions.map(q => q.courseId))];
  return ids.map(id => ({
    id,
    name: getCourseName(id)
  }));
});

const courseFilterOptions = computed(() => {
  return [
    { id: 'all', name: 'Todos los cursos' },
    ...uniqueCourses.value
  ];
});

const questions = computed(() => {
  if (!reviewData.value) return [];
  return reviewData.value.questions.map(q => {
    let currentStatus = q.status;
    let questionId = q.questionId;

    if (localRemovals.value.has(q.id)) {
      currentStatus = 'REMOVED';
    } else if (localReplacements.value[q.id]) {
      currentStatus = 'REPLACED';
      questionId = localReplacements.value[q.id];
    }

    return {
      ...q,
      status: currentStatus,
      questionId,
    };
  });
});

const filteredQuestions = computed(() => {
  let result = questions.value;

  // 1. Tab filter
  if (activeTab.value === 'empty') {
    result = result.filter(q => q.status === 'EMPTY');
  } else if (activeTab.value === 'replaced') {
    result = result.filter(q => q.status === 'REPLACED');
  } else if (activeTab.value === 'removed') {
    result = result.filter(q => q.status === 'REMOVED');
  }

  // 2. Course filter
  if (selectedCourseId.value !== 'all') {
    result = result.filter(q => q.courseId === selectedCourseId.value);
  }

  // 3. Search query filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(q => 
      q.topicName.toLowerCase().includes(query) ||
      q.subtopicName.toLowerCase().includes(query) ||
      (q.questionId && q.questionId.toLowerCase().includes(query))
    );
  }

  return result;
});

// Reset pagination page when filters change
watch([activeTab, selectedCourseId, searchQuery], () => {
  currentPage.value = 1;
});

const totalPages = computed(() => {
  return Math.ceil(filteredQuestions.value.length / itemsPerPage) || 1;
});

const paginatedQuestions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredQuestions.value.slice(start, start + itemsPerPage);
});

const hasEmptySlots = computed(() => {
  return questions.value.some(q => q.status === 'EMPTY');
});

const handleReplace = (questionId: string) => {
  const q = questions.value.find(x => x.id === questionId);
  activeReplacingId.value = questionId;
  replacementInputVal.value = q?.questionId || '';
};

const confirmReplacement = (questionId: string) => {
  const val = replacementInputVal.value.trim();
  if (val) {
    localReplacements.value[questionId] = val;
    localRemovals.value.delete(questionId);
  }
  activeReplacingId.value = null;
};

const handleRemove = (questionId: string) => {
  localRemovals.value.add(questionId);
  delete localReplacements.value[questionId];
};

const handleRestore = (questionId: string) => {
  localRemovals.value.delete(questionId);
  delete localReplacements.value[questionId];
};

const handleApprove = async () => {
  if (!reviewData.value) return;

  const replacementsArray = Object.entries(localReplacements.value).map(([reviewQuestionId, qId]) => ({
    reviewQuestionId,
    questionId: qId,
  }));

  const removalsArray = Array.from(localRemovals.value);

  try {
    const result = await store.approveCuration(props.materialId, {
      version: reviewData.value.version,
      continueWithWarnings: continueWithWarnings.value,
      replacements: replacementsArray,
      removals: removalsArray,
    });
    emit('approved', result);
  } catch (e) {
    console.error('Approval failed:', e);
  }
};
</script>

<template>
  <div v-if="store.isLoading && !reviewData" class="flex items-center justify-center py-24">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-indigo-500" />
  </div>

  <div v-else-if="reviewData" class="space-y-6">
    <!-- Header Details Banner -->
    <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/5 flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0">
            <UIcon name="i-heroicons-list-bullet" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Listado de preguntas para compilar</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Revisa y audita las preguntas seleccionadas antes de generar el documento final.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado:</span>
          <span
            class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
            :class="{
              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20': reviewData.status === 'COMPLETED' || reviewData.status === 'IN_REVIEW',
              'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20': reviewData.status === 'REVIEW_REQUIRED',
            }"
          >
            {{ getStatusLabel(reviewData.status) }}
          </span>
        </div>
      </div>

      <!-- Metadata Grid: Cycle, Template, Week -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-250 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-calendar" class="w-4.5 h-4.5 text-slate-450 dark:text-slate-550" />
          <div class="flex flex-col">
            <span class="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 leading-tight">Ciclo Académico</span>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ reviewData.cycleName }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-document-text" class="w-4.5 h-4.5 text-slate-450 dark:text-slate-550" />
          <div class="flex flex-col">
            <span class="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 leading-tight">Plantilla de Material</span>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ reviewData.templateName }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-clock" class="w-4.5 h-4.5 text-slate-450 dark:text-slate-550" />
          <div class="flex flex-col">
            <span class="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 leading-tight">Semana</span>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Semana {{ reviewData.weekNumber }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters: Tabs, Dropdown & Search -->
    <div class="bg-white dark:bg-[#2b2b3f] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <!-- Tab selector as capsule -->
        <div class="flex bg-slate-100 dark:bg-[#1a1b2e] p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-inner">
          <button
            v-for="tab in ['all', 'empty', 'replaced', 'removed']"
            :key="tab"
            @click="activeTab = tab as any"
            class="px-4 py-2 rounded-lg text-[11px] font-bold transition-all capitalize"
            :class="activeTab === tab 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          >
            {{ tab === 'all' ? 'Todos' : tab === 'empty' ? 'Vacantes' : tab === 'replaced' ? 'Reemplazados' : 'Descartados' }}
          </button>
        </div>

        <!-- Filters (Search & Course) -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Buscar tema, reactivo..."
            class="w-full sm:w-64"
            size="md"
          >
            <template #trailing>
              <UButton
                v-show="searchQuery !== ''"
                color="neutral"
                variant="link"
                icon="i-heroicons-x-mark-20-solid"
                :padded="false"
                @click="searchQuery = ''"
              />
            </template>
          </UInput>
          <USelectMenu
            v-model="selectedCourseId"
            :items="courseFilterOptions"
            value-key="id"
            label-key="name"
            class="w-full sm:w-56"
            size="md"
            :ui="{ content: 'z-[9999]' }"
          >
            <template #default>
              {{ courseFilterOptions.find(c => c.id === selectedCourseId)?.name || 'Todos los cursos' }}
            </template>
          </USelectMenu>
        </div>
      </div>

      <div class="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
        <span>Mostrando <strong class="text-slate-700 dark:text-slate-300">{{ filteredQuestions.length }}</strong> de <strong class="text-slate-700 dark:text-slate-300">{{ questions.length }}</strong> slots</span>
        <span v-if="totalPages > 1">Página <strong class="text-slate-700 dark:text-slate-300">{{ currentPage }}</strong> de <strong class="text-slate-700 dark:text-slate-300">{{ totalPages }}</strong></span>
      </div>
    </div>

    <!-- Question Cards List -->
    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="q in paginatedQuestions"
        :key="q.id"
        class="bg-white dark:bg-[#2b2b3f] border rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative group overflow-hidden"
        :class="{
          'border-slate-200 dark:border-slate-700/50': q.status === 'FOUND',
          'border-amber-200 dark:border-amber-800/50': q.status === 'EMPTY',
          'border-indigo-200 dark:border-indigo-800/50': q.status === 'REPLACED',
          'border-rose-200 dark:border-rose-800/50 opacity-80': q.status === 'REMOVED',
        }"
      >
        <!-- Accent left border -->
        <div class="absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300"
          :class="{
            'bg-emerald-500': q.status === 'FOUND',
            'bg-amber-500': q.status === 'EMPTY',
            'bg-indigo-500': q.status === 'REPLACED',
            'bg-rose-500': q.status === 'REMOVED',
          }"
        ></div>

        <!-- Card border glow on hover -->
        <div class="absolute -inset-px rounded-2xl border border-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div class="space-y-4 relative z-10">
          <!-- Top Row: Position, Hierarchy and Badges/Actions -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pl-2">
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-black text-slate-400 font-mono w-6">#{{ q.position }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {{ getCourseName(q.courseId) }}
                </span>
                <UIcon name="i-heroicons-minus" class="w-3 h-3 text-slate-300 dark:text-slate-600 rotate-90" />
                <span class="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {{ q.topicName }}
                </span>
                <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {{ q.subtopicName }}
                </span>
              </div>
              
              <div class="pl-8 flex flex-wrap items-center gap-2">
                <span v-if="q.questionId" class="inline-flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400 font-mono border border-slate-200/50 dark:border-slate-700/50 text-[10px] tracking-tight">
                  <UIcon name="i-heroicons-hashtag" class="w-3 h-3" />
                  {{ q.questionId }}
                </span>
                <span v-else class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/30 text-[10px]">
                  <UIcon name="i-heroicons-exclamation-circle" class="w-3 h-3" />
                  Slot Vacante (Requiere atención)
                </span>
              </div>
            </div>

            <!-- Status badge & Actions -->
            <div class="flex items-center gap-3.5 mt-2 sm:mt-0 self-end sm:self-auto">
              <!-- Action buttons -->
              <div class="flex items-center gap-1">
                <UButton
                  v-if="q.status !== 'REMOVED'"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  icon="i-heroicons-arrow-path-20-solid"
                  class="font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  @click="handleReplace(q.id)"
                >
                  Cambiar
                </UButton>
                <UButton
                  v-if="q.status !== 'REMOVED'"
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  class="font-bold"
                  @click="handleRemove(q.id)"
                >
                  Descartar
                </UButton>
                <UButton
                  v-else
                  color="neutral"
                  variant="soft"
                  size="xs"
                  icon="i-heroicons-arrow-uturn-left"
                  class="font-bold"
                  @click="handleRestore(q.id)"
                >
                  Restaurar
                </UButton>
              </div>
            </div>
          </div>
          <!-- Inline Replacement UI -->
          <div v-if="activeReplacingId === q.id" class="ml-2 mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm shrink-0 border border-slate-200 dark:border-slate-600">
              <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400" />
            </div>
            <div class="flex-1 min-w-0">
              <UInput 
                v-model="replacementInputVal" 
                placeholder="Ingresa el ID del reactivo (ej. 21956)..." 
                size="md" 
                variant="none"
                class="w-full !p-0 font-mono text-sm bg-transparent"
                @keyup.enter="confirmReplacement(q.id)"
                autofocus
              />
            </div>
            <div class="flex items-center gap-2 shrink-0 border-l border-slate-200 dark:border-slate-700 pl-3">
              <UButton size="sm" color="neutral" variant="ghost" class="font-bold rounded-lg" @click="activeReplacingId = null">
                Cancelar
              </UButton>
              <UButton size="sm" color="primary" class="font-bold rounded-lg shadow-sm" @click="confirmReplacement(q.id)">
                Confirmar Reemplazo
              </UButton>
            </div>
          </div>

          <!-- Question Content & Alternatives -->
          <div v-if="q.status !== 'REMOVED' && q.htmlContent" class="pl-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 max-w-none prose dark:prose-invert prose-p:my-1 prose-img:rounded-lg" v-html="q.htmlContent"></div>
            
            <!-- Alternatives list -->
            <div v-if="q.options && q.options.length > 0" class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="opt in q.options" :key="opt.label" 
                class="flex items-start gap-3 p-3 rounded-xl border transition-all"
                :class="opt.is_correct 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20' 
                  : 'bg-white dark:bg-[#1a1b2e] border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  :class="opt.is_correct 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'"
                >
                  {{ opt.label }}
                </span>
                <span class="leading-relaxed text-xs pt-1" v-html="opt.text"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredQuestions.length === 0" class="text-center py-16 text-slate-500 font-medium">
      No hay preguntas en esta pestaña o coincidentes con los filtros de búsqueda.
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="flex justify-center items-center py-4 border-t border-slate-100 dark:border-slate-800/50 mt-4">
      <UPagination
        v-model="currentPage"
        :total="filteredQuestions.length"
        :page-count="itemsPerPage"
      />
    </div>

    <!-- Warning Block and Footer Actions -->
    <div class="p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-2xl space-y-5">
      <div v-if="hasEmptySlots" class="flex gap-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-5 rounded-xl text-amber-800 dark:text-amber-400 ring-1 ring-amber-500/10">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mt-0.5 flex-shrink-0" />
        <div class="space-y-2">
          <h4 class="text-sm font-bold">Existen slots vacantes en la revisión</h4>
          <p class="text-xs leading-relaxed max-w-3xl opacity-90">
            Algunos temas de la semana seleccionada no tienen reactivos asignados en el banco de preguntas. Para continuar con la generación, activa la opción inferior para compilar el material omitiendo estos temas.
          </p>
          <UCheckbox
            v-model="continueWithWarnings"
            label="Continuar y generar documento ignorando los slots vacíos"
            class="pt-2 font-bold"
          />
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
        <UButton 
          color="neutral" 
          variant="ghost" 
          size="lg"
          @click="emit('cancel')"
          class="font-bold rounded-xl w-full sm:w-auto justify-center"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-document-check"
          @click="handleApprove"
          :loading="store.isLoading"
          :disabled="hasEmptySlots && !continueWithWarnings"
          class="shadow-sm font-black rounded-xl"
        >
          Aprobar y Compilar PDFs
        </UButton>
      </div>
    </div>
  </div>
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
