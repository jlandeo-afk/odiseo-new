<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSyllabusStore } from '../store';
import { useAcademicTimeStore } from '@/features/academic-time/store';
import { useToast } from '#imports';

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();

const isOpen = ref(false);
const sourceCycleId = ref('');
const targetCycleId = ref('');

const toast = useToast();

const availableSourceCycles = computed(() => {
  return timeStore.cycles.filter(c => c.id !== targetCycleId.value);
});

const confirmClone = async () => {
  if (!sourceCycleId.value || !targetCycleId.value) return;
  try {
    const res = await store.cloneCycleSyllabuses(targetCycleId.value, sourceCycleId.value);
    toast.add({
      title: 'Clonación Exitosa',
      description: `Se han clonado ${res.clonedCount} sílabos correctamente.`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
    isOpen.value = false;
  } catch (err: any) {
    toast.add({
      title: 'Error al Clonar',
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    });
  }
};

defineExpose({ isOpen, targetCycleId });
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-slate-100 dark:divide-slate-800' }">
        <div class="p-4 sm:p-6">
          <h3 class="text-lg font-medium mb-4">Clonar Sílabos del Ciclo</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Esta acción copiará todos los sílabos configurados de un ciclo anterior hacia el ciclo actual. Si ya existe un sílabo para un curso, este será sobrescrito.
          </p>
          
          <UFormField label="Seleccionar Ciclo Origen" class="mb-4">
            <USelect 
              v-model="sourceCycleId" 
              :options="availableSourceCycles" 
              value-attribute="id" 
              option-attribute="name" 
              placeholder="Selecciona el ciclo desde el cual copiar..." 
            />
          </UFormField>
          
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="gray" variant="ghost" class="btn-premium-secondary" @click="isOpen = false">Cancelar</UButton>
            <UButton color="neutral" variant="ghost" class="btn-premium-primary" @click="confirmClone" :loading="store.loading" :disabled="!sourceCycleId">Confirmar Clonación</UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
