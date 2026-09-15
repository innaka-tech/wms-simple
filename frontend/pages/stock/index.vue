<template>
  <div class="space-y-6">
    <!-- Header & Top Bar -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Monitoring • Ledger: setiap mutasi tercatat double-entry</p>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="stock" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Stock on Hand</span>
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

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        @click="activeTab = 'balance'"
        class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition"
        :class="activeTab === 'balance'
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        Saldo Stok (Stock on Hand)
      </button>
      <button
        @click="switchLedgerTab"
        class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition"
        :class="activeTab === 'ledger'
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        Buku Besar Mutasi (Audit Ledger)
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="stockStore.errorMessage" class="p-4 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2">
      <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
      <span>{{ stockStore.errorMessage }}</span>
    </div>

    <!-- ═══ TAB 1: SALDO STOK (BALANCE) ═══ -->
    <template v-if="activeTab === 'balance'">
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
          <p class="text-[10px] uppercase font-semibold text-slate-400">Qty Reserved</p>
          <p class="text-xl md:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{{ totalReserved }} <span class="text-xs font-normal text-slate-400">Unit</span></p>
        </div>
        <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p class="text-[10px] uppercase font-semibold text-slate-400">Qty In-Transit</p>
          <p class="text-xl md:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{{ totalInTransit }} <span class="text-xs font-normal text-slate-400">Unit</span></p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="stockStore.isLoading" class="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
        <div class="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
        Memuat saldo stok dari database...
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredList.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <AppIcon name="stock" custom-class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
        <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">{{ searchQuery ? 'Tidak ada SKU yang cocok dengan pencarian.' : 'Belum ada stok tercatat di gudang ini.' }}</p>
        <p class="text-[11px] text-slate-400 mt-1">{{ searchQuery ? 'Coba kata kunci lain.' : 'Stok muncul otomatis setelah proses Receiving & Putaway selesai.' }}</p>
      </div>

      <!-- DESKTOP TABLE VIEW -->
      <div v-else class="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th class="py-3.5 px-4">Kode SKU</th>
              <th class="py-3.5 px-4">Nama Item / Spesifikasi</th>
              <th class="py-3.5 px-4">UoM</th>
              <th class="py-3.5 px-4 text-right">On-Hand</th>
              <th class="py-3.5 px-4 text-right">Reserved</th>
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
                  {{ item.is_low_stock ? 'BELOW MIN' : 'AVAILABLE' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE CARD VIEW -->
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
              {{ item.is_low_stock ? 'LOW' : 'OK' }}
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
    </template>

    <!-- ═══ TAB 2: BUKU BESAR MUTASI (AUDIT LEDGER) ═══ -->
    <template v-else-if="activeTab === 'ledger'">
      <div v-if="loadingMovements" class="p-12 text-center text-xs text-slate-400">
        Memuat buku besar mutasi stok...
      </div>

      <div v-else-if="movements.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada catatan mutasi stok di buku besar.</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <th class="py-3 px-4">Waktu</th>
                <th class="py-3 px-4">Tipe Mutasi</th>
                <th class="py-3 px-4">SKU / Nama Barang</th>
                <th class="py-3 px-4 text-right">Perubahan Qty</th>
                <th class="py-3 px-4 text-right">Saldo (Awal → Akhir)</th>
                <th class="py-3 px-4">Referensi</th>
                <th class="py-3 px-4">Petugas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="m in movements" :key="m.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td class="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {{ m.created_at?.slice(0, 19).replace('T', ' ') }}
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="getMovementClass(m.movement_type)">
                    {{ m.movement_type }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ m.sku_code }}</span>
                  <div class="text-[11px] text-slate-400">{{ m.product_name }}</div>
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-sm" :class="m.qty_change > 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ m.qty_change > 0 ? '+' : '' }}{{ m.qty_change }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                  {{ m.qty_before }} → <span class="font-bold text-slate-800 dark:text-slate-200">{{ m.qty_after }}</span>
                </td>
                <td class="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  <div class="font-bold">{{ m.reference_type }}</div>
                  <div class="text-[10px] text-slate-400 truncate max-w-xs">{{ m.reference_id }}</div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ m.performed_by_name }}</div>
                  <div v-if="m.notes" class="text-[10px] text-slate-400 italic">{{ m.notes }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStockStore } from '~/stores/stock'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'

const stockStore = useStockStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()

const activeTab = ref('balance')
const searchQuery = ref('')
const movements = ref([])
const loadingMovements = ref(false)

const rawList = computed(() => stockStore.stockLevels || [])

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

function getMovementClass(type) {
  if (type.includes('INBOUND') || type.includes('RELEASE') || type.includes('OUTPUT')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
  }
  if (type.includes('SHIP') || type.includes('HOLD') || type.includes('INPUT')) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
  }
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
}

async function refreshStock() {
  await stockStore.fetchStockLevels(authStore.activeWarehouseId)
  if (activeTab.value === 'ledger') {
    await loadMovements()
  }
}

async function loadMovements() {
  loadingMovements.value = true
  try {
    const url = authStore.activeWarehouseId 
      ? `/stock/movements?warehouse_id=${authStore.activeWarehouseId}` 
      : '/stock/movements'
    const res = await apiFetch(url)
    if (res.success) {
      movements.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    loadingMovements.value = false
  }
}

async function switchLedgerTab() {
  activeTab.value = 'ledger'
  await loadMovements()
}

onMounted(async () => {
  await refreshStock()
})
</script>
