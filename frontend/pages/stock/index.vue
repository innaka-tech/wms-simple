<template>
  <div class="space-y-6">
    <!-- Header & Top Bar -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="stock" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Kartu Stok & Buku Besar Mutasi Barang (Ledger)</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Saldo Terkini Double-Entry • {{ authStore.activeWarehouseName }}</p>
      </div>

      <div class="flex items-center space-x-2.5">
        <div class="relative flex-1 md:w-64">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <AppIcon name="search" custom-class="w-3.5 h-3.5" />
          </span>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Cari SKU / Nama Barang..."
            class="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button 
          type="button" 
          @click="refreshStock"
          class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
        >
          <AppIcon name="refresh" custom-class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="stockStore.errorMessage" class="p-4 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2">
      <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
      <span>{{ stockStore.errorMessage }}</span>
    </div>

    <!-- Stock KPI Summary Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-[10px] uppercase font-semibold text-slate-400">Total SKU Terdaftar</p>
        <p class="text-xl md:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{{ filteredList.length }} <span class="text-xs font-normal text-slate-400">SKU</span></p>
      </div>
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-[10px] uppercase font-semibold text-slate-400">Total Unit On-Hand</p>
        <p class="text-xl md:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{{ totalOnHand }} <span class="text-xs font-normal text-slate-400">Unit/Kg</span></p>
      </div>
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-[10px] uppercase font-semibold text-slate-400">Total Alokasi Reserved</p>
        <p class="text-xl md:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{{ totalReserved }} <span class="text-xs font-normal text-slate-400">Unit</span></p>
      </div>
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-[10px] uppercase font-semibold text-slate-400">Total In-Transit</p>
        <p class="text-xl md:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{{ totalInTransit }} <span class="text-xs font-normal text-slate-400">Unit</span></p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="stockStore.isLoading" class="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
      <div class="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
      Memuat saldo stok dari database...
    </div>

    <!-- DESKTOP TABLE VIEW (Visible on md: screens and up) -->
    <div v-else class="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th class="py-3.5 px-4">Kode SKU</th>
            <th class="py-3.5 px-4">Nama Produk / Spesifikasi</th>
            <th class="py-3.5 px-4">Satuan (UoM)</th>
            <th class="py-3.5 px-4 text-right">On-Hand Fisik</th>
            <th class="py-3.5 px-4 text-right">Alokasi Reserved</th>
            <th class="py-3.5 px-4 text-right">In-Transit</th>
            <th class="py-3.5 px-4 text-center">Status Stok</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <tr 
            v-for="item in filteredList" 
            :key="item.id || item.sku"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
          >
            <td class="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
              <span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {{ item.sku_code || item.sku }}
              </span>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.product_name || item.name }}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Gudang: {{ item.warehouse_name || 'Main Hub Jakarta' }}</div>
            </td>
            <td class="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
              {{ item.unit || 'PCS' }}
            </td>
            <td class="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
              {{ item.qty_on_hand !== undefined ? item.qty_on_hand : item.onHand }}
            </td>
            <td class="py-3.5 px-4 text-right font-mono font-medium text-slate-500 dark:text-slate-400">
              {{ item.qty_reserved !== undefined ? item.qty_reserved : item.reserved }}
            </td>
            <td class="py-3.5 px-4 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
              {{ item.qty_in_transit !== undefined ? item.qty_in_transit : item.inTransit }}
            </td>
            <td class="py-3.5 px-4 text-center">
              <span 
                class="inline-block text-[10px] font-bold px-2.5 py-1 rounded-md border"
                :class="item.is_low_stock ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'"
              >
                {{ item.is_low_stock ? 'MINIMUM' : 'TERSEDIA' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MOBILE CARD VIEW (Visible on < md screens) -->
    <div v-if="!stockStore.isLoading" class="md:hidden space-y-3">
      <div 
        v-for="item in filteredList" 
        :key="item.id || item.sku"
        class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-sm transition-colors"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {{ item.sku_code || item.sku }}
            </span>
            <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1.5">{{ item.product_name || item.name }}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ item.unit || 'PCS' }} • Gudang: {{ item.warehouse_name || 'Main Hub' }}</p>
          </div>
          <span 
            class="text-[10px] font-bold px-2 py-0.5 rounded border" 
            :class="item.is_low_stock ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'"
          >
            {{ item.is_low_stock ? 'MIN' : 'AMAN' }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">On-Hand</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_on_hand !== undefined ? item.qty_on_hand : item.onHand }}</p>
          </div>
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Reserved</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_reserved !== undefined ? item.qty_reserved : item.reserved }}</p>
          </div>
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">In-Transit</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_in_transit !== undefined ? item.qty_in_transit : item.inTransit }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStockStore } from '~/stores/stock'
import { useAuthStore } from '~/stores/auth'

const stockStore = useStockStore()
const authStore = useAuthStore()

const searchQuery = ref('')

const fallbackList = [
  { sku: 'BULK-SUGAR-1T', name: 'Gula Pasir Rafinasi Jumbo Bag 1 Ton (Bulky)', unit: 'JUMBO_BAG', onHand: '20', reserved: '0', inTransit: '0', is_low_stock: false },
  { sku: 'SUGAR-SACK-25KG', name: 'Gula Pasir Rafinasi Karung 25 KG (Retail)', unit: 'SACK', onHand: '200', reserved: '0', inTransit: '0', is_low_stock: false },
  { sku: 'KDMP-CHILLER-300L', name: 'Showcase Display Chiller 300L (KDMP)', unit: 'UNIT', onHand: '15', reserved: '2', inTransit: '5', is_low_stock: false },
  { sku: 'ELEC-TV-43', name: 'Smart LED TV 43 Inch FHD', unit: 'PCS', onHand: '120', reserved: '10', inTransit: '0', is_low_stock: false }
]

const rawList = computed(() => {
  if (stockStore.stockLevels && stockStore.stockLevels.length > 0) {
    return stockStore.stockLevels
  }
  return fallbackList
})

const filteredList = computed(() => {
  if (!searchQuery.value.trim()) return rawList.value
  const q = searchQuery.value.toLowerCase().trim()
  return rawList.value.filter(item => {
    const sku = (item.sku_code || item.sku || '').toLowerCase()
    const name = (item.product_name || item.name || '').toLowerCase()
    return sku.includes(q) || name.includes(q)
  })
})

const totalOnHand = computed(() => {
  return rawList.value.reduce((acc, item) => acc + Number(item.qty_on_hand !== undefined ? item.qty_on_hand : item.onHand || 0), 0)
})

const totalReserved = computed(() => {
  return rawList.value.reduce((acc, item) => acc + Number(item.qty_reserved !== undefined ? item.qty_reserved : item.reserved || 0), 0)
})

const totalInTransit = computed(() => {
  return rawList.value.reduce((acc, item) => acc + Number(item.qty_in_transit !== undefined ? item.qty_in_transit : item.inTransit || 0), 0)
})

async function refreshStock() {
  await stockStore.fetchStockLevels(authStore.activeWarehouseId)
}

onMounted(async () => {
  await refreshStock()
})
</script>
