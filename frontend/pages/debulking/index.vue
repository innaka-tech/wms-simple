<template>
  <div class="space-y-6 max-w-6xl">
    <!-- Feedback Alerts -->
    <div v-if="debulkingStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ debulkingStore.errorMessage }}</span>
      </div>
      <button type="button" @click="debulkingStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="debulkingStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ debulkingStore.successMessage }}</span>
      </div>
      <button type="button" @click="debulkingStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header & Order Picker -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-3 transition-colors">
      <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Fase 2 — Warehouse Operation • Repacking On-Demand</p>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">Debulking &amp; Repacking</h3>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Toleransi Susut: &le; 1.00%</span>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Konversi Parent SKU (Jumbo Bag / Drum / Pack Besar) menjadi Child SKU (Karung Retail).
        Work order ini <span class="font-semibold text-slate-700 dark:text-slate-300">tertaut ke Delivery Order</span> — repacking hanya dikerjakan setelah ada permintaan kirim (docs/09 Prinsip 2).
      </p>

      <div class="space-y-1.5 pt-1">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilih Delivery Order (status terbuka)</label>
        <select
          v-model.number="selectedOrderKey"
          :disabled="isLoadingOrders"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none disabled:opacity-60"
        >
          <option :value="-1" disabled>{{ isLoadingOrders ? 'Memuat daftar order…' : '— Pilih order kirim —' }}</option>
          <option v-for="(o, i) in openOrders" :key="o.id" :value="i">
            {{ o.order_number }} — {{ o.recipient_name }} ({{ o.status }})
          </option>
        </select>
        <p v-if="!isLoadingOrders && openOrders.length === 0" class="text-xs text-slate-500 dark:text-slate-400">
          Belum ada order terbuka. Buat dulu di <span class="font-semibold">Outbound → Delivery Order &amp; SJ</span>.
        </p>
      </div>
    </div>

    <!-- 2-Column Responsive Input & Output Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

      <!-- Input Parent Bulky (Left Card) -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Input Kargo Bulky (Parent SKU)</h4>
            <span v-if="inputProduct" class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ inputProduct.sku_code }}</span>
          </div>

          <div class="mt-4 flex items-center space-x-4">
            <div class="space-y-1">
              <label class="text-[11px] text-slate-400 font-semibold uppercase block">Qty ({{ inputUomCode || 'UoM' }})</label>
              <input
                v-model.number="inputQty"
                type="number"
                min="0.1"
                step="0.1"
                class="w-28 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2.5 text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div class="flex-1 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ inputProduct ? inputProduct.name : '— pilih order dulu —' }}</p>
              <p class="text-slate-500 dark:text-slate-400 font-mono mt-1 font-semibold">
                Berat @ Unit: <input v-model.number="inputWeightPerUnit" type="number" min="0" step="0.1" class="w-20 bg-transparent border-b border-slate-300 dark:border-slate-700 text-center font-bold" /> KG
                <span class="block mt-1">Total: <span class="text-blue-600 dark:text-blue-400 font-bold">{{ totalInputWeight.toLocaleString() }} KG</span></span>
              </p>
            </div>
          </div>
        </div>

        <div class="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5">
          <span>Mutasi Stok Parent:</span>
          <span class="text-rose-600 dark:text-rose-400 font-bold">-{{ inputQty }} {{ inputUomCode || '' }}</span>
        </div>
      </div>

      <!-- Output Child Karung (Right Card) -->
      <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Output Hasil Konversi (Child SKU)</h4>
            <span v-if="outputProduct" class="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ outputProduct.sku_code }}</span>
          </div>

          <div class="mt-4 space-y-3">
            <div class="space-y-1">
              <label class="text-[11px] text-slate-400 font-semibold uppercase block">Child SKU (Hasil Repacking)</label>
              <select
                v-model="selectedOutputProductId"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
              >
                <option value="" disabled>— pilih child SKU —</option>
                <option v-for="p in childProductOptions" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
              </select>
            </div>

            <div class="flex items-center space-x-4">
              <div class="space-y-1">
                <label class="text-[11px] text-slate-400 font-semibold uppercase block">Qty ({{ outputUomCode || 'UoM' }})</label>
                <input
                  v-model.number="outputQty"
                  type="number"
                  min="0.1"
                  step="0.1"
                  class="w-28 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2.5 text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div class="flex-1 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ outputProduct ? outputProduct.name : '—' }}</p>
                <p class="text-slate-500 dark:text-slate-400 font-mono mt-1 font-semibold">
                  Berat @ Unit: <input v-model.number="outputWeightPerUnit" type="number" min="0" step="0.1" class="w-20 bg-transparent border-b border-slate-300 dark:border-slate-700 text-center font-bold" /> KG
                  <span class="block mt-1">Total: <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ totalOutputWeight.toLocaleString() }} KG</span></span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5">
          <span>Mutasi Stok Child:</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-bold">+{{ outputQty }} {{ outputUomCode || '' }}</span>
        </div>
      </div>
    </div>

    <!-- Shrinkage Live Calculation Card -->
    <div class="p-5 md:p-6 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Kalkulasi Susut Otomatis (Shrinkage):
        </span>
        <div class="flex items-center space-x-2 font-mono font-bold text-base md:text-lg" :class="isShrinkageHigh ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
          <span>Susut: {{ shrinkageKg }} KG</span>
          <span>({{ shrinkagePct }}%)</span>
        </div>
      </div>

      <div class="p-3 rounded-xl flex items-center space-x-2.5 text-xs font-medium" :class="isShrinkageHigh ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'">
        <AppIcon :name="isShrinkageHigh ? 'alert' : 'check'" custom-class="w-4 h-4 shrink-0" />
        <span>{{ isShrinkageHigh ? 'Peringatan: Susut melebihi batas toleransi wajar (> 1.00%). Memerlukan persetujuan khusus Kepala Gudang.' : 'Susut berada dalam batas toleransi wajar (≤ 1.00%). Sesuai standar ISO pergudangan.' }}</span>
      </div>
    </div>

    <!-- Supervisor Name & Action -->
    <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 transition-colors">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Supervisor Debulking (Wajib — Tercatat di Audit Trail)</label>
        <input
          v-model="actorName"
          type="text"
          required
          placeholder="Contoh: Mandor Joko / Supri"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="button"
        @click="handleDebulkSubmit"
        :disabled="debulkingStore.isLoading || selectedOrderKey < 0 || !inputProduct || !outputProduct"
        class="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
      >
        <AppIcon name="debulking" custom-class="w-4 h-4" />
        <span>{{ debulkingStore.isLoading ? 'Memproses...' : 'Selesaikan Debulking & Rekam Stock Movement' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDebulkingStore } from '~/stores/debulking'
import { useOutboundStore } from '~/stores/outbound'
import { useMasterStore } from '~/stores/master'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const debulkingStore = useDebulkingStore()
const outboundStore = useOutboundStore()
const masterStore = useMasterStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()

const openOrders = ref([])
const isLoadingOrders = ref(false)
const selectedOrderKey = ref(-1)
const orderItems = ref([])

const selectedOutputProductId = ref('')
const inputQty = ref(0)
const inputWeightPerUnit = ref(0)
const outputQty = ref(0)
const outputWeightPerUnit = ref(0)
const actorName = ref('')

const selectedOrder = computed(() => (selectedOrderKey.value >= 0 ? openOrders.value[selectedOrderKey.value] : null))
const inputProduct = computed(() => (orderItems.value.length > 0 ? masterStore.products.find(p => p.id === orderItems.value[0].product_id) || null : null))
const outputProduct = computed(() => masterStore.products.find(p => p.id === selectedOutputProductId.value) || null)

// Child SKU kandidat: produk hasil pecahan dari parent ini, fallback semua produk aktif lain
const childProductOptions = computed(() => {
  if (!inputProduct.value) return []
  const children = masterStore.products.filter(p => p.parent_bulky_product_id === inputProduct.value.id)
  return children.length > 0 ? children : masterStore.products.filter(p => p.id !== inputProduct.value.id)
})

const inputUom = computed(() => (inputProduct.value ? masterStore.uoms.find(u => u.id === inputProduct.value.default_uom_id) : null))
const inputUomCode = computed(() => inputUom.value?.code || '')
const outputUom = computed(() => (outputProduct.value ? masterStore.uoms.find(u => u.id === outputProduct.value.default_uom_id) : null))
const outputUomCode = computed(() => outputUom.value?.code || '')

const totalInputWeight = computed(() => Number((inputQty.value * inputWeightPerUnit.value).toFixed(2)))
const totalOutputWeight = computed(() => Number((outputQty.value * outputWeightPerUnit.value).toFixed(2)))
const shrinkageKg = computed(() => Math.max(0, Number((totalInputWeight.value - totalOutputWeight.value).toFixed(2))))
const shrinkagePct = computed(() => {
  if (totalInputWeight.value === 0) return '0.00'
  return ((shrinkageKg.value / totalInputWeight.value) * 100).toFixed(2)
})
const isShrinkageHigh = computed(() => parseFloat(shrinkagePct.value) > 1.0)

async function loadOpenOrders() {
  isLoadingOrders.value = true
  try {
    await outboundStore.fetchOrders()
    openOrders.value = (outboundStore.orders || []).filter(o => ['CREATED', 'PICKED', 'PACKED'].includes(o.status))
  } finally {
    isLoadingOrders.value = false
  }
}

watch(selectedOrderKey, async (k) => {
  orderItems.value = []
  selectedOutputProductId.value = ''
  if (k < 0) return
  const order = openOrders.value[k]
  try {
    const res = await apiFetch(`/outbound/${order.id}`)
    if (res.success) {
      orderItems.value = res.data.items || []
      if (orderItems.value[0]) {
        const p = masterStore.products.find(pr => pr.id === orderItems.value[0].product_id)
        inputQty.value = Number(orderItems.value[0].ordered_qty) || 0
        inputWeightPerUnit.value = Number(p?.weight_kg_per_unit) || 0
        // Preselect child SKU bila relasi parent-child terdaftar di master
        const child = masterStore.products.find(pr => pr.parent_bulky_product_id === orderItems.value[0].product_id)
        if (child) {
          selectedOutputProductId.value = child.id
          outputWeightPerUnit.value = Number(child.weight_kg_per_unit) || 0
        }
      }
    }
  } catch { /* error ditangani apiFetch */ }
})

watch(selectedOutputProductId, (id) => {
  const p = masterStore.products.find(pr => pr.id === id)
  if (p) outputWeightPerUnit.value = Number(p.weight_kg_per_unit) || 0
})

const { playAudioFeedback } = useBarcodeScanner()

async function handleDebulkSubmit() {
  const order = selectedOrder.value
  if (!order || !inputProduct.value || !outputProduct.value) return

  const payload = {
    warehouse_id: order.warehouse_id || authStore.activeWarehouseId,
    conversion_type: 'BULKY_TO_PACKAGED',
    outbound_order_id: order.id,
    inputs: [
      { product_id: inputProduct.value.id, qty_used: inputQty.value, uom_id: inputUom.value?.id || inputProduct.value.default_uom_id, weight_kg: totalInputWeight.value }
    ],
    outputs: [
      { product_id: outputProduct.value.id, qty_produced: outputQty.value, uom_id: outputUom.value?.id || outputProduct.value.default_uom_id, weight_kg: totalOutputWeight.value }
    ],
    allowable_shrinkage_percentage: 1.0,
    actor_name: actorName.value
  }

  await debulkingStore.submitWorkOrder(payload)
  if (!debulkingStore.errorMessage) playAudioFeedback('SUCCESS')
}

onMounted(async () => {
  if (authStore.user?.full_name) actorName.value = authStore.user.full_name
  await Promise.all([loadOpenOrders(), masterStore.fetchProducts(), masterStore.fetchReferences()])
})
</script>
