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
  code: 'dashboard' | 'stock' | 'gate_pass' | 'inbound' | 'debulking' | 'outbound_pod' | 'outbound_orders' | 'waybills' | 'billing' | 'checkpoints' | 'master_products' | 'master_warehouses' | 'master_customers' | 'master_users' | 'master_fleet';
  badge?: string;
  roles: UserRole[];
  /** Fase alur operasional: 1=Masuk 2=Gudang 3=Keluar 4=Bukti&Tagihan 5=Pemantauan */
  phase?: 1 | 2 | 3 | 4 | 5;
  /** Kelas warna aksen fase (dot + badge) untuk penandaan visual cepat */
  accent?: string;
}

/** Warna koding fase — konsisten di sidebar, drawer, dashboard & kicker halaman */
export const PHASE_ACCENT: Record<number, { dot: string; chip: string; text: string }> = {
  1: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  2: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  3: { dot: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  4: { dot: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
  5: { dot: 'bg-slate-400', chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20', text: 'text-slate-500 dark:text-slate-400' }
};

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'DRIVER', 'GATE_OFFICER'];

/**
 * Grup menu mengikuti alur operasional lapangan (docs/05 & docs/06):
 * Barang Masuk → Pekerjaan Gudang → Barang Keluar → Bukti Kirim & Penagihan.
 * Stok & dashboard = pemantauan (di atas, terpisah dari alur).
 */
const MASTER_NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Ringkasan & Pemantauan',
    items: [
      { name: 'Dashboard Operasional', path: '/', icon: 'home', code: 'dashboard', roles: ALL_ROLES },
      { name: 'Posisi Stok & Mutasi', path: '/stock', icon: 'stock', code: 'stock', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'], phase: 5, accent: 'bg-slate-400' },
      { name: 'Riwayat Checkpoint Dokumen', path: '/checkpoints', icon: 'checkpoint', code: 'checkpoints', roles: ALL_ROLES, phase: 5, accent: 'bg-slate-400' }
    ]
  },
  {
    title: '1. Barang Masuk',
    items: [
      { name: 'Terima Kiriman di Dock', path: '/inbound/receive', icon: 'inbound', code: 'inbound', badge: 'Dock', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'], phase: 1, accent: 'bg-emerald-500' }
    ]
  },
  {
    title: '2. Pekerjaan Gudang',
    items: [
      { name: 'Bongkar Ulang & Repacking', path: '/debulking', icon: 'debulking', code: 'debulking', badge: 'Curah', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'], phase: 2, accent: 'bg-amber-500' }
    ]
  },
  {
    title: '3. Barang Keluar',
    items: [
      { name: 'Order & Terbitkan Surat Jalan', path: '/outbound', icon: 'package', code: 'outbound_orders', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'], phase: 3, accent: 'bg-blue-500' },
      { name: 'Daftar Surat Jalan & Resi', path: '/waybills', icon: 'printer', code: 'waybills', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'], phase: 3, accent: 'bg-blue-500' },
      { name: 'Pos Satpam: Keluar-Masuk Truk', path: '/gate-pass', icon: 'truck', code: 'gate_pass', badge: 'Gerbang', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'GATE_OFFICER'], phase: 3, accent: 'bg-blue-500' }
    ]
  },
  {
    title: '4. Bukti Kirim & Penagihan',
    items: [
      { name: 'Pengiriman & e-POD', path: '/outbound/pod', icon: 'pod', code: 'outbound_pod', badge: 'KDMP', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'DRIVER'], phase: 4, accent: 'bg-cyan-500' },
      { name: 'Faktur & Pembayaran', path: '/billing', icon: 'chart', code: 'billing', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'], phase: 4, accent: 'bg-cyan-500' }
    ]
  },
  {
    title: 'Master & Pengaturan',
    items: [
      { name: 'Master Barang (SKU)', path: '/master/products', icon: 'box', code: 'master_products', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'], accent: 'bg-violet-500' },
      { name: 'Master Gudang & Rak', path: '/master/warehouses', icon: 'warehouse', code: 'master_warehouses', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'], accent: 'bg-violet-500' },
      { name: 'Master Customer & Vendor', path: '/master/customers', icon: 'users', code: 'master_customers', roles: ['SUPER_ADMIN', 'ADMIN_ADM'], accent: 'bg-violet-500' },
      { name: 'Pengguna & Hak Akses', path: '/master/users', icon: 'shield', code: 'master_users', roles: ['SUPER_ADMIN', 'ADMIN_ADM'], accent: 'bg-violet-500' },
      { name: 'Master Armada Pool', path: '/master/fleet', icon: 'truck', code: 'master_fleet', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'], accent: 'bg-violet-500' }
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

    // Dynamic bottom navigation items (flat list for mobile).
    // Mobile = sempit: maksimal 5 item paling sering dipakai, urut fase operasional.
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

      const phaseOf = (i: NavItem) => (i.path === '/' ? 0 : (i.phase ?? 9));
      return items.sort((a, b) => phaseOf(a) - phaseOf(b)).slice(0, 5);
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
        case 'outbound_orders':
        case 'waybills':
          return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
        case 'billing':
          return ['ADMIN_ADM', 'WH_MANAGER'].includes(currentRole);
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
      if (path.startsWith('/outbound/pod')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'DRIVER'].includes(currentRole);
      }
      if (path.startsWith('/outbound') || path.startsWith('/waybills')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'].includes(currentRole);
      }
      if (path.startsWith('/billing')) {
        return ['ADMIN_ADM', 'WH_MANAGER'].includes(currentRole);
      }
      if (path.startsWith('/stock')) {
        return ['ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'].includes(currentRole);
      }
      if (path.startsWith('/checkpoints')) {
        return true; // audit terbuka untuk semua role internal
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
