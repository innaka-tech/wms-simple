<template>
  <div class="space-y-6">
    <!-- Feedback -->
    <div v-if="waybillStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ waybillStore.errorMessage }}</span>
      </div>
      <button type="button" @click="waybillStore.errorMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>
    <div v-if="waybillStore.successMessage || outboundStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ waybillStore.successMessage || outboundStore.successMessage }}</span>
      </div>
      <button type="button" @click="waybillStore.successMessage = ''; outboundStore.successMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <div>
          <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Fase 3 — Barang Keluar • Checkpoint: ORDER → SJ/RESI → GATE-OUT</p>
          <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AppIcon name="package" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Order &amp; Terbitkan Surat Jalan</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Satu titik penerbitan Surat Jalan + Nomor Resi untuk semua jenis pengiriman.</p>
        </div>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/waybills" class="px-3.5 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5">
          <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
          <span>Daftar Waybill</span>
        </NuxtLink>
        <button type="button" @click="printer.connectBluetoothPrinter()" class="px-3.5 py-2 rounded-md text-xs font-semibold border transition flex items-center space-x-1.5" :class="printer.isConnected.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'">
          <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
          <span>{{ printer.isConnected.value ? 'Printer Terhubung' : 'Hubungkan Printer' }}</span>
        </button>
      </div>
    </div>

    <!-- Order List -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
      <div v-if="outboundStore.isLoading" class="p-8 text-center text-xs text-slate-400 font-mono">Memuat order...</div>
      <div v-else-if="outboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400 font-mono">Belum ada order pengiriman.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="order in outboundStore.orders" :key="order.id" class="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ order.order_number }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border" :class="statusBadge(order.status)">{{ order.status }}</span>
              <span v-if="waybillByOrder[order.id]" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {{ waybillByOrder[order.id].sj_number }} / {{ waybillByOrder[order.id].resi_number }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              {{ order.customer_name }} → {{ order.recipient_name }} <span v-if="order.destination_address" class="text-slate-400">• {{ order.destination_address }}</span>
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="canIssue(order)"
              type="button"
              :disabled="waybillStore.isLoading"
              @click="handleIssueWaybill(order)"
              class="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
              <span>Terbitkan SJ + Resi</span>
            </button>
            <NuxtLink
              to="/outbound/pod"
              class="px-3.5 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
            >POD</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useAuthStore } from '~/stores/auth'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const authStore = useAuthStore()
const printer = useThermalPrinter()

const waybillByOrder = computed(() => {
  const map = {}
  for (const w of waybillStore.waybills) map[w.reference_id] = w
  return map
})

function canIssue(order) {
  return ['CREATED', 'PICKED', 'PACKED'].includes(order.status) && !waybillByOrder.value[order.id]
}

function statusBadge(status) {
  const map = {
    CREATED: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    PICKED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    PACKED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    SHIPPED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    DELIVERED: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    POD_VERIFIED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }
  return map[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
}

async function handleIssueWaybill(order) {
  const actor = authStore.user?.full_name || 'Petugas Gudang'
  const wb = await waybillStore.issueWaybill(order.id, actor)
  if (wb) {
    await printer.printWaybillReceipt({
      order_number: order.order_number,
      sj_number: wb.sj_number,
      resi_number: wb.resi_number,
      recipient_name: order.recipient_name,
      destination: order.destination_address || order.destination_city || '',
      issued_by: actor
    })
    outboundStore.successMessage = `SJ ${wb.sj_number} / Resi ${wb.resi_number} siap — struk tercetak untuk sopir.`
  }
}

onMounted(async () => {
  await Promise.all([outboundStore.fetchOrders(), waybillStore.fetchWaybills()])
})
</script>
