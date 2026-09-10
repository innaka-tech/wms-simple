<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <!-- Feedback -->
    <div v-if="inboundStore.errorMessage" class="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span>{{ inboundStore.errorMessage }}</span>
      <button type="button" @click="inboundStore.errorMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>
    <div v-if="inboundStore.successMessage" class="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span>{{ inboundStore.successMessage }}</span>
      <button type="button" @click="inboundStore.successMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Receiving (Penerimaan Dock)</h2>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fase 1 · buat PO → terima fisik (tally) → simpan ke rak. Stok baru bertambah saat putaway.</p>
      </div>
      <button type="button" @click="showCreate = !showCreate"
              class="px-3 py-2 rounded-md text-xs font-semibold transition shrink-0"
              :class="showCreate ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'">
        {{ showCreate ? 'Tutup' : '+ PO Masuk Baru' }}
      </button>
    </div>

    <!-- Form PO baru -->
    <div v-if="showCreate" class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buat PO Inbound</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Pengirim / Shipper</span>
          <select v-model="form.customer_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Tujuan</span>
          <select v-model="form.warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
          </select>
        </label>
      </div>
      <div class="space-y-2">
        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Item Barang (SKU)</span>
        <div v-for="(it, idx) in form.items" :key="idx" class="flex gap-2 items-center">
          <select v-model="it.product_id" class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
          </select>
          <input v-model.number="it.ordered_qty" type="number" min="1" placeholder="Qty Order"
                 class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <button v-if="form.items.length > 1" type="button" @click="form.items.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-sm px-1">✕</button>
        </div>
        <button type="button" @click="form.items.push({ product_id: products[0]?.id, ordered_qty: 1 })" class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline">+ Tambah baris barang</button>
      </div>
      <button type="button" :disabled="inboundStore.isLoading" @click="submitCreate"
              class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
        Simpan PO (Checkpoint: PO_CREATED)
      </button>
    </div>

    <!-- Daftar PO -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors">
      <div v-if="inboundStore.isLoading && inboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400">Memuat PO...</div>
      <div v-else-if="inboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400">Belum ada PO Inbound. Buat PO terlebih dulu.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="po in inboundStore.orders" :key="po.id" class="px-4 py-3">
          <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ po.po_number }}</span>
                <span class="text-[10px] font-medium" :class="statusClass(po.status)">{{ statusLabel(po.status) }}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {{ po.customer_name }}<span v-if="po.truck_plate"> · truk {{ po.truck_plate }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" @click="openDetail(po)"
                      class="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                {{ expandedId === po.id ? 'Tutup' : 'Proses' }}
              </button>
              <NuxtLink :to="'/checkpoints?doc=' + po.po_number" class="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">Audit Trail</NuxtLink>
            </div>
          </div>

          <!-- Panel proses per PO -->
          <div v-if="expandedId === po.id" class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <!-- Item & aksi sesuai status -->
            <div v-for="item in (po.items || [])" :key="item.id" class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between flex-wrap gap-1">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ item.sku_code || item.product_name || item.product_id }}</p>
                <p class="text-[10px] font-mono text-slate-400">
                  Order {{ item.ordered_qty }}<template v-if="item.received_qty > 0"> · Diterima {{ item.received_qty }}</template><template v-if="item.storage_qty > 0"> · Di Rak {{ item.storage_qty }}</template>
                </p>
              </div>

              <!-- Step 2: terima fisik -->
              <div v-if="po.status === 'CREATED'" class="flex flex-wrap items-center gap-2">
                <input v-model.number="receiveDraft[item.id]" type="number" min="0" :max="item.ordered_qty" placeholder="Qty terima (tally)"
                       class="w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
                <select v-model="conditionDraft[item.id]" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-2 py-1.5 text-[11px] text-slate-900 dark:text-white focus:outline-none">
                  <option value="GOOD">Good (Baik)</option>
                  <option value="DAMAGED">Damaged (Rusak)</option>
                </select>
              </div>

              <!-- Step 3: putaway -->
              <div v-else-if="po.status === 'RECEIVED'" class="flex flex-wrap items-center gap-2">
                <input v-model.number="putawayDraft[item.id].storage_qty" type="number" min="0" :max="item.received_qty" placeholder="Qty ke rak"
                       class="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
                <input v-model.number="putawayDraft[item.id].cross_dock_qty" type="number" min="0" :max="item.received_qty" placeholder="Qty cross-dock"
                       class="w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
                <span class="text-[10px] text-slate-400">rak + cross-dock = {{ item.received_qty }} (wajib)</span>
              </div>
            </div>

            <!-- Info truk (step 2) -->
            <div v-if="po.status === 'CREATED'" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input v-model="truckPlate" placeholder="No. Polisi truk pengangkut" class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
              <input v-model="driverName" placeholder="Nama pengemudi (driver)" class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
            </div>

            <button type="button" :disabled="inboundStore.isLoading" @click="po.status === 'CREATED' ? submitReceive(po) : submitPutaway(po)"
                    class="px-4 py-2 rounded-md text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                    :class="po.status === 'CREATED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'">
              {{ po.status === 'CREATED' ? 'Konfirmasi Receiving Fisik (PO_RECEIVED)' : 'Selesaikan Putaway (stok masuk rak)' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useInboundStore } from '~/stores/inbound'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'

const inboundStore = useInboundStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()

const showCreate = ref(false)
const expandedId = ref('')
const customers = ref([])
const warehouses = ref([])
const products = ref([])
const truckPlate = ref('')
const driverName = ref('')
const receiveDraft = reactive({})
const conditionDraft = reactive({})
const putawayDraft = reactive({})

const form = ref({
  customer_id: '',
  warehouse_id: 'a0000000-0000-0000-0000-000000000001',
  items: [{ product_id: '', ordered_qty: 1 }]
})

function statusLabel(s) {
  return { CREATED: 'Menunggu Receiving', RECEIVED: 'Received — perlu Putaway', PUTAWAY_COMPLETED: 'Putaway Completed — stok masuk' }[s] || s
}
function statusClass(s) {
  return { CREATED: 'text-amber-600 dark:text-amber-400', RECEIVED: 'text-blue-600 dark:text-blue-400', PUTAWAY_COMPLETED: 'text-emerald-600 dark:text-emerald-400' }[s] || 'text-slate-400'
}

function openDetail(po) {
  expandedId.value = expandedId.value === po.id ? '' : po.id
  for (const item of (po.items || [])) {
    receiveDraft[item.id] = item.ordered_qty
    conditionDraft[item.id] = 'GOOD'
    if (!putawayDraft[item.id]) putawayDraft[item.id] = { storage_qty: item.received_qty, cross_dock_qty: 0 }
  }
}

async function submitCreate() {
  const items = form.value.items.filter(i => i.product_id && i.ordered_qty > 0)
  if (!form.value.customer_id || items.length === 0) {
    inboundStore.errorMessage = 'Pengirim & minimal 1 barang dengan qty diisi'
    return
  }
  const created = await inboundStore.createOrder({
    ...form.value,
    items,
    actor_name: authStore.user?.full_name || 'Petugas Gudang'
  })
  if (created) showCreate.value = false
}

async function submitReceive(po) {
  const items = (po.items || []).map(it => ({
    id: it.id,
    received_qty: Number(receiveDraft[it.id] ?? it.ordered_qty),
    item_condition: conditionDraft[it.id] || 'GOOD'
  }))
  await inboundStore.receivePhysical(po.id, {
    truck_plate: truckPlate.value,
    driver_name: driverName.value,
    items,
    actor_name: authStore.user?.full_name || 'Petugas Dock'
  })
  if (po.items?.length) openDetail(po) // refresh draft
  expandedId.value = po.id
}

async function submitPutaway(po) {
  const items = (po.items || []).map(it => ({
    id: it.id,
    product_id: it.product_id,
    received_qty: it.received_qty,
    cross_dock_qty: Number(putawayDraft[it.id]?.cross_dock_qty ?? 0),
    storage_qty: Number(putawayDraft[it.id]?.storage_qty ?? it.received_qty)
  }))
  await inboundStore.putaway(po.id, {
    items,
    actor_name: authStore.user?.full_name || 'Petugas Gudang'
  })
}

onMounted(async () => {
  await inboundStore.fetchOrders()
  if (authStore.user?.full_name) driverName.value = ''
  try {
    const [c, w, p] = await Promise.all([
      apiFetch('/master/customers'),
      apiFetch('/warehouses'),
      apiFetch('/products')
    ])
    if (c.success) customers.value = c.data || []
    if (w.success) warehouses.value = w.data || []
    if (p.success) products.value = p.data || []
    form.value.customer_id = customers.value[0]?.id || ''
    form.value.items[0].product_id = products.value[0]?.id || ''
  } catch (e) {
    console.error('Gagal memuat master data:', e)
  }
})
</script>
