import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export interface CycleWeek {
  id: string;
  cycleId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Cycle {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  daysPerWeek: number;
  totalWeeks: number;
  isActive: boolean;
  weeks: CycleWeek[];
}

export const useAcademicTimeStore = defineStore('academicTime', () => {
  const cycles = ref<Cycle[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const totalCycles = ref(0)
  const currentOffset = ref(0)
  const limit = 20

  const hasMore = computed(() => cycles.value.length < totalCycles.value)

  async function fetchCycles(loadMore = false) {
    if (isLoading.value) return;
    isLoading.value = true;
    error.value = null;

    if (!loadMore) {
      currentOffset.value = 0;
    }

    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      // @ts-ignore
      const response = await $fetch(`/api/v1/academic-time/cycles?limit=${limit}&offset=${currentOffset.value}`, {
        headers: { 'x-subdomain': subdomain }
      });
      
      const { data, total } = response as { data: Cycle[], total: number };
      
      if (loadMore) {
        // Prevent duplicate keys in Vue v-for by filtering existing IDs
        const existingIds = new Set(cycles.value.map(c => c.id));
        const newCycles = data.filter(c => !existingIds.has(c.id));
        cycles.value = [...cycles.value, ...newCycles];
      } else {
        cycles.value = data;
      }
      
      totalCycles.value = total;
      currentOffset.value += data.length;
    } catch (e: any) {
      error.value = e.message || 'Error fetching cycles'
    } finally {
      isLoading.value = false
    }
  }

  async function createCycle(data: { name: string; year: number; startDate: string; daysPerWeek: number; totalWeeks: number }) {
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      // @ts-ignore
      await $fetch('/api/v1/academic-time/cycles', {
        method: 'POST',
        headers: { 'x-subdomain': subdomain },
        body: data
      })
      await fetchCycles()
    } catch (e: any) {
      throw new Error(e.message || 'Error al crear el ciclo')
    }
  }

  async function toggleCycleVisibility(id: string, isActive: boolean) {
    const cycle = cycles.value.find(c => c.id === id)
    if (!cycle) return
    const prev = cycle.isActive
    cycle.isActive = isActive
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/cycles/${id}/visibility`, {
        method: 'PATCH',
        headers: { 'x-subdomain': subdomain },
        body: { isActive }
      })
    } catch {
      cycle.isActive = prev
      throw new Error('No se pudo guardar la visibilidad del ciclo.')
    }
  }

  async function toggleWeekVisibility(id: string, isActive: boolean) {
    let targetWeek: CycleWeek | undefined;
    for (const cycle of cycles.value) {
      targetWeek = cycle.weeks.find(w => w.id === id);
      if (targetWeek) break;
    }
    if (!targetWeek) return
    const prev = targetWeek.isActive
    targetWeek.isActive = isActive
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/weeks/${id}/visibility`, {
        method: 'PATCH',
        headers: { 'x-subdomain': subdomain },
        body: { isActive }
      })
    } catch {
      targetWeek.isActive = prev
      throw new Error('No se pudo guardar la visibilidad de la semana.')
    }
  }

  async function deleteCycle(id: string) {
    try {
      const authStore = useAuthStore();
      const subdomain = authStore.getSubdomain();
      // @ts-ignore
      await $fetch(`/api/v1/academic-time/cycles/${id}`, { 
        method: 'DELETE',
        headers: { 'x-subdomain': subdomain }
      })
      await fetchCycles()
    } catch (e: any) {
      if (e.status === 409) {
        throw new Error('No se puede eliminar el ciclo porque tiene sílabos asociados. Desactívalo en su lugar.')
      }
      throw new Error('Error al eliminar el ciclo.')
    }
  }

  return { cycles, isLoading, error, fetchCycles, createCycle, toggleCycleVisibility, toggleWeekVisibility, deleteCycle, hasMore }
})
