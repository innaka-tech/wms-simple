<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Akurasi Stok & Audit
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Opname (Cycle Count)
          </h1>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Siklus perhitungan fisik berkala per rak gudang, deteksi varians saldo sistem vs aktual, dan rekonsiliasi buku besar otomatis.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="loadSessions"
          class="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          Refresh
        </button>
        <button
          @click="openNewSessionModal"
          class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Mulai Sesi Opname Baru
        </button>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Sesi Opname</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ sessions.length }}</p>
        <span class="text-[10px] text-slate-400 font-mono">Riwayat Cycle Count</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-amber-600 dark:text-amber-400">Sesi Sedang Berjalan</p>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
          {{ sessions.filter(s => s.status === 'IN_PROGRESS').length }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Status IN_PROGRESS</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Selesai Rekonsiliasi</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
          {{ sessions.filter(s => s.status === 'RECONCILED').length }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Buku Besar Telah Disesuaikan</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-rose-600 dark:text-rose-400">Total Temuan Selisih</p>
        <p class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
          {{ sessions.reduce((acc, s) => acc + (parseInt(s.discrepancy_items) || 0), 0) }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Item Perlu Rekonsiliasi</span>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div v-if="loading" class="p-12 text-center text-xs text-slate-400">
        Memuat sesi stock opname...
      </div>

      <div v-else-if="sessions.length === 0" class="p-12 text-center">
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Belum ada sesi stock opname yang dibuat.</p>
        <p class="text-xs text-slate-400 mt-1">Klik tombol "Mulai Sesi Opname Baru" untuk memulai perhitungan fisik.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-3">No. Sesi Opname</th>
              <th class="p-3">Gudang & Zona</th>
              <th class="p-3 text-center">Status Sesi</th>
              <th class="p-3 text-right">Total Item</th>
              <th class="p-3 text-right">Item Berselisih</th>
              <th class="p-3">Pengawas / Tanggal</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="s in sessions" :key="s.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ s.opname_number }}</td>
              <td class="p-3">
                <div class="font-semibold text-slate-900 dark:text-white">{{ s.warehouse_name }}</div>
                <div class="text-[11px] text-slate-400">Zona: {{ s.zone || 'Semua Zona Rak' }}</div>
              </td>
              <td class="p-3 text-center">
                <span
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                  :class="s.status === 'IN_PROGRESS' 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' 
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'"
                >
                  {{ s.status }}
                </span>
              </td>
              <td class="p-3 text-right font-mono font-medium">{{ s.total_items }} SKU</td>
              <td class="p-3 text-right font-mono font-bold">
                <span
                  v-if="parseInt(s.discrepancy_items) > 0"
                  class="px-1.5 py-0.5 rounded text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-400"
                >
                  {{ s.discrepancy_items }} Selisih
                </span>
                <span v-else class="text-emerald-600 dark:text-emerald-400 font-normal text-[11px]">Cocok 100%</span>
              </td>
              <td class="p-3">
                <div class="text-slate-800 dark:text-slate-200 font-medium">{{ s.created_by_name }}</div>
                <div class="text-[10px] text-slate-400 font-mono">{{ s.created_at?.slice(0, 19).replace('T', ' ') }}</div>
              </td>
              <td class="p-3 text-right">
                <button
                  @click="openCountSheet(s.id)"
                  class="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition"
                >
                  Lembar Hitung
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ MODAL MULAI SESI OPNAME ═══ -->
    <div
      v-if="showNewSessionModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Mulai Sesi Stock Opname Baru</h3>
          <button @click="showNewSessionModal = false" class="text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Gudang</label>
            <select v-model="newSessionForm.warehouse_id" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
              <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Zona / Lorong Rak (Opsional)</label>
            <input v-model="newSessionForm.zone" type="text" placeholder="Contoh: Zona A / Cold Storage" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Opname</label>
            <textarea v-model="newSessionForm.notes" rows="2" placeholder="Catatan audit akhir bulan / cycle count..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2"></textarea>
          </div>

          <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-700 dark:text-blue-300">
            Sistem akan merekam <strong>snapshot saldo on-hand saat ini</strong> secara instan untuk dibandingkan dengan hasil hitungan fisik lapangan.
          </div>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button @click="showNewSessionModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button
            @click="submitNewSession"
            :disabled="submitting || !newSessionForm.warehouse_id"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition"
          >
            {{ submitting ? 'Merekam Snapshot...' : 'Mulai Sesi Sekarang' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL LEMBAR HITUNG & REKONSILIASI ═══ -->
    <div
      v-if="showCountSheetModal && currentSession"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-base font-bold text-slate-900 dark:text-white">{{ currentSession.opname_number }}</span>
              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                :class="currentSession.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
              >
                {{ currentSession.status }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ currentSession.warehouse_name }} · Zona: {{ currentSession.zone || 'Semua' }}
            </p>
          </div>

          <ThermalPrintButton
            :data="{
              title: 'LEMBAR KERJA STOCK OPNAME',
              no_order: currentSession.opname_number,
              petugas: currentSession.created_by_name,
              tujuan: currentSession.warehouse_name,
              items: currentSession.items?.map(i => ({ nama: i.sku_code, qty: i.physical_qty + ' ' + i.unit })) || []
            }"
            label="Cetak Lembar Kerja"
          />
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-2.5">Barang (SKU)</th>
                <th class="p-2.5 text-right">Saldo Sistem</th>
                <th class="p-2.5 text-right w-36">Hitung Fisik Aktual</th>
                <th class="p-2.5 text-center">Selisih (Varians)</th>
                <th class="p-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in currentSession.items" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td class="p-2.5">
                  <div class="font-bold text-slate-900 dark:text-white">{{ item.product_name }}</div>
                  <div class="font-mono text-[11px] text-slate-400">{{ item.sku_code }}</div>
                </td>
                <td class="p-2.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                  {{ Number(item.system_qty).toLocaleString('id-ID') }} {{ item.unit }}
                </td>
                <td class="p-2.5 text-right">
                  <div v-if="currentSession.status === 'IN_PROGRESS'" class="flex items-center justify-end gap-1">
                    <input
                      v-model.number="item.physical_qty"
                      @change="saveItemCount(item)"
                      type="number"
                      step="any"
                      class="w-24 text-right p-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <span class="text-[10px] text-slate-400 font-mono">{{ item.unit }}</span>
                  </div>
                  <div v-else class="font-mono font-bold text-slate-900 dark:text-white">
                    {{ Number(item.physical_qty).toLocaleString('id-ID') }} {{ item.unit }}
                  </div>
                </td>
                <td class="p-2.5 text-center">
                  <span
                    class="px-2 py-0.5 text-xs font-mono font-bold rounded"
                    :class="{
                      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400': (item.physical_qty - item.system_qty) !== 0,
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400': (item.physical_qty - item.system_qty) === 0
                    }"
                  >
                    {{ (item.physical_qty - item.system_qty) > 0 ? '+' : '' }}{{ item.physical_qty - item.system_qty }}
                  </span>
                </td>
                <td class="p-2.5 text-right">
                  <span class="text-[10px] font-bold uppercase" :class="item.status === 'ADJUSTED' ? 'text-emerald-600' : 'text-slate-400'">
                    {{ item.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            {{ currentSession.items?.filter(i => (i.physical_qty - i.system_qty) !== 0).length }} item memiliki selisih saldo.
          </span>

          <div class="flex items-center gap-2">
            <button @click="showCountSheetModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Tutup
            </button>
            <button
              v-if="currentSession.status === 'IN_PROGRESS'"
              @click="reconcileSession(currentSession.id)"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition"
            >
              Rekonsiliasi Buku Besar Stok
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useWmsApi } from '~/composables/useWmsApi'
import { useAuthStore } from '~/stores/auth'

const { apiFetch } = useWmsApi()
const authStore = useAuthStore()

const sessions = ref([])
const warehouses = ref([])
const loading = ref(false)
const submitting = ref(false)

const showNewSessionModal = ref(false)
const showCountSheetModal = ref(false)
const currentSession = ref(null)

const newSessionForm = ref({
  warehouse_id: '',
  zone: '',
  notes: ''
})

async function loadSessions() {
  loading.value = true
  try {
    const res = await apiFetch('/stock/opname')
    if (res.success) {
      sessions.value = res.data || []
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
      if (!newSessionForm.value.warehouse_id && warehouses.value.length > 0) {
        newSessionForm.value.warehouse_id = authStore.activeWarehouseId || warehouses.value[0].id
      }
    }
  } catch (e) {}
}

function openNewSessionModal() {
  newSessionForm.value.warehouse_id = authStore.activeWarehouseId || (warehouses.value[0]?.id || '')
  newSessionForm.value.zone = ''
  newSessionForm.value.notes = ''
  showNewSessionModal.value = true
}

const { confirmAction, showSuccess, showError } = useSwal()

async function submitNewSession() {
  submitting.value = true
  try {
    const res = await apiFetch('/stock/opname', {
      method: 'POST',
      body: {
        ...newSessionForm.value,
        actor_name: authStore.user?.full_name || 'Petugas Opname'
      }
    })
    if (res.success) {
      showNewSessionModal.value = false
      await loadSessions()
      openCountSheet(res.data.id)
    } else {
      showError('Gagal', res.message)
    }
  } catch (err) {
    showError('Error', err.message)
  } finally {
    submitting.value = false
  }
}

async function openCountSheet(sessionId) {
  try {
    const res = await apiFetch(`/stock/opname/${sessionId}`)
    if (res.success) {
      currentSession.value = res.data
      showCountSheetModal.value = true
    }
  } catch (e) {
    showError('Error', e.message)
  }
}

async function saveItemCount(item) {
  try {
    await apiFetch(`/stock/opname/${currentSession.value.id}/count`, {
      method: 'POST',
      body: {
        item_id: item.id,
        physical_qty: item.physical_qty,
        actor_name: authStore.user?.full_name || 'Checker Opname'
      }
    })
  } catch (e) {
    console.error(e)
  }
}

async function reconcileSession(sessionId) {
  const ok = await confirmAction(
    'Rekonsiliasi Stok?',
    'Seluruh selisih stok akan disesuaikan ke buku besar. Saldo stok gudang akan diperbarui otomatis.',
    { icon: 'warning', confirmText: 'Ya, Rekonsiliasi' }
  )
  if (!ok) return
  try {
    const res = await apiFetch(`/stock/opname/${sessionId}/reconcile`, {
      method: 'POST',
      body: { actor_name: authStore.user?.full_name || 'Manajer Gudang' }
    })
    if (res.success) {
      showSuccess('Berhasil', res.message)
      await openCountSheet(sessionId)
      await loadSessions()
    } else {
      showError('Gagal', res.message)
    }
  } catch (e) {
    showError('Error', e.message)
  }
}

onMounted(async () => {
  await Promise.all([loadSessions(), loadWarehouses()])
})
</script>
