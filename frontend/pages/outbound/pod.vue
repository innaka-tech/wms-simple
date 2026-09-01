<template>
  <div class="space-y-4">
    <!-- Feedback Alerts -->
    <div v-if="outboundStore.errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span>⚠ {{ outboundStore.errorMessage }}</span>
      <button type="button" @click="outboundStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="outboundStore.successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span>✓ {{ outboundStore.successMessage }}</span>
      <button type="button" @click="outboundStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-sm transition-colors">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">ORD-20260901-004</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">DRIVER POD</span>
      </div>
      <h3 class="font-bold text-slate-900 dark:text-slate-100 text-sm">Balai Desa Sukamaju (Program KDMP)</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">Penerima: Koperasi Desa • 2 Unit Showcase KDMP Chiller</p>
    </div>

    <!-- 1. Photo Capture -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-sm transition-colors">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Foto Serah Terima Fisik Barang di Balai Desa</label>
      <div class="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl text-center space-y-2">
        <span class="text-2xl block text-slate-400">📸</span>
        <p v-if="photoPreview" class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Foto Fisik Tersimpan Siap Dikirim</p>
        <button 
          type="button" 
          @click="takePhoto"
          class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition"
        >
          {{ photoPreview ? '✓ Foto Tersimpan (Ulangi)' : 'Ambil Foto Serah Terima' }}
        </button>
      </div>
    </div>

    <!-- 2. Signature Pad Component -->
    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-sm transition-colors">
      <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">2. Tanda Tangan Digital Penerima</label>
      <SignaturePad @update:signature="sig => signatureData = sig" />
      <div class="space-y-1.5 pt-1">
        <label class="text-xs text-slate-500 dark:text-slate-400 font-medium">Nama Jelas Penerima / Pengurus Koperasi:</label>
        <input 
          v-model="recipientName" 
          type="text" 
          required
          placeholder="Nama Kades / Pengurus KDMP"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="handleSubmitPod"
      :disabled="outboundStore.isLoading"
      class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
    >
      <span>{{ outboundStore.isLoading ? 'Mengirim...' : 'Kirim Bukti POD Selesai' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SignaturePad from '~/components/SignaturePad.vue'
import { useOutboundStore } from '~/stores/outbound'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const outboundStore = useOutboundStore()
const { playAudioFeedback } = useBarcodeScanner()

const photoPreview = ref(false)
const signatureData = ref('')
const recipientName = ref('I Made Sukarja (Ketua KDMP)')

function takePhoto() {
  photoPreview.value = true
  playAudioFeedback('SUCCESS')
}

async function handleSubmitPod() {
  if (!photoPreview.value) {
    outboundStore.errorMessage = 'Foto serah terima fisik barang wajib diambil terlebih dahulu!'
    playAudioFeedback('ERROR')
    return
  }

  playAudioFeedback('SUCCESS')
  outboundStore.successMessage = `POD Berhasil Dikirim! Diterima oleh ${recipientName.value}. Status Order menjadi DELIVERED & Siap Diverifikasi Admin.`
}
</script>
