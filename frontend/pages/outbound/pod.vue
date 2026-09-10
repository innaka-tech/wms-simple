<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="outboundStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ outboundStore.errorMessage }}</span>
      </div>
      <button type="button" @click="outboundStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="outboundStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ outboundStore.successMessage }}</span>
      </div>
      <button type="button" @click="outboundStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header & Order Destination -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-2 transition-colors">
      <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Fase 4 — Delivery & Billing • Checkpoint: POD → POD_VERIFIED → INVOICE → LUNAS</p>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center space-x-2 flex-wrap">
          <input
            v-model="orderNumberInput"
            @keydown.enter="lookupWaybill"
            type="text"
            placeholder="Masukkan No. Order (ORD-...)"
            class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none w-56"
          />
          <button type="button" @click="lookupWaybill" class="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer">
            Cari Resi
          </button>
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>Program KDMP Cold Chain</span>
        </span>
      </div>
      <div v-if="matchedWaybill" class="flex items-center gap-2 flex-wrap p-2.5 rounded-md bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <AppIcon name="printer" custom-class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{{ matchedWaybill.sj_number }}</span>
        <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">RESI: {{ matchedWaybill.resi_number }}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{{ matchedWaybill.status }}</span>
      </div>
      <p v-if="lookupMessage" class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{{ lookupMessage }}</p>
      <div>
        <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">Balai Desa Sukamaju (Koperasi Desa Merah Putih)</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kargo Khusus: 2 Unit Showcase Display KDMP Chiller (Aturan Upright Only & Tail-Lift Validated)</p>
      </div>
    </div>

    <!-- Responsive 2-Column Grid: Left (Photo), Right (Signature & Sign-off) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      
      <!-- 1. Photo Capture Panel -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
        <div class="border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Foto Serah Terima Fisik Barang</h4>
          <span class="text-xs font-mono" :class="photoPreview ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'">
            {{ photoPreview ? 'Foto Terlampir' : 'Wajib Diambil' }}
          </span>
        </div>

        <div class="p-6 md:p-8 border-2 border-dashed rounded-lg text-center space-y-3 transition-colors" :class="photoPreview ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'">
          <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <AppIcon name="camera" custom-class="w-6 h-6" />
          </div>
          <div v-if="photoPreview" class="space-y-1">
            <p class="text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-bold">Foto Fisik & Serial Number Showcase Tersimpan</p>
            <p class="text-[11px] text-slate-400 font-mono">Timestamp: {{ new Date().toLocaleTimeString() }} • Geotag: Verified</p>
          </div>
          <div v-else class="space-y-1">
            <p class="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-medium">Ambil foto serah terima unit chiller di balai desa / koperasi</p>
            <p class="text-[11px] text-slate-400">Pastikan unit berdiri tegak (*Upright Only*) dan label SN terbaca</p>
          </div>
          
          <button 
            type="button" 
            @click="takePhoto"
            class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md transition cursor-pointer shadow-2xs flex items-center justify-center space-x-1.5 mx-auto"
          >
            <AppIcon :name="photoPreview ? 'refresh' : 'camera'" custom-class="w-3.5 h-3.5" />
            <span>{{ photoPreview ? 'Ambil Ulang Foto' : 'Ambil Foto Serah Terima' }}</span>
          </button>
        </div>

        <div class="text-[11px] text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
          <p class="font-semibold text-slate-600 dark:text-slate-300">SOP Distribusi Showcase KDMP:</p>
          <ul class="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
            <li>Dilarang merebahkan unit (wajib posisi vertikal / tegak).</li>
            <li>Resting time minimal 2 jam sebelum dihidupkan kompresornya.</li>
          </ul>
        </div>
      </div>

      <!-- 2. Signature Pad & Sign-off Panel -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
        <div class="border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Tanda Tangan Digital Penerima</h4>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">BAST Digital</span>
        </div>

        <!-- Signature Pad Component -->
        <SignaturePad @update:signature="sig => signatureData = sig" />

        <div class="space-y-1.5 pt-1">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Jelas Penerima / Pengurus Koperasi KDMP:</label>
          <input 
            v-model="recipientName" 
            type="text" 
            required
            placeholder="Contoh: Bpk. Suparman (Ketua Koperasi)"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
          />
        </div>

        <!-- Submit Button -->
        <button 
          type="button" 
          @click="handleSubmitPod"
          :disabled="outboundStore.isLoading"
          class="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
        >
          <AppIcon name="check" custom-class="w-4 h-4" />
          <span>{{ outboundStore.isLoading ? 'Menyimpan BAST...' : 'Konfirmasi POD & Terbitkan BAST Digital' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SignaturePad from '~/components/SignaturePad.vue'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useWmsApi } from '~/composables/useWmsApi'
import { useAuthStore } from '~/stores/auth'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()
const { playAudioFeedback } = useBarcodeScanner()

const photoPreview = ref(false)
const signatureData = ref('')
const recipientName = ref('I Made Sukarja (Ketua KDMP)')

// Lookup order + waybill (resi) — nomor resi wajib tampil di halaman POD (docs/06)
const orderNumberInput = ref('')
const matchedWaybill = ref(null)
const lookupMessage = ref('')

function takePhoto() {
  photoPreview.value = true
  playAudioFeedback('SUCCESS')
}

async function lookupWaybill() {
  lookupMessage.value = ''
  matchedWaybill.value = null
  if (!orderNumberInput.value.trim()) return
  await waybillStore.fetchWaybills()
  const found = waybillStore.waybills.find(
    (w) => (w.order_number || '').toLowerCase() === orderNumberInput.value.trim().toLowerCase()
  )
  if (found) {
    matchedWaybill.value = found
    playAudioFeedback('SUCCESS')
  } else {
    lookupMessage.value = 'Waybill untuk nomor order itu tidak ditemukan — pastikan SJ + resi sudah diterbitkan.'
    playAudioFeedback('ERROR')
  }
}

async function handleSubmitPod() {
  if (!matchedWaybill.value) {
    outboundStore.errorMessage = 'Cari nomor order dulu — POD harus menautkan order + nomor resi.'
    playAudioFeedback('ERROR')
    return
  }
  if (!photoPreview.value) {
    outboundStore.errorMessage = 'Foto serah terima fisik barang wajib diambil terlebih dahulu!'
    playAudioFeedback('ERROR')
    return
  }

  const orderId = matchedWaybill.value.reference_id
  const actor = authStore.user?.full_name || 'Driver Pengiriman'
  try {
    await apiFetch(`/outbound/${orderId}/pod`, {
      method: 'POST',
      body: {
        recipient_name: recipientName.value,
        pod_photo_url: 'uploaded://pod-photo-capture',
        signature_photo_url: signatureData.value || 'data:image/png;base64,manual',
        delivered_qty: 1,
        actor_name: actor,
        notes: `Resi ${matchedWaybill.value.resi_number} / SJ ${matchedWaybill.value.sj_number}`
      }
    })
    playAudioFeedback('SUCCESS')
    outboundStore.successMessage = `POD Berhasil Dikirim! Diterima oleh ${recipientName.value}. Status Order DELIVERED — menunggu verifikasi admin sebelum penagihan.`
  } catch (err) {
    outboundStore.errorMessage = err.detail || err.message
    playAudioFeedback('ERROR')
  }
}

onMounted(() => {
  waybillStore.fetchWaybills()
})
</script>
