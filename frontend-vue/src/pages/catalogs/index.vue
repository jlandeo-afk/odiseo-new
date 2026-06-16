<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900">Catálogo de Temas</h1>
      <p class="text-sm text-gray-500">Ajusta los nombres locales y la visibilidad para tu institución.</p>
    </div>

    <!-- Table of Topics (Simulated Data for now) -->
    <UCard>
      <UTable :rows="topics" :columns="columns">
        <template #localAlias-data="{ row }">
          <UInput v-model="row.localAlias" placeholder="Alias local (opcional)" @blur="updateTopic(row)" />
        </template>
        <template #isActive-data="{ row }">
          <UToggle v-model="row.isActive" @change="updateTopic(row)" />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({
  layout: 'b2b',
  roles: ['admin', 'super-admin']
});

const columns = [
  { key: 'coreName', label: 'Nombre Original (Banco Global)' },
  { key: 'localAlias', label: 'Nombre Personalizado (Local)' },
  { key: 'isActive', label: 'Visible' }
];

const topics = ref([
  { id: '1', coreName: 'Álgebra Lineal', localAlias: 'Matemática I', isActive: true },
  { id: '2', coreName: 'Geometría del Espacio', localAlias: null, isActive: true },
  { id: '3', coreName: 'Física Cuántica', localAlias: null, isActive: false }
]);

async function updateTopic(row: any) {
  // Aquí se enviaría el PATCH request al backend
  console.log(`Updating topic ${row.id}: Alias=${row.localAlias}, Active=${row.isActive}`);
  // await $fetch(`/api/v1/catalogs/topics/${row.id}`, {
  //   method: 'PATCH',
  //   body: { localAlias: row.localAlias, isActive: row.isActive }
  // });
}
</script>
