<!--
  T028 [US3] — History View
  Permite recuperar el estado de PDFs generados mientras el usuario estaba offline.
  Consulta el historial persistido en la BD B2B vía GET /api/v1/materials/history
  y muestra los enlaces de descarga previamente generados.
-->
<template>
  <div class="materials-history">
    <header class="materials-history__header">
      <h1>Historial de Materiales</h1>
      <p class="materials-history__subtitle">
        Consulta y descarga todos los balotarios y exámenes generados previamente.
      </p>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="materials-history__loading">
      <div class="spinner" />
      <span>Cargando historial...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="materials.length === 0" class="materials-history__empty">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64" class="materials-history__empty-icon">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      <p>Aún no tienes materiales generados.</p>
    </div>

    <!-- History table -->
    <div v-else class="materials-history__table-wrapper">
      <table class="materials-history__table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Curso</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="material in materials"
            :key="material.id"
            class="materials-history__row"
          >
            <td>
              <span :class="['badge', `badge--${material.materialType.toLowerCase()}`]">
                {{ material.materialType }}
              </span>
            </td>
            <td>{{ material.courseId }}</td>
            <td>
              <span :class="['status-dot', `status-dot--${material.status.toLowerCase()}`]" />
              {{ statusLabel(material.status) }}
            </td>
            <td>{{ formatDate(material.createdAt) }}</td>
            <td>
              <a
                v-if="material.status === 'COMPLETED' && material.downloadUrl"
                :href="material.downloadUrl"
                target="_blank"
                rel="noopener"
                class="download-link"
              >
                ⬇ Descargar
              </a>
              <span v-else-if="material.status === 'FAILED'" class="error-text">
                {{ material.errorMessage || 'Error' }}
              </span>
              <span v-else class="pending-text">En proceso...</span>
            </td>
          </tr>
        </tbody>
      </table>
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

onMounted(async () => {
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

<style scoped>
.materials-history {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}

.materials-history__header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 6px;
}

.materials-history__subtitle {
  color: #6c757d;
  font-size: 0.95rem;
  margin: 0 0 28px;
}

.materials-history__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #6c757d;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top-color: #2c3e50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.materials-history__empty {
  text-align: center;
  padding: 60px 0;
  color: #9e9e9e;
}
.materials-history__empty-icon {
  color: #bdbdbd;
  margin-bottom: 12px;
}

.materials-history__table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}

.materials-history__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.materials-history__table thead {
  background: #f5f6fa;
}

.materials-history__table th {
  text-align: left;
  padding: 14px 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
}

.materials-history__table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.materials-history__row:hover {
  background: #f8f9ff;
}

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
}
.badge--examen { background: #e3f2fd; color: #1565c0; }
.badge--balotario { background: #f3e5f5; color: #7b1fa2; }

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.status-dot--pending { background: #ffc107; }
.status-dot--processing { background: #2196f3; animation: pulse 1.5s infinite; }
.status-dot--curation_required { background: #ff9800; }
.status-dot--completed { background: #4caf50; }
.status-dot--failed { background: #f44336; }

.download-link {
  color: #1565c0;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.download-link:hover { color: #0d47a1; text-decoration: underline; }

.error-text { color: #d32f2f; font-size: 0.85rem; }
.pending-text { color: #9e9e9e; font-style: italic; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
