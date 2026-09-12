<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <!-- Feedback: satu baris gabungan -->
    <div v-if="feedback.text" class="p-3 rounded-md text-xs flex justify-between items-center border"
         :class="feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'">
      <span class="font-medium">{{ feedback.text }}</span>
      <button type="button" @click="clearFeedback" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header ramping -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Delivery Order &amp; Surat Jalan</h2>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fase 3 · terbitkan Surat Jalan + resi, lalu truk keluar lewat gate</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" @click="showCreate = !showCreate"
                class="px-3 py-2 rounded-md text-xs font-semibold transition"
                :class="showCreate ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'">
          {{ showCreate ? 'Tutup Form' : '+ Buat DO Baru' }}
        </button>
        <NuxtLink to="/waybills" class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition">Daftar SJ & Resi</NuxtLink>
        <button type="button" @click="printer.connectBluetoothPrinter()"
                class="px-3 py-2 rounded-md text-xs font-medium border transition"
                :class="printer.isConnected.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'">
          {{ printer.isConnected.value ? 'Printer siap' : 'Hubungkan printer' }}
        </button>
      </div>
    </div>

    <!-- Form Buat DO -->
    <div v-if="showCreate" class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buat Delivery Order</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Shipper / Customer</span>
          <select v-model="createForm.customer_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="c in masterStore.customers" :key="c.id" :value="c.id">{{ c.code }} — {{ c.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Asal</span>
          <select v-model="createForm.warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Penerima (Consignee) *</span>
          <input v-model="createForm.recipient_name" required type="text" placeholder="Nama / instansi penerima"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Telepon Penerima</span>
          <input v-model="createForm.recipient_phone" type="tel" placeholder="08xx (opsional)"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1 sm:col-span-2">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat Tujuan *</span>
          <input v-model="createForm.destination_address" required type="text" placeholder="Alamat lengkap pengiriman"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
      </div>
      <div class="space-y-2">
        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Item Barang (SKU)</span>
        <div v-for="(it, idx) in createForm.items" :key="idx" class="flex gap-2 items-center">
          <select v-model="it.product_id" class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="p in masterStore.products" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
          </select>
          <input v-model.number="it.ordered_qty" type="number" min="1" placeholder="Qty"
                 class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <button v-if="createForm.items.length > 1" type="button" @click="createForm.items.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-sm px-1">✕</button>
        </div>
        <button type="button" @click="createForm.items.push({ product_id: '', ordered_qty: 1 })" class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline">+ Tambah baris item</button>
      </div>
      <button type="button" :disabled="outboundStore.isLoading" @click="handleCreateOrder"
              class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
        Simpan Delivery Order (ORDER_CREATED)
      </button>
    </div>

    <!-- Ringkasan status satu baris -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
      <span v-for="s in ringkasanStatus" :key="s.label" class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
        <span class="text-slate-500 dark:text-slate-400">{{ s.label }}</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ s.count }}</span>
      </span>
    </div>

    <!-- Daftar order -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors">
      <div v-if="outboundStore.isLoading" class="p-8 text-center text-xs text-slate-400">Memuat order...</div>
      <div v-else-if="outboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400">Belum ada Delivery Order. Buat DO baru dari data shipper.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="order in outboundStore.orders" :key="order.id" class="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ order.order_number }}</span>
              <span class="text-[10px] font-medium" :class="statusTextClass(order.status)">{{ statusLabel(order.status) }}</span>
              <span v-if="waybillByOrder[order.id]" class="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                {{ waybillByOrder[order.id].sj_number }} · {{ waybillByOrder[order.id].resi_number }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {{ order.customer_name }} → {{ order.recipient_name }}<span v-if="order.destination_address" class="text-slate-400"> · {{ order.destination_address }}</span>
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="order.status === 'CREATED'"
              type="button"
              :disabled="outboundStore.isLoading"
              @click="handlePick(order)"
              class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
            >Proses Picking</button>
            <button
              v-else-if="order.status === 'PICKED'"
              type="button"
              :disabled="outboundStore.isLoading"
              @click="handlePack(order)"
              class="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
            >Proses Packing</button>
            <button
              v-if="canIssue(order)"
              type="button"
              :disabled="waybillStore.isLoading"
              @click="handleIssueWaybill(order)"
              class="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
            >Terbitkan SJ + Resi</button>
            <NuxtLink
              :to="'/checkpoints?doc=' + order.order_number"
              class="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >Audit Trail</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useAuthStore } from '~/stores/auth'
import { useMasterStore } from '~/stores/master'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const authStore = useAuthStore()
const masterStore = useMasterStore()
const printer = useThermalPrinter()

// Form Buat DO
const showCreate = ref(false)
const createForm = reactive({
  customer_id: '',
  warehouse_id: authStore.activeWarehouseId || '',
  recipient_name: '',
  recipient_phone: '',
  destination_address: '',
  items: [{ product_id: '', ordered_qty: 1 }]
})

