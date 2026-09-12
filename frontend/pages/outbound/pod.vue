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
            Cari SJ / Resi
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
      <div v-if="matchedOrder" class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] text-slate-500 dark:text-slate-400">Order</span>
        <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ matchedOrder.order_number }}</span>
        <span class="text-[11px] text-slate-500">{{ matchedOrder.customer_name }}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border" :class="orderStatusTone(matchedOrder.status)">{{ matchedOrder.status }}</span>
      </div>
      <div>
        <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">Balai Desa Sukamaju (Koperasi Desa Merah Putih)</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kargo Khusus: 2 Unit Showcase Display KDMP Chiller (Aturan Upright Only & Tail-Lift Validated)</p>
      </div>
    </div>

    <!-- Panel Verifikasi Admin (ACC / Tolak POD) -->
    <div v-if="matchedOrder && matchedOrder.pod" class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verifikasi Admin — BAST Digital</h4>
          <p class="text-[11px] text-slate-400 mt-0.5">POD harus di-ACC sebelum order masuk daftar penagihan (billing_ready).</p>
        </div>
        <span v-if="matchedOrder.pod.status === 'ACCEPTED' && matchedOrder.status === 'POD_VERIFIED'"
              class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 w-fit">
          TERVERIFIKASI — SIAP DITAGIH
        </span>
        <span v-else-if="matchedOrder.status === 'CANCELLED'"
              class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 w-fit">
          DITOLAK — ORDER DIBATALKAN
        </span>
        <span v-else-if="matchedOrder.status === 'DELIVERED'"
              class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 w-fit">
          MENUNGGU VERIFIKASI
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Bukti Foto</p>
          <img v-if="matchedOrder.pod.pod_photo_url" :src="matchedOrder.pod.pod_photo_url" alt="Bukti foto serah terima" class="w-full max-h-44 object-cover rounded-md border border-slate-200 dark:border-slate-700" />
          <p v-else class="text-xs text-slate-400">Tidak ada foto terlampir.</p>
        </div>
        <div class="space-y-1.5">
          <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tanda Tangan Penerima</p>
          <img v-if="matchedOrder.pod.signature_photo_url" :src="matchedOrder.pod.signature_photo_url" alt="Tanda tangan digital penerima" class="w-full max-h-44 object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-white" />
          <p v-else class="text-xs text-slate-400">Tidak ada tanda tangan terlampir.</p>
        </div>
        <div class="space-y-2 text-xs">
          <div>
            <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Penerima (Consignee)</p>
            <p class="font-bold text-slate-900 dark:text-white">{{ matchedOrder.pod.recipient_name }}</p>
          </div>
          <div>
            <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Qty Diterima</p>
            <p class="font-mono font-bold text-slate-900 dark:text-white">{{ matchedOrder.pod.delivered_qty }}</p>
          </div>
          <div v-if="matchedOrder.pod.verified_by_name">
            <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Diverifikasi Oleh</p>
            <p class="font-bold text-slate-900 dark:text-white">{{ matchedOrder.pod.verified_by_name }}</p>
            <p v-if="matchedOrder.pod.rejection_reason" class="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Alasan: {{ matchedOrder.pod.rejection_reason }}</p>
          </div>
        </div>
      </div>

      <div v-if="matchedOrder.status === 'DELIVERED'" class="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label class="block space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Admin Verifikator (wajib)</span>
          <input v-model="verifierName" type="text" :placeholder="authStore.user?.full_name || 'Nama admin'"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label v-if="showRejectInput" class="block space-y-1">
          <span class="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Alasan Penolakan (wajib, maks 500 karakter)</span>
          <textarea v-model="rejectionReason" rows="2" maxlength="500" placeholder="Contoh: foto tidak jelas, qty fisik kurang dari surat jalan…"
                    class="w-full bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"></textarea>
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <button type="button" :disabled="outboundStore.isLoading" @click="handleVerify('ACCEPTED')"
                  class="flex-1 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5">
            <AppIcon name="check" custom-class="w-3.5 h-3.5" />
            <span>ACC POD (POD_VERIFIED)</span>
          </button>
          <button v-if="!showRejectInput" type="button" @click="showRejectInput = true"
                  class="flex-1 py-2.5 rounded-md border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition cursor-pointer">
            Tolak POD
          </button>
          <button v-else type="button" :disabled="outboundStore.isLoading" @click="handleVerify('REJECTED')"
                  class="flex-1 py-2.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
            Konfirmasi Penolakan (CANCELLED)
          </button>
        </div>
      </div>
    </div>

    <!-- Responsive 2-Column Grid: Left (Photo), Right (Signature & Sign-off) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      
      <!-- 1. Photo Capture Panel -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
        <div class="border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Bukti Foto Serah Terima (Proof of Delivery)</h4>
          <span class="text-xs font-mono" :class="photoDataUrl ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'">
            {{ photoDataUrl ? 'Foto Terlampir' : 'Wajib Diambil' }}
          </span>
        </div>

        <div class="p-6 md:p-8 border-2 border-dashed rounded-lg text-center space-y-3 transition-colors" :class="photoDataUrl ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'">
          <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <AppIcon name="camera" custom-class="w-6 h-6" />
          </div>
          <img v-if="photoDataUrl" :src="photoDataUrl" alt="Bukti foto serah terima" class="max-h-56 mx-auto rounded-md border border-slate-200 dark:border-slate-700" />
          <div v-if="photoDataUrl" class="space-y-1">
            <p class="text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-bold">Foto Bukti Serah Terima Tersimpan</p>
            <p class="text-[11px] text-slate-400 font-mono">Timestamp: {{ photoTakenAt }}</p>
          </div>
          <div v-else class="space-y-1">
            <p class="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-medium">Ambil foto serah terima barang bersama penerima</p>
            <p class="text-[11px] text-slate-400">Pastikan barang & label terlihat jelas dalam frame</p>
          </div>

          <input ref="photoInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onPhotoCaptured" />
          <button 
            type="button" 
            @click="$refs.photoInput.click()"
            class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md transition cursor-pointer shadow-2xs flex items-center justify-center space-x-1.5 mx-auto"
          >
            <AppIcon :name="photoDataUrl ? 'refresh' : 'camera'" custom-class="w-3.5 h-3.5" />
            <span>{{ photoDataUrl ? 'Ambil Ulang Foto' : 'Ambil Foto Serah Terima' }}</span>
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
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Tanda Tangan Digital Penerima (e-POD)</h4>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">BAST Digital</span>
        </div>

        <!-- Signature Pad Component -->
        <SignaturePad @update:signature="sig => signatureData = sig" />

        <div class="space-y-1.5 pt-1">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Penerima (Consignee):</label>
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
          <span>{{ outboundStore.isLoading ? 'Menyimpan BAST...' : 'Submit POD & Terbitkan BAST Digital' }}</span>
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

