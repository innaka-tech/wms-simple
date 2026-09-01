<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Saldo Stok Gudang</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Snapshot Real-time • {{ authStore.activeWarehouseName }}</p>
      </div>
      <button 
        type="button" 
        @click="refreshStock"
        class="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
      >
        <span>🔄</span>
        <span>Refresh</span>
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="stockStore.errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
      ⚠ {{ stockStore.errorMessage }}
    </div>

    <!-- Stock Cards (Mobile Friendly) -->
    <div v-if="stockStore.isLoading" class="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
      Memuat saldo stok dari host PostgreSQL...
    </div>

    <div v-else class="space-y-2.5">
      <div 
        v-for="item in stockDisplayList" 
        :key="item.id || item.sku"
        class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-sm transition-colors"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {{ item.sku_code || item.sku }}
            </span>
            <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1.5">{{ item.product_name || item.name }}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ item.unit || 'PCS' }} • Gudang: {{ item.warehouse_name || 'Main Hub' }}</p>
          </div>
          <span 
            class="text-[10px] font-semibold px-2 py-0.5 rounded border" 
            :class="item.is_low_stock ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'"
          >
            {{ item.is_low_stock ? 'MIN' : 'AMAN' }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">On-Hand</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_on_hand !== undefined ? item.qty_on_hand : item.onHand }}</p>
          </div>
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Reserved</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_reserved !== undefined ? item.qty_reserved : item.reserved }}</p>
          </div>
          <div class="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">In-Transit</p>
            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ item.qty_in_transit !== undefined ? item.qty_in_transit : item.inTransit }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStockStore } from '~/stores/stock'
import { useAuthStore } from '~/stores/auth'

const stockStore = useStockStore()
const authStore = useAuthStore()

const fallbackList = [
  { sku: 'BULK-SUGAR-1T', name: 'Gula Pasir Rafinasi Jumbo Bag 1 Ton (Bulky)', unit: 'JUMBO_BAG', onHand: '20', reserved: '0', inTransit: '0', is_low_stock: false },
  { sku: 'SUGAR-SACK-25KG', name: 'Gula Pasir Rafinasi Karung 25 KG (Retail)', unit: 'SACK', onHand: '200', reserved: '0', inTransit: '0', is_low_stock: false },
  { sku: 'KDMP-CHILLER-300L', name: 'Showcase Display Chiller 300L (KDMP)', unit: 'UNIT', onHand: '15', reserved: '2', inTransit: '5', is_low_stock: false },
  { sku: 'ELEC-TV-43', name: 'Smart LED TV 43 Inch FHD', unit: 'PCS', onHand: '120', reserved: '10', inTransit: '0', is_low_stock: false }
]

const stockDisplayList = computed(() => {
  if (stockStore.stockLevels.length > 0) {
    return stockStore.stockLevels
  }
  return fallbackList
})

async function refreshStock() {
  await stockStore.fetchStockLevels(authStore.activeWarehouseId)
}

onMounted(async () => {
  await refreshStock()
})
</script>
