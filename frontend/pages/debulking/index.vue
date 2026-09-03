<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="debulkingStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ debulkingStore.errorMessage }}</span>
      </div>
      <button type="button" @click="debulkingStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="debulkingStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ debulkingStore.successMessage }}</span>
      </div>
      <button type="button" @click="debulkingStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header & WO Info -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-2 transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center space-x-2">
          <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
            WO-DEBULK-20260901
          </span>
          <span class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            PENCURAHAN & REPACKING
          </span>
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Toleransi Susut: &le; 1.00%</span>
      </div>
      <div>
        <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">Konversi Kargo Bulky Parent ke Kemasan Retail</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Jumbo Bag Gula Pasir Rafinasi 1 Ton &rarr; Karung 25 KG (Double-Entry Stock Ledger Balancing)</p>
      </div>
    </div>

    <!-- 2-Column Responsive Input & Output Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      
      <!-- Input Parent Bulky (Left Card) -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Input Barang Bulky (Parent)</h4>
            <span class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">BULK-SUGAR-1T</span>
          </div>

          <div class="mt-4 flex items-center space-x-4">
            <div class="space-y-1">
              <label class="text-[11px] text-slate-400 font-semibold uppercase block">Jumlah Bag</label>
              <input 
                v-model.number="inputBags" 
                type="number" 
                min="1"
                class="w-28 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2.5 text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div class="flex-1 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">Jumbo Bag (@ 1.000 KG/Bag)</p>
              <p class="text-slate-500 dark:text-slate-400 font-mono mt-1 font-semibold">Total Berat Input: <span class="text-blue-600 dark:text-blue-400 font-bold text-sm">{{ totalInputWeight.toLocaleString() }} KG</span></p>
            </div>
          </div>
        </div>

        <div class="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5">
          <span>Mutasi Stok Parent:</span>
          <span class="text-rose-600 dark:text-rose-400 font-bold">-{{ inputBags }} Jumbo Bag</span>
        </div>
      </div>

      <!-- Output Child Karung (Right Card) -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Output Hasil Karung (Child)</h4>
            <span class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">SUGAR-SACK-25KG</span>
          </div>

          <div class="mt-4 flex items-center space-x-4">
            <div class="space-y-1">
              <label class="text-[11px] text-slate-400 font-semibold uppercase block">Jumlah Sak</label>
              <input 
                v-model.number="outputSacks" 
                type="number" 
                min="1"
                step="0.1"
                class="w-28 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2.5 text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div class="flex-1 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">Karung Retail (@ 25 KG/Sak)</p>
              <p class="text-slate-500 dark:text-slate-400 font-mono mt-1 font-semibold">Total Berat Output: <span class="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{{ totalOutputWeight.toLocaleString() }} KG</span></p>
            </div>
          </div>
        </div>

        <div class="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5">
          <span>Mutasi Stok Child:</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-bold">+{{ outputSacks }} Karung (25 KG)</span>
        </div>
      </div>
    </div>

    <!-- Shrinkage Live Calculation Card -->
    <div class="p-5 md:p-6 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Kalkulasi Susut Otomatis (Shrinkage Loss Formula):
        </span>
        <div class="flex items-center space-x-2 font-mono font-bold text-base md:text-lg" :class="isShrinkageHigh ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
          <span>Susut: {{ shrinkageKg }} KG</span>
          <span>({{ shrinkagePct }}%)</span>
        </div>
      </div>

      <div class="p-3 rounded-xl flex items-center space-x-2.5 text-xs font-medium" :class="isShrinkageHigh ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'">
        <AppIcon :name="isShrinkageHigh ? 'alert' : 'check'" custom-class="w-4 h-4 shrink-0" />
        <span>{{ isShrinkageHigh ? 'Peringatan: Susut melebihi batas toleransi wajar (> 1.00%). Memerlukan persetujuan khusus Kepala Gudang.' : 'Susut berada dalam batas toleransi wajar (≤ 1.00%). Sesuai standar ISO pergudangan.' }}</span>
      </div>
    </div>

    <!-- Supervisor Name & Action -->
    <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 transition-colors">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Pengawas De-bulking (Wajib Sesuai Audit)</label>
        <input 
          v-model="actorName" 
          type="text" 
          required 
          placeholder="Contoh: Mandor Joko / Supri"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
        />
      </div>

      <!-- Submit Button -->
      <button 
        type="button" 
        @click="handleDebulkSubmit" 
        :disabled="debulkingStore.isLoading" 
        class="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
      >
        <AppIcon name="debulking" custom-class="w-4 h-4" />
        <span>{{ debulkingStore.isLoading ? 'Memproses...' : 'Selesaikan De-bulking & Rekam Mutasi Stok' }}</span>
      </button>
    </div>
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