async function handleCreateOrder() {
  if (!createForm.customer_id || !createForm.recipient_name.trim() || !createForm.destination_address.trim()) {
    feedback.value = { type: 'error', text: 'Shipper, nama penerima, dan alamat tujuan wajib diisi.' }
    return
  }
  const validItems = createForm.items.filter(i => i.product_id && i.ordered_qty > 0)
  if (!validItems.length) {
    feedback.value = { type: 'error', text: 'Minimal 1 item dengan qty > 0.' }
    return
  }
  const created = await outboundStore.createOrder({
    customer_id: createForm.customer_id,
    warehouse_id: createForm.warehouse_id || authStore.activeWarehouseId,
    recipient_name: createForm.recipient_name.trim(),
    recipient_phone: createForm.recipient_phone.trim() || undefined,
    destination_address: createForm.destination_address.trim(),
    items: validItems
  })
  syncFeedback()
  if (created) {
    showCreate.value = false
    createForm.recipient_name = ''
    createForm.recipient_phone = ''
    createForm.destination_address = ''
    createForm.items = [{ product_id: '', ordered_qty: 1 }]
  }
}

async function handlePick(order) {
  const ok = await outboundStore.pickOrder(order.id)
  syncFeedback()
  if (ok) feedback.value = { type: 'ok', text: `${order.order_number} — picking selesai, lanjut packing.` }
}

async function handlePack(order) {
  const ok = await outboundStore.packOrder(order.id)
  syncFeedback()
  if (ok) feedback.value = { type: 'ok', text: `${order.order_number} — packing selesai, siap terbitkan SJ.` }
}

// Feedback terpadu: error/sukses dari kedua store jadi satu notifikasi
const feedback = ref({ type: '', text: '' })
function clearFeedback() {
  feedback.value = { type: '', text: '' }
  waybillStore.errorMessage = ''
  waybillStore.successMessage = ''
  outboundStore.successMessage = ''
}
function syncFeedback() {
  if (waybillStore.errorMessage) feedback.value = { type: 'error', text: waybillStore.errorMessage }
  else if (waybillStore.successMessage) feedback.value = { type: 'ok', text: waybillStore.successMessage }
  else if (outboundStore.successMessage) feedback.value = { type: 'ok', text: outboundStore.successMessage }
}

const waybillByOrder = computed(() => {
  const map = {}
  for (const w of waybillStore.waybills) map[w.reference_id] = w
  return map
})

function canIssue(order) {
  return ['CREATED', 'PICKED', 'PACKED'].includes(order.status) && !waybillByOrder.value[order.id]
}

// Label manusia + warna penanda ringan (dot, bukan badge kotak)
function statusLabel(status) {
  const map = {
    CREATED: 'Baru', PICKED: 'Picked', PACKED: 'Packed',
    SHIPPED: 'Shipped', DELIVERED: 'Delivered',
    POD_VERIFIED: 'POD Terverifikasi', CANCELLED: 'Batal'
  }
  return map[status] || status
}
function statusTextClass(status) {
  const map = {
    CREATED: 'text-slate-400', PICKED: 'text-amber-600 dark:text-amber-400',
    PACKED: 'text-blue-600 dark:text-blue-400', SHIPPED: 'text-indigo-600 dark:text-indigo-400',
    DELIVERED: 'text-cyan-600 dark:text-cyan-400', POD_VERIFIED: 'text-emerald-600 dark:text-emerald-400',
    CANCELLED: 'text-rose-500'
  }
  return map[status] || 'text-slate-400'
}

const ringkasanStatus = computed(() => {
  const orders = outboundStore.orders || []
  const cnt = (arr) => orders.filter(o => arr.includes(o.status)).length
  return [
    { label: 'DO Baru', count: cnt(['CREATED']), dot: 'bg-slate-400' },
    { label: 'Picking & Packing', count: cnt(['PICKED', 'PACKED']), dot: 'bg-amber-500' },
    { label: 'SJ Terbit', count: Object.keys(waybillByOrder.value).length, dot: 'bg-blue-500' },
    { label: 'POD Terverifikasi', count: cnt(['POD_VERIFIED']), dot: 'bg-emerald-500' }
  ]
})

async function handleIssueWaybill(order) {
  const actor = authStore.user?.full_name || 'Petugas Gudang'
  const wb = await waybillStore.issueWaybill(order.id, actor)
  syncFeedback()
  if (wb) {
    await printer.printWaybillReceipt({
      order_number: order.order_number,
      sj_number: wb.sj_number,
      resi_number: wb.resi_number,
      recipient_name: order.recipient_name,
      destination: order.destination_address || order.destination_city || '',
      issued_by: actor
    })
    waybillStore.successMessage = `SJ ${wb.sj_number} / Resi ${wb.resi_number} terbit — struk tercetak untuk driver.`
    syncFeedback()
  }
}

onMounted(async () => {
  await Promise.all([
    outboundStore.fetchOrders(),
    waybillStore.fetchWaybills(),
    masterStore.fetchCustomers(),
    masterStore.fetchWarehouses(),
    masterStore.fetchProducts()
  ])
  if (masterStore.customers.length && !createForm.customer_id) createForm.customer_id = masterStore.customers[0].id
  syncFeedback()
})
</script>
