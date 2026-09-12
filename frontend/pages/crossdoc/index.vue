<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <!-- Feedback -->
    <div v-if="crossDocStore.errorMessage" class="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span class="font-medium">{{ crossDocStore.errorMessage }}</span>
      <button type="button" @click="crossDocStore.errorMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>
    <div v-if="crossDocStore.successMessage" class="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span class="font-medium">{{ crossDocStore.successMessage }}</span>
      <button type="button" @click="crossDocStore.successMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <p class="kicker">Fase 3 — Outbound • Penerbitan Ulang Dokumen</p>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="checkpoint" custom-class="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>Cross-Doc (Swap Dokumen)</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Terbitkan ulang dokumen logistik: Surat Jalan Swap, Re-issue AWB, atau Sub-SJ dekonsolidasi — tanpa menyentuh stok.</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" @click="showCreate = !showCreate"
                class="px-3 py-2 rounded-md text-xs font-semibold transition"
                :class="showCreate ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700' : 'bg-cyan-600 hover:bg-cyan-700 text-white'">
          {{ showCreate ? 'Tutup Form' : '+ Terbitkan Cross-Doc' }}
        </button>
        <NuxtLink to="/crossdock" class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition">Manifest</NuxtLink>
      </div>
    </div>

    <!-- Form Terbitkan Cross-Doc -->
    <div v-if="showCreate" class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Terbitkan Cross-Document</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Penerbit</span>
          <select v-model="form.warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Shipper / Customer</span>
          <select v-model="form.customer_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="c in masterStore.customers" :key="c.id" :value="c.id">{{ c.code }} — {{ c.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Jenis Cross-Doc</span>
          <select v-model="form.cross_doc_type" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option value="SURAT_JALAN_SWAP">Surat Jalan Swap (ganti SJ)</option>
            <option value="AWB_REISSUE">Re-issue AWB (airway bill)</option>
            <option value="DECONSOLIDATION_SUB_SJ">Sub-SJ Dekonsolidasi</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alasan</span>
          <select v-model="form.reason" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option value="BLIND_SHIPPING">Blind Shipping</option>
            <option value="ROUTE_RE_DISPATCH">Re-dispatch Rute</option>
            <option value="SUB_DISTRIBUTION">Sub-Distribusi</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe Dokumen Asal *</span>
          <select v-model="form.source_document_type_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="t in documentTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">No. Dokumen Asal *</span>
          <input v-model="form.source_document_number" required type="text" placeholder="SJ-XXXXXXXX / MNF-…"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Pengirim di Dokumen Asal</span>
          <input v-model="form.source_sender_name" type="text" placeholder="Nama pengirim asal"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe Dokumen Baru *</span>
          <select v-model="form.target_document_type_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="t in documentTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">No. Dokumen Baru *</span>
          <input v-model="form.target_document_number" required type="text" placeholder="SJ-XXXXXXXX (nomor baru)"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Penerima Baru</span>
          <input v-model="form.target_recipient_name" type="text" placeholder="Nama penerima tujuan baru"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1 sm:col-span-2">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat Tujuan Baru</span>
          <input v-model="form.target_destination_address" type="text" placeholder="Alamat pengiriman baru"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
      </div>
      <div class="space-y-2">
        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Item (qty asal → qty diterbitkan ulang)</span>
        <div v-for="(it, idx) in form.items" :key="idx" class="flex gap-2 items-center flex-wrap">
          <select v-model="it.product_id" class="flex-1 min-w-[180px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="p in masterStore.products" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
          </select>
          <input v-model.number="it.original_qty" type="number" min="1" placeholder="Qty asal"
                 class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <span class="text-slate-400 text-xs">→</span>
          <input v-model.number="it.reissued_qty" type="number" min="0" placeholder="Qty baru"
                 class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <button v-if="form.items.length > 1" type="button" @click="form.items.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-sm px-1">✕</button>
        </div>
        <button type="button" @click="form.items.push({ product_id: '', original_qty: 1, reissued_qty: 1 })" class="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">+ Tambah baris item</button>
      </div>
      <button type="button" :disabled="crossDocStore.isLoading" @click="handleIssue"
              class="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
        Terbitkan Cross-Doc (CROSS_DOC_ISSUED)
      </button>
    </div>

    <!-- Daftar Cross-Doc -->
    <AppDataTable
      :rows="crossDocStore.docs"
      :columns="columns"
      :loading="crossDocStore.isLoading && crossDocStore.docs.length === 0"
      row-key-prop="id"
      search-placeholder="Cari nomor dokumen, shipper…"
      empty-title="Belum ada cross-document diterbitkan"
      empty-hint="Terbitkan cross-doc saat dokumen asal perlu diganti (swap, re-dispatch, dekonsolidasi)."
    >
      <template #row-actions="{ row }">
        <NuxtLink
          :to="'/checkpoints?doc=' + row.cross_doc_number"
          class="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
        >Audit Trail</NuxtLink>
      </template>
      <template #mobile-actions="{ row }">
        <NuxtLink
          :to="'/checkpoints?doc=' + row.cross_doc_number"
          class="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium"
        >Audit Trail</NuxtLink>
      </template>
    </AppDataTable>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useCrossDocStore } from '~/stores/crossdoc'
