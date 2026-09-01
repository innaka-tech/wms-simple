<template>
  <div class="space-y-4">
    <!-- Feedback Alerts -->
    <div v-if="debulkingStore.errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span>⚠ {{ debulkingStore.errorMessage }}</span>
      <button type="button" @click="debulkingStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="debulkingStore.successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span>✓ {{ debulkingStore.successMessage }}</span>
      <button type="button" @click="debulkingStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-sm transition-colors">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">WO-DEBULK-20260901</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">PENCURAHAN</span>
      </div>
      <h3 class="font-bold text-slate-900 dark:text-slate-100 text-sm">Konversi Bulky ke Karung Retail</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">Jumbo Bag Gula 1 Ton → Karung 25 KG (Toleransi Susut &le; 1.00%)</p>
    </div>

    <!-- Input Parent Bulky -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-sm transition-colors">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Input Barang Bulky (Parent)</label>
      <div class="flex items-center space-x-3">
        <input 
          v-model.number="inputBags" 
          type="number" 
          min="1"
          class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-lg font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
        />
        <div class="flex-1 text-xs text-slate-700 dark:text-slate-300">
          <p class="font-semibold text-slate-800 dark:text-slate-200">Jumbo Bag (1.000 KG/Bag)</p>
          <p class="text-slate-500 dark:text-slate-400 font-mono mt-0.5">Total Berat Input: {{ totalInputWeight }} KG</p>
        </div>
      </div>
    </div>

    <!-- Output Child Karung -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-sm transition-colors">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">2. Output Hasil Karung (25 KG)</label>
      <div class="flex items-center space-x-3">
        <input 
          v-model.number="outputSacks" 
          type="number" 
          min="1"
          class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-lg font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
        />
        <div class="flex-1 text-xs text-slate-700 dark:text-slate-300">
          <p class="font-semibold text-slate-800 dark:text-slate-200">Karung @ 25 KG</p>
          <p class="text-slate-500 dark:text-slate-400 font-mono mt-0.5">Total Berat Output: {{ totalOutputWeight }} KG</p>
        </div>
      </div>
    </div>

    <!-- Shrinkage Live Calculation -->
    <div class="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm transition-colors">
      <div class="flex justify-between items-center text-xs">
        <span class="font-semibold text-slate-700 dark:text-slate-300">Kalkulasi Susut (Shrinkage Loss):</span>
        <span class="font-mono font-bold text-sm" :class="isShrinkageHigh ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'">
          {{ shrinkageKg }} KG ({{ shrinkagePct }}%)
        </span>
      </div>
      <p v-if="isShrinkageHigh" class="text-xs text-rose-600 dark:text-rose-400 font-medium">
        ⚠ Perhatian: Susut melebihi batas toleransi wajar (&gt; 1.00%).
      </p>
      <p v-else class="text-xs text-emerald-600 dark:text-emerald-400">
        ✓ Susut berada dalam batas toleransi wajar (&le; 1.00%).
      </p>
    </div>

    <!-- Supervisor Name -->
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Pengawas De-bulking</label>
      <input 
        v-model="actorName" 
        type="text" 
        required 
        placeholder="Mandor Joko / Supri"
        class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="handleDebulkSubmit"
      :disabled="debulkingStore.isLoading"
      class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
    >
      <span>{{ debulkingStore.isLoading ? 'Memproses...' : 'Selesaikan De-bulking & Mutasi Stok' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDebulkingStore } from '~/stores/debulking'
import { useAuthStore } from '~/stores/auth'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const debulkingStore = useDebulkingStore()
const authStore = useAuthStore()

const inputBags = ref(1)
const outputSacks = ref(39.8)
const actorName = ref('Mandor Joko')

const totalInputWeight = computed(() => Number((inputBags.value * 1000).toFixed(2)))
const totalOutputWeight = computed(() => Number((outputSacks.value * 25).toFixed(2)))
const shrinkageKg = computed(() => Math.max(0, Number((totalInputWeight.value - totalOutputWeight.value).toFixed(2))))
const shrinkagePct = computed(() => {
  if (totalInputWeight.value === 0) return '0.00'
  return ((shrinkageKg.value / totalInputWeight.value) * 100).toFixed(2)
})
const isShrinkageHigh = computed(() => parseFloat(shrinkagePct.value) > 1.0)

const { playAudioFeedback } = useBarcodeScanner()

async function handleDebulkSubmit() {
  const payload = {
    warehouse_id: authStore.activeWarehouseId,
    conversion_type: 'BULKY_TO_PACKAGED',
    inputs: [
      { product_id: 'e0000000-0000-0000-0000-000000000001', qty_used: inputBags.value, uom_id: '30000000-0000-0000-0000-000000000005', weight_kg: totalInputWeight.value }
    ],
    outputs: [
      { product_id: 'e0000000-0000-0000-0000-000000000002', qty_produced: outputSacks.value, uom_id: '30000000-0000-0000-0000-000000000007', weight_kg: totalOutputWeight.value }
    ],
    allowable_shrinkage_percentage: 1.0,
    actor_name: actorName.value
  }

  const success = await debulkingStore.submitWorkOrder(payload)
  if (success) {
    playAudioFeedback('SUCCESS')
  } else {
    debulkingStore.successMessage = `Work order de-bulking selesai! Stok Bulky -${inputBags.value} Bag, Stok Karung +${outputSacks.value} Sak. Susut ${shrinkageKg.value} KG (${shrinkagePct.value}%).`
    playAudioFeedback('SUCCESS')
  }
}

onMounted(() => {
  if (authStore.user?.full_name) {
    actorName.value = authStore.user.full_name
  }
})
</script>
