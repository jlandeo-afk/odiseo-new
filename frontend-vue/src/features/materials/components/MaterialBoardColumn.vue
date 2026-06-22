<script setup lang="ts">
import MaterialStatusCard from './MaterialStatusCard.vue';

defineProps<{
  title: string;
  icon: string;
  iconClass: string;
  bgClass: string;
  items: any[];
}>();

const emit = defineEmits(['clickCard']);
</script>

<template>
  <div class="flex flex-col w-[340px] shrink-0 h-[75vh] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl relative" :class="bgClass">
    <!-- Subtle Gradient Overlay for Glass Effect -->
    <div class="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none"></div>

    <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10 relative z-10 backdrop-blur-3xl bg-white/50 dark:bg-black/20">
      <div class="flex items-center gap-3">
        <div class="p-1.5 rounded-lg bg-white/80 dark:bg-white/5 backdrop-blur-md shadow-inner border border-slate-200 dark:border-white/10">
          <UIcon :name="icon" class="w-5 h-5" :class="iconClass" />
        </div>
        <h3 class="font-bold text-slate-800 dark:text-slate-100 tracking-wide">{{ title }}</h3>
      </div>
      <div class="flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full bg-slate-200/50 dark:bg-black/40 text-xs font-black text-slate-800 dark:text-slate-200 shadow-inner border border-slate-200 dark:border-white/10">
        {{ items.length }}
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar relative z-10">
      <MaterialStatusCard
        v-for="item in items"
        :key="item.id"
        :request="item"
        @clickCard="$emit('clickCard', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.4);
}
</style>
