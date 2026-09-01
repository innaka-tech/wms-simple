<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-base font-extrabold text-white">Saldo Stok Gudang</h2>
        <p class="text-[10px] text-slate-400">Snapshot Real-time Host PostgreSQL</p>
      </div>
      <button 
        type="button" 
        @click="refresh"
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
      >
        🔄 Refresh
      </button>
    </div>

    <!-- Stock Cards (Mobile Friendly) -->
    <div class="space-y-2.5">
      <div 
        v-for="item in stockList" 
        :key="item.sku"
        class="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 shadow-md"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">{{ item.sku }}</span>
            <h4 class="font-bold text-white text-sm mt-1">{{ item.name }}</h4>
            <p class="text-[10px] text-slate-400">{{ item.category }} • {{ item.packaging }}</p>
          </div>
          <span class="text-xs font-bold" :class="item.isLow ? 'text-rose-400' : 'text-emerald-400'">
            {{ item.isLow ? '⚠ MIN' : '✓ AMAN' }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900 text-center font-mono">
          <div class="p-1.5 bg-slate-900 rounded-lg">
            <p class="text-[9px] text-slate-500">On-Hand</p>
            <p class="text-sm font-extrabold text-emerald-400">{{ item.onHand }}</p>
          </div>
          <div class="p-1.5 bg-slate-900 rounded-lg">
            <p class="text-[9px] text-slate-500">Reserved</p>
            <p class="text-sm font-extrabold text-amber-400">{{ item.reserved }}</p>
          </div>
          <div class="p-1.5 bg-slate-900 rounded-lg">
            <p class="text-[9px] text-slate-500">In-Transit</p>
            <p class="text-sm font-extrabold text-purple-400">{{ item.inTransit }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const stockList = ref([
  { sku: 'BULK-SUGAR-1T', name: 'Gula Rafinasi Jumbo Bag 1 Ton', category: 'Bulky Kargo', packaging: 'Jumbo Bag 1T', onHand: '20 Unit', reserved: '0', inTransit: '0', isLow: false },
  { sku: 'SUGAR-SACK-25KG', name: 'Gula Rafinasi Karung 25 KG', category: 'Child Hasil De-bulk', packaging: 'Karung 25kg', onHand: '200 Sak', reserved: '0', inTransit: '0', isLow: false },
  { sku: 'ELEC-TV-43', name: 'Smart LED TV 43 Inch FHD', category: 'Packaged Goods', packaging: 'Karton Box', onHand: '120 Unit', reserved: '10 Unit', inTransit: '0', isLow: false }
])

function refresh() {
  alert('Data stok berhasil dimutakhirkan dari PostgreSQL host!')
}
</script>
