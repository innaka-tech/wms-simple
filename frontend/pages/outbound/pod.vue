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
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3 transition-colors">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 mb-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            <span>Fase 4 — Delivery & Billing • Checkpoint POD → POD_VERIFIED</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/60 shadow-xs">
              <AppIcon name="check" custom-class="w-4 h-4" />
            </div>
            <span>Elektronik Proof of Delivery (e-POD)</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Verifikasi serah terima fisik kargo di lokasi customer dengan bukti foto dan tanda tangan digital.</p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="orderNumberInput"
            @keydown.enter="lookupWaybill"
            type="text"
            placeholder="Masukkan No. Order (ORD-...)"
            class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none w-56 shadow-xs"
          />
          <button type="button" @click="lookupWaybill" class="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs">
            Cari SJ / Resi
          </button>
        </div>
      </div>
      <div v-if="matchedWaybill" class="flex items-center gap-2 flex-wrap p-2.5 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60">
        <AppIcon name="printer" custom-class="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <span class="text-xs font-mono font-bold text-sky-700 dark:text-sky-300">{{ matchedWaybill.sj_number }}</span>
        <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">RESI: {{ matchedWaybill.resi_number }}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{{ matchedWaybill.status }}</span>
      </div>
      <p v-if="lookupMessage" class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{{ lookupMessage }}</p>
      <div v-if="matchedOrder" class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] text-slate-500 dark:text-slate-400">Order</span>
        <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ matchedOrder.order_number }}</span>
        <span class="text-[11px] text-slate-500">{{ matchedOrder.customer_name }}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border" :class="orderStatusTone(matchedOrder.status)">{{ matchedOrder.status }}</span>
      </div>
      <div v-if="matchedOrder" class="pt-2 border-t border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">
          {{ matchedOrder.recipient_name }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tujuan: {{ matchedOrder.destination_address }}<span v-if="matchedOrder.destination_city">, {{ matchedOrder.destination_city }}</span>
          <span v-if="orderItemsSummary"> · Kargo: {{ orderItemsSummary }}</span>
        </p>
        <div v-if="isKdmpColdChain" class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>Program Khusus KDMP Cold Chain (Aturan Upright Only &amp; Tail-Lift Validated)</span>
        </div>
      </div>
      <div v-else class="pt-1">
        <p class="text-xs text-slate-400 italic">Cari nomor order di atas untuk memuat rincian serah terima barang (e-POD).</p>
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
        <div v-if="showRejectInput" class="space-y-2">
          <label class="block space-y-1">
            <span class="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Alasan Penolakan (wajib, maks 500 karakter)</span>
            <textarea v-model="rejectionReason" rows="2" maxlength="500" placeholder="Contoh: barang rusak fisik, foto tidak jelas, toko tutup…"
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"></textarea>
          </label>
          <div class="space-y-1">
            <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Tindakan Alokasi Fisik Barang:</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label class="flex items-center gap-2 p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition">
                <input type="radio" v-model="rejectionDisposition" value="RESTOCK" class="text-rose-600" />
                <div>
                  <span class="font-semibold block text-slate-800 dark:text-slate-200">Restock ke Gudang</span>
                  <span class="text-[10px] text-slate-400 block">Barang utuh kembali ke on_hand</span>
                </div>
              </label>
              <label class="flex items-center gap-2 p-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition">
                <input type="radio" v-model="rejectionDisposition" value="QUARANTINE" class="text-amber-600" />
                <div>
                  <span class="font-semibold block text-amber-800 dark:text-amber-200">Isolasi Karantina (QC)</span>
                  <span class="text-[10px] text-amber-600 dark:text-amber-400 block">Barang rusak/cacat perlu periksa</span>
                </div>
              </label>
            </div>
          </div>
        </div>
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
            :disabled="!matchedOrder"
            @click="$refs.photoInput.click()"
            class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md transition cursor-pointer shadow-2xs flex items-center justify-center space-x-1.5 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AppIcon :name="photoDataUrl ? 'refresh' : 'camera'" custom-class="w-3.5 h-3.5" />
            <span>{{ !matchedOrder ? 'Cari Nomor Order Terlebih Dahulu' : (photoDataUrl ? 'Ambil Ulang Foto' : 'Ambil Foto Serah Terima') }}</span>
          </button>
        </div>

        <div v-if="isKdmpColdChain" class="text-[11px] text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
          <p class="font-semibold text-slate-600 dark:text-slate-300">SOP Distribusi Showcase KDMP:</p>
          <ul class="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
            <li>Dilarang merebahkan unit (wajib posisi vertikal / tegak).</li>
            <li>Resting time minimal 2 jam sebelum dihidupkan kompresornya.</li>
          </ul>
        </div>
        <div v-else class="text-[11px] text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
          <p class="font-semibold text-slate-600 dark:text-slate-300">SOP Serah Terima Pengiriman:</p>
          <ul class="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
            <li>Pastikan koli/kemasan utuh dan segel pengaman tidak rusak.</li>
            <li>Cek kesesuaian fisik kargo dengan Surat Jalan dan Nomor Resi resmi.</li>
          </ul>
        </div>
      </div>

      <!-- 2. Signature Pad & Sign-off Panel -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
        <div class="border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Bukti &amp; Tanda Tangan Serah Terima (e-POD)</h4>
          <span class="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">BAST Digital</span>
        </div>

        <!-- Mode Pemenuhan BAST -->
        <div class="flex gap-4 items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-md border border-slate-200 dark:border-slate-800" :class="{ 'opacity-60': !matchedOrder }">
          <label class="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input type="radio" value="SIGNATURE" v-model="proofMethod" :disabled="!matchedOrder" class="text-slate-900 dark:text-slate-100" />
            <span>Tanda Tangan Kanvas Digital</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input type="radio" value="REPRESENTATIVE" v-model="proofMethod" :disabled="!matchedOrder" class="text-slate-900 dark:text-slate-100" />
            <span>Diwakilkan / Pos Satpam / Stempel Toko</span>
          </label>
        </div>

        <!-- Signature Pad Component -->
        <div v-if="proofMethod === 'SIGNATURE'">
          <SignaturePad @update:signature="sig => signatureData = sig" />
        </div>
        <div v-else class="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-md text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p class="font-semibold flex items-center space-x-1.5">
            <AppIcon name="check-circle" custom-class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Metode Serah Terima: Diwakilkan / Pos Keamanan</span>
          </p>
          <p class="text-[11px] text-blue-700 dark:text-blue-400">
            Tanda tangan kanvas tidak diwajibkan. Pastikan foto fisik barang pada langkah 1 memuat foto stempel basah penerima, foto kartu identitas (KTP/ID Badge), atau nota tanda terima fisik perwakilan.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Penerima / Perwakilan:</label>
            <input 
              v-model="recipientName" 
              type="text" 
              :disabled="!matchedOrder"
              required
              :placeholder="!matchedOrder ? 'Cari order terlebih dahulu' : 'Contoh: Bpk. Suparman / Satpam Pos 1'"
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Qty Diterima Fisik:</span>
                <span v-if="matchedOrder && !hasDiscrepancy" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800">
                  <AppIcon name="lock" custom-class="w-2.5 h-2.5" /> Sesuai SJ
                </span>
                <span v-else-if="matchedOrder && hasDiscrepancy" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded border border-amber-200 dark:border-amber-800">
                  Mode Selisih Aktif
                </span>
              </label>
              <span v-if="orderTotalQty" class="text-[10px] text-slate-400 font-mono">Max Order: {{ orderTotalQty }}</span>
            </div>
            <div class="relative">
              <input 
                v-model.number="deliveredQtyInput" 
                type="number" 
                min="1"
                :max="orderTotalQty || undefined"
                :readonly="!hasDiscrepancy || !matchedOrder"
                :disabled="!matchedOrder"
                required
                :placeholder="!matchedOrder ? 'Cari order dulu...' : 'Qty fisik diterima'"
                :class="[
                  'w-full rounded-md px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none transition',
                  !matchedOrder 
                    ? 'bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                    : !hasDiscrepancy 
                      ? 'bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed select-none' 
                      : 'bg-amber-50/50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 focus:border-amber-500'
                ]"
              />
              <div v-if="matchedOrder && !hasDiscrepancy" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs flex items-center gap-1 pointer-events-none">
                <AppIcon name="lock" custom-class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[10px] font-medium hidden sm:inline text-slate-400">Terkunci</span>
              </div>
            </div>
            <p v-if="!matchedOrder" class="text-[11px] text-slate-400 italic">
              Nomor order belum dimuat. Cari No. Order / SJ pada pencarian di atas.
            </p>
            <p v-else-if="!hasDiscrepancy" class="text-[11px] text-slate-500 dark:text-slate-400">
              Kuantitas terkunci sesuai Surat Jalan. Centang <strong>"Ada Selisih Fisik"</strong> di bawah jika kargo diterima tidak utuh.
            </p>
            <p v-else class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Mode selisih aktif: sesuaikan angka fisik yang benar-benar diterima (maks. {{ orderTotalQty }}).
            </p>
          </div>
        </div>

        <!-- Toggle Selisih Fisik / Kerusakan -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <label class="flex items-center space-x-2 cursor-pointer" :class="{ 'opacity-60 cursor-not-allowed': !matchedOrder }">
            <input 
              type="checkbox" 
              v-model="hasDiscrepancy" 
              :disabled="!matchedOrder"
              class="rounded border-slate-300 text-amber-600 focus:ring-amber-500" 
            />
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Ada Selisih Fisik / Kerusakan Barang</span>
          </label>
          <div v-if="hasDiscrepancy" class="space-y-1">
            <label class="text-[11px] font-medium text-amber-700 dark:text-amber-400">Catatan Selisih / Kerusakan Fisik (wajib):</label>
            <textarea
              v-model="discrepancyNotes"
              rows="2"
              required
              placeholder="Jelaskan detail barang kurang, cacat, kardus sobek, atau selisih kuantitas..."
              class="w-full bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            ></textarea>
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          type="button" 
          @click="handleSubmitPod"
          :disabled="outboundStore.isLoading || !matchedOrder"
          class="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer"
        >
          <AppIcon name="check" custom-class="w-4 h-4" />
          <span>{{ !matchedOrder ? 'Cari Nomor Order Terlebih Dahulu' : (outboundStore.isLoading ? 'Menyimpan BAST...' : 'Submit POD & Terbitkan BAST Digital') }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const deliveredQtyInput = ref(null)
const proofMethod = ref('SIGNATURE')
const hasDiscrepancy = ref(false)
const discrepancyNotes = ref('')

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
const rejectionDisposition = ref('RESTOCK')

const orderTotalQty = computed(() => {
  if (!matchedOrder.value || !Array.isArray(matchedOrder.value.items)) return 0
  return matchedOrder.value.items.reduce((sum, it) => {
    const qty = Number(it.packed_qty || it.picked_qty || it.ordered_qty || 0)
    return sum + qty
  }, 0)
})

const orderItemsSummary = computed(() => {
  if (!matchedOrder.value || !Array.isArray(matchedOrder.value.items)) return ''
  return matchedOrder.value.items.map(it => {
    const qty = Number(it.packed_qty || it.picked_qty || it.ordered_qty || 0)
    return `${qty}x ${it.product_name || it.sku_code || 'Item'}`
  }).join(', ')
})

const isKdmpColdChain = computed(() => {
  if (!matchedOrder.value) return false
  const text = JSON.stringify(matchedOrder.value).toLowerCase()
  return text.includes('chiller') || text.includes('showcase') || text.includes('kdmp')
})

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
  const term = orderNumberInput.value.trim().toLowerCase()
  if (!term) return
  await waybillStore.fetchWaybills()
  const found = waybillStore.waybills.find(
    (w) => (w.order_number || '').toLowerCase() === term ||
           (w.sj_number || '').toLowerCase() === term ||
           (w.resi_number || '').toLowerCase() === term
  )
  if (found) {
    matchedWaybill.value = found
    playAudioFeedback('SUCCESS')
    try {
      const res = await apiFetch(`/outbound/${found.reference_id}`)
      if (res.success) {
        matchedOrder.value = res.data
        recipientName.value = matchedOrder.value.recipient_name || ''
        hasDiscrepancy.value = false
        discrepancyNotes.value = ''
        const total = orderTotalQty.value
        deliveredQtyInput.value = total > 0 ? total : 1
      }
    } catch { /* panel verifikasi cukup tersembunyi bila detail gagal dimuat */ }
  } else {
    lookupMessage.value = 'Dokumen untuk nomor order/SJ/Resi itu tidak ditemukan — pastikan SJ + resi sudah terbit.'
    playAudioFeedback('ERROR')
  }
}

