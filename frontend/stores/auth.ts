import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN_ADM' | 'WH_MANAGER' | 'WH_STAFF' | 'DRIVER' | 'GATE_OFFICER' | 'CUSTOMER';
  warehouse_id?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: '' as string,
    activeWarehouseId: 'a0000000-0000-0000-0000-000000000001', // Default WH-JKT-01 Main Hub
    activeWarehouseName: 'WH-JKT-01 (Main Hub Jakarta)',
    isLoading: false,
    errorMessage: ''
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    roleLabel: (state) => {
      switch (state.user?.role) {
        case 'SUPER_ADMIN': return 'Super Admin';
        case 'ADMIN_ADM': return 'Admin Operasional';
        case 'WH_MANAGER': return 'Kepala Gudang (WH Manager)';
        case 'WH_STAFF': return 'Petugas Lapangan / Checker';
        case 'DRIVER': return 'Pengemudi / Driver';
        case 'GATE_OFFICER': return 'Petugas Pos Satpam Gerbang';
        default: return 'Staf WMS';
      }
    }
  },

  actions: {
    initAuth() {
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('wms_token');
        const savedUser = localStorage.getItem('wms_user');
        if (savedToken) {
          this.token = savedToken;
        }
        if (savedUser) {
          try {
            this.user = JSON.parse(savedUser);
          } catch {
            this.user = null;
          }
        }
      }
    },

    async login(username: string, password: string): Promise<boolean> {
      this.isLoading = true;
      this.errorMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: { username, password }
        });

        if (res.success && res.data) {
          this.token = res.data.token;
          this.user = res.data.user;

          if (this.user?.warehouse_id) {
            this.activeWarehouseId = this.user.warehouse_id;
            this.activeWarehouseName = this.user.warehouse_name || 'Gudang Ditugaskan';
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem('wms_token', this.token);
            localStorage.setItem('wms_user', JSON.stringify(this.user));
          }
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Login gagal';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = '';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wms_token');
        localStorage.removeItem('wms_user');
      }
    },

    setWarehouse(id: string, name: string) {
      this.activeWarehouseId = id;
      this.activeWarehouseName = name;
    }
  }
});
