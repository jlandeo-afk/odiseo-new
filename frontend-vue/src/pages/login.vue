<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
      <div class="text-center">
        <!-- Logo from Branding -->
        <img 
          v-if="branding?.logoUrl" 
          class="mx-auto h-16 w-auto mb-4" 
          :src="branding.logoUrl" 
          :alt="branding.commercialName" 
        />
        <h2 
          class="mt-2 text-center text-3xl font-extrabold text-gray-900"
          :style="{ color: branding?.primaryColor }"
        >
          {{ branding?.commercialName || 'Odiseo B2B' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Inicia sesión para acceder al panel de administración
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="mb-4">
            <label for="email-address" class="sr-only">Correo electrónico</label>
            <UInput 
              id="email-address" 
              name="email" 
              type="email" 
              v-model="email"
              required 
              placeholder="Correo electrónico" 
              size="lg"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Contraseña</label>
            <UInput 
              id="password" 
              name="password" 
              type="password" 
              v-model="password"
              required 
              placeholder="Contraseña" 
              size="lg"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <UButton 
            type="submit" 
            block 
            size="lg"
            :loading="loading"
            :style="{ backgroundColor: branding?.primaryColor }"
          >
            Ingresar
          </UButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

definePageMeta({
  layout: false // Login page doesn't use the default B2B layout
});

const authStore = useAuthStore();
const { branding } = storeToRefs(authStore);
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const subdomain = ref('');

onMounted(async () => {
  // Capture subdomain from hostname
  const host = window.location.hostname; // e.g. colegio.odiseo.com
  const parts = host.split('.');
  if (parts.length >= 2) {
    subdomain.value = parts[0];
  } else {
    subdomain.value = 'default';
  }
  
  // Fetch branding based on subdomain
  await authStore.fetchBranding(subdomain.value);
});

async function handleLogin() {
  loading.value = true;
  error.value = '';
  
  const success = await authStore.login({ email: email.value, password: password.value }, subdomain.value);
  
  loading.value = false;
  if (success) {
    router.push('/materials/curation'); // Redirect to dashboard/curation
  } else {
    error.value = 'Credenciales inválidas o acceso denegado para esta institución.';
  }
}
</script>
