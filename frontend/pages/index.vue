<template>
  <div class="max-w-6xl mx-auto space-y-5">

    <!-- Header ramping: sapaan + dua aksi cepat -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          {{ greeting }}, {{ firstName }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{ authStore.activeWarehouseName }} • {{ authStore.roleLabel }}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink
          v-if="authStore.canAccess('stock')"
          to="/stock"
          class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition border border-slate-200 dark:border-slate-800"
        >Posisi Stok</NuxtLink>
        <NuxtLink
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass"
          class="px-3 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition"
        >Pos Gerbang</NuxtLink>
      </div>
    </div>

    <!-- Peta alur: kartu fase sekaligus metrik kerja (menggantikan telemetry bar terpisah) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <NuxtLink
        v-for="fase in alurOperasional"
        :key="fase.no"
        :to="fase.to"
        class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-2 hover:border-slate-400 dark:hover:border-slate-600 transition group"
        :class="fase.topBorder"
      >
        <p class="text-[10px] font-mono font-bold uppercase tracking-wider" :class="fase.text">{{ fase.label }}</p>
        <p class="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">{{ fase.count }}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">{{ fase.metric }}</p>
      </NuxtLink>
    </div>

    <!-- Dua kolom: audit terkiri + modul -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

      <!-- Strip audit terakhir (ringkas) -->
      <div class="lg:col-span-2 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Checkpoint Terakhir</h3>
          <NuxtLink to="/checkpoints" class="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline">Semua →</NuxtLink>
        </div>
        <div v-if="recentCheckpoints.length === 0" class="py-4 text-center text-[11px] text-slate-400">Belum ada aktivitas hari ini.</div>
        <div v-else class="space-y-0.5">
          <NuxtLink v-for="cp in recentCheckpoints" :key="cp.id" :to="'/checkpoints?doc=' + (cp.entity_number || '')"
                    class="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="cpDot(cp.step_code)"></span>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{{ cp.entity_number || cp.entity_type }}</p>
              <p class="text-[10px] text-slate-400 truncate">{{ cp.step_label }}</p>
            </div>
            <span class="text-[10px] font-mono text-slate-400 shrink-0">{{ shortTime(cp.created_at) }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Modul: daftar teks ramping urut fase (bukan grid kartu) -->
      <div class="lg:col-span-3 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Modul Operasional</h3>
        <NuxtLink
          v-for="m in daftarModul"
          :key="m.to"
          :to="m.to"
          class="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 group"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="m.dot"></span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:underline">{{ m.label }}</p>
            <p class="text-[10px] text-slate-400">{{ m.hint }}</p>
          </div>
          <span v-if="m.badge" class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                :class="m.count > 0 ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'">{{ m.badge }}</span>
        </NuxtLink>
      </div>

    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useStockStore } from '~/stores/stock'
import { useGatePassStore } from '~/stores/gatePass'
import { useInboundStore } from '~/stores/inbound'
import { useDebulkingStore } from '~/stores/debulking'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useBillingStore } from '~/stores/billing'

const authStore = useAuthStore()
const stockStore = useStockStore()
const gatePassStore = useGatePassStore()
const inboundStore = useInboundStore()
const debulkingStore = useDebulkingStore()
const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const billingStore = useBillingStore()

onMounted(async () => {
  try {
    await Promise.all([
      stockStore.fetchStockLevels(),
      gatePassStore.fetchLogs(),
      gatePassStore.fetchVehicles(),
      inboundStore.fetchOrders(),
      debulkingStore.fetchWorkOrders(),
      outboundStore.fetchOrders(),
      waybillStore.fetchWaybills(),
      billingStore.fetchInvoices()
    ])
    try {
      const { apiFetch } = useWmsApi()
      const cpRes = await apiFetch('/checkpoints/recent?limit=6')
      if (cpRes.success) recentCheckpoints.value = cpRes.data || []
    } catch (e) {
      console.error('Failed to load recent checkpoints:', e)
    }
  } catch (err) {
    console.error('Failed to load dashboard telemetry:', err)
  }
})

const firstName = computed(() => (authStore.user?.full_name || 'Petugas').split(' ')[0])
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  return 'Selamat sore'
})

const departedVehiclesCount = computed(() =>
  (gatePassStore.logs || []).filter(gp => gp.status === 'DEPARTED').length
)

