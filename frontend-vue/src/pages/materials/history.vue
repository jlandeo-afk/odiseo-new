<template>
  <div class="px-8 py-6 max-w-full">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Historial de Materiales</h1>
        <p class="text-sm text-slate-500 mt-1">
          Consulta y descarga todos los balotarios y exámenes generados previamente.
        </p>
      </div>
      <div class="flex items-center gap-4">
        <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-path" @click="fetchHistory" :loading="loading" />
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && materials.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-slate-100 dark:bg-[#2b2b3f] rounded-xl animate-pulse" />
    </div>

    <!-- Empty state -->
    <div v-else-if="materials.length === 0" class="py-20 text-center bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <UIcon name="i-heroicons-document-magnifying-glass" class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Aún no tienes materiales</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Los balotarios y exámenes generados aparecerán aquí para que los puedas descargar en cualquier momento.
      </p>
    </div>

    <!-- History table -->
    <div v-else class="bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50 text-sm text-left">
          <thead class="bg-slate-50 dark:bg-[#1e1e2d]/50">
            <tr>
              <th class="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Tipo</th>
              <th class="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Curso</th>
              <th class="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Estado</th>
              <th class="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Fecha</th>
              <th class="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/30">
            <tr
              v-for="material in materials"
              :key="material.id"
              class="hover:bg-slate-50/50 dark:hover:bg-[#36364e] transition-colors"
            >
              <td class="px-6 py-4">
                <UBadge :color="material.materialType === 'EXAMEN' ? 'indigo' : 'fuchsia'" variant="subtle">
                  {{ material.materialType }}
                </UBadge>
              </td>
              <td class="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{{ material.courseId }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="statusColorClass(material.status)"></span>
                  <span class="text-slate-600 dark:text-slate-300 font-medium text-[13px]">{{ statusLabel(material.status) }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-500 dark:text-slate-400">{{ formatDate(material.createdAt) }}</td>
              <td class="px-6 py-4">
                <UButton
                  v-if="material.status === 'COMPLETED' && material.downloadUrl"
                  size="xs"
                  color="primary"
                  variant="soft"
                  icon="i-heroicons-arrow-down-tray"
                  :to="material.downloadUrl"
                  target="_blank"
                >
                  Descargar
                </UButton>
                <div v-else-if="material.status === 'FAILED'" class="text-xs text-rose-500 max-w-[200px] truncate" :title="material.errorMessage || 'Error'">
                  {{ material.errorMessage || 'Error' }}
                </div>
                <div v-else class="text-xs text-slate-400 italic">
                  En proceso...
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import type { MaterialRequest, MaterialRequestStatus } from '@/types/materials';

definePageMeta({
  layout: 'b2b',
  permissions: ['generate_material']
});

const materials = ref<MaterialRequest[]>([]);
const loading = ref(true);
const authStore = useAuthStore();

const API_BASE = 'http://localhost:3000/api';

async function fetchHistory() {
  loading.value = true;
  const subdomain = authStore.getSubdomain();
  try {
    const response = await fetch(`${API_BASE}/v1/materials/history`, {
      method: 'GET',
      headers: {
        'x-subdomain': subdomain,
      },
      credentials: 'include',
    });
    if (response.ok) {
      materials.value = await response.json();
    }
  } catch (err) {
    console.error('[History] Failed to load materials history:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchHistory();
});

function statusLabel(status: MaterialRequestStatus): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    CURATION_REQUIRED: 'En curaduría',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
  };
  return labels[status] || status;
}

function statusColorClass(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-400';
    case 'PROCESSING': return 'bg-indigo-500 animate-pulse';
    case 'CURATION_REQUIRED': return 'bg-orange-500';
    case 'COMPLETED': return 'bg-emerald-500';
    case 'FAILED': return 'bg-rose-500';
    default: return 'bg-slate-400';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
