<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSyllabusStore } from '../store';
import { useAcademicTimeStore } from '../../academic-time/store';
import { useCatalogsStore } from '../../catalogs/store';

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();
const toast = useToast();

const syllabus = computed(() => store.syllabus);

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
const activeTopics = computed(() => course.value?.topics.filter(t => t.isActive) || []);

const topicOptions = computed(() => {
  const options: { label: string; topicId: string; subtopicId: string; value: string }[] = [];
  activeTopics.value.forEach(topic => {
    if (topic.subtopics && topic.subtopics.length > 0) {
      topic.subtopics.forEach(sub => {
        options.push({
          label: `${topic.name} - ${sub.name}`,
          topicId: topic.id,
          subtopicId: sub.id,
          value: `${topic.id}|${sub.id}`
        });
      });
    } else {
      options.push({
        label: topic.name,
        topicId: topic.id,
        subtopicId: '',
        value: `${topic.id}|`
      });
    }
  });
  return options;
});

const activeAddWeek = ref<number | null>(null);
const newDistForm = ref({
  topicValue: '',
  requestedQuantity: 10
});

const openAddForWeek = (weekNumber: number) => {
  activeAddWeek.value = weekNumber;
  newDistForm.value = { topicValue: '', requestedQuantity: 10 };
};

const cancelAdd = () => {
  activeAddWeek.value = null;
};

const saveNewDist = async (weekNumber: number) => {
  if (!newDistForm.value.topicValue) return;
  const [topicId, subtopicId] = newDistForm.value.topicValue.split('|');
  
  try {
    await store.addDistribution(syllabus.value.id, {
      weekNumber,
      topicId,
      subtopicId,
      requestedQuantity: Number(newDistForm.value.requestedQuantity)
    });
    activeAddWeek.value = null;
  } catch (e: any) {
    toast.add({ title: 'Error de Asignación', description: e.message, color: 'red' });
  }
};

const updateQty = async (distId: string, quantity: number) => {
  try {
    await store.updateDistributionQuantity(distId, syllabus.value.id, quantity);
  } catch (e: any) {
    toast.add({ title: 'Error al actualizar', description: e.message, color: 'red' });
  }
};

const removeDist = async (distId: string) => {
  try {
    await store.deleteDistribution(distId, syllabus.value.id);
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'red' });
  }
};

const getTopicName = (topicId: string, subtopicId: string) => {
  const t = course.value?.topics.find(x => x.id === topicId);
  if (!t) return topicId;
  if (!subtopicId) return t.name;
  const s = t.subtopics.find(x => x.id === subtopicId);
  return s ? `${t.name} - ${s.name}` : `${t.name} - ${subtopicId}`;
};

const isTopicActive = (topicId: string) => {
  const t = course.value?.topics.find(x => x.id === topicId);
  return t ? t.isActive : false;
};

const weeksList = computed(() => {
  const weeks = [];
  const cycleWeeks = cycle.value?.weeks || [];
  for (let w = 1; w <= totalWeeks.value; w++) {
    const dists = store.distributions.filter(d => d.weekNumber === w);
    const totalQty = dists.reduce((sum, d) => sum + Number(d.requestedQuantity), 0);
    const cWeek = cycleWeeks.find(cw => cw.weekNumber === w);
    weeks.push({
      number: w,
      isActive: cWeek ? cWeek.isActive : true,
      distributions: dists,
      totalQty
    });
  }
  return weeks;
});

const grandTotal = computed(() => store.distributions.reduce((sum, d) => sum + Number(d.requestedQuantity), 0));
</script>

