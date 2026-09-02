<template>
  <div class="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors selection:bg-blue-600 selection:text-white">
    
    <!-- TOP BAR (Status & Theme Switcher) -->
    <header class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span class="font-bold text-sm tracking-tight text-slate-900 dark:text-white">WMS SIMPLE <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">ENTERPRISE</span></span>
      </div>

      <div class="flex items-center space-x-3">
        <div class="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Core API: 3000 (SQLite Active)</span>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <!-- MAIN AUTHENTICATION CONTAINER -->
    <main class="flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
      <div class="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-colors">
        
        <!-- LEFT PANEL: Enterprise Telemetry & Identity (Desktop Only) -->
        <div class="hidden lg:flex lg:col-span-5 bg-slate-900 dark:bg-slate-900/90 text-slate-100 p-8 flex-col justify-between border-r border-slate-800 relative">
          <!-- Subtle Grid Background -->
          <div class="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

          <!-- Top Brand & Description -->
          <div class="space-y-4 relative z-10">
            <div class="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-medium">
              <span>Platform v1.1.0-prod</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white leading-snug">
              Sistem Manajemen Pergudangan & Distribusi Logistik
            </h1>
            <p class="text-xs text-slate-400 leading-relaxed">
              Arsitektur terintegrasi untuk kargo umum, curah kering & cair (*de-bulking*), gate pass armada, dan rantai dingin KDMP.
            </p>
          </div>

          <!-- Middle: System Telemetry Specifications -->
          <div class="space-y-2.5 my-6 relative z-10">
            <div class="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="font-medium">Active Warehouse Node</span>
                <span class="font-mono text-emerald-400 font-bold">WH-JKT-01</span>
              </div>
              <p class="text-xs font-semibold text-slate-200">Main Consolidation & Bulky Terminal</p>
              <div class="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Security: Scoped JWT RBAC</span>
                <span>Audit: Linked Chain</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center text-xs">
              <div class="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <p class="text-[10px] text-slate-400 uppercase font-mono">DB Mode</p>
                <p class="font-bold text-slate-200 mt-0.5 font-mono">SQLite (WAL)</p>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <p class="text-[10px] text-slate-400 uppercase font-mono">Ledger State</p>
                <p class="font-bold text-emerald-400 mt-0.5 font-mono">Double-Entry</p>
              </div>
            </div>
          </div>

          <!-- Bottom: Certification & Compliance -->
          <div class="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
            <div class="flex items-center space-x-1.5">
              <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Audit Chain Integrity</span>
            </div>
            <span class="font-mono text-[10px] text-slate-400">Zero Raw SQL</span>
          </div>
        </div>

        <!-- RIGHT PANEL: Authentication Form & Role Clearance -->
        <div class="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          
          <!-- Mobile Header (Visible on < lg) -->
          <div class="lg:hidden pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">WMS SIMPLE</h2>
              <p class="text-xs text-slate-500">Enterprise Logistics Suite v1.1.0</p>
            </div>
            <span class="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              WH-JKT-01
            </span>
          </div>

          <!-- Title -->
          <div class="space-y-1">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Masuk ke Portal Operasional
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gunakan kredensial akun resmi atau pilih profil simulasi peran di bawah.
            </p>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="authStore.errorMessage" class="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="font-medium">{{ authStore.errorMessage }}</span>
            </div>
            <button @click="authStore.errorMessage = ''" class="font-bold hover:opacity-80 p-1">✕</button>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="space-y-4 my-5">
            <!-- Username Input -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Pengguna / ID Karyawan
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input 
                  v-model="username" 
                  type="text" 
                  required
                  placeholder="Contoh: superadmin / gate_officer"
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1.5">
              <div class="flex justify-between items-center">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan Sandi' }}
                </button>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                  </svg>
                </div>
                <input 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  required
                  placeholder="Masukkan kata sandi..."
                  class="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition"
                />
                <button 
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg v-if="!showPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit" 
              :disabled="authStore.isLoading"
              class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md shadow-blue-600/10 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              <span v-if="authStore.isLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ authStore.isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Konsol Operasional' }}</span>
              <svg v-if="!authStore.isLoading" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <!-- ROLE CLEARANCE SELECTOR (Sleek Accordion / Enterprise Profile Switcher) -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Pilih Profil Simulasi Peran (RBAC Clearance)
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Default: password123</span>
            </div>

            <!-- 6 Enterprise Role Cards (Clean, Subtle, Minimalist) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button 
                v-for="role in demoRoles" 
                :key="role.username"
                type="button"
                @click="quickLogin(role.username)"
                class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-950/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition text-left group cursor-pointer"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {{ role.title }}
                  </span>
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border" :class="role.badgeClass">
                    {{ role.code }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ role.name }}</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">{{ role.username }}</p>
              </button>
            </div>
          </div>

        </div>

      </div>
    </main>

    <!-- FOOTER: Security & Compliance Metadata -->
    <footer class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center sm:flex sm:items-center sm:justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
      <p>© 2026 WMS Simple Enterprise. Seluruh hak cipta dilindungi.</p>
      <div class="flex items-center justify-center space-x-4 mt-2 sm:mt-0 font-mono text-[10px]">
        <span>Standard: ISO/IEC 27001</span>
        <span>•</span>
        <span>OWASP Top 10 Web Compliant</span>
        <span>•</span>
        <span>v1.1.0-release</span>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import ThemeToggle from '~/components/ThemeToggle.vue'

definePageMeta({
  layout: false // Standalone login page without sidebar
})

const router = useRouter()
const authStore = useAuthStore()

const username = ref('superadmin')
const password = ref('password123')
const showPassword = ref(false)

const demoRoles = [
  { 
    title: 'Super Administrator', 
    name: 'System Super Admin', 
    username: 'superadmin', 
    code: 'SUPER',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  },
  { 
    title: 'Admin Operasional', 
    name: 'Siti Rahmawati', 
    username: 'admin_adm', 
    code: 'ADMIN',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  },
  { 
    title: 'Kepala Gudang', 
    name: 'Bambang Sudiro', 
    username: 'mgr_jkt', 
    code: 'MNGR',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  { 
    title: 'Petugas Checker', 
    name: 'Joko Susanto', 
    username: 'staff_jkt', 
    code: 'STAFF',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  { 
    title: 'Pengemudi Armada', 
    name: 'Budi Santoso', 
    username: 'driver_budi', 
    code: 'DRV',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
  },
  { 
    title: 'Petugas Pos Satpam', 
    name: 'Sersan Hendro', 
    username: 'gate_officer', 
    code: 'GATE',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }
]

async function handleLogin() {
  const success = await authStore.login(username.value, password.value)
  if (success) {
    router.push('/')
  }
}

async function quickLogin(selectedUsername) {
  username.value = selectedUsername
  password.value = 'password123'
  await handleLogin()
}
</script>