import { useMasterStore } from '~/stores/master'
import { useAuthStore } from '~/stores/auth'

const crossDocStore = useCrossDocStore()
const masterStore = useMasterStore()
const authStore = useAuthStore()

const showCreate = ref(false)

const documentTypes = ref([])

const form = reactive({
  warehouse_id: authStore.activeWarehouseId || '',
  customer_id: '',
  cross_doc_type: 'SURAT_JALAN_SWAP',
  reason: 'BLIND_SHIPPING',
  source_document_type_id: '',
  target_document_type_id: '',
  source_document_number: '',
  source_sender_name: '',
  target_document_number: '',
  target_recipient_name: '',
  target_destination_address: '',
  items: [{ product_id: '', original_qty: 1, reissued_qty: 1 }]
})

const columns = [
  { key: 'cross_doc_number', label: 'No. Cross-Doc', type: 'mono', primary: true },
  { key: 'cross_doc_type', label: 'Jenis', hideOnMobile: true },
  { key: 'source_document_number', label: 'Dok. Asal', type: 'mono', hideOnMobile: true },
  { key: 'target_document_number', label: 'Dok. Baru', type: 'mono', hideOnMobile: true },
  { key: 'customer_name', label: 'Shipper', hideOnMobile: true },
  { key: 'warehouse_name', label: 'Gudang', hideOnMobile: true },
  { key: 'issued_by_name', label: 'Diterbitkan Oleh', hideOnDesktop: true },
  { key: 'status', label: 'Status', type: 'status' }
]

function typeLabel(t) {
  return { SURAT_JALAN_SWAP: 'SJ Swap', AWB_REISSUE: 'AWB Re-issue', DECONSOLIDATION_SUB_SJ: 'Sub-SJ' }[t] || t
}

async function handleIssue() {
  if (!form.warehouse_id || !form.customer_id) {
    crossDocStore.errorMessage = 'Gudang penerbit dan shipper wajib dipilih.'
    return
  }
  if (!form.source_document_type_id || !form.target_document_type_id) {
    crossDocStore.errorMessage = 'Tipe dokumen asal dan tipe dokumen baru wajib dipilih.'
    return
  }
  if (!form.source_document_number.trim() || !form.target_document_number.trim()) {
    crossDocStore.errorMessage = 'Nomor dokumen asal dan nomor dokumen baru wajib diisi.'
    return
  }
  const validItems = form.items.filter(i => i.product_id && i.original_qty > 0)
  if (!validItems.length) {
    crossDocStore.errorMessage = 'Minimal 1 item dengan qty asal > 0.'
    return
  }
  const created = await crossDocStore.issueDoc({
    warehouse_id: form.warehouse_id,
    customer_id: form.customer_id,
    cross_doc_type: form.cross_doc_type,
    reason: form.reason,
    source_document_type_id: form.source_document_type_id,
    target_document_type_id: form.target_document_type_id,
    source_document_number: form.source_document_number.trim(),
    source_sender_name: form.source_sender_name.trim() || undefined,
    target_document_number: form.target_document_number.trim(),
    target_recipient_name: form.target_recipient_name.trim() || undefined,
    target_destination_address: form.target_destination_address.trim() || undefined,
    items: validItems,
    actor_name: authStore.user?.full_name || 'Petugas Gudang'
  })
  if (created) {
    showCreate.value = false
    form.source_document_number = ''
    form.source_sender_name = ''
    form.target_document_number = ''
    form.target_recipient_name = ''
    form.target_destination_address = ''
    form.items = [{ product_id: '', original_qty: 1, reissued_qty: 1 }]
  }
}

onMounted(async () => {
  crossDocStore.fetchDocs()
  masterStore.fetchWarehouses()
  masterStore.fetchCustomers()
  masterStore.fetchProducts()
  try {
    const { apiFetch } = useWmsApi()
    const res = await apiFetch('/master/document-types')
    documentTypes.value = res.data || []
    if (documentTypes.value.length) {
      const sjAsal = documentTypes.value.find(t => t.code === 'SJ_SUPPLIER')
      const sjBaru = documentTypes.value.find(t => t.code === 'SJ_PENGIRIMAN')
      form.source_document_type_id = sjAsal?.id || documentTypes.value[0].id
      form.target_document_type_id = sjBaru?.id || documentTypes.value[documentTypes.value.length - 1].id
    }
  } catch { /* dropdown kosong — validasi form menahan submit */ }
})
</script>
