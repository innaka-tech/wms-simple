<template>
  <div class="space-y-5 max-w-6xl">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
      <div>
        <p class="kicker">Fase 3 — Outbound • Dokumen Resmi</p>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="printer" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Surat Jalan &amp; Resi</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semua dokumen pengiriman keluar (SJ-XXXXXXXX / RESI-XXXXXXXX).</p>
      </div>
      <select
        v-model="statusFilter"
        @change="load"
        class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full sm:w-auto"
      >
        <option value="">Semua Status</option>
        <option value="ISSUED">Terbit</option>
        <option value="PRINTED">Dicetak</option>
        <option value="IN_TRANSIT">Di Perjalanan</option>
        <option value="POD_VERIFIED">POD Terverifikasi</option>
        <option value="VOID">Dibatalkan</option>
      </select>
    </div>

    <!-- Standard table (search + pagination + mobile cards + error/empty states) -->
    <AppDataTable
      :rows="waybillStore.waybills"
      :columns="columns"
      :loading="waybillStore.isLoading"
      :error="tableError"
      row-key-prop="id"
      search-placeholder="Cari SJ, resi, order, tujuan…"
      empty-title="Belum ada Surat Jalan diterbitkan"
      empty-hint="Terbitkan SJ dari halaman Delivery Order & Surat Jalan."
      @retry="load"
    >
      <template #empty-action>
        <NuxtLink to="/outbound" class="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition">
          Buka Order Pengiriman
        </NuxtLink>
      </template>

      <!-- Desktop actions -->
      <template #row-actions="{ row }">
        <NuxtLink
          :to="'/checkpoints?doc=' + row.sj_number"
          class="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
        >
          Audit Trail
        </NuxtLink>
      </template>

      <!-- Mobile actions -->
      <template #mobile-actions="{ row }">
        <NuxtLink
          :to="'/checkpoints?doc=' + row.sj_number"
          class="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          Audit Trail Dokumen
        </NuxtLink>
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
