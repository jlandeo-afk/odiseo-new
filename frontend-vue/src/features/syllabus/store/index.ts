import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

export const useSyllabusStore = defineStore('syllabus', () => {
  const syllabus = ref<any>(null);
  const syllabiList = ref<any[]>([]);
  const distributions = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSyllabiByCycle(cycleId: string) {
    loading.value = true;
    error.value = null;
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      const response = await $fetch(`/api/v1/syllabus/cycle/${cycleId}`, {
        headers: { 'x-subdomain': subdomain }
      });
      syllabiList.value = response as any[];
    } catch (err: any) {
      error.value = err.message || 'Error al obtener los sílabos del ciclo.';
    } finally {
      loading.value = false;
    }
  }

  async function createSyllabus(payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      const response = await $fetch('/api/v1/syllabus', {
        method: 'POST',
        headers: { 'x-subdomain': subdomain },
        body: payload
      });
      syllabus.value = (response as any).syllabus;
      // Also add to current list
      if (syllabus.value) {
        syllabiList.value.push(syllabus.value);
      }
    } catch (err: any) {
      // The backend returns a specific ConflictException with message if duplicates exist
      error.value = err.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  }

  async function addDistribution(syllabusId: string, payload: any) {
    // Generate temporary ID for Optimistic UI
    const tempId = 'temp-' + Date.now();
    const newDist = { id: tempId, syllabusId, ...payload, weight: payload.weight || 1 };
    
    // 1. Optimistic Update
    distributions.value.push(newDist);
    
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      const response = await $fetch(`/api/v1/syllabus/${syllabusId}/distribution`, {
        method: 'POST',
        headers: { 'x-subdomain': subdomain },
        body: payload
      });
      
      // 2. Replace temp ID with real ID from server
      const createdDist = (response as any).distribution;
      const index = distributions.value.findIndex(d => d.id === tempId);
      if (index !== -1) {
        distributions.value[index] = createdDist;
      }
    } catch (err: any) {
      // 3. Rollback Optimistic UI
      distributions.value = distributions.value.filter(d => d.id !== tempId);
      throw err; // Propagate error for UI to show toast
    }
  }

  async function updateDistributionWeight(distId: string, syllabusId: string, weight: number) {
    const dist = distributions.value.find(d => d.id === distId);
    if (!dist) return;
    
    const prevWeight = dist.weight;
    // 1. Optimistic Update
    dist.weight = weight;

    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      await $fetch(`/api/v1/syllabus/${syllabusId}/distribution/${distId}`, {
        method: 'PATCH',
        headers: { 'x-subdomain': subdomain },
        body: { weight }
      });
    } catch (err: any) {
      // 2. Rollback
      dist.weight = prevWeight;
      throw err;
    }
  }

  async function deleteDistribution(distId: string, syllabusId: string) {
    const distIndex = distributions.value.findIndex(d => d.id === distId);
    if (distIndex === -1) return;
    
    const backupDist = distributions.value[distIndex];
    // 1. Optimistic Delete
    distributions.value.splice(distIndex, 1);

    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      await $fetch(`/api/v1/syllabus/${syllabusId}/distribution/${distId}`, {
        method: 'DELETE',
        headers: { 'x-subdomain': subdomain }
      });
    } catch (err: any) {
      // 2. Rollback
      distributions.value.splice(distIndex, 0, backupDist);
      throw err;
    }
  }

  async function fetchSummary(syllabusId: string) {
    loading.value = true;
    error.value = null;
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      const response = await $fetch(`/api/v1/syllabus/${syllabusId}/summary`, {
        headers: { 'x-subdomain': subdomain }
      });
      distributions.value = (response as any).summary?.distributions || [];
    } catch (err: any) {
      error.value = err.message || 'Error al obtener las distribuciones.';
    } finally {
      loading.value = false;
    }
  }

  async function cloneSyllabus(syllabusId: string, sourceId: string) {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      const response = await $fetch(`/api/v1/syllabus/${syllabusId}/clone`, {
        method: 'POST',
        headers: { 'x-subdomain': subdomain },
        body: { sourceId }
      });
      distributions.value = (response as any).summary?.distributions || [];
    } catch (err: any) {
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function toggleSyllabusVisibility(id: string, isActive: boolean) {
    const target = syllabiList.value.find(s => s.id === id);
    if (!target) return;
    const prev = target.isActive;
    target.isActive = isActive;
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      await $fetch(`/api/v1/syllabus/${id}/archive`, {
        method: 'PATCH',
        headers: { 'x-subdomain': subdomain },
        body: { isActive }
      });
    } catch (err: any) {
      target.isActive = prev;
      throw new Error(err.message || 'Error al cambiar la visibilidad del sílabo.');
    }
  }

  return {
    syllabus,
    syllabiList,
    distributions,
    loading,
    error,
    fetchSyllabiByCycle,
    createSyllabus,
    addDistribution,
    updateDistributionWeight,
    deleteDistribution,
    fetchSummary,
    cloneSyllabus,
    toggleSyllabusVisibility
  };
});
