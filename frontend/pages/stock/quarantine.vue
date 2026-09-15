<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
            Kualitas &amp; Isolasi Fisik
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Karantina &amp; Retur Barang (QC)
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pengelolaan isolasi barang retur POD, barang rusak (*damage*), pemeriksaan QC berkala, serta disposisi restock/scrap.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="loadQuarantineRecords"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
          title="Perbarui data"
        >
          <AppIcon name="refresh-cw" custom-class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow transition"
        >
          <AppIcon name="plus" custom-class="w-4 h-4" />
          <span>Tahan Barang ke Karantina</span>
        </button>
      </div>
    </div>

    <!-- Summary Metrics (Pastel Palette) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Kasus Karantina</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ records.length }}</p>
          <span class="text-[11px] text-slate-400">Semua Riwayat Isolasi</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
          <AppIcon name="archive" custom-class="w-4.5 h-4.5" />
        </div>
      </div>

      <div class="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 shadow-sm flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-rose-700 dark:text-rose-300">Menunggu QC</p>
          <p class="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1">
            {{ records.filter(r => r.inspection_status === 'PENDING').length }}
          </p>
          <span class="text-[11px] text-rose-600/70 dark:text-rose-400/60 font-medium">Perlu Keputusan Disposisi</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
          <AppIcon name="alert-triangle" custom-class="w-4.5 h-4.5" />
        </div>
      </div>

      <div class="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 shadow-sm flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-teal-700 dark:text-teal-300">Rilis Restock</p>
          <p class="text-2xl font-bold text-teal-800 dark:text-teal-200 mt-1">
            {{ records.filter(r => r.disposition === 'RETURN_TO_STOCK').length }}
          </p>
          <span class="text-[11px] text-teal-600/70 dark:text-teal-400/60 font-medium">Kembali Layak Jual</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-teal-100/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
          <AppIcon name="check-circle" custom-class="w-4.5 h-4.5" />
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-slate-600 dark:text-slate-300">Scrap / Pemusnahan</p>
          <p class="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            {{ records.filter(r => r.disposition === 'DISPOSE_SCRAP').length }}
          </p>
          <span class="text-[11px] text-slate-400 font-medium">Penghapusan Buku Berita Acara</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
          <AppIcon name="trash-2" custom-class="w-4.5 h-4.5" />
        </div>
      </div>
    </div>

    <!-- Status Filter -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        v-for="f in ['ALL', 'PENDING', 'INSPECTED']"
        :key="f"
        @click="activeFilter = f"
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        :class="activeFilter === f 
          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        {{ f === 'ALL' ? 'Semua Kasus' : (f === 'PENDING' ? 'Perlu QC (Pending)' : 'Telah Diperiksa (Selesai)') }}
      </button>
    </div>

    <!-- Records Table -->
    <div class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div v-if="loading" class="p-12 text-center text-xs text-slate-400">
        Memuat daftar catatan karantina...
      </div>

      <AppEmptyState
        v-else-if="filteredRecords.length === 0"
        icon="shield-check"
        title="Tidak Ada Barang di Area Karantina"
        description="Area isolasi saat ini bersih dan tidak ada barang bermasalah atau menunggu pemeriksaan QC."
        action-label="Tahan Barang Baru"
        action-icon="plus"
        @action="openCreateModal"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-3">No. Karantina</th>
              <th class="p-3">Gudang</th>
              <th class="p-3">Barang (SKU)</th>
              <th class="p-3 text-right">Qty</th>
              <th class="p-3">Sumber & Alasan</th>
              <th class="p-3 text-center">Status QC</th>
              <th class="p-3">Disposisi Akhir</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in filteredRecords" :key="r.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ r.record_number }}</td>
              <td class="p-3 text-slate-600 dark:text-slate-400">{{ r.warehouse_name }}</td>
              <td class="p-3">
                <div class="font-semibold text-slate-900 dark:text-white">{{ r.product_name }}</div>
                <div class="font-mono text-[11px] text-slate-400">{{ r.sku_code }}</div>
              </td>
              <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                {{ Number(r.qty).toLocaleString('id-ID') }} {{ r.unit }}
              </td>
              <td class="p-3">
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {{ r.source_type }}
                </span>
                <p class="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">{{ r.reason }}</p>
                <span v-if="r.source_reference" class="text-[10px] text-slate-400 font-mono">Ref: {{ r.source_reference }}</span>
              </td>
              <td class="p-3 text-center">
                <span
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                  :class="r.inspection_status === 'PENDING' 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' 
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'"
                >
                  {{ r.inspection_status }}
                </span>
              </td>
              <td class="p-3">
                <div v-if="r.disposition" class="space-y-0.5">
                  <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {{ r.disposition }}
                  </span>
                  <p class="text-[10px] text-slate-400 truncate max-w-xs">{{ r.inspection_notes }}</p>
                </div>
                <span v-else class="text-[11px] text-slate-400 italic">Menunggu QC</span>
              </td>
              <td class="p-3 text-right">
                <button
                  v-if="r.inspection_status === 'PENDING'"
                  @click="openInspectModal(r)"
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                >
                  Periksa (QC)
                </button>
                <span v-else class="text-slate-400 text-xs">Selesai</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ MODAL TAHAN BARANG KE KARANTINA ═══ -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Tahan Barang ke Area Karantina</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gudang</label>
            <select v-model="createForm.warehouse_id" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
              <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Barang (SKU)</label>
            <select v-model="createForm.product_id" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
              <option value="">-- Pilih Barang --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku_code }} · {{ p.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jumlah Ditahan (Qty)</label>
              <input v-model.number="createForm.qty" type="number" min="1" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sumber Masalah</label>
              <select v-model="createForm.source_type" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                <option value="DAMAGE_FOUND">Temuan Kerusakan Fisik</option>
                <option value="POD_RETURN">Retur POD / Ditolak Customer</option>
                <option value="INBOUND_REJECT">Ditolak Saat Inbound</option>
                <option value="EXPIRED">Kedaluwarsa / Rusak Kemasan</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Referensi (Opsional)</label>
            <input v-model="createForm.source_reference" type="text" placeholder="Contoh: DO20260901, PO20260901" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan Penahanan (Catatan Fisik)</label>
            <textarea v-model="createForm.reason" rows="2" placeholder="Jelaskan kondisi cacat/kerusakan..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2"></textarea>
          </div>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button @click="showCreateModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button
            @click="submitCreateQuarantine"
            :disabled="submitting || !createForm.product_id || createForm.qty <= 0"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition"
          >
            {{ submitting ? 'Menyimpan...' : 'Tahan ke Karantina' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL QC & DISPOSISI ═══ -->
    <div
      v-if="showInspectModal && selectedRecord"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Pemeriksaan QC & Disposisi</h3>
            <span class="font-mono text-xs text-slate-400">{{ selectedRecord.record_number }}</span>
          </div>
          <button @click="showInspectModal = false" class="text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
            <div class="flex justify-between font-medium">
              <span class="text-slate-500">Barang:</span>
              <span class="text-slate-900 dark:text-white">{{ selectedRecord.product_name }}</span>
            </div>
            <div class="flex justify-between font-medium">
              <span class="text-slate-500">Jumlah:</span>
              <span class="font-mono text-slate-900 dark:text-white">{{ selectedRecord.qty }} {{ selectedRecord.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Alasan:</span>
              <span class="text-slate-700 dark:text-slate-300 italic">{{ selectedRecord.reason }}</span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keputusan Disposisi QC</label>
            <select v-model="inspectForm.disposition" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
              <option value="RETURN_TO_STOCK">Rilis Kembali ke Rak Layak Jual (Restock on_hand)</option>
              <option value="RETURN_TO_VENDOR">Retur ke Vendor / Supplier</option>
              <option value="DISPOSE_SCRAP">Berita Acara Pemusnahan (Scrap / Hapus Buku)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Hasil Pemeriksaan QC</label>
            <textarea v-model="inspectForm.inspection_notes" rows="3" placeholder="Deskripsikan hasil uji fisik, perbaikan, atau justifikasi pemusnahan..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2"></textarea>
          </div>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button @click="showInspectModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button
            @click="submitInspect"
            :disabled="submitting"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
          >
            <AppIcon v-if="submitting" name="refresh-cw" custom-class="w-3.5 h-3.5 animate-spin" />
            <span>{{ submitting ? 'Memproses...' : 'Simpan Keputusan QC' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWmsApi } from '~/composables/useWmsApi'
import { useAuthStore } from '~/stores/auth'

const { apiFetch } = useWmsApi()
const authStore = useAuthStore()

const records = ref([])
const warehouses = ref([])
const products = ref([])
const loading = ref(false)
const submitting = ref(false)
const activeFilter = ref('ALL')

const showCreateModal = ref(false)
const showInspectModal = ref(false)
const selectedRecord = ref(null)

const createForm = ref({
  warehouse_id: '',
  product_id: '',
  qty: 1,
  source_type: 'DAMAGE_FOUND',
  source_reference: '',
  reason: ''
})

const inspectForm = ref({
  disposition: 'RETURN_TO_STOCK',
  inspection_notes: ''
})

const filteredRecords = computed(() => {
  if (activeFilter.value === 'ALL') return records.value
  return records.value.filter(r => r.inspection_status === activeFilter.value)
})

async function loadQuarantineRecords() {
  loading.value = true
  try {
    const res = await apiFetch('/stock/quarantine')
    if (res.success) {
      records.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadWarehouses() {
  try {
    const res = await apiFetch('/warehouses')
    if (res.success) {
      warehouses.value = res.data || []
      if (!createForm.value.warehouse_id && warehouses.value.length > 0) {
        createForm.value.warehouse_id = authStore.activeWarehouseId || warehouses.value[0].id
      }
    }
  } catch (e) {}
}

async function loadProducts() {
  try {
    const res = await apiFetch('/products')
    if (res.success) {
      products.value = res.data || []
    }
  } catch (e) {}
}

function openCreateModal() {
  createForm.value.warehouse_id = authStore.activeWarehouseId || (warehouses.value[0]?.id || '')
  createForm.value.product_id = ''
  createForm.value.qty = 1
  createForm.value.source_type = 'DAMAGE_FOUND'
  createForm.value.source_reference = ''
  createForm.value.reason = ''
  showCreateModal.value = true
}

const { showError } = useSwal()

async function submitCreateQuarantine() {
  submitting.value = true
  try {
    const res = await apiFetch('/stock/quarantine', {
      method: 'POST',
      body: {
        ...createForm.value,
        actor_name: authStore.user?.full_name || 'Petugas Gudang'
      }
    })
    if (res.success) {
      showCreateModal.value = false
      await loadQuarantineRecords()
    } else {
      showError('Gagal', res.message || 'Gagal menyimpan catatan karantina')
    }
  } catch (err) {
    showError('Error', err.message)
  } finally {
    submitting.value = false
  }
}

function openInspectModal(record) {
  selectedRecord.value = record
  inspectForm.value.disposition = 'RETURN_TO_STOCK'
  inspectForm.value.inspection_notes = ''
  showInspectModal.value = true
}

async function submitInspect() {
  if (!selectedRecord.value) return
  submitting.value = true
  try {
    const res = await apiFetch(`/stock/quarantine/${selectedRecord.value.id}/inspect`, {
      method: 'POST',
      body: {
        ...inspectForm.value,
        actor_name: authStore.user?.full_name || 'Petugas QC'
      }
    })
    if (res.success) {
      showInspectModal.value = false
      await loadQuarantineRecords()
    } else {
      showError('Gagal', res.message)
    }
  } catch (err) {
    showError('Error', err.message)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadQuarantineRecords(), loadWarehouses(), loadProducts()])
})
</script>
