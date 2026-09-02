import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_ADM' | 'WH_MANAGER' | 'WH_STAFF' | 'DRIVER' | 'GATE_OFFICER' | 'CUSTOMER';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  warehouse_id?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
}

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  code: 'dashboard' | 'stock' | 'gate_pass' | 'inbound' | 'debulking' | 'outbound_pod';
  badge?: string;
  roles: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'DRIVER', 'GATE_OFFICER'];

const MASTER_NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama & Ringkasan',
    items: [
      { name: 'Dashboard Utama', path: '/', icon: 'home', code: 'dashboard', roles: ALL_ROLES },
      { name: 'Kartu Stok & Ledger', path: '/stock', icon: 'stock', code: 'stock', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'] }
    ]
  },
  {
    title: 'Pintu & Gerbang',
    items: [
      { name: 'Pos Satpam (Gate Pass)', path: '/gate-pass', icon: 'truck', code: 'gate_pass', badge: 'Satpam', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'GATE_OFFICER'] },
      { name: 'Penerimaan (Inbound)', path: '/inbound/receive', icon: 'inbound', code: 'inbound', badge: 'Dock', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] }
    ]
  },
  {
    title: 'Operasional Gudang',
    items: [
      { name: 'Repacking (De-bulking)', path: '/debulking', icon: 'debulking', code: 'debulking', badge: 'Curah', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] }
    ]
  },
  {
    title: 'Distribusi & Pengiriman',
    items: [
      { name: 'Bukti Kirim (e-POD / BAST)', path: '/outbound/pod', icon: 'pod', code: 'outbound_pod', badge: 'KDMP', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'DRIVER'] }
    ]
  }
];

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
    userRole: (state) => (state.user?.role || 'SUPER_ADMIN') as UserRole,
    roleLabel: (state) => {
      switch (state.user?.role) {
        case 'SUPER_ADMIN': return 'Super Admin';
        case 'ADMIN_ADM': return 'Admin Operasional';
        case 'WH_MANAGER': return 'Kepala Gudang (WH Manager)';
        case 'WH_STAFF': return 'Petugas Lapangan / Checker';
        case 'DRIVER': return 'Pengemudi / Driver';
        case 'GATE_OFFICER': return 'Petugas Pos Satpam Gerbang';
        default: return 'Super Admin';
      }
    },
    roleBadgeColor: (state) => {
      switch (state.user?.role) {
        case 'SUPER_ADMIN': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        case 'ADMIN_ADM': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'WH_MANAGER': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        case 'WH_STAFF': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        case 'DRIVER': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
        case 'GATE_OFFICER': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        default: return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      }
    },
    
    // Dynamic filtered menu sections according to the active user role
    allowedNavSections: (state): NavSection[] => {
      const currentRole: UserRole = state.user?.role || 'SUPER_ADMIN';
      
      return MASTER_NAV_SECTIONS.map(section => {
        const allowedItems = section.items.filter(item => item.roles.includes(currentRole));
        return {
          title: section.title,
          items: allowedItems
        };
      }).filter(section => section.items.length > 0);
    },

    // Dynamic bottom navigation items (flat list for mobile)
    allowedBottomNavItems: (state): NavItem[] => {
      const currentRole: UserRole = state.user?.role || 'SUPER_ADMIN';
      const items: NavItem[] = [];

      for (const section of MASTER_NAV_SECTIONS) {
        for (const item of section.items) {
          if (item.roles.includes(currentRole)) {
            items.push(item);
          }
        }
      }
      return items;
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

    canAccess(moduleCode: string): boolean {
      const currentRole: UserRole = this.user?.role || 'SUPER_ADMIN';
      if (currentRole === 'SUPER_ADMIN') return true;

      switch (moduleCode) {
        case 'gate_pass':
          return ['ADMIN_ADM', 'WH_MANAGER', 'GATE_OFFICER'].includes(currentRole);
        case 'inbound':
          return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
        case 'debulking':
          return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
        case 'outbound_pod':
          return ['ADMIN_ADM', 'WH_MANAGER', 'DRIVER'].includes(currentRole);
        case 'stock':
          return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'].includes(currentRole);
        default:
          return true;
      }
    },

    canAccessRoute(path: string): boolean {
      const currentRole: UserRole = this.user?.role || 'SUPER_ADMIN';
      if (currentRole === 'SUPER_ADMIN') return true;
      if (path === '/' || path === '/login') return true;

      if (path.startsWith('/gate-pass')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'GATE_OFFICER'].includes(currentRole);
      }
      if (path.startsWith('/inbound')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
      }
      if (path.startsWith('/debulking')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
      }
      if (path.startsWith('/outbound')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'DRIVER'].includes(currentRole);
      }
      if (path.startsWith('/stock')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'].includes(currentRole);
      }

      return true;
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
        this.errorMessage = err.detail || err.message || 'Username atau kata sandi salah';
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
