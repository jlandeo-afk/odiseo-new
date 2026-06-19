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

defineExpose({ isOpen });
</script>

<template>
  <USlideover v-model="isOpen">
    <div class="p-6 flex flex-col gap-6 h-full bg-white dark:bg-gray-900 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Crear Sílabo</h2>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
      </div>
      
      <div class="flex-1 space-y-4">
        <UFormGroup label="Ciclo ID">
          <UInput v-model="form.cycleId" placeholder="Ej. UUID del ciclo" />
        </UFormGroup>

        <UFormGroup label="Curso ID">
          <UInput v-model="form.courseId" placeholder="Ej. UUID del curso" />
        </UFormGroup>

        <UAlert v-if="store.error" color="red" variant="subtle" icon="i-heroicons-exclamation-triangle" :title="store.error" />
      </div>

      <div class="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
        <UButton color="gray" variant="soft" @click="isOpen = false">Cancelar</UButton>
        <UButton color="primary" :loading="store.loading" @click="submit">Crear Sílabo</UButton>
      </div>
    </div>
  </USlideover>
</template>
