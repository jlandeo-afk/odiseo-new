<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMaterialsStore, type ReviewQuestion } from '../store/materials';

const props = defineProps<{
  materialId: string;
}>();

const emit = defineEmits(['approved', 'cancel']);

const store = useMaterialsStore();

const continueWithWarnings = ref(false);
const localReplacements = ref<Record<string, string>>({}); // reviewQuestionId -> newQuestionId
const localRemovals = ref<Set<string>>(new Set()); // set of reviewQuestionId

const activeTab = ref<'all' | 'empty' | 'replaced' | 'removed'>('all');

onMounted(async () => {
  await store.fetchReviewData(props.materialId);
});

const reviewData = computed(() => store.currentReview);

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
  if (activeTab.value === 'all') return questions.value;
  if (activeTab.value === 'empty') return questions.value.filter(q => q.status === 'EMPTY');
  if (activeTab.value === 'replaced') return questions.value.filter(q => q.status === 'REPLACED');
  if (activeTab.value === 'removed') return questions.value.filter(q => q.status === 'REMOVED');
  return questions.value;
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
  <div v-if="store.isLoading && !reviewData" class="flex items-center justify-center py-20">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-indigo-500" />
  </div>

  <div v-else-if="reviewData" class="space-y-6">
    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span class="px-2.5 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
            Revision de Reactivos
          </span>
          <h2 class="text-2xl font-bold mt-2">Curation Pipeline</h2>
          <p class="text-sm text-slate-300 mt-1">Cura los slots de preguntas seleccionados para el material.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Version actual</span>
            <span class="text-lg font-bold">v{{ reviewData.version }}</span>
          </div>
          <div class="h-8 w-px bg-slate-800"></div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Estado</span>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {{ reviewData.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Tabs -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
      <div class="flex gap-2">
        <UButton
          v-for="tab in ['all', 'empty', 'replaced', 'removed']"
          :key="tab"
          :color="activeTab === tab ? 'indigo' : 'gray'"
          :variant="activeTab === tab ? 'solid' : 'ghost'"
          size="sm"
          @click="activeTab = tab as any"
          class="capitalize"
        >
          {{ tab === 'all' ? 'Todos' : tab === 'empty' ? 'Vacantes' : tab === 'replaced' ? 'Reemplazados' : 'Descartados' }}
        </UButton>
      </div>

      <div class="text-xs text-slate-500">
        Mostrando {{ filteredQuestions.length }} de {{ questions.length }} slots
      </div>
    </div>

    <!-- Question Cards List -->
    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="q in filteredQuestions"
        :key="q.id"
        class="bg-white dark:bg-[#1e1e2d] border rounded-xl p-5 shadow-sm transition-all hover:shadow-md"
        :class="{
          'border-slate-200 dark:border-slate-800': q.status === 'FOUND',
          'border-amber-400 dark:border-amber-500/40 bg-amber-50/10': q.status === 'EMPTY',
          'border-indigo-400 dark:border-indigo-500/40 bg-indigo-50/10': q.status === 'REPLACED',
          'border-red-400 dark:border-red-500/40 opacity-75 bg-red-50/5': q.status === 'REMOVED',
        }"
      >
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-slate-400">#{{ q.position }}</span>
              <span class="font-semibold text-slate-900 dark:text-slate-100">
                {{ q.topicName }}
              </span>
              <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-slate-400" />
              <span class="text-sm text-slate-500 dark:text-slate-400">
                {{ q.subtopicName }}
              </span>
            </div>
            <div class="mt-2 text-xs font-mono text-slate-500">
              <span v-if="q.questionId" class="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                ID Reactivo: {{ q.questionId }}
              </span>
              <span v-else class="text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
                Slot Vacante (Sin reactivo)
              </span>
            </div>
          </div>

          <!-- Status badge & Actions -->
          <div class="flex items-center gap-3 mt-2 sm:mt-0">
            <!-- Badge -->
            <span
              class="px-2 py-0.5 rounded text-xs font-semibold border"
              :class="{
                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': q.status === 'FOUND',
                'bg-amber-500/10 text-amber-500 border-amber-500/20': q.status === 'EMPTY',
                'bg-indigo-500/10 text-indigo-500 border-indigo-500/20': q.status === 'REPLACED',
                'bg-red-500/10 text-red-500 border-red-500/20': q.status === 'REMOVED',
              }"
            >
              {{ q.status }}
            </span>

            <!-- Action buttons -->
            <div class="flex items-center gap-1.5">
              <UButton
                v-if="q.status !== 'REMOVED'"
                color="indigo"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-path-20-solid"
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
    <div v-if="filteredQuestions.length === 0" class="text-center py-12 text-slate-500">
      No hay slots en esta pestaña.
    </div>

    <!-- Warning Block and Footer Actions -->
    <div class="p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
      <div v-if="hasEmptySlots" class="flex gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-700 dark:text-amber-400">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <h4 class="text-sm font-semibold">Existen slots vacantes en la revisión</h4>
          <p class="text-xs mt-0.5 leading-relaxed">
            Algunos temas no tienen reactivos asignados en el banco. Para continuar con la generación, puedes activar la opción inferior para compilar ignorando estos slots.
          </p>
          <UCheckbox
            v-model="continueWithWarnings"
            label="Continuar con advertencias (ignorar slots vacíos)"
            class="mt-3 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div class="flex justify-between items-center pt-2">
        <UButton color="gray" variant="ghost" @click="emit('cancel')">
          Volver a Historial
        </UButton>
        <UButton
          color="indigo"
          size="lg"
          @click="handleApprove"
          :loading="store.isLoading"
          :disabled="hasEmptySlots && !continueWithWarnings"
          class="shadow-md shadow-indigo-600/15"
        >
          Aprobar y Generar PDFs
        </UButton>
      </div>
    </div>
  </div>
</template>
