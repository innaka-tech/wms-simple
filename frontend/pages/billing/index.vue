<template>
  <div class="space-y-6">
    <!-- Feedback -->
    <div v-if="billingStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ billingStore.errorMessage }}</span>
      </div>
      <button type="button" @click="billingStore.errorMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>
    <div v-if="billingStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ billingStore.successMessage }}</span>
      </div>
      <button type="button" @click="billingStore.successMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs transition-colors">
      <div class="flex items-center gap-2 mb-1">
        <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800">
          Billing &amp; Keuangan 3PL
        </span>
      </div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
        <AppIcon name="stock" custom-class="w-5 h-5 text-violet-600 dark:text-violet-400" />
        <span>Faktur Penagihan &amp; Pembayaran</span>
      </h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">POD terverifikasi → terbit Faktur Invoice → pembayaran diterima = LUNAS. Audit trail keuangan terintegrasi.</p>
      
      <!-- Metric Cards (Pastel Palette) -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
        <div class="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-rose-700 dark:text-rose-300">Outstanding / Piutang</p>
            <p class="text-lg md:text-xl font-mono font-bold text-rose-800 dark:text-rose-200 mt-1">Rp {{ formatIDR(billingStore.outstandingTotal) }}</p>
            <span class="text-[10px] text-rose-600/70 dark:text-rose-400/60 font-medium">Menunggu Pelunasan</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <AppIcon name="alert-triangle" custom-class="w-4 h-4" />
          </div>
        </div>

        <div class="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-teal-700 dark:text-teal-300">Payment Received (LUNAS)</p>
            <p class="text-lg md:text-xl font-mono font-bold text-teal-800 dark:text-teal-200 mt-1">Rp {{ formatIDR(billingStore.paidTotal) }}</p>
            <span class="text-[10px] text-teal-600/70 dark:text-teal-400/60 font-medium">Pembayaran Sah Terkonfirmasi</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-teal-100/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <AppIcon name="check-circle" custom-class="w-4 h-4" />
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-slate-600 dark:text-slate-300">Invoice Terbit</p>
            <p class="text-lg md:text-xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">{{ billingStore.invoices.filter(i => i.status !== 'VOID').length }}</p>
            <span class="text-[10px] text-slate-400 font-medium">Total Dokumen Tagihan</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <AppIcon name="file-text" custom-class="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    <!-- Siap Ditagih -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-3 transition-colors">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
        Order Siap Dibilling (POD Terverifikasi · billing_ready)
      </h3>
      <div v-if="readyToBill.length === 0" class="p-4 text-center text-xs text-slate-400 font-mono">Tidak ada order menunggu invoicing.</div>
      <div v-for="order in readyToBill" :key="order.id" 
           class="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-md border transition-all"
           :class="route.query.order === order.order_number ? 'border-purple-400 dark:border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-400 shadow-2xs' : 'border-slate-100 dark:border-slate-800'">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ order.order_number }}</p>
            <span v-if="route.query.order === order.order_number" class="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              Baru Diverifikasi POD
            </span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ order.recipient_name }} • {{ order.customer_name }}</p>
        </div>
        <div class="flex items-center gap-2 w-full md:w-auto">
          <input
            v-model="amountByOrder[order.id]"
            type="number"
            min="1"
            required
            placeholder="Nilai faktur (Rp, wajib diisi)"
            class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none w-full md:w-48 font-mono"
          />
          <button
            type="button"
            title="Hitung estimasi tagihan otomatis"
            @click="autoFillAmount(order)"
            class="px-2.5 py-2 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 font-semibold whitespace-nowrap transition cursor-pointer"
          >
            Auto Estimasi
          </button>
        </div>
        <button
          type="button"
          :disabled="billingStore.isLoading"
          @click="handleIssueInvoice(order)"
          class="px-3.5 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shadow-2xs whitespace-nowrap"
        >
          Terbitkan Faktur
        </button>
      </div>
    </div>

    <!-- Daftar Faktur -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
      <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Daftar Invoice &amp; Pembayaran</h3>
        <select v-model="statusFilter" @change="loadInvoices" class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 focus:outline-none">
          <option value="">Semua</option>
          <option value="ISSUED">Belum LUNAS</option>
          <option value="PAID">LUNAS</option>
        </select>
      </div>
      <div v-if="billingStore.isLoading" class="p-8 text-center text-xs text-slate-400 font-mono">Memuat faktur...</div>
      <div v-else-if="billingStore.invoices.length === 0" class="p-8 text-center text-xs text-slate-400 font-mono">Belum ada Invoice diterbitkan.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="inv in billingStore.invoices" :key="inv.id" class="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ inv.invoice_number }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border" :class="inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'">
                {{ inv.status === 'PAID' ? 'LUNAS' : 'BELUM LUNAS' }}
              </span>
              <span class="text-[10px] font-mono text-slate-400">{{ inv.currency }}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">Order {{ inv.order_number || '-' }} • {{ inv.recipient_name || '-' }}</p>
          </div>
          <div class="text-xs font-mono shrink-0 md:text-right">
            <p class="font-bold" :class="inv.amount ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'">
              {{ inv.amount ? `Rp ${formatIDR(inv.amount)}` : 'Nominal Belum Ditentukan' }}
            </p>
            <p class="text-[10px] text-slate-400">Terbayar: Rp {{ formatIDR(inv.total_paid || 0) }}</p>
          </div>
          <button
            v-if="inv.status === 'ISSUED'"
            type="button"
            @click="openPayment(inv)"
            class="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0"
          >
            Catat Pembayaran
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Pembayaran -->
    <div v-if="paymentTarget" class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="paymentTarget = null">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-xl md:rounded-xl p-5 w-full md:max-w-md space-y-4 shadow-2xl">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Catat Payment Received</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{{ paymentTarget.invoice_number }} • Order {{ paymentTarget.order_number }}</p>
        </div>
        <div class="text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 space-y-1">
          <div class="flex justify-between"><span class="text-slate-500">Nilai faktur</span><span class="font-bold">Rp {{ formatIDR(paymentTarget.amount) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Sudah dibayar</span><span class="font-bold">Rp {{ formatIDR(paymentTarget.total_paid || 0) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Sisa</span><span class="font-bold text-rose-500">Rp {{ formatIDR(Math.max(0, Number(paymentTarget.amount || 0) - Number(paymentTarget.total_paid || 0))) }}</span></div>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Jumlah Pembayaran (Rp)</label>
          <input v-model="paymentForm.amount" type="number" min="1" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-3 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Metode</label>
          <select v-model="paymentForm.method" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
            <option value="TRANSFER">TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="QRIS">QRIS</option>
            <option value="GIRO">GIRO</option>
          </select>
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="paymentTarget = null" class="flex-1 py-2.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition">Batal</button>
          <button type="button" :disabled="billingStore.isLoading" @click="handlePayment" class="flex-1 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer">
            Terima Pembayaran
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBillingStore } from '~/stores/billing'
import { useOutboundStore } from '~/stores/outbound'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const billingStore = useBillingStore()
const outboundStore = useOutboundStore()
const authStore = useAuthStore()

const statusFilter = ref('')
const amountByOrder = reactive({})
const paymentTarget = ref(null)
const paymentForm = reactive({ amount: '', method: 'TRANSFER' })

const readyToBill = computed(() => {
  const invoicedOrderIds = new Set(
    billingStore.invoices.filter((i) => i.status !== 'VOID').map((i) => i.outbound_order_id)
  )
  return outboundStore.orders.filter(
    (o) => o.status === 'POD_VERIFIED' && Boolean(o.billing_ready) && o.payment_status !== 'PAID' && !invoicedOrderIds.has(o.id)
  )
})

function formatIDR(v) {
  return Number(v || 0).toLocaleString('id-ID')
}

function openPayment(inv) {
  paymentTarget.value = inv
  const remaining = Math.max(0, Number(inv.amount || 0) - Number(inv.total_paid || 0))
  paymentForm.amount = remaining > 0 ? String(remaining) : ''
  paymentForm.method = 'TRANSFER'
}

function autoFillAmount(order) {
  // Hitung estimasi tagihan: default ekspedisi Rp 150.000 atau berbasis berat kargo
  const baseTariff = 150000
  const weight = Number(order.total_weight_kg || 0)
  const estimated = weight > 0 ? Math.max(baseTariff, Math.round(weight * 25000)) : baseTariff
  amountByOrder[order.id] = String(estimated)
}

async function handleIssueInvoice(order) {
  const actor = authStore.user?.full_name || 'Admin Adm'
  const raw = amountByOrder[order.id]
  const amount = Number(raw)
  if (!amount || amount <= 0) {
    billingStore.errorMessage = 'Nilai faktur wajib diisi dan harus lebih dari Rp 0'
    return
  }
  await billingStore.issueInvoice(order.id, amount, actor, `Faktur untuk order ${order.order_number}`)
  amountByOrder[order.id] = ''
}

async function handlePayment() {
  const amount = Number(paymentForm.amount)
  if (!amount || amount <= 0) {
    billingStore.errorMessage = 'Jumlah pembayaran wajib lebih dari 0'
    return
  }
  const actor = authStore.user?.full_name || 'Admin Adm'
  await billingStore.recordPayment(paymentTarget.value.id, amount, paymentForm.method, actor)
  paymentTarget.value = null
}

function loadInvoices() {
  billingStore.fetchInvoices(statusFilter.value || undefined)
}

onMounted(async () => {
  await Promise.all([loadInvoices(), outboundStore.fetchOrders()])
  if (route.query.order) {
    const targetOrder = readyToBill.value.find(o => o.order_number === route.query.order)
    if (targetOrder) {
      autoFillAmount(targetOrder)
      billingStore.successMessage = `Order ${targetOrder.order_number} berhasil dimuat dari verifikasi POD. Estimasi tagihan telah diisi otomatis.`
    }
  }
})
</script>
