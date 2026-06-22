<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  request: {
    id: string;
    materialType: string;
    weekNumber: number;
    status: string;
    createdAt: string;
    cycle?: { name: string };
    courses: {
      courseId: string;
      status: string;
      downloadUrl?: string;
      warnings?: any;
    }[];
  };
}>();

const emit = defineEmits(['clickCard']);

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
</script>

<template>
  <div class="relative group">
    <!-- Neon Glow Effect behind card on hover -->
    <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
    
    <div 
      @click="$emit('clickCard', request)"
      class="relative bg-white/90 dark:bg-[#1a1b2e]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-xl overflow-hidden p-5 transition-transform duration-300 group-hover:-translate-y-1 cursor-pointer"
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
      <div class="mb-2">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
          Material #{{ request.id.slice(0, 8) }}
        </h3>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
          {{ request.materialType === 'EXAMEN' ? 'Evaluación' : 'Recurso' }} / Semana {{ request.weekNumber }}
        </p>
      </div>

      <!-- Footer Data -->
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/80 dark:border-white/5">
        <div class="flex -space-x-2">
          <div class="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/50 border border-white dark:border-[#1a1b2e] flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-400">AI</div>
          <div class="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/50 border border-white dark:border-[#1a1b2e] flex items-center justify-center text-[8px] font-bold text-emerald-600 dark:text-emerald-400">DB</div>
        </div>
        <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <UIcon name="i-heroicons-clock" class="w-3 h-3" />
          {{ new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
        </span>
      </div>
    </div>
  </div>
</template>