const inboundAktif = computed(() =>
  (inboundStore.orders || []).filter(o => !['PUTAWAY_COMPLETED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length
)
const repackAktif = computed(() =>
  (debulkingStore.workOrders || []).filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
)
const siapKirim = computed(() =>
  (outboundStore.orders || []).filter(o => ['CREATED', 'PICKED', 'PACKED'].includes(o.status)).length
)
const menungguPod = computed(() =>
  (waybillStore.waybills || []).filter(w => ['ISSUED', 'PRINTED', 'IN_TRANSIT'].includes(w.status)).length
)
const belumLunas = computed(() =>
  (billingStore.invoices || []).filter(i => i.status === 'ISSUED').length
)

// Strip audit checkpoint terakhir
const recentCheckpoints = ref([])
const CHECKPOINT_COLORS = {
  PO_: 'bg-emerald-500', PUTAWAY: 'bg-emerald-500', INBOUND: 'bg-emerald-500',
  DEBULK: 'bg-amber-500', CONVERSION: 'bg-amber-500',
  MANIFEST: 'bg-blue-500', LOADED: 'bg-blue-500', DEPART: 'bg-blue-500', GATE: 'bg-blue-500', PICK: 'bg-blue-500', PACK: 'bg-blue-500', SHIP: 'bg-blue-500', WAYBILL: 'bg-blue-500', VENDOR: 'bg-blue-500', RECEIVED: 'bg-blue-500',
  POD: 'bg-cyan-500', INVOICE: 'bg-cyan-500', PAYMENT: 'bg-cyan-500', PAID: 'bg-cyan-500', CROSS_DOC: 'bg-cyan-500'
}
function cpDot(code) {
  const key = Object.keys(CHECKPOINT_COLORS).find(k => (code || '').includes(k))
  return key ? CHECKPOINT_COLORS[key] : 'bg-slate-400'
}
function shortTime(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
}

// Lima fase — kartu metrik sekaligus pintu modul
const alurOperasional = computed(() => [
  { no: 1, label: 'Inbound', count: inboundAktif.value, metric: 'kiriman aktif', to: '/inbound/receive', topBorder: 'border-t-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { no: 2, label: 'Warehouse Operation', count: repackAktif.value, metric: 'work order aktif', to: '/debulking', topBorder: 'border-t-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { no: 3, label: 'Outbound', count: siapKirim.value, metric: 'order siap proses', to: '/outbound', topBorder: 'border-t-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  { no: 4, label: 'Delivery & Billing', count: menungguPod.value + belumLunas.value, metric: 'menunggu POD / bayar', to: '/outbound/pod', topBorder: 'border-t-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  { no: 5, label: 'Monitoring', count: stockStore.stockLevels.length, metric: 'SKU terpantau', to: '/stock', topBorder: 'border-t-slate-400', text: 'text-slate-500 dark:text-slate-400' }
])

// Daftar modul — hanya yang punya akses per role aktif
const daftarModul = computed(() => {
  const all = [
    { to: '/inbound/receive', label: 'Receiving (Penerimaan Dock)', hint: 'Fase 1 · scan & tally kedatangan', dot: 'bg-emerald-500', badge: inboundAktif.value || '', access: 'inbound' },
    { to: '/debulking', label: 'Debulking & Repacking', hint: 'Fase 2 · konversi kemasan curah', dot: 'bg-amber-500', badge: repackAktif.value || '', access: 'debulking' },
    { to: '/outbound', label: 'Delivery Order & Surat Jalan', hint: 'Fase 3 · DO, SJ + resi semua jalur', dot: 'bg-blue-500', badge: siapKirim.value || '', access: 'outbound_orders' },
    { to: '/waybills', label: 'Surat Jalan & Resi', hint: 'Fase 3 · semua dokumen keluar', dot: 'bg-blue-500', badge: '', access: 'waybills' },
    { to: '/gate-pass', label: 'Gate Pass (Pos Jaga)', hint: 'Fase 3 · dokumen, odometer, solar', dot: 'bg-blue-500', badge: departedVehiclesCount.value || '', access: 'gate_pass' },
    { to: '/outbound/pod', label: 'Delivery & POD', hint: 'Fase 4 · foto serah terima + TTD', dot: 'bg-cyan-500', badge: menungguPod.value || '', access: 'outbound_pod' },
    { to: '/billing', label: 'Faktur & Pembayaran', hint: 'Fase 4 · sampai LUNAS', dot: 'bg-cyan-500', badge: belumLunas.value || '', access: 'billing' }
  ]
  return all.filter(m => authStore.canAccess(m.access))
})
</script>
