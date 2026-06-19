<script setup lang="ts">
import { ref } from 'vue';
import { useSyllabusStore } from '../../features/syllabus/store';
import SyllabusSlideOver from '../../features/syllabus/components/SyllabusSlideOver.vue';
import SyllabusDistributionMatrix from '../../features/syllabus/components/SyllabusDistributionMatrix.vue';
import SyllabusCloneModal from '../../features/syllabus/components/SyllabusCloneModal.vue';

const store = useSyllabusStore();
const slideOverRef = ref();
const cloneModalRef = ref();

const openCreate = () => {
  if (slideOverRef.value) {
    slideOverRef.value.isOpen = true;
  }
};

const openClone = () => {
  if (cloneModalRef.value) {
    cloneModalRef.value.isOpen = true;
  }
};
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Gestión de Sílabos</h1>
        <p class="text-sm text-gray-500 mt-1">Configura la distribución semanal de preguntas para tus cursos.</p>
      </div>
      <div class="flex gap-2">
        <UButton v-if="store.syllabus" icon="i-heroicons-document-duplicate" color="gray" variant="soft" @click="openClone">Clonar</UButton>
        <UButton icon="i-heroicons-plus" color="primary" @click="openCreate">Nuevo Sílabo</UButton>
      </div>
    </div>

    <UCard v-if="!store.syllabus" class="border-dashed border-2 border-gray-200 dark:border-gray-800">
      <div class="text-center py-16 flex flex-col items-center">
        <div class="bg-primary-50 dark:bg-primary-950 p-4 rounded-full mb-4">
          <UIcon name="i-heroicons-document-text" class="w-8 h-8 text-primary-500" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">No hay sílabo seleccionado</h3>
        <p class="mt-2 text-sm text-gray-500 max-w-sm">Crea un nuevo sílabo o selecciona uno existente desde el panel de control para comenzar a asignar la distribución de preguntas.</p>
        <UButton class="mt-6" color="primary" variant="soft" @click="openCreate">Comenzar ahora</UButton>
      </div>
    </UCard>
    
    <div v-else class="space-y-6">
      <UAlert color="green" variant="subtle" icon="i-heroicons-check-circle" title="Sílabo Activo" :description="`ID: ${store.syllabus.id} | Curso: ${store.syllabus.courseId}`" />
      <SyllabusDistributionMatrix />
    </div>

    <SyllabusSlideOver ref="slideOverRef" />
    <SyllabusCloneModal ref="cloneModalRef" />
  </div>
</template>
