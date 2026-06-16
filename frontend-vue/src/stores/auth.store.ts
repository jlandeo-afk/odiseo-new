import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Branding {
  commercialName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  companyId: string;
  roles: string[];
  permissions: string[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const branding = ref<Branding | null>(null);
  const isAuthenticated = ref(false);

  async function fetchBranding(subdomain: string) {
    try {
      // API call to the backend
      const { data, error } = await useFetch(`/api/v1/tenants/branding?subdomain=${subdomain}`);
      if (data.value) {
        branding.value = data.value as Branding;
      }
    } catch (error) {
      console.error('Failed to fetch branding', error);
    }
  }

  async function login(credentials: any, subdomain: string) {
    try {
      const { data, error } = await useFetch('/api/v1/auth/login', {
        method: 'POST',
        body: { ...credentials, subdomain }
      });
      
      if (error.value) throw new Error('Login failed');
      if (data.value) {
          user.value = data.value.user as User;
          isAuthenticated.value = true;
          // Hydrate roles and permissions
          if (data.value.user.roles) user.value.roles = data.value.user.roles;
          if (data.value.user.permissions) user.value.permissions = data.value.user.permissions;
          return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function logout() {
    user.value = null;
    isAuthenticated.value = false;
    useRouter().push('/login');
  }

  function hasPermission(permission: string): boolean {
    return user.value?.permissions.includes(permission) || false;
  }

  function hasRole(role: string): boolean {
    return user.value?.roles.includes(role) || false;
  }

  return { user, branding, isAuthenticated, fetchBranding, login, logout, hasPermission, hasRole };
});
