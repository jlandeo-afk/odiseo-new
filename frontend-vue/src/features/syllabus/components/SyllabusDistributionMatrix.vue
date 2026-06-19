<script setup lang="ts">
import { useSyllabusStore } from '../store';

const store = useSyllabusStore();

const addDemoDist = () => {
  store.addDistribution({ weekNumber: 1, topicId: 'Topico A', subtopicId: 'Subtopico X', requestedQuantity: 1 });
};

const addErrorDist = () => {
  store.addDistribution({ weekNumber: 1, topicId: 'Topico B', subtopicId: 'Subtopico Y', requestedQuantity: 150 });
};
</script>

<template>
  <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
      <h3 class="font-medium text-gray-900 dark:text-white">Distribución de Temas</h3>
      <div class="flex gap-2">
        <UButton size="sm" color="red" variant="soft" @click="addErrorDist">Simular Error > 100</UButton>
        <UButton size="sm" color="primary" @click="addDemoDist">Agregar (Optimistic)</UButton>
      </div>
    </div>
    
    <div v-if="store.error" class="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
      <p class="text-sm text-red-600 dark:text-red-400 font-medium">{{ store.error }}</p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500 w-48">Semana</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Contenido Asignado</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500 w-32">Cant.</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="dist in store.distributions" :key="dist.id" :class="{'bg-amber-50 dark:bg-amber-900/10': dist.hasGeneratedMaterials}">
            <td class="px-4 py-3 text-gray-900 dark:text-white">
              Semana {{ dist.weekNumber }}
              <UBadge v-if="dist.hasGeneratedMaterials" color="amber" variant="subtle" size="xs" class="ml-2" title="Modificar esta semana requerirá re-generar materiales (EC-005)">
                Materiales Generados
              </UBadge>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ dist.topicId }} / {{ dist.subtopicId }}</td>
            <td class="px-4 py-3 text-right">
              <UBadge color="gray">{{ dist.requestedQuantity }}</UBadge>
            </td>
          </tr>
          <tr v-if="store.distributions.length === 0">
            <td colspan="3" class="px-4 py-8 text-center text-gray-500 italic">No hay distribuciones asignadas</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
