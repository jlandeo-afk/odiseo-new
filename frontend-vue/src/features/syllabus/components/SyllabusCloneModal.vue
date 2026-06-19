<script setup lang="ts">
import { ref } from 'vue';
import { useSyllabusStore } from '../store';

const store = useSyllabusStore();
const isOpen = ref(false);
const sourceId = ref('');

const confirmClone = async () => {
  await store.cloneSyllabus(sourceId.value);
  isOpen.value = false;
};

defineExpose({ isOpen });
</script>

<template>
  <UModal v-model="isOpen">
    <div class="p-6">
      <h3 class="text-lg font-medium mb-4">Clonar Sílabo</h3>
      <UAlert 
        v-if="store.distributions.length > 0"
        color="amber" 
        variant="subtle" 
        icon="i-heroicons-exclamation-triangle" 
        title="Existen datos previos" 
        description="Esta acción sobrescribirá las distribuciones actuales del sílabo." 
        class="mb-4"
      />
      <UFormGroup label="ID del Sílabo Origen">
        <UInput v-model="sourceId" placeholder="UUID del sílabo a copiar" />
      </UFormGroup>
      
      <div class="flex justify-end gap-2 mt-6">
        <UButton color="gray" variant="ghost" @click="isOpen = false">Cancelar</UButton>
        <UButton color="primary" @click="confirmClone" :loading="store.loading">Confirmar Clonación</UButton>
      </div>
    </div>
  </UModal>
</template>
