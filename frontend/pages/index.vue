<template>
  <div class="space-y-6">
    
    <!-- Operational Shift Header Card (Clean Enterprise Slate) -->
    <div class="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1.5">
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium font-mono">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Shift 1 Aktif</span>
            <span>•</span>
            <span>{{ authStore.roleLabel }}</span>
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ authStore.activeWarehouseName }}</span>
        </div>
        <h2 class="text-lg md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Selamat Bertugas, {{ authStore.user?.full_name || 'Petugas Operasional' }}
        </h2>
        <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          <span v-if="authStore.userRole === 'GATE_OFFICER'">Pos Gerbang: Catat keberangkatan/kepulangan armada dan verifikasi odometer serta BBM.</span>
          <span v-else-if="authStore.userRole === 'DRIVER'">Distribusi: Selesaikan serah terima barang dan dokumentasikan tanda tangan BAST Desa.</span>
          <span v-else-if="authStore.userRole === 'WH_STAFF'">Gudang: Lakukan tally penerimaan inbound dan penimbangan repacking kargo curah.</span>
          <span v-else>Pilih modul tugas, pantau pergerakan armada, atau kelola mutasi stok gudang secara terpadu.</span>
        </p>
      </div>

      <div class="flex items-center space-x-2.5">
        <NuxtLink 
          v-if="authStore.canAccess('stock')"
          to="/stock"
          class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition flex items-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <AppIcon name="stock" custom-class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>Buka Kartu Stok</span>
        </NuxtLink>
        <NuxtLink 
          v-else-if="authStore.userRole === 'DRIVER'"
          to="/outbound/pod"
          class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-sm cursor-pointer"
        >
          <AppIcon name="pod" custom-class="w-3.5 h-3.5" />
          <span>Buka e-POD</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Quick Action Grid (Filtered by Active Role) -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Modul Tugas ({{ authStore.roleLabel }})
        </h3>
        <span class="text-[11px] text-slate-400 dark:text-slate-500">Akses resmi terverifikasi</span>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <!-- 1. Pos Satpam Gate Pass -->
        <NuxtLink 
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass" 
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-98 transition flex flex-col justify-between h-40 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition">
              <AppIcon name="truck" custom-class="w-5 h-5" />
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              GATE PASS
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
              Pemeriksaan Gerbang
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Catat odometer, level BBM & struk armada
            </p>
          </div>
        </NuxtLink>

        <!-- 2. Inbound Receiving -->
        <NuxtLink 
          v-if="authStore.canAccess('inbound')"
          to="/inbound/receive" 
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-98 transition flex flex-col justify-between h-40 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition">
              <AppIcon name="inbound" custom-class="w-5 h-5" />
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              INBOUND
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
              Penerimaan Barang
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Scan barcode & tally fisik kedatangan
            </p>
          </div>
        </NuxtLink>

        <!-- 3. De-bulking Work Order -->
        <NuxtLink 
          v-if="authStore.canAccess('debulking')"
          to="/debulking" 
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-98 transition flex flex-col justify-between h-40 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition">
              <AppIcon name="debulking" custom-class="w-5 h-5" />
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              REPACK
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
              De-bulking Curah
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Pencurahan Jumbo Bag & batas susut
            </p>
          </div>
        </NuxtLink>

        <!-- 4. Driver POD -->
        <NuxtLink 
          v-if="authStore.canAccess('outbound_pod')"
          to="/outbound/pod" 
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-98 transition flex flex-col justify-between h-40 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition">
              <AppIcon name="pod" custom-class="w-5 h-5" />
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              E-POD
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
              Bukti Serah Terima
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Foto penyerahan & tanda tangan BAST
            </p>
          </div>
        </NuxtLink>

        <!-- 5. Kartu Stok Card (for Single-Role Drivers/Satpam) -->
        <NuxtLink 
          v-if="authStore.canAccess('stock') && (authStore.userRole === 'GATE_OFFICER' || authStore.userRole === 'DRIVER')"
          to="/stock" 
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-98 transition flex flex-col justify-between h-40 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition">
              <AppIcon name="stock" custom-class="w-5 h-5" />
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              STOK
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
              Kartu Stok Gudang
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Pemeriksaan saldo barang real-time
            </p>
          </div>
        </NuxtLink>

      </div>
    </div>

    <!-- Live Telemetry Grid (Status Armada & Stok) -->
    <div class="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm transition-colors">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 class="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Status Operasional Armada & Mutasi Barang
          </h4>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Tersinkronisasi dengan database SQLite/PostgreSQL
          </p>
        </div>
        <NuxtLink to="/stock" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1">
          <span>Lihat Kartu Stok</span>
          <span>→</span>
        </NuxtLink>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Armada di Luar</p>
            <p class="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {{ departedVehiclesCount }} <span class="text-xs text-slate-500 font-normal">Unit</span>
            </p>
            <span class="inline-flex items-center space-x-1 mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Dalam Perjalanan</span>
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <AppIcon name="truck" custom-class="w-5 h-5" />
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Trip Antar-Hub</p>
            <p class="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {{ inTransitCount }} <span class="text-xs text-slate-500 font-normal">Trip</span>
            </p>
            <span class="inline-flex items-center space-x-1 mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Cross-Dock Aktif</span>
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <AppIcon name="refresh" custom-class="w-5 h-5" />
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">SKU Terdaftar</p>
            <p class="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {{ stockStore.stockLevels.length || 4 }} <span class="text-xs text-slate-500 font-normal">SKU</span>
            </p>
            <span class="inline-flex items-center space-x-1 mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Double-Entry Aktif</span>
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <AppIcon name="package" custom-class="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Operational Highlights -->
    <div class="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3 shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
          <AppIcon name="truck" custom-class="w-4 h-4" />
        </div>
        <div>
          <h5 class="text-xs font-bold text-slate-900 dark:text-white">Program KDMP Cold Chain</h5>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">SOP Upright Only, Truk Tail-Lift, Nomor Seri Showcase, & TTD BAST Desa.</p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3 shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
          <AppIcon name="package" custom-class="w-4 h-4" />
        </div>
        <div>
          <h5 class="text-xs font-bold text-slate-900 dark:text-white">Cross-Document SJ Swap</h5>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Penerbitan Surat Jalan Blind Shipping 3PL tanpa bongkar ulang muatan.</p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3 shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
          <AppIcon name="shield" custom-class="w-4 h-4" />
        </div>
        <div>
          <h5 class="text-xs font-bold text-slate-900 dark:text-white">Rantai Audit Terverifikasi</h5>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Identitas petugas fisik tercatat pada setiap mutasi dan serah terima kargo.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useStockStore } from '~/stores/stock'
import { useGatePassStore } from '~/stores/gatePass'
import AppIcon from '~/components/AppIcon.vue'

const authStore = useAuthStore()
const stockStore = useStockStore()
const gatePassStore = useGatePassStore()

onMounted(async () => {
  try {
    await Promise.all([
      stockStore.fetchStockLevels(),
      gatePassStore.fetchLogs()
    ])
  } catch (err) {
    console.error('Failed to load dashboard telemetry:', err)
  }
})

const departedVehiclesCount = computed(() => {
  return (gatePassStore.logs || []).filter(gp => gp.status === 'DEPARTED').length
})

const inTransitCount = computed(() => {
  return (gatePassStore.logs || []).filter(gp => gp.status === 'IN_TRANSIT').length
})
</script>
