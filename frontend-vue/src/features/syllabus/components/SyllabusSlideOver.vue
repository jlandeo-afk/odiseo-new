<script setup lang="ts">
import { ref } from 'vue';
import { useSyllabusStore } from '../store';

const store = useSyllabusStore();
const isOpen = ref(false);

const form = ref({
  cycleId: '',
  courseId: ''
});

const submit = async () => {
  await store.createSyllabus({ cycleId: form.value.cycleId, courseId: form.value.courseId });
  if (!store.error) {
    isOpen.value = false;
    form.value.cycleId = '';
    form.value.courseId = '';
  }
};

defineExpose({ isOpen, form });
</script>

<template>
  <USlideover v-model="isOpen">
    <div class="p-6 flex flex-col gap-6 h-full bg-white dark:bg-gray-900 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Crear Sílabo</h2>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
      </div>
      
      <div class="flex-1 space-y-4">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Estás a punto de inicializar un nuevo sílabo.
            Una vez creado, podrás configurar la matriz de distribución de preguntas por semana.
          </p>
        </div>

        <UAlert v-if="store.error" color="error" variant="subtle" icon="i-heroicons-exclamation-triangle" :title="store.error" />
      </div>

      <div class="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
        <UButton color="neutral" variant="soft" @click="isOpen = false">Cancelar</UButton>
        <UButton color="primary" :loading="store.loading" @click="submit">Confirmar y Crear</UButton>
      </div>
    </div>
  </USlideover>
</template>
