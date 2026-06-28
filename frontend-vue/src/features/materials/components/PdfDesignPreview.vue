<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  html: string
  loading?: boolean
  zoom?: number
}>(), {
  zoom: 85
})

const iframeHeight = ref(1122)
const iframeWidth = ref(850) // Ancho inicial estimado (21cm + padding)

function onIframeLoad(e: Event) {
  const iframe = e.target as HTMLIFrameElement;
  try {
    if (iframe.contentWindow && iframe.contentWindow.document) {
      const doc = iframe.contentWindow.document;
      // Allow the body to be completely transparent so the parent's background shows through
      doc.body.style.backgroundColor = 'transparent';
      // Prevent internal scrolling completely via CSS
      doc.documentElement.style.overflow = 'hidden';
      doc.body.style.overflow = 'hidden';
      
      const height = Math.max(1122, doc.documentElement.scrollHeight);
      const width = Math.max(850, doc.documentElement.scrollWidth);
      
      // Agregamos un pequeñísimo buffer (10px) para evitar recortes matemáticos
      iframeHeight.value = height + 10;
      iframeWidth.value = width;
    }
  } catch (err) {
    console.error("Iframe resize error", err);
  }
}
</script>

<template>
  <div class="relative w-full flex justify-center items-start min-h-full">
    
    <div v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20 rounded-xl">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-indigo-500 animate-spin" />
    </div>

    <!-- CONTENEDOR FANTASMA -->
    <div class="relative transition-all duration-200 shrink-0" 
         :style="{ 
           width: 'calc(' + iframeWidth + 'px * ' + (zoom / 100) + ')',
           height: 'calc(' + iframeHeight + 'px * ' + (zoom / 100) + ')' 
         }">
         
      <!-- IFRAME REAL -->
      <div class="absolute top-0 left-0 origin-top-left transition-transform duration-200 flex justify-center" 
           :style="{ width: iframeWidth + 'px', transform: 'scale(' + (zoom / 100) + ')' }">
        <iframe v-if="html" :srcdoc="html" sandbox="allow-same-origin" allowtransparency="true" scrolling="no"
          class="bg-transparent border-none outline-none overflow-hidden"
          :style="{ width: iframeWidth + 'px', height: iframeHeight + 'px' }"
          @load="onIframeLoad"
          title="Vista previa del diseño" />
      </div>
      
    </div>
  </div>
</template>
