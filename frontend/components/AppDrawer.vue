<template>
  <div>
    <!-- Backdrop Overlay -->
    <div 
      v-if="isOpen" 
      @click="$emit('close')"
      class="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Drawer Panel -->
    <aside 
      class="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            W
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white leading-tight">WMS Simple</h2>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-mono">Enterprise v1.0.6</p>
          </div>
        </div>
        <button 
          @click="$emit('close')" 
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
        >
          ✕
        </button>
      </div>

      <!-- User Profile Card -->
      <div class="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-1 uppercase tracking-wider">Petugas Aktif</p>
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ userInitials }}
          </div>
          <div>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ authStore.user?.full_name || 'Petugas Operasional' }}</p>
            <p class="text-xs text-emerald-600 dark:text-emerald-400 font-mono">{{ authStore.activeWarehouseName }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto py-3">
        <nav class="space-y-1 px-3">
          <NuxtLink to="/" @click="$emit('close')" class="drawer-link" :class="$route.path === '/' ? 'active' : ''">
            <span class="text-lg w-7 text-center">🏠</span>
            <span class="font-medium">Dashboard Utama</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-3 mt-5 mb-2">Pintu Masuk & Keluar</p>
          <NuxtLink to="/inbound/receive" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/inbound') ? 'active' : ''">
            <span class="text-lg w-7 text-center">📥</span>
            <span class="font-medium">Penerimaan (Inbound)</span>
          </NuxtLink>
          <NuxtLink to="/gate-pass" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/gate-pass') ? 'active' : ''">
            <span class="text-lg w-7 text-center">🚛</span>
            <span class="font-medium">Pos Satpam (Gate Pass)</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-3 mt-5 mb-2">Operasional Dalam</p>
          <NuxtLink to="/debulking" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/debulking') ? 'active' : ''">
            <span class="text-lg w-7 text-center">⚖️</span>
            <span class="font-medium">Repacking (De-bulking)</span>
          </NuxtLink>
          <NuxtLink to="/stock" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/stock') ? 'active' : ''">
            <span class="text-lg w-7 text-center">📊</span>
            <span class="font-medium">Kartu Stok & Ledger</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-3 mt-5 mb-2">Pengiriman Akhir</p>
          <NuxtLink to="/outbound/pod" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/outbound') ? 'active' : ''">
            <span class="text-lg w-7 text-center">✍️</span>
            <span class="font-medium">Bukti Kirim (e-POD / BAST)</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- Drawer Footer (Theme & Logout) -->
      <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 space-y-2">
        <div class="flex items-center justify-between px-2">
          <span class="text-xs text-slate-600 dark:text-slate-400 font-medium">Tema Tampilan</span>
          <ThemeToggle />
        </div>
        <button 
          @click="handleLogout"
          class="w-full py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 hover:bg-rose-500/20 text-xs"
        >
          <span>🚪</span>
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import ThemeToggle from '~/components/ThemeToggle.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const authStore = useAuthStore()

const userInitials = computed(() => {
  const name = authStore.user?.full_name || 'Petugas WMS'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})

function handleLogout() {
  authStore.logout()
  emit('close')
  navigateTo('/')
}
</script>

<style scoped>
.drawer-link {
  @apply flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-xs;
}
.drawer-link.active {
  @apply bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20;
}
</style>
