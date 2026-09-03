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
    <main class="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
      <div class="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-colors">
        
        <!-- LEFT PANEL: Enterprise Telemetry & Identity (Desktop Only) -->
        <div class="hidden lg:flex lg:col-span-5 bg-slate-950 text-slate-100 p-8 flex-col justify-between border-r border-slate-800">
          
          <!-- Top Brand & Description -->
          <div class="space-y-3">
            <div class="inline-flex items-center space-x-2 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Platform v1.1.0 • Node WH-JKT-01</span>
            </div>
            <h1 class="text-xl font-bold tracking-tight text-white leading-snug">
              Sistem Manajemen Pergudangan & Distribusi Logistik
            </h1>
            <p class="text-xs text-slate-400 leading-relaxed">
              Arsitektur operasional terintegrasi untuk kargo curah (*de-bulking*), flow-through cross-docking, pos pemeriksaan armada, dan rantai dingin KDKMP.
            </p>
          </div>

          <!-- Middle: System Telemetry Specifications -->
          <div class="space-y-2 my-5">
            <div class="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Active Warehouse</span>
                <span class="text-emerald-400 font-bold">WH-JKT-01</span>
              </div>
              <p class="text-xs font-semibold text-slate-200">Terminal Konsolidasi & Kargo Curah</p>
              <div class="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Security: Scoped JWT</span>
                <span>Ledger: Double-Entry</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center text-xs">
              <div class="p-2.5 rounded-md bg-slate-900 border border-slate-800">
                <p class="text-[10px] text-slate-500 uppercase font-mono">Database</p>
                <p class="font-semibold text-slate-200 mt-0.5 font-mono text-xs">SQLite (WAL)</p>
              </div>
              <div class="p-2.5 rounded-md bg-slate-900 border border-slate-800">
                <p class="text-[10px] text-slate-500 uppercase font-mono">Audit Chain</p>
                <p class="font-semibold text-emerald-400 mt-0.5 font-mono text-xs">Immutable</p>
              </div>
            </div>
          </div>

          <!-- Bottom: Certification & Compliance -->
          <div class="pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <div class="flex items-center space-x-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>OWASP Top 10 Verified</span>
            </div>
            <span class="text-slate-500">ISO/IEC 27001</span>
          </div>
        </div>

        <!-- RIGHT PANEL: Authentication Form & Role Clearance -->
        <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          
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
                  class="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium cursor-pointer"
                >
                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan Sandi' }}
                </button>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  class="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none transition shadow-2xs"
                />
                <button 
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
              class="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              <span v-if="authStore.isLoading" class="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              <span>{{ authStore.isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Konsol Operasional' }}</span>
              <svg v-if="!authStore.isLoading" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <!-- ROLE CLEARANCE SELECTOR (Sleek Enterprise Profile Switcher) -->
          <div class="pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400 font-mono">
                Profil Simulasi Peran (RBAC Clearance)
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Sandi: password123</span>
            </div>

            <!-- 6 Enterprise Role Cards (Clean, Subtle, Minimalist) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button 
                v-for="role in demoRoles" 
                :key="role.username"
                type="button"
                @click="quickLogin(role.username)"
                class="p-2 rounded-md border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left group cursor-pointer shadow-2xs"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {{ role.title }}
                  </span>
                  <span class="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded border" :class="role.badgeClass">
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
