export default defineNuxtConfig({
  compatibilityDate: '2026-06-15',
  srcDir: 'src/',
  modules: ['@pinia/nuxt', '@nuxt/ui'],
  devtools: { enabled: true },
  alias: {
    '@': '/home/jhon/Documents/work-projects/odiseo-new/frontend-vue/src'
  },
  css: ['~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'pinia'
      ]
    }
  }
})
