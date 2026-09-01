<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl">
      <div class="flex justify-between items-center">
        <span class="text-xs font-mono font-bold text-rose-400">ORD-20260831-004</span>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300">DRIVER POD</span>
      </div>
      <h3 class="font-bold text-white text-sm mt-0.5">Toko Elektronik Bali Jaya</h3>
      <p class="text-[10px] text-slate-400">Jl. Gatot Subroto No. 45, Denpasar • 10 TV 43"</p>
    </div>

    <!-- 1. Photo Capture -->
    <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <label class="text-[11px] font-bold text-slate-300 uppercase">1. Foto Serah Terima Fisik Barang</label>
      <div class="p-4 border-2 border-dashed border-slate-700 bg-slate-900/60 rounded-xl text-center space-y-2">
        <span class="text-3xl block">📸</span>
        <button 
          type="button" 
          @click="takePhoto"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow"
        >
          {{ hasPhoto ? '✓ Foto Tersimpan (Ulangi)' : 'AMBIL FOTO SERAH TERIMA' }}
        </button>
      </div>
    </div>

    <!-- 2. Signature Pad Component -->
    <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <label class="text-[11px] font-bold text-slate-300 uppercase">2. Tanda Tangan Penerima</label>
      <SignaturePad @update:signature="sig => signatureData = sig" />
      <div class="space-y-1 pt-1">
        <label class="text-[10px] text-slate-400">Nama Jelas Penerima:</label>
        <input 
          v-model="recipientName" 
          type="text" 
          placeholder="Nama Penerima"
          class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>
    </div>

    <!-- Submit Button -->
    <button 
      type="button" 
      @click="submitPod"
      class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold rounded-2xl shadow-xl shadow-rose-900/40 active:scale-98 transition flex items-center justify-center space-x-2"
    >
      <span>✅ KIRIM BUKTI POD SELESAI</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SignaturePad from '~/components/SignaturePad.vue'

const hasPhoto = ref(false)
const signatureData = ref('')
const recipientName = ref('I Made Sukarja')

function takePhoto() {
  hasPhoto.value = true
  alert('📸 Kamera HP Aktif: Foto barang di depan toko berhasil diambil!')
}

function submitPod() {
  if (!hasPhoto.value) {
    alert('Harap ambil foto serah terima fisik terlebih dahulu!')
    return
  }
  alert(`✅ POD Berhasil Dikirim! Diterima oleh ${recipientName.value}. Status Order menjadi DELIVERED & Siap Diverifikasi Admin.`)
}
</script>
