<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSyllabusStore } from '../store';
import { useAcademicTimeStore } from '../../academic-time/store';
import { useCatalogsStore } from '../../catalogs/store';
import SyllabusSubtopicSlideOver from './SyllabusSubtopicSlideOver.vue';
import { useToast } from '#imports';

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();
const toast = useToast();

const generatedWeeks = computed(() => store.generatedWeeks);

function isGeneratedWeek(weekNumber: number) {
  return generatedWeeks.value.includes(weekNumber);
}

function getWeekEmptyStatus() {
  const emptyWeeks: number[] = [];
  for (const col of matrixColumns.value) {
    const hasDist = store.distributions.some(d => d.weekNumber === col.number);
    if (!hasDist) emptyWeeks.push(col.number);
  }
  return emptyWeeks;
}

const emptyWeeks = computed(() => getWeekEmptyStatus());

const syllabus = computed(() => store.syllabus);
const slideOverRef = ref<InstanceType<typeof SyllabusSubtopicSlideOver> | null>(null);
const matrixSearchQuery = ref('');

const selectedTemplateId = ref<string>('');

const templates = computed(() => {
  const cycleId = syllabus.value?.cycleId;
  return cycleId ? timeStore.templatesByCycle[cycleId] || [] : [];
});

const selectedTemplate = computed(() => {
  return templates.value.find(t => t.id === selectedTemplateId.value) || null;
});

const targetQuestionsQuantity = computed(() => {
  if (!selectedTemplate.value || !syllabus.value?.courseId) return null;
  const courseConfig = selectedTemplate.value.courses?.find(c => c.courseId === syllabus.value.courseId);
  return courseConfig ? courseConfig.questionsQuantity : null;
});

watch(() => templates.value, (newTemplates) => {
  if (newTemplates && newTemplates.length > 0 && !selectedTemplateId.value) {
    selectedTemplateId.value = newTemplates[0].id;
  }
}, { immediate: true });

watch(() => syllabus.value?.id, async (newId) => {
  if (newId) {
    await store.fetchSummary(newId);
    if (syllabus.value?.courseId) {
      await catalogsStore.fetchCourseTopics(syllabus.value.courseId);
    }
    if (syllabus.value?.cycleId) {
      await timeStore.fetchTemplates(syllabus.value.cycleId);
    }
  }
}, { immediate: true });

const cycle = computed(() => timeStore.cycles.find(c => c.id === syllabus.value?.cycleId));
const totalWeeks = computed(() => cycle.value?.totalWeeks || 16);
const course = computed(() => catalogsStore.courses.find(c => c.id === syllabus.value?.courseId));

interface RowData {
  topicId: string;
  subtopicId: string;
  topicName: string;
  subtopicName: string;
  topicIsActive: boolean;
}

const localRows = ref<RowData[]>([]);

const getTopicName = (topicId: string) => {
  const t = course.value?.topics.find(x => x.id === topicId);
  return t ? t.name : topicId;
};

const getSubtopicName = (topicId: string, subtopicId: string) => {
  const t = course.value?.topics.find(x => x.id === topicId);
  if (!t || !subtopicId) return 'General';
  const s = t.subtopics.find(x => x.id === subtopicId);
  return s ? s.name : subtopicId;
};

const getTopicIsActive = (topicId: string) => {
  const t = course.value?.topics.find(x => x.id === topicId);
  return t ? t.isActive !== false : true;
};

const onAddSubtopics = (selected: RowData[]) => {
  selected.forEach(row => {
    const exists = localRows.value.some(r => r.topicId === row.topicId && r.subtopicId === row.subtopicId);
    if (!exists) {
      localRows.value.push(row);
    }
  });
};

