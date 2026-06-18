<template>
  <div class="min-h-screen bg-white flex flex-col" :style="customThemeStyle">
    <!-- Top Bar (Linear-like) -->
    <header class="flex items-center h-11 px-6 border-b border-gray-100 bg-white sticky top-0 z-10">
      <!-- Logo / Brand from tenant -->
      <div class="flex items-center gap-2.5 mr-8">
        <div
          class="w-5 h-5 rounded flex items-center justify-center transition-colors"
          :style="{ backgroundColor: primaryColor }"
        >
          <span class="text-white text-[9px] font-bold">O</span>
        </div>
        <span class="text-sm font-medium text-gray-900">Odiseo</span>
        <span class="text-gray-300 text-xs">/</span>
        <span class="text-sm text-gray-500">{{ tenantName }}</span>
      </div>

      <!-- Nav links -->
      <nav class="flex items-center gap-1">
        <NuxtLink
          v-for="link in filteredNavLinks"
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

      <!-- Right: Command Palette Hint & User Logout -->
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

        <div class="flex items-center gap-2 border-l border-gray-100 pl-3">
          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center cursor-pointer relative group">
            <span class="text-white text-[10px] font-bold">{{ userInitials }}</span>
            <div class="absolute right-0 top-8 hidden group-hover:block bg-white border border-gray-100 rounded-md shadow-lg py-1 w-28 text-left z-20">
              <button @click="handleLogout" class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
          <span class="text-xs text-gray-600 font-medium hidden sm:inline-block">{{ userName }}</span>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex">
      <!-- Sidebar -->
      <aside class="w-52 shrink-0 border-r border-gray-100 px-3 py-4 bg-white">
        <p class="px-2 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Módulos</p>
        <NuxtLink
          v-for="link in filteredSidebarLinks"
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
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();

const tenantName = computed(() => authStore.branding?.commercialName || 'Odiseo B2B');
const primaryColor = computed(() => authStore.branding?.primaryColor || '#2563eb');
const userName = computed(() => authStore.user?.name || 'Usuario');
const userInitials = computed(() => {
  const name = userName.value;
  return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
});

const customThemeStyle = computed(() => ({
  '--color-primary': primaryColor.value,
}));

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}

async function handleLogout() {
  await authStore.logout();
}

const navLinks = [
  { to: '/catalogs', label: 'Catálogos', permission: 'view_catalogs' },
  { to: '/academic-time', label: 'Tiempo Académico', permission: 'view_catalogs' },
  { to: '/materials/curation', label: 'Materiales', permission: 'generate_material' },
];

const sidebarLinks = [
  { to: '/catalogs', label: 'Catálogos', icon: '📚', permission: 'view_catalogs' },
  { to: '/academic-time', label: 'Ciclos Académicos', icon: '📅', permission: 'view_catalogs' },
  { to: '/materials/curation', label: 'Curación Manual', icon: '📝', permission: 'generate_material' },
];

const filteredNavLinks = computed(() => {
  return navLinks.filter(link => !link.permission || authStore.hasPermission(link.permission));
});

const filteredSidebarLinks = computed(() => {
  return sidebarLinks.filter(link => !link.permission || authStore.hasPermission(link.permission));
});
</script>
