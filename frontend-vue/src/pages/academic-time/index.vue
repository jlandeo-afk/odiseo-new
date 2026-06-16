<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900">Tiempo Académico</h1>
      <UButton color="primary" @click="isCreating = true">Nuevo Ciclo</UButton>
    </div>

    <div v-for="cycle in cycles" :key="cycle.id" class="mb-8">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ cycle.name }}</h2>
          <span class="text-sm text-gray-500">{{ cycle.startDate }} a {{ cycle.endDate }}</span>
        </template>
        
        <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          <!-- Weeks Grid -->
          <div 
            v-for="week in cycle.weeks" 
            :key="week.id"
            :class="[
              'p-4 border rounded-lg text-center relative transition-colors',
              week.isActive ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
            ]"
          >
            <div v-if="!week.isActive" class="absolute inset-0 flex items-center justify-center">
              <span class="transform -rotate-12 text-gray-400 font-bold tracking-widest uppercase opacity-30 pointer-events-none">Feriado</span>
            </div>
            
            <span class="block text-sm font-medium text-gray-700">Semana {{ week.weekNumber }}</span>
            <span class="block text-xs text-gray-500 mt-1">{{ week.startDate }}</span>
            
            <div class="mt-3">
              <UToggle 
                v-model="week.isActive" 
                size="sm"
                @change="toggleWeek(week)" 
                :title="week.isActive ? 'Marcar como vacación' : 'Reactivar semana'"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({
  layout: 'b2b',
  roles: ['admin', 'super-admin']
});

const isCreating = ref(false);

const cycles = ref([
  {
    id: '1',
    name: 'Ciclo Verano 2026',
    startDate: '2026-01-10',
    endDate: '2026-03-10',
    weeks: [
      { id: 'w1', weekNumber: 1, startDate: '2026-01-10', isActive: true },
      { id: 'w2', weekNumber: 2, startDate: '2026-01-17', isActive: true },
      { id: 'w3', weekNumber: 3, startDate: '2026-01-24', isActive: false }, // Feriado
      { id: 'w4', weekNumber: 4, startDate: '2026-01-31', isActive: true },
    ]
  }
]);

async function toggleWeek(week: any) {
  console.log(`Toggling week ${week.id} to ${week.isActive}`);
  // Llama a PATCH /api/v1/academic-time/weeks/:id (activate/deactivate)
}
</script>