const matrixRows = computed(() => {
  const map = new Map<string, RowData>();

  // Desde la base de datos (distribución existente)
  store.distributions.forEach(d => {
    const key = `${d.topicId}|${d.subtopicId}`;
    if (!map.has(key)) {
      map.set(key, {
        topicId: d.topicId,
        subtopicId: d.subtopicId,
        topicName: getTopicName(d.topicId),
        subtopicName: getSubtopicName(d.topicId, d.subtopicId),
        topicIsActive: getTopicIsActive(d.topicId)
      });
    }
  });

  // Desde adiciones locales temporales
  localRows.value.forEach(row => {
    const key = `${row.topicId}|${row.subtopicId}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  });

  let list = Array.from(map.values()).sort((a, b) => a.topicName.localeCompare(b.topicName));

  if (matrixSearchQuery.value) {
    const q = matrixSearchQuery.value.toLowerCase();
    list = list.filter(row =>
      row.topicName.toLowerCase().includes(q) ||
      row.subtopicName.toLowerCase().includes(q)
    );
  }

  return list;
});

const matrixColumns = computed(() => {
  const cols = [];
  const cycleWeeks = cycle.value?.weeks || [];
  for (let w = 1; w <= totalWeeks.value; w++) {
    const cWeek = cycleWeeks.find(cw => cw.weekNumber === w);
    cols.push({
      number: w,
      isActive: cWeek ? cWeek.isActive : true
    });
  }
  return cols;
});

const getCellValue = (row: RowData, weekNumber: number) => {
  const dist = store.distributions.find(d => d.topicId === row.topicId && d.subtopicId === row.subtopicId && d.weekNumber === weekNumber);
  return dist ? dist.questionCount : '';
};

const getRowTotal = (row: RowData) => {
  const dists = store.distributions.filter(d => d.topicId === row.topicId && d.subtopicId === row.subtopicId);
  return dists.reduce((sum, d) => sum + Number(d.questionCount), 0);
};

const getColTotal = (weekNumber: number) => {
  const dists = store.distributions.filter(d => d.weekNumber === weekNumber);
  return dists.reduce((sum, d) => sum + Number(d.questionCount), 0);
};

const grandTotalQuestionCount = computed(() => store.distributions.reduce((sum, d) => sum + Number(d.questionCount), 0));

const updateCell = async (row: RowData, weekNumber: number, newValueStr: string) => {
  const dist = store.distributions.find(d => d.topicId === row.topicId && d.subtopicId === row.subtopicId && d.weekNumber === weekNumber);
  const newValue = newValueStr.trim() !== '' ? Number(newValueStr) : null;

  const maxLimit = targetQuestionsQuantity.value !== null ? targetQuestionsQuantity.value : 100;
  if (newValue !== null && (newValue < 1 || newValue > maxLimit)) {
    toast.add({
      title: 'Rango Incorrecto',
      description: targetQuestionsQuantity.value !== null
        ? `La cantidad de preguntas debe estar entre 1 y ${targetQuestionsQuantity.value} (límite de la plantilla "${selectedTemplate.value?.name}")`
        : 'La cantidad de preguntas debe estar entre 1 y 100',
      color: 'red'
    });
    return;
  }

  if (dist && dist.questionCount === newValue) return;

  if (isGeneratedWeek(weekNumber)) {
    toast.add({
      title: 'Semana con Materiales Generados',
      description: 'Esta semana ya tiene materiales generados. Al modificar la distribución, los materiales existentes podrían quedar desactualizados.',
      color: 'warning',
      timeout: 5000
    });
  }

  try {
    if (dist && newValue !== null) {
      await store.updateDistributionQuestionCount(dist.id, syllabus.value.id, newValue);
    } else if (dist && newValue === null) {
      await store.deleteDistribution(dist.id, syllabus.value.id);
    } else if (!dist && newValue !== null) {
      await store.addDistribution(syllabus.value.id, {
        weekNumber,
        topicId: row.topicId,
        subtopicId: row.subtopicId,
        questionCount: newValue
      });
    }
  } catch (e: any) {
    toast.add({ title: 'Error de Guardado', description: e.message || 'No se pudo guardar la cantidad de preguntas', color: 'red' });
  }
};
</script>

<template>
  <div class="space-y-6 w-full pb-10">
    <!-- Cabecera de la Matriz de Distribución -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#2b2b3f] px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm gap-4">
      <div class="flex items-center gap-3">
        <!-- Icono decorativo -->
        <div
          class="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
          <UIcon name="i-heroicons-table-cells" class="w-5.5 h-5.5" />
        </div>
        <div class="space-y-0.5">
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Matriz de Distribución de Preguntas
          </h3>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Curso: <span class="text-slate-700 dark:text-slate-300 font-bold">{{ course?.name }}</span> • {{ totalWeeks
            }} semanas planificadas
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        <!-- Widget de Preguntas Totales -->
        <div
          class="bg-indigo-50/50 dark:bg-[#1e1e2d] px-5 py-2.5 rounded-xl border border-indigo-100/40 dark:border-indigo-900/30 text-right shadow-inner">
          <p class="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-0.5">Preguntas
            Totales Asignadas</p>
          <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none transition-all duration-300">
            {{ grandTotalQuestionCount }}</p>
        </div>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-plus" class="btn-premium-primary"
          @click="slideOverRef?.open()">
          Añadir Temas
        </UButton>
      </div>
    </div>


    <!-- Tabla Pivote de la Matriz -->
    <div
      class="border border-slate-200 dark:border-slate-700/50 rounded-2xl bg-white dark:bg-[#2b2b3f] shadow-sm overflow-hidden flex flex-col relative">

      <!-- Barra de Filtros Interna de la Matriz -->
      <div
        class="p-4 bg-slate-50/50 dark:bg-[#1e1e2d]/20 border-b border-slate-200/60 dark:border-slate-750/40 flex items-center justify-between gap-4">
        <div class="flex flex-1 items-center gap-4 flex-wrap">
          <div class="w-full max-w-xs relative">
            <UInput v-model="matrixSearchQuery" placeholder="Filtrar por tema o subtema..." icon="i-heroicons-funnel"
              size="sm" color="gray" variant="outline" class="w-full" />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-[11px] font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Plantilla de
              Validación:</span>
            <USelectMenu v-model="selectedTemplateId" :items="templates" value-key="id" label-key="name"
              placeholder="Selecciona plantilla..." class="w-48" size="sm">
              <template #empty>
                <div class="text-xs text-slate-500 text-center py-2">
                  No hay plantillas en este ciclo
                </div>
              </template>
            </USelectMenu>
          </div>

          <div v-if="targetQuestionsQuantity !== null"
            class="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/40 dark:border-indigo-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
            <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              Meta: {{ targetQuestionsQuantity }} preguntas/semana
            </span>
          </div>
        </div>
        <span class="text-xs text-slate-400 dark:text-slate-500 font-medium select-none shrink-0">
          Mostrando {{ matrixRows.length }} filas
        </span>
      </div>

      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th
                class="sticky left-0 z-20 bg-slate-50 dark:bg-[#1e1e2d] p-3.5 border-b border-r border-slate-200 dark:border-slate-700 min-w-[290px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-500 dark:text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                Tema / Subtema
              </th>
              <th v-for="col in matrixColumns" :key="col.number"
                class="p-3 border-b border-r border-slate-200 dark:border-slate-700 text-center text-[10px] font-bold w-[62px]"
                :class="[
                  col.isActive
                    ? isGeneratedWeek(col.number)
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                      : emptyWeeks.includes(col.number)
                        ? 'bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500'
                        : 'bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'
                    : 'bg-slate-50 dark:bg-[#1e1e2d]/60 text-slate-400 dark:text-slate-500'
                ]">
                <div class="flex flex-col items-center gap-0.5">
                  <span>S{{ col.number }}</span>
                  <div v-if="isGeneratedWeek(col.number)"
                    class="flex items-center gap-0.5 text-[8px] font-medium text-amber-600 dark:text-amber-500"
                    title="Esta semana tiene materiales generados. Al editarla los materiales podrían quedar desactualizados.">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-2.5 h-2.5 shrink-0" />
                    <span>Mat.</span>
                  </div>
                  <div v-else-if="emptyWeeks.includes(col.number) && col.isActive"
                    class="text-[8px] font-medium text-slate-400 dark:text-slate-500">
                    Vacío
                  </div>
                  <div v-if="!col.isActive"
                    class="flex items-center gap-0.5 text-[8px] font-medium text-slate-400 dark:text-slate-500">
                    <UIcon name="i-heroicons-lock-closed" class="w-2.5 h-2.5 shrink-0" />
                    <span>Lock</span>
                  </div>
                </div>
              </th>
              <th
                class="bg-slate-50 dark:bg-[#1e1e2d] p-3.5 border-b border-slate-200 dark:border-slate-700 text-center text-[10px] font-bold uppercase tracking-wider w-[82px] text-slate-500 dark:text-slate-450">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Fila cuando no hay temas añadidos -->
            <tr v-if="matrixRows.length === 0">
              <td :colspan="matrixColumns.length + 2"
                class="text-center py-20 text-slate-500 dark:text-slate-400 bg-slate-50/10 dark:bg-[#1e1e2d]/10">
                <div class="max-w-md mx-auto space-y-3">
                  <UIcon name="i-heroicons-document-plus"
                    class="w-12 h-12 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
                  <p class="font-bold text-sm text-slate-700 dark:text-slate-300">No hay temas añadidos en esta matriz
                  </p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">Haz clic en "Añadir Temas" arriba a la derecha
                    para
                    seleccionar los subtemas que se impartirán.</p>
                </div>
              </td>
            </tr>
            <!-- Filas de Datos -->
            <tr v-for="row in matrixRows" :key="row.topicId + '|' + row.subtopicId"
              class="hover:bg-slate-50/50 dark:hover:bg-[#36364e]/30 transition-colors group">
              <!-- Columna izquierda fija -->
              <td
                class="sticky left-0 z-10 bg-white dark:bg-[#2b2b3f] group-hover:bg-slate-50/60 dark:group-hover:bg-[#2d2d42] p-3.5 border-b border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                <div class="flex items-center gap-2">
                  <div class="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1" :title="row.topicName">
                    {{ row.topicName }}
                  </div>
                  <UBadge v-if="!row.topicIsActive" color="red" variant="subtle" size="xs">Inactivo</UBadge>
                </div>
                <div class="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 line-clamp-1"
                  :title="row.subtopicName">
                  {{ row.subtopicName }}
                </div>
              </td>

              <!-- Celdas de Semanas -->
              <td v-for="col in matrixColumns" :key="col.number"
                class="p-1 border-b border-r border-slate-200 dark:border-slate-700 text-center"
                :class="{ 'bg-[linear-gradient(45deg,rgba(148,163,184,0.02)_25%,transparent_25%,transparent_50%,rgba(148,163,184,0.02)_50%,rgba(148,163,184,0.02)_75%,transparent_75%,transparent)] bg-[length:12px_12px] bg-slate-50/30 dark:bg-slate-900/10': !col.isActive }">
                <!-- Input de Celda tipo Spreadsheet -->
                <input v-if="col.isActive" type="number" min="1"
                  :max="targetQuestionsQuantity !== null ? targetQuestionsQuantity : 100"
                  class="w-full h-8 text-center border border-transparent rounded-lg text-xs bg-transparent dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hide-arrows transition-all"
                  :value="getCellValue(row, col.number)"
                  @blur="e => updateCell(row, col.number, (e.target as HTMLInputElement).value)"
                  @keyup.enter="e => (e.target as HTMLInputElement).blur()" placeholder="-" />
                <!-- Celda bloqueada para semanas inactivas -->
                <div v-else class="flex items-center justify-center text-slate-300 dark:text-slate-650 h-8"
                  title="Semana Inactiva (Feriado)">
                  <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
                </div>
              </td>

              <!-- Columna derecha: Total por Fila -->
              <td
                class="p-3.5 border-b border-slate-200 dark:border-slate-700 text-center font-bold text-xs bg-slate-50/30 dark:bg-[#1e1e2d]/20 text-slate-700 dark:text-slate-350">
                {{ getRowTotal(row) || '-' }}
              </td>
            </tr>
          </tbody>
          <!-- Fila de Totales del Pie de Tabla -->
          <tfoot v-if="matrixRows.length > 0">
            <tr>
              <td
                class="sticky left-0 z-20 bg-slate-100 dark:bg-[#1e1e2d] p-3.5 border-r border-slate-200 dark:border-slate-700 font-extrabold text-right text-xs text-slate-750 dark:text-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                Totales por Semana
              </td>
              <td v-for="col in matrixColumns" :key="col.number"
                class="bg-slate-100 dark:bg-[#1e1e2d] p-3.5 border-r border-slate-200 dark:border-slate-700 text-center font-extrabold text-xs"
                :class="[
                  !col.isActive ? 'text-slate-450 dark:text-slate-550' : '',
                  col.isActive && targetQuestionsQuantity === null ? 'text-indigo-650 dark:text-indigo-400' : '',
                  col.isActive && targetQuestionsQuantity !== null && getColTotal(col.number) === targetQuestionsQuantity ? 'text-emerald-600 dark:text-emerald-450 bg-emerald-50/20 dark:bg-emerald-950/15' : '',
                  col.isActive && targetQuestionsQuantity !== null && getColTotal(col.number) > targetQuestionsQuantity ? 'text-rose-600 dark:text-rose-450 bg-rose-50/30 dark:bg-rose-950/15' : '',
                  col.isActive && targetQuestionsQuantity !== null && getColTotal(col.number) > 0 && getColTotal(col.number) < targetQuestionsQuantity ? 'text-amber-600 dark:text-amber-500 bg-amber-50/30 dark:bg-amber-950/15' : ''
                ]"
                :title="col.isActive && targetQuestionsQuantity !== null ? `Total semanal: ${getColTotal(col.number)} / ${targetQuestionsQuantity} preguntas` : ''">
                {{ getColTotal(col.number) || '-' }}
              </td>
              <td
                class="bg-indigo-100/50 dark:bg-indigo-950/40 p-3.5 border-t border-slate-200 dark:border-slate-700 text-center font-black text-sm text-indigo-700 dark:text-indigo-450 shadow-inner">
                {{ grandTotalQuestionCount }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <SyllabusSubtopicSlideOver ref="slideOverRef" :courseId="syllabus?.courseId"
      :existingKeys="matrixRows.map(r => `${r.topicId}|${r.subtopicId}`)" @add-subtopics="onAddSubtopics" />
  </div>
</template>

<style scoped>
.hide-arrows::-webkit-outer-spin-button,
.hide-arrows::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.hide-arrows {
  -moz-appearance: textfield;
}

/* Scrollbar estilizada */
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.dark class.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #475569;
}
</style>
