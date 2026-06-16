import { useAuthStore } from '@/stores/auth.store';
import { defineNuxtRouteMiddleware, navigateTo, abortNavigation } from '#app';

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();
  
  const publicRoutes = ['/login'];
  
  // Si la ruta es pública
  if (publicRoutes.includes(to.path)) {
    if (authStore.isAuthenticated) {
      return navigateTo('/materials/curation');
    }
    return;
  }
  
  // Proteger rutas privadas
  if (!authStore.isAuthenticated) {
    return navigateTo('/login');
  }
  
  // Control de acceso basado en roles (Spatie RBAC)
  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    const hasRequiredRole = to.meta.roles.some(role => authStore.hasRole(role as string));
    if (!hasRequiredRole) {
      return abortNavigation({
        statusCode: 403,
        statusMessage: 'Acceso Denegado: Permisos insuficientes'
      });
    }
  }

  // Control de acceso basado en permisos (Spatie RBAC)
  if (to.meta.permissions && Array.isArray(to.meta.permissions)) {
    const hasRequiredPermission = to.meta.permissions.some(permission => authStore.hasPermission(permission as string));
    if (!hasRequiredPermission) {
      return abortNavigation({
        statusCode: 403,
        statusMessage: 'Acceso Denegado: No tienes el permiso necesario'
      });
    }
  }
});
