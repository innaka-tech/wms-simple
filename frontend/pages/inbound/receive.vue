<template>
  <div class="space-y-4">
    <!-- PO Header Info -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-bold text-emerald-400">PO-20260831-001</span>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300">DOCK RECEIVING</span>
      </div>
      <h3 class="font-bold text-white text-sm">PT Agro Pangan Nusantara</h3>
      <p class="text-[10px] text-slate-400">Kargo: Gula Pasir Rafinasi (Bulky Jumbo Bag 1 Ton)</p>
    </div>

    <!-- Barcode Scanner Quick Box -->
    <div class="p-3 bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="text-2xl">📷</span>
        <div>
          <p class="text-xs font-bold text-white">Scan Barcode / QR Item</p>
          <p class="text-[10px] text-slate-400 font-mono">BULK-SUGAR-1T</p>
        </div>
      </div>
      <button 
        type="button" 
        @click="simulateScan"
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow"
      >
        TAP SCAN
      </button>
    </div>

    <!-- Jumbo Tally Counter (+ / -) -->
    <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
      <div class="flex justify-between items-center">
        <label class="text-xs font-bold text-slate-300 uppercase">Kuantitas Fisik Diterima</label>
        <span class="text-xs text-slate-400">Pesanan: 10 Unit</span>
      </div>
      <div class="flex items-center justify-between space-x-3">
        <button 
          type="button" 
          @click="qty > 0 ? qty-- : null"
          class="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-90 text-2xl font-black text-white flex items-center justify-center border border-slate-700 shadow-md"
        >
          -
        </button>
        <div class="flex-1 text-center py-2 bg-slate-900 border border-slate-800 rounded-xl">
          <span class="text-3xl font-black font-mono text-emerald-400">{{ qty }}</span>
          <span class="text-xs text-slate-400 block">Jumbo Bag (Ton)</span>
        </div>
        <button 
          type="button" 
          @click="qty++"
          class="w-16 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-2xl font-black text-white flex items-center justify-center shadow-lg shadow-emerald-900/50"
        >
          +
        </button>
      </div>
    </div>

    <!-- Officer Name -->
    <div class="space-y-1">
      <label class="text-[11px] font-bold text-slate-300 uppercase">Nama Petugas Pemeriksa</label>
      <input 
        v-model="actorName" 
        type="text" 
        required 
        placeholder="Nama Staff Gudang"
        class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
      />
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="submitReceive"
      class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-900/40 active:scale-98 transition flex items-center justify-center space-x-2"
    >
      <span>📦 KONFIRMASI PENERIMAAN FISIK</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const qty = ref(10)
const actorName = ref('Joko Susanto')

function simulateScan() {
  alert('Beep! 🔊 Barcode SKU BULK-SUGAR-1T berhasil dipindai.')
}

function submitReceive() {
  alert(`✅ Berhasil! Diterima ${qty.value} Jumbo Bag oleh ${actorName.value}. Stok staging bertambah & Checkpoint audit tercatat.`)
}
</script>
