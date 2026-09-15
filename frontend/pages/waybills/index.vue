<template>
  <div class="space-y-5 max-w-6xl">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800">
            Surat Jalan &amp; Resi
          </span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="printer" custom-class="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span>Daftar Surat Jalan &amp; Resi Pengiriman</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semua dokumen pengiriman resmi logistik (SJ-XXXXXXXX / RESI-XXXXXXXX).</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          @change="load"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 w-full sm:w-auto shadow-xs"
        >
          <option value="">Semua Status</option>
          <option value="ISSUED">Terbit (ISSUED)</option>
          <option value="PRINTED">Dicetak (PRINTED)</option>
          <option value="IN_TRANSIT">Di Perjalanan (IN_TRANSIT)</option>
          <option value="POD_VERIFIED">POD Terverifikasi</option>
          <option value="VOID">Dibatalkan (VOID)</option>
        </select>
        <NuxtLink
          to="/waybills/print"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
          <span>Cetak Dokumen</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Standard table (search + pagination + mobile cards + error/empty states) -->
    <AppDataTable
      :rows="waybillStore.waybills"
      :columns="columns"
      :loading="waybillStore.isLoading"
      :error="tableError"
      row-key-prop="id"
      search-placeholder="Cari nomor SJ, resi, order, atau nama penerima…"
      empty-title="Belum Ada Surat Jalan Diterbitkan"
      empty-hint="Terbitkan Surat Jalan dari halaman Delivery Order & Surat Jalan."
      @retry="load"
    >
      <template #empty-action>
        <NuxtLink to="/outbound" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition">
          <AppIcon name="plus" custom-class="w-3.5 h-3.5" />
          <span>Buka Order Pengiriman</span>
        </NuxtLink>
      </template>

      <!-- Desktop actions -->
      <template #row-actions="{ row }">
        <div class="flex items-center space-x-2">
          <NuxtLink
            :to="'/waybills/print?sj=' + row.sj_number"
            class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center space-x-1 shadow-xs"
          >
            <AppIcon name="printer" custom-class="w-3.5 h-3.5 text-white" />
            <span>Cetak SJ</span>
          </NuxtLink>
          <NuxtLink
            :to="'/checkpoints?doc=' + row.sj_number"
            class="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
          >
            Audit Trail
          </NuxtLink>
        </div>
      </template>

      <!-- Mobile actions -->
      <template #mobile-actions="{ row }">
        <div class="flex items-center space-x-3 pt-1">
          <NuxtLink
            :to="'/waybills/print?sj=' + row.sj_number"
            class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1"
          >
            <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
            <span>Cetak Dokumen SJ</span>
          </NuxtLink>
          <NuxtLink
            :to="'/checkpoints?doc=' + row.sj_number"
            class="text-xs text-slate-500 font-medium hover:underline"
          >
            Audit Trail
          </NuxtLink>
        </div>
      </template>
    </AppDataTable>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useWaybillStore } from '~/stores/waybill'
import { describeApiError } from '~/composables/useApiError'

const waybillStore = useWaybillStore()
const statusFilter = ref('')
const apiError = ref(null)

const columns = [
  { key: 'sj_number', label: 'No. Surat Jalan', type: 'mono', primary: true },
  { key: 'resi_number', label: 'No. Resi', type: 'mono' },
  { key: 'order_number', label: 'Order', type: 'mono', hideOnMobile: true },
  { key: 'recipient_name', label: 'Penerima' },
  { key: 'destination_city', label: 'Tujuan' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'issued_by_name', label: 'Diterbitkan Oleh', hideOnMobile: true },
  { key: 'issued_at', label: 'Tanggal Terbit', type: 'date', hideOnMobile: true }
]

const tableError = computed(() => apiError.value)

async function load() {
  apiError.value = null
  try {
    await waybillStore.fetchWaybills(statusFilter.value || undefined)
  } catch (err) {
    apiError.value = describeApiError(err)
  }
}

onMounted(load)
</script>

<style scoped>
.kicker {
  @apply text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5;
}
</style>
