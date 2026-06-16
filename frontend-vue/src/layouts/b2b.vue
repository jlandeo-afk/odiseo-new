<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- B2B Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-4">
            <img v-if="branding?.logoUrl" :src="branding.logoUrl" class="h-8 w-auto" alt="Logo" />
            <span class="text-xl font-bold text-gray-900" :style="{ color: branding?.primaryColor }">
              {{ branding?.commercialName || 'Odiseo B2B' }}
            </span>
          </div>
          <div class="flex items-center gap-4">
            <!-- User Menu -->
            <span class="text-sm text-gray-600">{{ user?.name }}</span>
            <UButton color="gray" variant="ghost" @click="logout">Cerrar Sesión</UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
        &copy; {{ new Date().getFullYear() }} Odiseo B2B. Todos los derechos reservados.
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { user, branding } = storeToRefs(authStore);

function logout() {
  authStore.logout();
}
</script>
