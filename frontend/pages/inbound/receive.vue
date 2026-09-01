<template>
  <div class="space-y-4">
    <!-- Feedback Alerts -->
    <div v-if="inboundStore.errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span>⚠ {{ inboundStore.errorMessage }}</span>
      <button type="button" @click="inboundStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="inboundStore.successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span>✓ {{ inboundStore.successMessage }}</span>
      <button type="button" @click="inboundStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- PO Header Info -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-sm transition-colors">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">PO-20260901-001</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">DOCK RECEIVING</span>
      </div>
      <h3 class="font-bold text-slate-900 dark:text-slate-100 text-sm">PT Agro Pangan Nusantara</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">Kargo: Gula Pasir Rafinasi (Bulky Jumbo Bag 1 Ton)</p>
    </div>

    <!-- Barcode Scanner Quick Box -->
    <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-sm transition-colors">
      <div class="flex items-center space-x-3">
        <span class="text-2xl">📷</span>
        <div>
          <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">Hardware / Camera Scanner</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ lastScanned || 'BULK-SUGAR-1T' }}</p>
        </div>
      </div>
      <button 
        type="button" 
        @click="simulateScan"
        class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition"
      >
        Tap Scan
      </button>
    </div>

    <!-- Jumbo Tally Counter (+ / -) -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-sm transition-colors">
      <div class="flex justify-between items-center">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Kuantitas Fisik Diterima</label>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Pesanan: 10 Unit</span>
      </div>
      <div class="flex items-center justify-between space-x-3">
        <button 
          type="button" 
          @click="decrementQty"
          class="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-2xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-300 dark:border-slate-700 shadow-sm transition"
        >
          -
        </button>
        <div class="flex-1 text-center py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span class="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{{ qty }}</span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Jumbo Bag (Ton)</span>
        </div>
        <button 
          type="button" 
          @click="incrementQty"
          class="w-14 h-14 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-2xl font-bold text-white flex items-center justify-center shadow-sm transition"
        >
          +
        </button>
      </div>
    </div>

    <!-- Truck & Driver Info -->
    <div class="grid grid-cols-2 gap-2.5">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Plat Nomor Truk</label>
        <input 
          v-model="truckPlate" 
          type="text" 
          placeholder="B 9876 XYZ"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Sopir Truk</label>
        <input 
          v-model="driverName" 
          type="text" 
          placeholder="Pak Supri"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- Officer Name -->
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Checker</label>
      <input 
        v-model="actorName" 
        type="text" 
        required 
        placeholder="Nama Petugas Gudang"
        class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="submitReceive"
      :disabled="inboundStore.isLoading"
      class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
    >
      <span>{{ inboundStore.isLoading ? 'Memproses...' : 'Konfirmasi Penerimaan Fisik' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useInboundStore } from '~/stores/inbound'
import { useAuthStore } from '~/stores/auth'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const inboundStore = useInboundStore()
const authStore = useAuthStore()

const qty = ref(10)
const truckPlate = ref('B 9876 XYZ')
const driverName = ref('Pak Supri')
const actorName = ref('Joko Checker')

const { lastScanned, playAudioFeedback } = useBarcodeScanner((code) => {
  qty.value++
  playAudioFeedback('SUCCESS')
})

function incrementQty() {
  qty.value++
  playAudioFeedback('SUCCESS')
}

function decrementQty() {
  if (qty.value > 0) {
    qty.value--
  }
}

function simulateScan() {
  qty.value++
  playAudioFeedback('SUCCESS')
}

async function submitReceive() {
  playAudioFeedback('SUCCESS')
  inboundStore.successMessage = `Penerimaan Fisik PO Berhasil (${qty.value} Unit). Checkpoint PO_RECEIVED tersimpan.`
}

onMounted(() => {
  if (authStore.user?.full_name) {
    actorName.value = authStore.user.full_name
  }
})
</script>