<template>
  <div class="space-y-6 w-full pb-10">
    <!-- Header with totals -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-[#2b2b3f] px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Matriz de Distribución</h3>
        <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span class="font-medium text-indigo-600 dark:text-indigo-400">{{ course?.name || syllabus?.courseId }}</span>
          <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
          <span>{{ totalWeeks }} semanas</span>
        </div>
      </div>
      <div class="mt-4 sm:mt-0 bg-slate-50 dark:bg-[#1e1e2d] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700/50 text-right min-w-[140px]">
        <p class="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Total Preguntas</p>
        <p class="text-3xl font-black text-slate-800 dark:text-slate-200 leading-none">
          {{ grandTotal }}
        </p>
      </div>
    </div>

    <!-- The Matrix List -->
    <div class="space-y-4">
      <div
        v-for="week in weeksList" 
        :key="week.number"
        class="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white dark:bg-[#2b2b3f] shadow-sm transition-all duration-200"
        :class="{'ring-1 ring-indigo-500 border-indigo-500': activeAddWeek === week.number}"
      >
        <!-- Week Header -->
        <div class="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 dark:bg-[#1e1e2d]/50 border-b border-slate-200 dark:border-slate-700/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-lg" :class="week.distributions.length > 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'">
              <span class="font-bold text-sm">S{{ week.number }}</span>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">Semana {{ week.number }}</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ week.distributions.length }} temas • {{ week.totalQty }} preguntas
              </p>
            </div>
          </div>
          
          <div>
            <UButton 
              v-if="week.isActive && activeAddWeek !== week.number"
              size="sm" 
              color="primary" 
              variant="soft" 
              icon="i-heroicons-plus" 
              @click="openAddForWeek(week.number)"
              class="hidden sm:flex"
            >
              Añadir Tema
            </UButton>
            <UButton 
              v-if="week.isActive && activeAddWeek !== week.number"
              size="sm" 
              color="primary" 
              variant="soft" 
              icon="i-heroicons-plus" 
              @click="openAddForWeek(week.number)"
              class="sm:hidden"
            />
          </div>
        </div>

        <!-- Week Body -->
        <div v-if="!week.isActive" class="px-5 py-6 text-center bg-slate-50/50 dark:bg-[#1e1e2d]/30 border-t border-slate-200 dark:border-slate-700/50">
          <p class="text-sm text-red-500 font-semibold flex items-center justify-center gap-2">
            <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
            Semana Inactiva (Feriado o deshabilitada)
          </p>
        </div>
        <div v-else class="p-0">
          
          <!-- Empty State -->
          <div v-if="week.distributions.length === 0 && activeAddWeek !== week.number" class="px-5 py-6 text-center">
            <div class="w-10 h-10 mx-auto bg-slate-50 dark:bg-[#1e1e2d] rounded-full flex items-center justify-center mb-2">
              <UIcon name="i-heroicons-document-minus" class="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">Sin contenido asignado</p>
          </div>

          <!-- Topics List -->
          <div v-if="week.distributions.length > 0" class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <div 
              v-for="dist in week.distributions" 
              :key="dist.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#36364e] transition-colors gap-3 sm:gap-0"
            >
              <div class="flex-1 pr-4 flex items-center gap-2">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-200" :class="{ 'line-through opacity-50': !isTopicActive(dist.topicId) }">
                  {{ getTopicName(dist.topicId, dist.subtopicId) }}
                </span>
                <UBadge v-if="!isTopicActive(dist.topicId)" color="red" size="sm" variant="subtle">Inactivo</UBadge>
              </div>
              
              <div class="flex items-center gap-4 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400 dark:text-slate-500">Preguntas:</span>
                  <UInput 
                    type="number" 
                    size="sm" 
                    :model-value="dist.requestedQuantity" 
                    @update:model-value="val => updateQty(dist.id, Number(val))" 
                    class="w-20" 
                    :ui="{ base: 'text-center font-medium dark:bg-[#1e1e2d] dark:border-slate-600' }"
                  />
                </div>
                <UTooltip text="Eliminar tema">
                  <UButton 
                    size="xs" 
                    color="error" 
                    variant="ghost" 
                    icon="i-heroicons-trash" 
                    @click="removeDist(dist.id)" 
                  />
                </UTooltip>
              </div>
            </div>
          </div>

          <!-- Add Form Inline -->
          <div v-if="activeAddWeek === week.number" class="px-5 py-4 bg-indigo-50/50 dark:bg-indigo-500/10 border-t border-indigo-100 dark:border-indigo-500/20">
            <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div class="flex-1 w-full">
                <label class="text-[10px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide mb-1 block">Tema / Subtema</label>
                <USelectMenu 
                  v-model="newDistForm.topicValue" 
                  :options="topicOptions" 
                  value-attribute="value" 
                  option-attribute="label" 
                  placeholder="Buscar tema..." 
                  searchable
                  class="w-full"
                />
              </div>
              <div class="w-full sm:w-28 shrink-0">
                <label class="text-[10px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide mb-1 block">Cantidad</label>
                <UInput 
                  type="number" 
                  v-model="newDistForm.requestedQuantity" 
                  class="w-full" 
                  :ui="{ base: 'text-center dark:bg-[#1e1e2d] dark:border-slate-600' }"
                />
              </div>
              <div class="flex items-center gap-1 w-full sm:w-auto sm:self-end pt-5 sm:pt-0">
                <UButton 
                  color="primary" 
                  icon="i-heroicons-check" 
                  @click="saveNewDist(week.number)"
                  class="flex-1 sm:flex-none justify-center"
                >
                  Guardar
                </UButton>
                <UButton 
                  color="neutral" 
                  variant="ghost" 
                  icon="i-heroicons-x-mark" 
                  @click="cancelAdd" 
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