// Auto-sync Qty Diterima Fisik dengan orderTotalQty
watch(orderTotalQty, (newTotal) => {
  if (!hasDiscrepancy.value && newTotal > 0) {
    deliveredQtyInput.value = newTotal
  }
})

// Toggle selisih: jika dimatikan, kembalikan ke total pesanan dan bersihkan catatan
watch(hasDiscrepancy, (val) => {
  if (!val) {
    deliveredQtyInput.value = orderTotalQty.value > 0 ? orderTotalQty.value : null
    discrepancyNotes.value = ''
  }
})

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
        rejection_disposition: decision === 'REJECTED' ? rejectionDisposition.value : undefined,
        actor_name: verifierName.value.trim()
      }
    })
    playAudioFeedback('SUCCESS')
    const res = await apiFetch(`/outbound/${matchedOrder.value.id}`)
    if (res.success) matchedOrder.value = res.data
    showRejectInput.value = false
    rejectionReason.value = ''
    rejectionDisposition.value = 'RESTOCK'
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
  if (proofMethod.value === 'SIGNATURE' && !signatureData.value) {
    outboundStore.errorMessage = 'Tanda tangan penerima wajib — minta penerima tanda tangan di kotak e-POD atau pilih opsi Diwakilkan / Pos Satpam.'
    playAudioFeedback('ERROR')
    return
  }
  if (!recipientName.value.trim()) {
    outboundStore.errorMessage = 'Nama penerima (consignee) / perwakilan wajib diisi.'
    playAudioFeedback('ERROR')
    return
  }
  if (hasDiscrepancy.value && !discrepancyNotes.value.trim()) {
    outboundStore.errorMessage = 'Catatan selisih fisik / kerusakan barang wajib diisi jika opsi selisih dicentang.'
    playAudioFeedback('ERROR')
    return
  }

  const orderId = matchedWaybill.value.reference_id
  const actor = authStore.user?.full_name || 'Driver Pengiriman'
  const finalDeliveredQty = Number(deliveredQtyInput.value) > 0 ? Number(deliveredQtyInput.value) : (orderTotalQty.value || 1)

  if (orderTotalQty.value > 0 && finalDeliveredQty > orderTotalQty.value) {
    outboundStore.errorMessage = `Qty diterima fisik (${finalDeliveredQty}) tidak boleh melebihi jumlah pesanan (${orderTotalQty.value}).`
    playAudioFeedback('ERROR')
    return
  }

  try {
    await apiFetch(`/outbound/${orderId}/pod`, {
      method: 'POST',
      body: {
        recipient_name: recipientName.value.trim(),
        pod_photo_url: photoDataUrl.value,
        signature_photo_url: proofMethod.value === 'SIGNATURE' ? signatureData.value : 'DIWAKILKAN_STEMPEL_POS',
        proof_type: proofMethod.value,
        delivered_qty: finalDeliveredQty,
        discrepancy_notes: hasDiscrepancy.value ? discrepancyNotes.value.trim() : undefined,
        actor_name: actor,
        notes: `Resi ${matchedWaybill.value.resi_number} / SJ ${matchedWaybill.value.sj_number} • Foto ${photoTakenAt.value}`
      }
    })
    playAudioFeedback('SUCCESS')
    outboundStore.successMessage = `POD Berhasil Dikirim! Diterima oleh ${recipientName.value} (Qty: ${finalDeliveredQty}). Status Order DELIVERED — menunggu verifikasi admin sebelum penagihan.`
    photoDataUrl.value = ''
    signatureData.value = ''
    deliveredQtyInput.value = null
    hasDiscrepancy.value = false
    discrepancyNotes.value = ''
    proofMethod.value = 'SIGNATURE'
    const res = await apiFetch(`/outbound/${orderId}`)
    if (res.success) matchedOrder.value = res.data
  } catch (err) {
    outboundStore.errorMessage = err.detail || err.message
    playAudioFeedback('ERROR')
  }
}

onMounted(() => {
  waybillStore.fetchWaybills()
})
</script>