const photoInput = ref(null)
const photoDataUrl = ref('')
const photoTakenAt = ref('')
const signatureData = ref('')
const recipientName = ref('')

// Foto kamera/file → base64 (dikompres biar payload ringan)
function onPhotoCaptured(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const maxW = 900
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      photoDataUrl.value = canvas.toDataURL('image/jpeg', 0.75)
      photoTakenAt.value = new Date().toLocaleString('id-ID')
      playAudioFeedback('SUCCESS')
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

// Lookup order + waybill (resi) — nomor resi wajib tampil di halaman POD (docs/06)
const orderNumberInput = ref('')
const matchedWaybill = ref(null)
const matchedOrder = ref(null)
const lookupMessage = ref('')
const verifierName = ref('')
const showRejectInput = ref(false)
const rejectionReason = ref('')

function orderStatusTone(s) {
  return {
    CREATED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    PICKED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    PACKED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    SHIPPED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    DELIVERED: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    POD_VERIFIED: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    CANCELLED: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
  }[s] || 'bg-slate-100 text-slate-600 border-slate-200'
}

async function lookupWaybill() {
  lookupMessage.value = ''
  matchedWaybill.value = null
  matchedOrder.value = null
  showRejectInput.value = false
  rejectionReason.value = ''
  if (!orderNumberInput.value.trim()) return
  await waybillStore.fetchWaybills()
  const found = waybillStore.waybills.find(
    (w) => (w.order_number || '').toLowerCase() === orderNumberInput.value.trim().toLowerCase()
  )
  if (found) {
    matchedWaybill.value = found
    playAudioFeedback('SUCCESS')
    try {
      const res = await apiFetch(`/outbound/${found.reference_id}`)
      if (res.success) matchedOrder.value = res.data
    } catch { /* panel verifikasi cukup tersembunyi bila detail gagal dimuat */ }
  } else {
    lookupMessage.value = 'Surat Jalan untuk nomor order itu tidak ditemukan — pastikan SJ + resi sudah terbit.'
    playAudioFeedback('ERROR')
  }
}

async function handleVerify(decision) {
  if (!matchedOrder.value) return
  if (!verifierName.value.trim()) {
    outboundStore.errorMessage = 'Nama admin verifikator wajib diisi (audit trail).'
    playAudioFeedback('ERROR')
    return
  }
  if (decision === 'REJECTED' && !rejectionReason.value.trim()) {
    outboundStore.errorMessage = 'Alasan penolakan wajib diisi.'
    playAudioFeedback('ERROR')
    return
  }
  try {
    await apiFetch(`/outbound/${matchedOrder.value.id}/verify-pod`, {
      method: 'POST',
      body: {
        status: decision,
        rejection_reason: decision === 'REJECTED' ? rejectionReason.value.trim() : undefined,
        actor_name: verifierName.value.trim()
      }
    })
    playAudioFeedback('SUCCESS')
    const res = await apiFetch(`/outbound/${matchedOrder.value.id}`)
    if (res.success) matchedOrder.value = res.data
    showRejectInput.value = false
    rejectionReason.value = ''
  } catch (err) {
    outboundStore.errorMessage = err.detail || err.message
    playAudioFeedback('ERROR')
  }
}

async function handleSubmitPod() {
  if (!matchedWaybill.value) {
    outboundStore.errorMessage = 'Cari nomor order dulu — POD harus menautkan order + nomor resi.'
    playAudioFeedback('ERROR')
    return
  }
  if (!photoDataUrl.value) {
    outboundStore.errorMessage = 'Foto serah terima fisik barang wajib diambil terlebih dahulu!'
    playAudioFeedback('ERROR')
    return
  }
  if (!signatureData.value) {
    outboundStore.errorMessage = 'Tanda tangan penerima wajib — minta penerima tanda tangan di kotak e-POD.'
    playAudioFeedback('ERROR')
    return
  }
  if (!recipientName.value.trim()) {
    outboundStore.errorMessage = 'Nama penerima (consignee) wajib diisi.'
    playAudioFeedback('ERROR')
    return
  }

  const orderId = matchedWaybill.value.reference_id
  const actor = authStore.user?.full_name || 'Driver Pengiriman'
  try {
    await apiFetch(`/outbound/${orderId}/pod`, {
      method: 'POST',
      body: {
        recipient_name: recipientName.value.trim(),
        pod_photo_url: photoDataUrl.value,
        signature_photo_url: signatureData.value,
        delivered_qty: 1,
        actor_name: actor,
        notes: `Resi ${matchedWaybill.value.resi_number} / SJ ${matchedWaybill.value.sj_number} • Foto ${photoTakenAt.value}`
      }
    })
    playAudioFeedback('SUCCESS')
    outboundStore.successMessage = `POD Berhasil Dikirim! Diterima oleh ${recipientName.value}. Status Order DELIVERED — menunggu verifikasi admin sebelum penagihan.`
    photoDataUrl.value = ''
    signatureData.value = ''
  } catch (err) {
    outboundStore.errorMessage = err.detail || err.message
    playAudioFeedback('ERROR')
  }
}

onMounted(() => {
  waybillStore.fetchWaybills()
})
</script>
