import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSyllabusStore = defineStore('syllabus', () => {
  const syllabus = ref<any>(null);
  const distributions = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function createSyllabus(payload: any) {
    loading.value = true;
    error.value = null;
    try {
      // Placeholder for API
      syllabus.value = { id: 'new-id', ...payload };
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function addDistribution(payload: any) {
    const tempId = 'temp-' + Date.now();
    const newDist = { id: tempId, ...payload, requestedQuantity: payload.requestedQuantity || 1 };
    distributions.value.push(newDist);
    
    try {
      // Simulate API limit validation
      if (newDist.requestedQuantity > 100) {
        throw new Error('La cantidad máxima de preguntas por semana no puede exceder 100');
      }
    } catch (err: any) {
      // Rollback Optimistic UI
      distributions.value = distributions.value.filter(d => d.id !== tempId);
      
      // En una implementación real, este toast debe provenir de un composable global para que persista
      // useToast().add({ title: 'Error de Sincronización', description: err.message, color: 'red' });
      console.error('Optimistic Rollback:', err.message);
      // Fallback a mostrar el error en el store
      error.value = err.message;
      setTimeout(() => { error.value = null; }, 5000);
    }
  }

  async function fetchSummary(syllabusId: string) {
    loading.value = true;
    try {
      // placeholder para GET summary, por ahora no muteamos states solo simulamos
      console.log('Fetching summary for ', syllabusId);
    } finally {
      loading.value = false;
    }
  }

  async function cloneSyllabus(sourceId: string) {
    loading.value = true;
    try {
      // simulamos API, en real agregaría las distributions de ese source
      console.log('Cloning from ', sourceId);
    } finally {
      loading.value = false;
    }
  }

  return {
    syllabus,
    distributions,
    loading,
    error,
    createSyllabus,
    addDistribution,
    fetchSummary,
    cloneSyllabus
  };
});
