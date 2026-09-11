<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <!-- Feedback -->
    <div v-if="crossDockStore.errorMessage" class="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span class="font-medium">{{ crossDockStore.errorMessage }}</span>
      <button type="button" @click="crossDockStore.errorMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>
    <div v-if="crossDockStore.successMessage" class="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span class="font-medium">{{ crossDockStore.successMessage }}</span>
      <button type="button" @click="crossDockStore.successMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <p class="kicker">Fase 3 — Outbound • Transfer Antar-Gudang</p>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="debulking" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Cross-Dock Antar-Gudang</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manifest transfer hub → spoke: muat (stok keluar) → terima di tujuan (stok masuk). Ledger double-entry.</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" @click="showCreate = !showCreate"
                class="px-3 py-2 rounded-md text-xs font-semibold transition"
                :class="showCreate ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'">
          {{ showCreate ? 'Tutup Form' : '+ Manifest Baru' }}
        </button>
        <NuxtLink to="/crossdoc" class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition">Cross-Doc</NuxtLink>
      </div>
    </div>

    <!-- Ringkasan -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        <span class="text-slate-500 dark:text-slate-400">Manifest Baru</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ countByStatus('CREATED') }}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        <span class="text-slate-500 dark:text-slate-400">In-Transit (Dimuat)</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ countByStatus('LOADED') }}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span class="text-slate-500 dark:text-slate-400">Diterima Tujuan</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ countByStatus('RECEIVED_DEST') }}</span>
      </span>
    </div>

    <!-- Form Buat Manifest -->
    <div v-if="showCreate" class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buat Manifest Cross-Dock</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Asal (Hub)</span>
          <select v-model="form.source_warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Tujuan (Spoke)</span>
          <select v-model="form.destination_warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
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
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Armada Pool (opsional)</span>
          <select v-model="form.vehicle_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option value="">— Tanpa armada pool (isi nopol manual) —</option>
            <option v-for="v in masterStore.vehicles" :key="v.id" :value="v.id">{{ v.plate_number }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Pengemudi (Driver)</span>
          <input v-model="form.driver_name" type="text" placeholder="Nama driver"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">No. Polisi (jika vendor/manual)</span>
          <input v-model="form.truck_plate" type="text" placeholder="B 1234 XYZ"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none" />
        </label>
      </div>
      <div class="space-y-2">
        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Item Barang (SKU)</span>
        <div v-for="(it, idx) in form.items" :key="idx" class="flex gap-2 items-center">
          <select v-model="it.product_id" class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="p in masterStore.products" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
          </select>
          <input v-model.number="it.planned_qty" type="number" min="1" placeholder="Qty rencana"
                 class="w-28 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <button v-if="form.items.length > 1" type="button" @click="form.items.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-sm px-1">✕</button>
        </div>
        <button type="button" @click="form.items.push({ product_id: '', planned_qty: 1 })" class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline">+ Tambah baris item</button>
      </div>
      <button type="button" :disabled="crossDockStore.isLoading" @click="handleCreate"
              class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
        Simpan Manifest (MANIFEST_CREATED)
      </button>
    </div>

    <!-- Daftar Manifest -->
    <AppDataTable
      :rows="crossDockStore.manifests"
      :columns="columns"
      :loading="crossDockStore.isLoading && crossDockStore.manifests.length === 0"
      row-key-prop="id"
      search-placeholder="Cari manifest, gudang, nopol…"
      empty-title="Belum ada manifest cross-dock"
      empty-hint="Buat manifest untuk memindahkan stok antar gudang via truk."
    >
      <template #row-actions="{ row }">
        <button
          v-if="row.status === 'CREATED'"
          type="button"
          class="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
          @click="openLoad(row)"
        >Proses Muat</button>
        <button
          v-else-if="row.status === 'LOADED'"
          type="button"
          class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          @click="openReceive(row)"
        >Terima di Tujuan</button>
        <button
          v-if="row.status === 'LOADED' && !row.waybill_id"
          type="button"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          @click="handleIssueWaybill(row)"
        >Terbitkan SJ</button>
        <span
          v-else-if="row.waybill_id"
          class="text-xs text-slate-400 font-mono"
          :title="row.sj_number"
        >SJ ✓</span>
        <NuxtLink
          :to="'/checkpoints?doc=' + row.manifest_number"
          class="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
        >Audit Trail</NuxtLink>
      </template>
      <template #mobile-actions="{ row }">
        <button
          v-if="row.status === 'CREATED'"
          type="button"
          class="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold"
          @click="openLoad(row)"
        >Proses Muat</button>
        <button
          v-else-if="row.status === 'LOADED'"
          type="button"
          class="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold"
          @click="openReceive(row)"
        >Terima di Tujuan</button>
        <button
          v-if="row.status === 'LOADED' && !row.waybill_id"
          type="button"
          class="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold"
          @click="handleIssueWaybill(row)"
        >Terbitkan SJ</button>
        <NuxtLink
          :to="'/checkpoints?doc=' + row.manifest_number"
          class="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium"
        >Audit Trail</NuxtLink>
      </template>
    </AppDataTable>

    <!-- Modal Proses (Muat / Terima) -->
    <div v-if="activeManifest" class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="activeManifest = null">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-xl md:rounded-xl p-5 w-full md:max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ modalMode === 'load' ? 'Proses Pemuatan' : 'Penerimaan di Gudang Tujuan' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{{ activeManifest.manifest_number }} • {{ activeManifest.source_warehouse_name }} → {{ activeManifest.destination_warehouse_name }}</p>
        </div>

        <div class="space-y-2">
          <div v-for="(it, idx) in activeItems" :key="it.id" class="p-2.5 rounded-md border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div class="flex justify-between items-baseline">
              <p class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ it.sku_code }} — {{ it.product_name }}</p>
              <p class="text-[10px] font-mono text-slate-400">Rencana {{ it.planned_qty }}</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-[11px] text-slate-500 shrink-0">{{ modalMode === 'load' ? 'Qty dimuat:' : 'Qty diterima:' }}</label>
              <input
                v-if="modalMode === 'load'"
                v-model.number="loadQty[idx]" type="number" min="0"
                class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                v-else
                v-model.number="receiveQty[idx]" type="number" min="0"
                class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <label class="block space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {{ modalMode === 'load' ? 'Nama Petugas Pemuatan (wajib)' : 'Nama Petugas Penerima di Tujuan (wajib)' }}
          </span>
          <input v-model="actorName" type="text" :placeholder="authStore.user?.full_name || 'Nama petugas'"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" @click="activeManifest = null" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="button" :disabled="crossDockStore.isLoading" @click="handleSubmitModal"
                  class="text-xs font-semibold px-4 py-2 rounded-md text-white transition disabled:opacity-50"
                  :class="modalMode === 'load' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'">
            {{ modalMode === 'load' ? 'Konfirmasi Muat (MANIFEST_LOADED)' : 'Konfirmasi Terima (RECEIVED_AT_DEST)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useCrossDockStore } from '~/stores/crossdock'
import { useMasterStore } from '~/stores/master'
import { useAuthStore } from '~/stores/auth'
import { useWaybillStore } from '~/stores/waybill'

const crossDockStore = useCrossDockStore()
const masterStore = useMasterStore()
const authStore = useAuthStore()
const waybillStore = useWaybillStore()

const showCreate = ref(false)
const activeManifest = ref(null)
const activeItems = ref([])
const modalMode = ref('load')
const loadQty = ref([])
const receiveQty = ref([])
const actorName = ref('')

const form = reactive({
  source_warehouse_id: authStore.activeWarehouseId || '',
  destination_warehouse_id: '',
  customer_id: '',
  vehicle_id: '',
  driver_name: '',
  truck_plate: '',
  items: [{ product_id: '', planned_qty: 1 }]
})

const columns = [
  { key: 'manifest_number', label: 'No. Manifest', type: 'mono', primary: true },
  { key: 'source_warehouse_name', label: 'Asal (Hub)', hideOnMobile: true },
  { key: 'destination_warehouse_name', label: 'Tujuan (Spoke)', hideOnMobile: true },
  { key: 'customer_name', label: 'Shipper', hideOnMobile: true },
  { key: 'vehicle_plate', label: 'Armada', hideOnMobile: true },
  { key: 'truck_plate', label: 'Nopol', hideOnDesktop: true, hideOnMobile: true },
  { key: 'status', label: 'Status', type: 'status' }
]

function countByStatus(s) {
  return (crossDockStore.manifests || []).filter(m => m.status === s).length
}

async function handleCreate() {
  if (!form.source_warehouse_id || !form.destination_warehouse_id || !form.customer_id) {
    crossDockStore.errorMessage = 'Gudang asal, tujuan, dan shipper wajib dipilih.'
    return
  }
  if (form.source_warehouse_id === form.destination_warehouse_id) {
    crossDockStore.errorMessage = 'Gudang asal dan tujuan tidak boleh sama.'
    return
  }
  const validItems = form.items.filter(i => i.product_id && i.planned_qty > 0)
  if (!validItems.length) {
    crossDockStore.errorMessage = 'Minimal 1 item dengan qty > 0.'
    return
  }
  const created = await crossDockStore.createManifest({
    source_warehouse_id: form.source_warehouse_id,
    destination_warehouse_id: form.destination_warehouse_id,
    customer_id: form.customer_id,
    vehicle_id: form.vehicle_id || undefined,
    driver_name: form.driver_name.trim() || undefined,
    truck_plate: form.truck_plate.trim() || undefined,
    items: validItems,
    actor_name: authStore.user?.full_name || 'Petugas Gudang'
  })
  if (created) {
    showCreate.value = false
    form.driver_name = ''
    form.truck_plate = ''
    form.items = [{ product_id: '', planned_qty: 1 }]
  }
}

async function openLoad(manifest) {
  const detail = await crossDockStore.fetchManifestDetail(manifest.id)
  if (!detail) return
  modalMode.value = 'load'
  activeManifest.value = detail
  activeItems.value = detail.items || []
  loadQty.value = (detail.items || []).map(i => Number(i.planned_qty))
  actorName.value = authStore.user?.full_name || ''
}

async function openReceive(manifest) {
  const detail = await crossDockStore.fetchManifestDetail(manifest.id)
  if (!detail) return
  modalMode.value = 'receive'
  activeManifest.value = detail
  activeItems.value = detail.items || []
  receiveQty.value = (detail.items || []).map(i => Number(i.loaded_qty || i.planned_qty))
  actorName.value = authStore.user?.full_name || ''
}

async function handleIssueWaybill(manifest) {
  // docs/09 v3.2.0 Prinsip 3: SJ + resi universal — cross-dock ikut terbit di satu titik yang sama
  const actor = authStore.user?.full_name || 'Petugas Gudang'
  const wb = await waybillStore.issueWaybill(manifest.id, actor, 'CROSS_DOCK_MANIFEST')
  if (wb) {
    crossDockStore.successMessage = `SJ ${wb.sj_number} & Resi ${wb.resi_number} diterbitkan untuk manifest ${manifest.manifest_number}`
    await crossDockStore.fetchManifests()
  }
}

async function handleSubmitModal() {
  if (!actorName.value.trim()) {
    crossDockStore.errorMessage = 'Nama petugas wajib diisi (audit trail).'
    return
  }
  let ok = false
  if (modalMode.value === 'load') {
    const items = activeItems.value.map((it, idx) => ({ id: it.id, loaded_qty: Number(loadQty.value[idx]) || 0 }))
    if (items.some(i => i.loaded_qty <= 0)) {
      crossDockStore.errorMessage = 'Qty muat harus > 0 untuk semua item.'
      return
    }
    ok = await crossDockStore.loadManifest(activeManifest.value.id, items, actorName.value.trim())
  } else {
    const items = activeItems.value.map((it, idx) => ({ id: it.id, received_qty: Number(receiveQty.value[idx]) || 0 }))
    if (items.some(i => i.received_qty <= 0)) {
      crossDockStore.errorMessage = 'Qty terima harus > 0 untuk semua item.'
      return
    }
    ok = await crossDockStore.receiveDest(activeManifest.value.id, items, actorName.value.trim())
  }
  if (ok) activeManifest.value = null
}

onMounted(() => {
  crossDockStore.fetchManifests()
  masterStore.fetchWarehouses()
  masterStore.fetchCustomers()
  masterStore.fetchProducts()
  masterStore.fetchVehicles()
})
</script>
