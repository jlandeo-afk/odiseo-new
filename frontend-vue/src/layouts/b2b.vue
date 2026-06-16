<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Top Bar (Linear-like) -->
    <header class="flex items-center h-11 px-6 border-b border-gray-100 bg-white sticky top-0 z-10">
      <!-- Logo / Brand from tenant -->
      <div class="flex items-center gap-2.5 mr-8">
        <div class="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
          <span class="text-white text-[9px] font-bold">O</span>
        </div>
        <span class="text-sm font-medium text-gray-900">Odiseo</span>
        <span class="text-gray-300 text-xs">/</span>
        <span class="text-sm text-gray-500">{{ tenantName }}</span>
      </div>

      <!-- Nav links -->
      <nav class="flex items-center gap-1">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors"
          :class="$route.path.startsWith(link.to)
            ? 'text-gray-900 bg-gray-100 font-medium'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Right: Command Palette Hint -->
      <div class="ml-auto flex items-center gap-3">
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
          @click="openCommandPalette"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          Buscar...
          <kbd class="ml-1 flex gap-0.5">
            <span class="inline-flex h-4 items-center rounded border border-gray-300 bg-white px-1 text-[10px] text-gray-500">⌘K</span>
          </kbd>
        </button>

        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span class="text-white text-[10px] font-bold">A</span>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex">
      <!-- Sidebar -->
      <aside class="w-52 shrink-0 border-r border-gray-100 px-3 py-4 bg-white">
        <p class="px-2 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Módulos</p>
        <NuxtLink
          v-for="link in sidebarLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-[13px] mb-0.5 transition-colors"
          :class="$route.path.startsWith(link.to)
            ? 'text-gray-900 bg-gray-100 font-medium'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        >
          <span class="text-base leading-none">{{ link.icon }}</span>
          {{ link.label }}
        </NuxtLink>
      </aside>

      <!-- Page slot -->
      <div class="flex-1 overflow-auto">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const tenantName = 'Colegio Demo'

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}

const navLinks = [
  { to: '/catalogs', label: 'Catálogos' },
  { to: '/academic-time', label: 'Tiempo Académico' },
]

const sidebarLinks = [
  { to: '/catalogs', label: 'Catálogos', icon: '📚' },
  { to: '/academic-time', label: 'Ciclos Académicos', icon: '📅' },
]
</script>
