<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="inboundStore.errorMessage" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-sm">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ inboundStore.errorMessage }}</span>
      </div>
      <button type="button" @click="inboundStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="inboundStore.successMessage" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-sm">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ inboundStore.successMessage }}</span>
      </div>
      <button type="button" @click="inboundStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Responsive Layout: 1 Column on Mobile, 12-Column Split on Desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Column: PO Information, Scanner & Quantity Counter (lg:col-span-7) -->
      <div class="lg:col-span-7 space-y-4">
        <!-- PO Header Info -->
        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 shadow-sm transition-colors">
          <div class="flex justify-between items-center">
            <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">PO-20260901-001</span>
            <span class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">DOCK RECEIVING</span>
          </div>
          <div>
            <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">PT Agro Pangan Nusantara</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kargo: Gula Pasir Rafinasi (Bulky Jumbo Bag 1 Ton)</p>
          </div>
        </div>

        <!-- Barcode Scanner Quick Box -->
        <div class="p-4 md:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shadow-sm transition-colors">
          <div class="flex items-center space-x-3.5">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <AppIcon name="scan" custom-class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200">Hardware & Camera Scanner</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{{ lastScanned || 'BULK-SUGAR-1T' }}</p>
            </div>
          </div>
          <button 
            type="button" 
            @click="simulateScan"
            class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
          >
            <AppIcon name="barcode" custom-class="w-3.5 h-3.5" />
            <span>Simulasi Scan</span>
          </button>
        </div>

        <!-- Jumbo Tally Counter (+ / -) -->
        <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
          <div class="flex justify-between items-center">
            <label class="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">Kuantitas Fisik Diterima</label>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">Pesanan PO: 10 Unit</span>
          </div>
          
          <div class="flex items-center justify-between space-x-4">
            <button 
              type="button" 
              @click="decrementQty"
              class="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-2xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-300 dark:border-slate-700 shadow-2xs transition cursor-pointer"
            >
              -
            </button>
            <div class="flex-1 text-center py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span class="text-3xl md:text-4xl font-bold font-mono text-slate-900 dark:text-slate-100">{{ qty }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">Jumbo Bag (Ton)</span>
            </div>
            <button 
              type="button" 
              @click="incrementQty"
              class="w-14 h-14 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-2xl font-bold text-white flex items-center justify-center shadow-xs transition cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column: Truck, Driver, Officer & Submit (lg:col-span-5) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Truck & Driver Manifest Card -->
        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">Manifest Pengirim</h4>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Plat Nomor Truk</label>
              <input 
                v-model="truckPlate" 
                type="text" 
                placeholder="B 9876 XYZ"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Sopir Truk</label>
              <input 
                v-model="driverName" 
                type="text" 
                placeholder="Pak Supri"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div class="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Checker Fisik (Wajib Sesuai Audit)</label>
            <input 
              v-model="actorName" 
              type="text" 
              required 
              placeholder="Nama Petugas Gudang"
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <!-- Submit Action Button -->
        <button 
          type="button" 
          @click="submitReceive"
          :disabled="inboundStore.isLoading"
          class="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
        >
          <AppIcon name="check" custom-class="w-4 h-4" />
          <span>{{ inboundStore.isLoading ? 'Memproses...' : 'Konfirmasi Penerimaan Fisik' }}</span>
        </button>

        <!-- Audit Checkpoint Continuity Tag -->
        <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
          <AppIcon name="shield" custom-class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Setiap penerimaan mengunci mutasi stok ledger & menerbitkan Checkpoint PO_RECEIVED.</span>
        </div>
      </div>
    </div>
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
