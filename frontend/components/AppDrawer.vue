<template>
  <div>
    <!-- Backdrop Overlay -->
    <div 
      v-if="isOpen" 
      @click="$emit('close')"
      class="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Drawer Panel -->
    <aside 
      class="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            W
          </div>
          <div>
            <h2 class="text-base font-bold text-white leading-tight">WMS Simple</h2>
            <p class="text-xs text-blue-400 font-mono">Enterprise v2.4</p>
          </div>
        </div>
        <button @click="$emit('close')" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white active:scale-95 transition-all">
          ✕
        </button>
      </div>

      <!-- User Profile Card -->
      <div class="px-5 py-4 border-b border-slate-800">
        <p class="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Petugas Aktif</p>
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
            BS
          </div>
          <div>
            <p class="text-sm font-bold text-slate-200">Budi Santoso</p>
            <p class="text-xs text-emerald-400">WH-JKT-01 (Main Hub)</p>
          </div>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto py-3">
        <nav class="space-y-1 px-3">
          <NuxtLink to="/" @click="$emit('close')" class="drawer-link" :class="$route.path === '/' ? 'active' : ''">
            <span class="text-xl w-8 text-center">🏠</span>
            <span class="font-medium">Dashboard Utama</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 mt-6 mb-2">Pintu Masuk & Keluar</p>
          <NuxtLink to="/inbound/receive" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/inbound') ? 'active' : ''">
            <span class="text-xl w-8 text-center">📥</span>
            <span class="font-medium">Penerimaan (Inbound)</span>
          </NuxtLink>
          <NuxtLink to="/gate-pass" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/gate-pass') ? 'active' : ''">
            <span class="text-xl w-8 text-center">🚛</span>
            <span class="font-medium">Pos Satpam (Gate Pass)</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 mt-6 mb-2">Operasional Dalam</p>
          <NuxtLink to="/debulking" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/debulking') ? 'active' : ''">
            <span class="text-xl w-8 text-center">⚖️</span>
            <span class="font-medium">Repacking (De-bulking)</span>
          </NuxtLink>
          <NuxtLink to="/cross-dock" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/cross-dock') ? 'active' : ''">
            <span class="text-xl w-8 text-center">⚡</span>
            <span class="font-medium">Cross-Dock (Tukar SJ)</span>
          </NuxtLink>
          <NuxtLink to="/stock" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/stock') ? 'active' : ''">
            <span class="text-xl w-8 text-center">📊</span>
            <span class="font-medium">Kartu Stok & Ledger</span>
          </NuxtLink>

          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 mt-6 mb-2">Pengiriman Akhir</p>
          <NuxtLink to="/outbound/pod" @click="$emit('close')" class="drawer-link" :class="$route.path.startsWith('/outbound') ? 'active' : ''">
            <span class="text-xl w-8 text-center">✍️</span>
            <span class="font-medium">Bukti Kirim (e-POD / BAST)</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- Drawer Footer -->
      <div class="p-4 border-t border-slate-800 bg-slate-800/30">
        <button class="w-full py-2.5 bg-rose-500/10 text-rose-400 font-bold rounded-xl border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2">
          <span>🚪</span>
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})
defineEmits(['close'])
</script>

<style scoped>
.drawer-link {
  @apply flex items-center space-x-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all active:scale-95;
}
.drawer-link.active {
  @apply bg-blue-600/10 text-blue-400 font-bold border border-blue-500/20;
}
</style>
