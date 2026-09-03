<template>
  <div class="space-y-5">
    
    <!-- Control Tower Header (Clean B2B Logistics Console) -->
    <div class="p-4 sm:p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center space-x-2 text-xs font-mono">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Shift 1 (08:00 - 16:00)</span>
          </span>
          <span class="text-slate-400">/</span>
          <span class="text-slate-600 dark:text-slate-400 font-medium">{{ authStore.activeWarehouseName }}</span>
        </div>
        <h2 class="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Konsol Pengendali Logistik & Distribusi
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Petugas Aktif: <strong class="text-slate-800 dark:text-slate-200">{{ authStore.user?.full_name || 'Petugas Operasional' }}</strong> 
          <span class="text-slate-400">({{ authStore.roleLabel }})</span>
        </p>
      </div>

      <!-- Header Action Group -->
      <div class="flex items-center space-x-2 shrink-0">
        <NuxtLink 
          v-if="authStore.canAccess('stock')"
          to="/stock"
          class="px-3 py-2 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
        >
          <AppIcon name="stock" custom-class="w-3.5 h-3.5 text-slate-500" />
          <span>Buku Besar Stok</span>
        </NuxtLink>
        <NuxtLink 
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass"
          class="px-3 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <AppIcon name="truck" custom-class="w-3.5 h-3.5" />
          <span>Pos Gerbang Armada</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Operational Telemetry Bar (4 Key Metrics) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Armada di Luar</span>
          <AppIcon name="truck" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ departedVehiclesCount }}
          </p>
          <span class="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
            Gate-Out Aktif
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Trip Antar-Hub</span>
          <AppIcon name="refresh" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ inTransitCount }}
          </p>
          <span class="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium">
            Cross-Dock
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>SKU Aktif</span>
          <AppIcon name="package" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ stockStore.stockLevels.length || 4 }}
          </p>
          <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
            Double-Entry
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Target Dwelling</span>
          <AppIcon name="clock" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            ≤ 7 <span class="text-xs font-normal text-slate-400">Hari</span>
          </p>
          <span class="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
            Flow-Through
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Action Grid (Filtered by Active Role) -->
    <div>
      <div class="flex items-center justify-between mb-2 px-1">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Modul Operasional Lapangan
        </h3>
        <span class="text-[11px] text-slate-400 font-mono">Akses Role: {{ authStore.roleLabel }}</span>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <!-- 1. Pos Satpam Gate Pass -->
        <NuxtLink 
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="truck" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              GATE-01
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Pemeriksaan Pos Satpam
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Catat odometer keluar/masuk & level solar
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>Buka Modul</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- 2. Inbound Receiving -->
        <NuxtLink 
          v-if="authStore.canAccess('inbound')"
          to="/inbound/receive" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="inbound" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              DOCK-IN
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Penerimaan Barang Dock
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Scan serial number & tally fisik kedatangan
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>Buka Modul</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- 3. De-bulking Work Order -->
        <NuxtLink 
          v-if="authStore.canAccess('debulking')"
          to="/debulking" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="debulking" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              BULK-01
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              De-bulking & Repacking Curah
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Konversi kemasan jumbo & kalkulasi susut
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>Buka Modul</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- 4. Driver POD -->
        <NuxtLink 
          v-if="authStore.canAccess('outbound_pod')"
          to="/outbound/pod" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="pod" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              E-POD
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Bukti Kirim Digital (e-POD)
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Foto penyerahan barang & TTD BAST Desa
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>Buka Modul</span>
            <span>→</span>
          </div>
        </NuxtLink>

      </div>
    </div>

    <!-- Logistics Distribution Scheme & Hub Staging (AUCMA KDKMP Reference) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Hub Distribution Allocation -->
      <div class="lg:col-span-2 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              Alokasi Hub Pergudangan & Staging
            </h4>
            <p class="text-[11px] text-slate-400 mt-0.5">Distribusi KDKMP: 20.000 Kopdes / 80.000 Unit</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
            Priok & Perak Gateway
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Hub Cikarang (Priok)</span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">7.000 m²</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Cakupan Wilayah: Jawa Bagian Barat/Tengah & Seluruh Sumatera</p>
            <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>Alokasi Unit: 60%</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">Flow-Through Ready</span>
            </div>
          </div>

          <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Hub Surabaya (Perak)</span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">3.500 m²</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Cakupan Wilayah: Jawa Timur, Bali, NTB, dan NTT</p>
            <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>Alokasi Unit: 40%</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">Flow-Through Ready</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cold Chain & Audit Compliance Sidebar -->
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              Standar Kepatuhan Kargo
            </h4>
            <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">ISO 27001</span>
          </div>
          <ul class="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Upright Only:</strong> Kulkas & Freezer pantang dimiringkan saat muat dan bongkar.</span>
            </li>
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Truk Tail-Lift:</strong> Khusus pengiriman Balai Desa tanpa fasilitas forklift.</span>
            </li>
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Resting Time 2-4 Jam:</strong> Kompresor wajib diistirahatkan sebelum colok listrik.</span>
            </li>
          </ul>
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>Audit Chain:</span>
          <span class="text-slate-700 dark:text-slate-300 font-semibold">100% Immutable Checkpoint</span>
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
