<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useMaterialsStore } from '../store/materials';
import { useCatalogsStore } from '@/features/catalogs/store';

const props = defineProps<{
  materialId: string;
}>();

const emit = defineEmits(['approved', 'cancel']);

const store = useMaterialsStore();
const catalogsStore = useCatalogsStore();

const continueWithWarnings = ref(false);
const localReplacements = ref<Record<string, string>>({}); // reviewQuestionId -> newQuestionId
const localRemovals = ref<Set<string>>(new Set()); // set of reviewQuestionId

const activeTab = ref<'all' | 'empty' | 'replaced' | 'removed'>('all');
const searchQuery = ref('');
const selectedCourseId = ref('all');
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

const uniqueCourses = computed(() => {
  if (!reviewData.value) return [];
  const ids = [...new Set(reviewData.value.questions.map(q => q.courseId))];
  return ids.map(id => ({
    id,
    name: getCourseName(id)
  }));
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
  const newId = prompt('Ingresa el ID del nuevo reactivo a asignar:', 'core-q-999');
  if (newId) {
    localReplacements.value[questionId] = newId;
    localRemovals.value.delete(questionId);
  }
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
    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-md border border-indigo-950">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
            <UIcon name="i-heroicons-shield-check" class="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 class="text-xl font-bold tracking-tight">Revisión Académica de Reactivos</h2>
            <p class="text-[11px] text-slate-300 font-medium">Revisa y audita las preguntas seleccionadas por el algoritmo antes de la compilación.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-xl border border-white/5 self-stretch md:self-auto justify-between md:justify-end">
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">Versión</span>
            <span class="text-sm font-black font-mono">v{{ reviewData.version }}</span>
          </div>
          <div class="h-6 w-px bg-white/10"></div>
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-widest text-slate-400 block font-bold font-medium">Estado</span>
            <span class="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
              {{ reviewData.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters: Tabs, Dropdown & Search -->
    <div class="bg-white dark:bg-[#2b2b3f] p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <!-- Tab selector as capsule -->
        <div class="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-inner">
          <button
            v-for="tab in ['all', 'empty', 'replaced', 'removed']"
            :key="tab"
            @click="activeTab = tab as any"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
            :class="activeTab === tab 
              ? 'bg-white dark:bg-[#1a1b2e] text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/5' 
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
            placeholder="Buscar tema/reactivo..."
            class="w-full sm:w-60"
            size="sm"
          />
          <USelectMenu
            v-model="selectedCourseId"
            :options="[{ id: 'all', name: 'Todos los cursos' }, ...uniqueCourses]"
            value-key="id"
            label-key="name"
            class="w-full sm:w-48"
            size="sm"
          />
        </div>
      </div>

      <div class="flex justify-between items-center text-[11px] text-slate-450 dark:text-slate-500 font-medium">
        <span>Mostrando {{ filteredQuestions.length }} de {{ questions.length }} slots</span>
        <span v-if="totalPages > 1">Página {{ currentPage }} de {{ totalPages }}</span>
      </div>
    </div>

    <!-- Question Cards List -->
    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="q in paginatedQuestions"
        :key="q.id"
        class="bg-white dark:bg-[#2b2b3f] border rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative group"
        :class="{
          'border-slate-200 dark:border-slate-700/50': q.status === 'FOUND',
          'border-amber-400 dark:border-amber-500/40 bg-amber-50/10 dark:bg-amber-950/5': q.status === 'EMPTY',
          'border-indigo-400 dark:border-indigo-500/40 bg-indigo-50/10 dark:bg-indigo-950/5': q.status === 'REPLACED',
          'border-rose-450 dark:border-rose-500/30 opacity-70 bg-rose-50/5 dark:bg-rose-950/5': q.status === 'REMOVED',
        }"
      >
        <!-- Card border glow on hover -->
        <div class="absolute -inset-px rounded-2xl border border-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black text-slate-400 font-mono">#{{ q.position }}</span>
              <span class="font-bold text-xs text-slate-800 dark:text-slate-100">
                {{ q.topicName }}
              </span>
              <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-slate-400" />
              <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {{ q.subtopicName }}
              </span>
            </div>
            
            <div class="pt-2 text-[11px] font-bold text-slate-500 flex flex-wrap items-center gap-2">
              <span class="bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-950/30">
                {{ getCourseName(q.courseId) }}
              </span>
              <span v-if="q.questionId" class="bg-slate-150/50 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-700 dark:text-slate-350 font-mono border border-slate-200 dark:border-slate-700">
                ID Reactivo: {{ q.questionId }}
              </span>
              <span v-else class="text-amber-600 dark:text-amber-450 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Slot Vacante (Sin reactivo)
              </span>
            </div>
          </div>

          <!-- Status badge & Actions -->
          <div class="flex items-center gap-3.5 mt-2 sm:mt-0 self-end sm:self-auto">
            <!-- Badge -->
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
              :class="{
                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': q.status === 'FOUND',
                'bg-amber-500/10 text-amber-500 border-amber-500/20': q.status === 'EMPTY',
                'bg-indigo-500/10 text-indigo-500 border-indigo-500/20': q.status === 'REPLACED',
                'bg-rose-500/10 text-rose-500 border-rose-500/20': q.status === 'REMOVED',
              }"
            >
              {{ q.status === 'FOUND' ? 'Asignado' : q.status === 'EMPTY' ? 'Vacante' : q.status === 'REPLACED' ? 'Reemplazado' : 'Descartado' }}
            </span>

            <!-- Action buttons -->
            <div class="flex items-center gap-1">
              <UButton
                v-if="q.status !== 'REMOVED'"
                color="indigo"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-path-20-solid"
                class="rounded-lg font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                @click="handleReplace(q.id)"
              >
                Reemplazar
              </UButton>
              <UButton
                v-if="q.status !== 'REMOVED'"
                color="red"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                class="rounded-lg font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                @click="handleRemove(q.id)"
              >
                Descartar
              </UButton>
              <UButton
                v-else
                color="gray"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-uturn-left"
                class="rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                @click="handleRestore(q.id)"
              >
                Restaurar
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredQuestions.length === 0" class="text-center py-16 text-slate-500 font-medium">
      No hay slots en esta pestaña o coincidentes con los filtros.
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
    <div class="p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl space-y-4">
      <div v-if="hasEmptySlots" class="flex gap-4 bg-amber-500/10 border border-amber-500/20 p-4.5 rounded-xl text-amber-700 dark:text-amber-400">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mt-0.5 flex-shrink-0" />
        <div class="space-y-2">
          <h4 class="text-sm font-bold">Existen slots vacantes en la revisión</h4>
          <p class="text-xs leading-relaxed max-w-3xl">
            Algunos temas de la semana seleccionada no tienen reactivos asignados en el banco de preguntas. Para continuar con la generación, activa la opción inferior para compilar el material omitiendo estos temas.
          </p>
          <UCheckbox
            v-model="continueWithWarnings"
            label="Continuar con advertencias (ignorar slots vacíos)"
            class="text-slate-800 dark:text-slate-200 font-semibold"
          />
        </div>
      </div>

      <div class="flex justify-between items-center pt-2">
        <UButton 
          color="gray" 
          variant="ghost" 
          @click="emit('cancel')"
          class="font-bold rounded-xl"
        >
          Cancelar
        </UButton>
        <UButton
          color="indigo"
          size="md"
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
