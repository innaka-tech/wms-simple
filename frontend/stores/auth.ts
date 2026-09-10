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
  roles: UserRole[];
}

/**
 * Parent menu = tahapan operasional (berisi submenu modul).
 * Sengaja dua tingkat: parent selalu terlihat (konteks), modul baru muncul saat dibuka —
 * sidebar tetap pendek & tenang meski modul bertambah.
 */
export interface NavParent {
  name: string;
  /** Path tujuan saat parent diklik = modul pertamanya */
  path: string;
  icon: string;
  phase?: 1 | 2 | 3 | 4 | 5;
  accent?: string;
  /** Band visual untuk ritme sidebar: main (ringkasan) | flow (alur barang) | admin (master) */
  band?: 'main' | 'flow' | 'admin';
  roles: UserRole[];
  children: NavItem[];
}

/** Warna koding fase — konsisten di sidebar, drawer, dashboard & kicker halaman */
export const PHASE_ACCENT: Record<number, { dot: string; chip: string; text: string }> = {
  1: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  2: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  3: { dot: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  4: { dot: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
  5: { dot: 'bg-slate-400', chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20', text: 'text-slate-500 dark:text-slate-400' }
};

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'DRIVER', 'GATE_OFFICER'];

/**
 * Grup menu mengikuti alur operasional lapangan (docs/05 & docs/06):
 * Barang Masuk → Pekerjaan Gudang → Barang Keluar → Bukti Kirim & Penagihan.
 * Stok & dashboard = pemantauan (di atas, terpisah dari alur).
 */
/**
 * Menu dua tingkat — parent = tahapan operasional (selalu terlihat),
 * anak = modul di tahap itu (muncul saat parent dibuka). Urutan = alur barang:
 * Masuk → Gudang → Keluar → Bukti/Tagihan. Dashboard & Pemantauan di atas, Master di bawah.
 */
const MASTER_NAV_PARENTS: NavParent[] = [
  {
    name: 'Beranda',
    path: '/',
    icon: 'home',
    band: 'main',
    roles: ALL_ROLES,
    children: []
  },
  {
    name: 'Monitoring',
    path: '/stock',
    icon: 'stock',
    phase: 5,
    band: 'main',
    accent: 'bg-slate-400',
    roles: ALL_ROLES.filter(r => r !== 'DRIVER'),
    children: [
      { name: 'Stock on Hand', path: '/stock', icon: 'stock', code: 'stock', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'] },
      { name: 'Audit Trail Dokumen', path: '/checkpoints', icon: 'checkpoint', code: 'checkpoints', roles: ALL_ROLES }
    ]
  },
  {
    name: 'Inbound (Barang Masuk)',
    path: '/inbound/receive',
    icon: 'inbound',
    phase: 1,
    band: 'flow',
    accent: 'bg-emerald-500',
    roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'],
    children: [
      { name: 'Receiving (Penerimaan Dock)', path: '/inbound/receive', icon: 'inbound', code: 'inbound', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] }
    ]
  },
  {
    name: 'Warehouse Operation',
    path: '/debulking',
    icon: 'debulking',
    phase: 2,
    band: 'flow',
    accent: 'bg-amber-500',
    roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'],
    children: [
      { name: 'Debulking & Repacking', path: '/debulking', icon: 'debulking', code: 'debulking', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] }
    ]
  },
  {
    name: 'Outbound (Barang Keluar)',
    path: '/outbound',
    icon: 'package',
    phase: 3,
    band: 'flow',
    accent: 'bg-blue-500',
    roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF', 'GATE_OFFICER'],
    children: [
      { name: 'Delivery Order & SJ', path: '/outbound', icon: 'package', code: 'outbound_orders', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] },
      { name: 'Surat Jalan & Resi', path: '/waybills', icon: 'printer', code: 'waybills', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'WH_STAFF'] },
      { name: 'Gate Pass (Pos Jaga)', path: '/gate-pass', icon: 'truck', code: 'gate_pass', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'GATE_OFFICER'] }
    ]
  },
  {
    name: 'Delivery & Billing',
    path: '/outbound/pod',
    icon: 'pod',
    phase: 4,
    band: 'flow',
    accent: 'bg-cyan-500',
    roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'DRIVER'],
    children: [
      { name: 'Delivery & POD', path: '/outbound/pod', icon: 'pod', code: 'outbound_pod', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER', 'DRIVER'] },
      { name: 'Faktur & Pembayaran', path: '/billing', icon: 'chart', code: 'billing', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'] }
    ]
  },
  {
    name: 'Master Data',
    path: '/master/products',
    icon: 'box',
    accent: 'bg-violet-500',
    band: 'admin',
    roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'],
    children: [
      { name: 'Barang (SKU)', path: '/master/products', icon: 'box', code: 'master_products', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'] },
      { name: 'Gudang & Rak', path: '/master/warehouses', icon: 'warehouse', code: 'master_warehouses', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'] },
      { name: 'Customer & Vendor', path: '/master/customers', icon: 'users', code: 'master_customers', roles: ['SUPER_ADMIN', 'ADMIN_ADM'] },
      { name: 'Armada Pool', path: '/master/fleet', icon: 'truck', code: 'master_fleet', roles: ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'] },
      { name: 'Pengguna & Hak Akses', path: '/master/users', icon: 'shield', code: 'master_users', roles: ['SUPER_ADMIN', 'ADMIN_ADM'] }
    ]
  }
];

/** Metadata path → nama & fase (untuk breadcrumb shell, tanpa hardcode per halaman) */
export const NAV_META: Record<string, { name: string; phase?: 1 | 2 | 3 | 4 | 5 }> = Object.fromEntries(
  MASTER_NAV_PARENTS.flatMap(p => [
    [p.path, { name: p.name, phase: p.phase }] as [string, { name: string; phase?: 1 | 2 | 3 | 4 | 5 }],
    ...p.children.map(item => [item.path, { name: item.name, phase: p.phase }] as [string, { name: string; phase?: 1 | 2 | 3 | 4 | 5 }])
  ])
);

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
    
    // Menu dua tingkat per role: parent selalu tampil, anak cuma dari role yang berhak.
    // Parent dengan semua anak ter-filter tetap hilang (tidak ada parent mati).
    allowedNavParents: (state): NavParent[] => {
      const currentRole: UserRole = state.user?.role || 'SUPER_ADMIN';

      return MASTER_NAV_PARENTS
        .map(parent => {
          if (parent.name === 'Beranda') {
            return parent.roles.includes(currentRole) ? parent : null;
          }
          const children = parent.children.filter(item => item.roles.includes(currentRole));
          if (children.length === 0) return null;
          return { ...parent, children };
        })
        .filter((p): p is NavParent => p !== null);
    },

    // Bottom nav mobile: parent operasional urut alur barang, maksimal 5.
    // Prioritas: Beranda → fase 1-4 → Pemantauan → Master (yang jarang dibuka dari HP).
    allowedBottomNavItems: (state): NavItem[] => {
      const currentRole: UserRole = state.user?.role || 'SUPER_ADMIN';
      const priority = (p: NavParent) => {
        if (p.name === 'Beranda') return 0;
        if (p.phase && p.phase <= 4) return p.phase;
        if (p.phase === 5) return 5;
        return 6;
      };
      return MASTER_NAV_PARENTS
        .filter(p => p.roles.includes(currentRole))
        .sort((a, b) => priority(a) - priority(b))
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          path: p.path,
          icon: p.icon,
          code: 'dashboard'
        } as NavItem));
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
