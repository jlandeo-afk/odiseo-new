<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAcademicTimeStore } from '@/features/academic-time/store';

const props = defineProps<{
  request: {
    id: string;
    materialType: string;
    weekNumber: number;
    status: string;
    createdAt: string;
    cycle?: { id: string; name: string };
    courses: {
      courseId: string;
      status: string;
      downloadUrl?: string;
      warnings?: any;
    }[];
  };
}>();

const emit = defineEmits(['clickCard']);
const timeStore = useAcademicTimeStore();

const weekDates = computed(() => {
  if (!props.request.cycle?.id) return '';
  const cycle = timeStore.cycles.find(c => c.id === props.request.cycle!.id);
  if (!cycle || !cycle.weeks) return '';
  const week = cycle.weeks.find(w => w.weekNumber === props.request.weekNumber);
  if (!week) return '';
  
  const start = new Date(week.startDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  const end = new Date(week.endDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  return `${start} al ${end}`;
});

const statusColor = computed(() => {
  switch (props.request.status) {
    case 'PENDING': return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]';
    case 'PROCESSING': return 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]';
    case 'CURATION_REQUIRED': 
    case 'REVIEW_REQUIRED':
    case 'IN_REVIEW': return 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.6)]';
    case 'COMPLETED': return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]';
    case 'FAILED': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]';
    default: return 'bg-slate-400';
  }
});

const totalCourses = computed(() => props.request.courses?.length || 0);
const completedCourses = computed(() => {
  if (!props.request.courses) return 0;
  return props.request.courses.filter(c => c.status === 'COMPLETED' || c.status === 'COMPLETED_WITH_WARNINGS').length;
});
const progressPercentage = computed(() => {
  if (totalCourses.value === 0) return 0;
  return (completedCourses.value / totalCourses.value) * 100;
});
const progressColorClass = computed(() => {
  if (progressPercentage.value === 100) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  if (props.request.status === 'PROCESSING') return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse';
  if (props.request.status === 'FAILED') return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
  return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
});
</script>

<template>
  <div class="relative group">
    <!-- Neon Glow Effect behind card on hover -->
    <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
    
    <div 
      @click="$emit('clickCard', request)"
      class="relative bg-white/90 dark:bg-[#1a1b2e]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-xl overflow-hidden p-5 transition-transform duration-300 group-hover:-translate-y-1 cursor-pointer flex flex-col h-full"
    >
      
      <!-- Top Badges Row -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span v-if="request.cycle" class="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {{ request.cycle.name }}
          </span>
        </div>
        <div class="flex items-center gap-2">
           <span class="w-2.5 h-2.5 rounded-full" :class="statusColor"></span>
        </div>
      </div>

      <!-- Main Content -->
      <div class="mb-4 flex-1">
        <h3 class="text-base font-black text-slate-900 dark:text-white line-clamp-1 flex items-center gap-2">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-indigo-500" />
          Semana {{ request.weekNumber }}
          <span v-if="weekDates" class="text-[9px] font-bold text-indigo-500/80 dark:text-indigo-400 uppercase tracking-wide ml-1 mt-0.5">
            ({{ weekDates }})
          </span>
        </h3>
        
        <!-- Minibar -->
        <div class="mt-3">
          <div class="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-heroicons-academic-cap" class="w-3.5 h-3.5" />
              Cursos
            </span>
            <span :class="{'text-emerald-500': completedCourses === totalCourses && totalCourses > 0, 'text-blue-500': request.status === 'PROCESSING', 'text-rose-500': request.status === 'FAILED'}">
              {{ completedCourses }}/{{ totalCourses }} listos
            </span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-black/40 rounded-full h-1.5 overflow-hidden border border-slate-200/50 dark:border-white/5">
            <div 
              class="h-full rounded-full transition-all duration-1000"
              :class="progressColorClass"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Footer Data -->
      <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
          </div>
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">Equipo AI</span>
        </div>
        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
          <UIcon name="i-heroicons-clock" class="w-3 h-3" />
          {{ new Date(request.createdAt).toLocaleDateString('es-PE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
        </span>
      </div>
    </div>
  </div>
</template>
