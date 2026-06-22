<template>
  <div class="px-8 py-6 max-w-full">
    <!-- Breadcrumb / back link -->
    <div class="mb-6">
      <NuxtLink
        to="/materials/history"
        class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        <span>Volver al Historial</span>
      </NuxtLink>
    </div>

    <!-- Review component wrapper -->
    <div class="max-w-4xl mx-auto">
      <MaterialReviewList
        :materialId="materialId"
        @approved="handleApproved"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import MaterialReviewList from '@/features/materials/components/MaterialReviewList.vue';

definePageMeta({
  layout: 'b2b',
  permissions: ['generate_material']
});

const route = useRoute();
const router = useRouter();
const materialId = route.params.id as string;

function handleApproved(result: any) {
  // Navigate back to history where they can track compilation progress
  router.push('/materials/history');
}

function handleCancel() {
  router.push('/materials/history');
}
</script>
