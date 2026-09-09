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

    <!-- Header + Filter -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <div>
          <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Fase 3 — Barang Keluar</p>
          <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AppIcon name="printer" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Daftar Surat Jalan &amp; Resi</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dokumen pengiriman resmi (SJ-XXXXXXXX / RESI-XXXXXXXX) — semua jalur.</p>
        </div>
      </div>
      <select
        v-model="statusFilter"
        @change="load"
        class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-w-[180px]"
      >
        <option value="">Semua Status</option>
        <option value="ISSUED">ISSUED</option>
        <option value="PRINTED">PRINTED</option>
        <option value="IN_TRANSIT">IN_TRANSIT</option>
        <option value="POD_VERIFIED">POD_VERIFIED</option>
        <option value="VOID">VOID</option>
      </select>
    </div>

    <!-- List -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
      <div v-if="waybillStore.isLoading" class="p-8 text-center text-xs text-slate-400 font-mono">Memuat waybill...</div>
      <div v-else-if="waybillStore.waybills.length === 0" class="p-8 text-center text-xs text-slate-400 font-mono">Belum ada waybill diterbitkan.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="wb in waybillStore.waybills" :key="wb.id" class="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{{ wb.sj_number }}</span>
              <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ wb.resi_number }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{{ wb.status }}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              Order {{ wb.order_number || '-' }} → {{ wb.recipient_name || '-' }}
              <span v-if="wb.destination_city" class="text-slate-400">• {{ wb.destination_city }}</span>
            </p>
          </div>
          <div class="text-[10px] font-mono text-slate-400 shrink-0 md:text-right">
            <p>Diterbitkan: {{ wb.issued_by_name }}</p>
            <p>{{ formatTime(wb.issued_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useWaybillStore } from '~/stores/waybill'

const waybillStore = useWaybillStore()
const statusFilter = ref('')

function formatTime(v) {
  if (!v) return '-'
  try {
    return new Date(v).toLocaleString('id-ID')
  } catch {
    return v
  }
}

function load() {
  waybillStore.fetchWaybills(statusFilter.value || undefined)
}

onMounted(load)
</script>
