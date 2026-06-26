<script setup lang="ts">
defineProps<{
  html: string
  loading?: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-20">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-indigo-500 animate-spin" />
  </div>
  <iframe v-else-if="html" :srcdoc="html" sandbox="allow-same-origin"
    class="w-full h-[80vh] rounded-xl border border-slate-200 dark:border-white/10 bg-white"
    title="Vista previa del diseño" />
</template>
