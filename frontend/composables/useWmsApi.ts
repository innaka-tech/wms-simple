import { useRuntimeConfig } from '#app';
import { useAuthStore } from '~/stores/auth';

export function useWmsApi() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase || 'http://localhost:3000/api';

  async function apiFetch<T = any>(endpoint: string, options: any = {}): Promise<T> {
    const authStore = useAuthStore();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await $fetch<T>(url, {
        ...options,
        headers
      });
      return response;
    } catch (err: any) {
      // Parse RFC 7807 Problem Details or fetch error
      const problem = err.data || {
        success: false,
        message: err.message || 'Gagal berkomunikasi dengan server WMS',
        code: 'NETWORK_ERROR'
      };
      throw problem;
    }
  }

  return {
    apiBase,
    apiFetch
  };
}
