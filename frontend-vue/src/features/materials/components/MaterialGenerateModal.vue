<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAcademicTimeStore } from '@/features/academic-time/store';
import { useMaterialsStore } from '../store/materials';

const props = defineProps<{
  cycleId: string;
  defaultTemplateId?: string;
}>();

const emit = defineEmits(['success']);

const academicStore = useAcademicTimeStore();
const materialsStore = useMaterialsStore();

const isOpen = ref(false);
const selectedTemplateId = ref('');
const selectedWeek = ref<number>(1);
const requiresReview = ref(true);

const templates = computed(() => academicStore.templatesByCycle[props.cycleId] ?? []);
const currentCycle = computed(() => academicStore.cycles.find(c => c.id === props.cycleId));

const totalWeeksOptions = computed(() => {
  const weeksCount = currentCycle.value?.totalWeeks || 16;
  return Array.from({ length: weeksCount }, (_, i) => ({
    label: `Semana ${i + 1}`,
    value: i + 1,
  }));
});

const templateOptions = computed(() => {
  return templates.value.map(t => ({
    label: `${t.name} (${t.courses.length} cursos)`,
    value: t.id,
  }));
});

// Watch cycleId to load templates reactively and set default selected template
watch(() => props.cycleId, async (newCycleId) => {
  if (newCycleId) {
    try {
      await academicStore.fetchTemplates(newCycleId);
      if (templateOptions.value.length > 0) {
        selectedTemplateId.value = templateOptions.value[0].value;
      } else {
        selectedTemplateId.value = '';
      }
    } catch (err) {
      console.error('Error fetching templates in modal:', err);
    }
  } else {
    selectedTemplateId.value = '';
  }
}, { immediate: true });

// Reset error and set default template when modal opens
watch(isOpen, (newVal) => {
  if (newVal) {
    materialsStore.error = null;
    if (props.defaultTemplateId && templateOptions.value.find(t => t.value === props.defaultTemplateId)) {
      selectedTemplateId.value = props.defaultTemplateId;
    }
  }
});

const handleGenerate = async () => {
  if (!selectedTemplateId.value) return;
  try {
    const result = await materialsStore.generateMaterial({
      profileId: selectedTemplateId.value,
      weekNumber: selectedWeek.value,
      requiresReview: requiresReview.value,
    });
    isOpen.value = false;
    emit('success', result);
  } catch (e) {
    console.error('Error generating material:', e);
  }
};

defineExpose({ isOpen });
</script>

<template>
  <UModal v-model="isOpen">
    <div class="p-6 bg-white dark:bg-[#1e1e2d] rounded-xl">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
          <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">Generar Material PDF</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Genera balotarios o exámenes basados en la distribución del sílabo</p>
        </div>
      </div>

      <!-- Error Alert (Custom Styled to prevent Nuxt UI crashes) -->
      <div
        v-if="materialsStore.error"
        class="p-4 mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl flex items-start gap-3"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-650 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h4 class="text-sm font-bold text-red-800 dark:text-red-200">Error de Generación</h4>
          <p class="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
            {{ materialsStore.error }}
          </p>
        </div>
      </div>

      <div class="space-y-6">
        <!-- Template Selection -->
        <UFormGroup label="Plantilla de Distribución" required class="form-group-spacing">
          <USelectMenu
            v-model="selectedTemplateId"
            :items="templateOptions"
            value-key="value"
            label-key="label"
            placeholder="Selecciona una plantilla"
            class="w-full"
          />
        </UFormGroup>

        <!-- Week Selection -->
        <UFormGroup label="Semana Académica" required class="form-group-spacing">
          <USelectMenu
            v-model="selectedWeek"
            :items="totalWeeksOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormGroup>

        <!-- Curation Mode Toggle -->
        <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div class="flex items-start gap-3">
            <UCheckbox v-model="requiresReview" class="mt-1" />
            <div>
              <label class="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                Activar flujo de revisión interactiva
              </label>
              <span class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block leading-normal">
                Permite curar reactivos, detectar vacíos en el banco de preguntas y sustituirlos antes de que el Worker physical compile los PDFs finales.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
        <UButton
          color="gray"
          variant="ghost"
          @click="isOpen = false"
          class="hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancelar
        </UButton>
        <UButton
          color="indigo"
          @click="handleGenerate"
          :loading="materialsStore.isLoading"
          :disabled="!selectedTemplateId"
          class="shadow-sm shadow-indigo-600/10"
        >
          Iniciar Generación
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<style scoped>
.form-group-spacing {
  margin-bottom: 24px !important;
}
</style>
