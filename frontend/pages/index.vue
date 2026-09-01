<template>
  <div class="space-y-4">
    <!-- Operational Shift Banner -->
    <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-medium">{{ authStore.roleLabel }} • {{ authStore.activeWarehouseName }}</p>
          </div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">Menu Operasional Lapangan</h2>
        </div>
        <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
          ⚡
        </div>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Pilih modul tugas untuk input data atau scan barcode fisik.</p>
    </div>

    <!-- Quick Touch Grid (Industrial Clean Cards) -->
    <div class="grid grid-cols-2 gap-3">
      <!-- 1. Pos Satpam Gate Pass -->
      <NuxtLink 
        to="/gate-pass" 
        class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-98 transition flex flex-col justify-between h-32 shadow-sm group"
      >
        <div class="flex justify-between items-start">
          <span class="text-2xl">🚛</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">POS SATPAM</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Gate Pass Armada</h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Odometer, BBM, Surat Jalan</p>
        </div>
      </NuxtLink>

      <!-- 2. Inbound Receiving -->
      <NuxtLink 
        to="/inbound/receive" 
        class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-98 transition flex flex-col justify-between h-32 shadow-sm group"
      >
        <div class="flex justify-between items-start">
          <span class="text-2xl">📥</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">DOCK</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Inbound Receive</h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scan Barcode & Tally Fisik</p>
        </div>
      </NuxtLink>

      <!-- 3. De-bulking Work Order -->
      <NuxtLink 
        to="/debulking" 
        class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-98 transition flex flex-col justify-between h-32 shadow-sm group"
      >
        <div class="flex justify-between items-start">
          <span class="text-2xl">⚖️</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">CURAH</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">De-bulking</h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Bulky → Karung & Susut %</p>
        </div>
      </NuxtLink>

      <!-- 4. Driver POD -->
      <NuxtLink 
        to="/outbound/pod" 
        class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-98 transition flex flex-col justify-between h-32 shadow-sm group"
      >
        <div class="flex justify-between items-start">
          <span class="text-2xl">✍️</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">DRIVER</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Serah Terima POD</h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Foto & TTD Digital Customer</p>
        </div>
      </NuxtLink>
    </div>

    <!-- Live Operational Summary -->
    <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm transition-colors">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status Armada & Stok</h4>
        <NuxtLink to="/stock" class="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Lihat Semua →</NuxtLink>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Armada di Luar</p>
          <p class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{{ departedVehiclesCount }} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">Unit</span></p>
        </div>
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">In-Transit</p>
          <p class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{{ inTransitCount }} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">Trip</span></p>
        </div>
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Total SKU Aktif</p>
          <p class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{{ stockStore.stockLevels.length || 4 }} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">SKU</span></p>
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

const authStore = useAuthStore()
const stockStore = useStockStore()
const gatePassStore = useGatePassStore()

const departedVehiclesCount = computed(() => {
  return gatePassStore.logs.filter(l => l.status === 'DEPARTED').length || 1
})

const inTransitCount = computed(() => {
  return stockStore.stockLevels.reduce((sum, item) => sum + (Number(item.qty_in_transit) > 0 ? 1 : 0), 0) || 1
})

onMounted(async () => {
  authStore.initAuth()
  await stockStore.fetchStockLevels(authStore.activeWarehouseId)
  await gatePassStore.fetchLogs('DEPARTED')
})
</script>
