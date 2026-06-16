<template>
  <div class="min-h-screen bg-white flex">

    <!-- Left panel: Branding / Illustration -->
    <div
      class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
      :style="leftPanelStyle"
    >
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 24px 24px;" />

      <!-- Top logo -->
      <div class="relative flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
          :style="{ backgroundColor: branding?.primaryColor || '#2563eb' }"
        >
          <span class="text-white text-sm font-bold">O</span>
        </div>
        <span class="text-sm font-semibold" :style="{ color: branding?.primaryColor || '#1e40af' }">
          {{ branding?.commercialName || 'Odiseo' }}
        </span>
      </div>

      <!-- Center quote -->
      <div class="relative max-w-sm">
        <p class="text-2xl font-medium leading-snug text-gray-900/80">
          "La gestión académica que se adapta a tu institución."
        </p>
        <div class="mt-8 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">A</div>
          <div>
            <p class="text-sm font-medium text-gray-800">Administración Académica</p>
            <p class="text-xs text-gray-500">{{ branding?.commercialName || 'Tu institución' }}</p>
          </div>
        </div>
      </div>

      <!-- Bottom stats row -->
      <div class="relative flex items-center gap-8">
        <div v-for="stat in stats" :key="stat.label">
          <p class="text-xl font-bold text-gray-900">{{ stat.value }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- Right panel: Login form -->
    <div class="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">

      <!-- Mobile logo -->
      <div class="lg:hidden mb-10 flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-md flex items-center justify-center"
          :style="{ backgroundColor: branding?.primaryColor || '#2563eb' }"
        >
          <span class="text-white text-xs font-bold">O</span>
        </div>
        <span class="text-sm font-semibold text-gray-900">{{ branding?.commercialName || 'Odiseo' }}</span>
      </div>

      <div class="max-w-sm w-full mx-auto">

        <!-- Header -->
        <div class="mb-8">
          <!-- Tenant branding badge -->
          <div v-if="branding" class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 mb-4">
            <span class="w-2 h-2 rounded-full bg-emerald-400" />
            <span class="text-xs text-gray-600 font-medium">{{ branding.commercialName }}</span>
          </div>
          <div v-else-if="isBrandingLoading" class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 mb-4">
            <span class="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            <span class="text-xs text-gray-400">Cargando institución...</span>
          </div>

          <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p class="text-sm text-gray-500 mt-1.5">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleLogin">

          <!-- Email -->
          <div>
            <label for="email" class="block text-xs font-medium text-gray-600 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="admin@colegio.edu"
              class="w-full text-sm border rounded-lg px-3 py-2.5 outline-none transition-all placeholder:text-gray-300"
              :class="error ? 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'"
            />
          </div>

          <!-- Password -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="password" class="text-xs font-medium text-gray-600">Contraseña</label>
              <a href="#" class="text-xs text-blue-600 hover:text-blue-700 transition-colors">¿Olvidaste tu contraseña?</a>
            </div>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full text-sm border rounded-lg px-3 py-2.5 pr-10 outline-none transition-all placeholder:text-gray-300"
                :class="error ? 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Error message -->
          <Transition name="shake-in">
            <div v-if="error" class="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100">
              <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-red-600">{{ error }}</p>
            </div>
          </Transition>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading || !email || !password"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
            :style="{ backgroundColor: branding?.primaryColor || '#2563eb' }"
            :class="!loading && 'hover:opacity-90 active:scale-[0.98]'"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ loading ? 'Ingresando...' : 'Ingresar al panel' }}
          </button>
        </form>

        <!-- Footer -->
        <p class="mt-8 text-center text-xs text-gray-400">
          Plataforma segura B2B —
          <span class="text-gray-500">Odiseo © {{ new Date().getFullYear() }}</span>
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

definePageMeta({ layout: false });

const authStore = useAuthStore();
const { branding } = storeToRefs(authStore);
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);
const isBrandingLoading = ref(false);
const subdomain = ref('');

const leftPanelStyle = computed(() => ({
  backgroundColor: branding.value?.primaryColor
    ? `${branding.value.primaryColor}08`
    : '#f0f7ff',
  color: branding.value?.primaryColor || '#1e40af',
  borderRight: '1px solid #f3f4f6'
}));

const stats = [
  { value: '2.4k', label: 'Preguntas activas' },
  { value: '98%', label: 'Disponibilidad' },
  { value: '< 1s', label: 'Tiempo de respuesta' },
];

onMounted(async () => {
  const host = window.location.hostname;
  const parts = host.split('.');
  subdomain.value = parts.length >= 2 ? parts[0] : 'default';

  isBrandingLoading.value = true;
  try {
    await authStore.fetchBranding(subdomain.value);
  } finally {
    isBrandingLoading.value = false;
  }
});

async function handleLogin() {
  loading.value = true;
  error.value = '';

  const success = await authStore.login(
    { email: email.value, password: password.value },
    subdomain.value
  );

  loading.value = false;
  if (success) {
    router.push('/catalogs');
  } else {
    error.value = 'Credenciales inválidas o acceso denegado para esta institución.';
  }
}
</script>

<style scoped>
.shake-in-enter-active {
  animation: shake-in 300ms ease;
}

@keyframes shake-in {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}
</style>
