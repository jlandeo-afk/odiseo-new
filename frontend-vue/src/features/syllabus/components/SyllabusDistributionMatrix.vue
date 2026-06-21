<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSyllabusStore } from '../store';
import { useAcademicTimeStore } from '../../academic-time/store';
import { useCatalogsStore } from '../../catalogs/store';
import SyllabusSubtopicSlideOver from './SyllabusSubtopicSlideOver.vue';

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();
const toast = useToast();

const syllabus = computed(() => store.syllabus);
const slideOverRef = ref<InstanceType<typeof SyllabusSubtopicSlideOver> | null>(null);

watch(() => syllabus.value?.id, async (newId) => {
  if (newId) {
    await store.fetchSummary(newId);
    if (syllabus.value?.courseId) {
       await catalogsStore.fetchCourseTopics(syllabus.value.courseId);
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
  
  // From store
  store.distributions.forEach(d => {
    const key = `${d.topicId}|${d.subtopicId}`;
    if (!map.has(key)) {
      map.set(key, {
        topicId: d.topicId,
        subtopicId: d.subtopicId,
        topicName: getTopicName(d.topicId),
        subtopicName: getSubtopicName(d.topicId, d.subtopicId)
      });
    }
  });
  
  // From local additions
  localRows.value.forEach(row => {
    const key = `${row.topicId}|${row.subtopicId}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  });
  
  return Array.from(map.values()).sort((a, b) => a.topicName.localeCompare(b.topicName));
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
  return dist ? dist.weight : '';
};

const getRowTotal = (row: RowData) => {
  const dists = store.distributions.filter(d => d.topicId === row.topicId && d.subtopicId === row.subtopicId);
  return dists.reduce((sum, d) => sum + Number(d.weight), 0);
};

const getColTotal = (weekNumber: number) => {
  const dists = store.distributions.filter(d => d.weekNumber === weekNumber);
  return dists.reduce((sum, d) => sum + Number(d.weight), 0);
};

const grandTotalWeight = computed(() => store.distributions.reduce((sum, d) => sum + Number(d.weight), 0));

const updateCell = async (row: RowData, weekNumber: number, newValueStr: string) => {
  const dist = store.distributions.find(d => d.topicId === row.topicId && d.subtopicId === row.subtopicId && d.weekNumber === weekNumber);
  const newValue = newValueStr.trim() !== '' ? Number(newValueStr) : null;
  
  if (newValue !== null && (newValue < 1 || newValue > 10)) {
    toast.add({ title: 'Error', description: 'El peso debe estar entre 1 y 10', color: 'red' });
    return;
  }
  
  // If the value is the same, do nothing
  if (dist && dist.weight === newValue) return;
  
  try {
    if (dist && newValue !== null) {
      await store.updateDistributionWeight(dist.id, syllabus.value.id, newValue);
    } else if (dist && newValue === null) {
      await store.deleteDistribution(dist.id, syllabus.value.id);
    } else if (!dist && newValue !== null) {
      await store.addDistribution(syllabus.value.id, {
        weekNumber,
        topicId: row.topicId,
        subtopicId: row.subtopicId,
        weight: newValue
      });
    }
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message || 'Hubo un error al actualizar', color: 'red' });
  }
};
</script>

<template>
  <div class="space-y-6 w-full pb-10">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-[#2b2b3f] px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Matriz Pivote de Sílabo</h3>
        <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span class="font-medium text-indigo-600 dark:text-indigo-400">{{ course?.name || syllabus?.courseId }}</span>
          <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
          <span>{{ totalWeeks }} semanas</span>
        </div>
      </div>
    <div class="mt-4 sm:mt-0 flex items-center gap-4">
        <div class="bg-slate-50 dark:bg-[#1e1e2d] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700/50 text-right">
          <p class="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Peso Total</p>
          <p class="text-3xl font-black text-slate-800 dark:text-slate-200 leading-none">{{ grandTotalWeight }}</p>
        </div>
        <UButton color="primary" icon="i-heroicons-plus" @click="slideOverRef?.open()">Añadir Temas</UButton>
      </div>
    </div>

    <!-- Information about Weights -->
    <div class="bg-gradient-to-r from-indigo-50 to-fuchsia-50 dark:from-indigo-900/20 dark:to-fuchsia-900/20 p-4 sm:p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20 flex flex-col sm:flex-row gap-4 items-start shadow-sm">
      <div class="bg-white dark:bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm border border-indigo-50 dark:border-indigo-500/20">
        <UIcon name="i-heroicons-light-bulb" class="w-6 h-6" />
      </div>
      <div>
        <h4 class="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">Tip de Diseño: Pesos Relativos</h4>
        <p class="text-[13px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed max-w-4xl">
          Ingresa un valor del <strong>1 al 10</strong> para asignar el nivel de importancia de cada subtema. Este número <strong>no</strong> representa la cantidad exacta de preguntas que se imprimirán, sino su <em>proporción</em>. La cantidad final de ejercicios se calculará automáticamente con base en la <strong>Plantilla de Material</strong> que utilice la academia.
        </p>
      </div>
    </div>

    <!-- Pivot Matrix -->
    <div class="border border-slate-200 dark:border-slate-700/50 rounded-2xl bg-white dark:bg-[#2b2b3f] shadow-sm overflow-hidden flex flex-col relative">
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th class="sticky left-0 z-20 bg-slate-50 dark:bg-[#1e1e2d] p-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Tema / Subtema
              </th>
              <th v-for="col in matrixColumns" :key="col.number" class="p-3 border-b border-r border-slate-200 dark:border-slate-700 text-center text-xs font-semibold w-[60px]" :class="col.isActive ? 'bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'bg-red-50 dark:bg-red-500/10 text-red-500'">
                S{{ col.number }}
                <div v-if="!col.isActive" class="text-[9px] font-normal mt-1 flex flex-col items-center"><UIcon name="i-heroicons-lock-closed" class="w-3 h-3" /> Inactiva</div>
              </th>
              <th class="bg-slate-50 dark:bg-[#1e1e2d] p-3 border-b border-slate-200 dark:border-slate-700 text-center font-bold text-sm w-[80px]">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="matrixRows.length === 0">
              <td :colspan="matrixColumns.length + 2" class="text-center py-16 text-slate-500 bg-slate-50/30 dark:bg-[#1e1e2d]/30">
                <UIcon name="i-heroicons-document-plus" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No hay temas añadidos a la matriz.</p>
                <p class="text-sm mt-1">Haz clic en <b>"Añadir Temas"</b> para comenzar a planificar tu sílabo.</p>
              </td>
            </tr>
            <tr v-for="row in matrixRows" :key="row.topicId + '|' + row.subtopicId" class="hover:bg-slate-50/80 dark:hover:bg-[#36364e] transition-colors group">
              <td class="sticky left-0 z-10 bg-white dark:bg-[#2b2b3f] group-hover:bg-slate-50/80 dark:group-hover:bg-[#36364e] p-3 border-b border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                <div class="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-1" :title="row.topicName">{{ row.topicName }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1" :title="row.subtopicName">{{ row.subtopicName }}</div>
              </td>
              <td v-for="col in matrixColumns" :key="col.number" class="p-1 border-b border-r border-slate-200 dark:border-slate-700 text-center" :class="{'bg-slate-50/50 dark:bg-slate-800/30': !col.isActive}">
                <input 
                  v-if="col.isActive"
                  type="number" 
                  min="1" 
                  max="10" 
                  class="w-full h-8 text-center border border-transparent rounded text-sm bg-transparent dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hide-arrows transition-colors" 
                  :value="getCellValue(row, col.number)"
                  @blur="e => updateCell(row, col.number, (e.target as HTMLInputElement).value)"
                  @keyup.enter="e => (e.target as HTMLInputElement).blur()"
                  placeholder="-"
                />
              </td>
              <td class="p-3 border-b border-slate-200 dark:border-slate-700 text-center font-bold text-sm bg-slate-50/50 dark:bg-[#1e1e2d]/50 text-slate-700 dark:text-slate-300">
                {{ getRowTotal(row) || '-' }}
              </td>
            </tr>
          </tbody>
          <tfoot v-if="matrixRows.length > 0">
            <tr>
              <td class="sticky left-0 z-20 bg-slate-100 dark:bg-[#1e1e2d] p-3 border-r border-slate-200 dark:border-slate-700 font-bold text-right text-sm text-slate-700 dark:text-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Totales por Semana
              </td>
              <td v-for="col in matrixColumns" :key="col.number" class="bg-slate-100 dark:bg-[#1e1e2d] p-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-sm text-indigo-700 dark:text-indigo-400">
                {{ getColTotal(col.number) || '-' }}
              </td>
              <td class="bg-indigo-100 dark:bg-indigo-900/30 p-3 border-t border-slate-200 dark:border-slate-700 text-center font-black text-lg text-indigo-800 dark:text-indigo-300">
                {{ grandTotalWeight }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <SyllabusSubtopicSlideOver 
      ref="slideOverRef" 
      :courseId="syllabus?.courseId" 
      :existingKeys="matrixRows.map(r => `${r.topicId}|${r.subtopicId}`)"
      @add-subtopics="onAddSubtopics" 
    />
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

/* Make scrollbar look nice */
.custom-scrollbar::-webkit-scrollbar {
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
  border: 3px solid transparent;
  background-clip: padding-box;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #475569;
}
</style>
