<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-bold text-amber-400">WO-DEBULK-20260831</span>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300">PENCURAHAN</span>
      </div>
      <h3 class="font-bold text-white text-sm mt-0.5">Konversi Bulky ke Karung Retail</h3>
      <p class="text-[10px] text-slate-400">Jumbo Bag Gula 1 Ton → Karung 25 KG</p>
    </div>

    <!-- Input Parent Bulky -->
    <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <label class="text-[11px] font-bold text-slate-300 uppercase">1. Input Barang Bulky</label>
      <div class="flex items-center space-x-2">
        <input 
          v-model.number="inputBags" 
          type="number" 
          class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold text-amber-400 text-center"
        />
        <div class="flex-1 text-xs text-slate-300">
          <p class="font-bold">Jumbo Bag (1.000 KG/Bag)</p>
          <p class="text-slate-400 font-mono">Total Berat Input: {{ totalInputWeight }} KG</p>
        </div>
      </div>
    </div>

    <!-- Output Child Karung -->
    <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <label class="text-[11px] font-bold text-slate-300 uppercase">2. Output Hasil Karung (25 KG)</label>
      <div class="flex items-center space-x-2">
        <input 
          v-model.number="outputSacks" 
          type="number" 
          class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold text-emerald-400 text-center"
        />
        <div class="flex-1 text-xs text-slate-300">
          <p class="font-bold">Karung @ 25 KG</p>
          <p class="text-slate-400 font-mono">Total Berat Output: {{ totalOutputWeight }} KG</p>
        </div>
      </div>
    </div>

    <!-- Shrinkage Live Calculation -->
    <div class="p-3.5 rounded-xl border" :class="isShrinkageHigh ? 'bg-rose-950/40 border-rose-800' : 'bg-slate-950 border-slate-800'">
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold text-slate-300">Kalkulasi Susut (Shrinkage Loss):</span>
        <span class="font-mono font-black text-sm" :class="isShrinkageHigh ? 'text-rose-400' : 'text-slate-200'">
          {{ shrinkageKg }} KG ({{ shrinkagePct }}%)
        </span>
      </div>
      <p v-if="isShrinkageHigh" class="text-[11px] text-rose-400 font-semibold mt-1">
        ⚠ PERINGATAN: Susut melebihi toleransi maksimal 1.00%!
      </p>
      <p v-else class="text-[10px] text-emerald-400 mt-1">
        ✓ Susut berada dalam batas toleransi wajar (<= 1.00%).
      </p>
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="submitDebulk"
      class="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold rounded-2xl shadow-xl shadow-amber-900/40 active:scale-98 transition flex items-center justify-center space-x-2"
    >
      <span>⚖️ SELESAIKAN DE-BULKING & MUTASI STOK</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const inputBags = ref(1)
const outputSacks = ref(39)

const totalInputWeight = computed(() => inputBags.value * 1000)
const totalOutputWeight = computed(() => outputSacks.value * 25)
const shrinkageKg = computed(() => Math.max(0, totalInputWeight.value - totalOutputWeight.value))
const shrinkagePct = computed(() => {
  if (totalInputWeight.value === 0) return '0.00'
  return ((shrinkageKg.value / totalInputWeight.value) * 100).toFixed(2)
})
const isShrinkageHigh = computed(() => parseFloat(shrinkagePct.value) > 1.0)

function submitDebulk() {
  alert(`✅ Work Order De-bulking Selesai! Stok Bulky berkurang ${inputBags.value} Bag, Stok Karung bertambah ${outputSacks.value} Karung. Susut tercatat ${shrinkageKg.value} KG.`)
}
</script>
