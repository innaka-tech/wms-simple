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
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Order &amp; Surat Jalan</h2>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fase 3 · terbitkan SJ + resi, lalu truk keluar lewat gerbang</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <NuxtLink to="/waybills" class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition">Daftar Resi</NuxtLink>
        <button type="button" @click="printer.connectBluetoothPrinter()"
                class="px-3 py-2 rounded-md text-xs font-medium border transition"
                :class="printer.isConnected.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'">
          {{ printer.isConnected.value ? 'Printer siap' : 'Hubungkan printer' }}
        </button>
      </div>
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
      <div v-else-if="outboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400">Belum ada order pengiriman.</div>
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
              v-if="canIssue(order)"
              type="button"
              :disabled="waybillStore.isLoading"
              @click="handleIssueWaybill(order)"
              class="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
            >Terbitkan SJ + Resi</button>
            <NuxtLink
              :to="'/checkpoints?doc=' + order.order_number"
              class="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >Riwayat</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useAuthStore } from '~/stores/auth'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const authStore = useAuthStore()
const printer = useThermalPrinter()

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
    CREATED: 'Baru', PICKED: 'Sudah pick', PACKED: 'Sudah pack',
    SHIPPED: 'Dikirim', DELIVERED: 'Sampai tujuan',
    POD_VERIFIED: 'POD terverifikasi', CANCELLED: 'Batal'
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
    { label: 'Baru', count: cnt(['CREATED']), dot: 'bg-slate-400' },
    { label: 'Pick/Pack', count: cnt(['PICKED', 'PACKED']), dot: 'bg-amber-500' },
    { label: 'Sudah ada SJ', count: Object.keys(waybillByOrder.value).length, dot: 'bg-blue-500' },
    { label: 'POD verifikasi', count: cnt(['POD_VERIFIED']), dot: 'bg-emerald-500' }
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
    waybillStore.successMessage = `SJ ${wb.sj_number} / Resi ${wb.resi_number} terbit — struk tercetak untuk sopir.`
    syncFeedback()
  }
}

onMounted(async () => {
  await Promise.all([outboundStore.fetchOrders(), waybillStore.fetchWaybills()])
  syncFeedback()
})
</script>
