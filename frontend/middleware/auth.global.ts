import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();
  
  // Initialize auth state if running in client
  if (typeof window !== 'undefined' && !authStore.user) {
    authStore.initAuth();
  }

  // Allow unrestricted access to login page
  if (to.path === '/login') {
    return;
  }

  // Verify RBAC access for the requested route
  if (!authStore.canAccessRoute(to.path)) {
    console.warn(`[RBAC Guard] Access Denied: User role '${authStore.user?.role}' is not authorized for route '${to.path}'`);
    authStore.errorMessage = `Akses Ditolak: Peran '${authStore.roleLabel}' tidak memiliki izin untuk membuka halaman tersebut.`;
    return navigateTo('/');
  }
});
