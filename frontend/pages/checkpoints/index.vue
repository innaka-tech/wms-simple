<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <!-- Feedback -->
    <div v-if="errorMessage" class="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
      {{ errorMessage }}
    </div>

    <!-- Pencarian -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800">
            Integritas Data &bull; Audit Trail
          </span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Audit Trail Rantai Checkpoint</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Masukkan nomor dokumen: PO, MNF, SJ/RESI, XDOC, ORD, INV, VENDOUT</p>
      </div>
      <form class="flex gap-2" @submit.prevent="lookup">
        <input
          v-model="docNumber"
          type="text"
          placeholder="Contoh: SJT2AC1QCW..."
          class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none w-52 shadow-xs"
        />
        <button type="submit" :disabled="isLoading" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer">
          <AppIcon name="search" custom-class="w-3.5 h-3.5" />
          <span>{{ isLoading ? 'Mencari...' : 'Telusuri' }}</span>
        </button>
      </form>
    </div>

    <!-- Hasil -->
    <template v-if="result">
      <!-- Header dokumen: identitas + status rantai, satu baris -->
      <div class="px-4 py-3 rounded-lg border flex items-center justify-between gap-3 transition-colors"
           :class="result.chain_valid ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-rose-500/5 border-rose-500/30'">
        <div class="min-w-0">
          <p class="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">{{ result.document_number }}</p>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ result.entity_type.replace(/_/g, ' ') }} • {{ result.total_checkpoints }} checkpoint tercatat</p>
        </div>
        <span class="px-2 py-1 rounded text-[10px] font-mono font-bold border shrink-0"
              :class="result.chain_valid
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'">
          {{ result.chain_valid ? 'Chain Valid' : 'Chain Broken' }}
        </span>
      </div>

      <!-- Timeline ramping -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors">
        <div v-for="(cp, idx) in result.timeline" :key="cp.id">
          <!-- Garis + node -->
          <div class="flex gap-3 px-4" :class="idx === 0 ? 'pt-4' : ''">
            <div class="flex flex-col items-center">
              <span class="w-2.5 h-2.5 rounded-full ring-4 shrink-0 my-1" :class="[cpDot(cp.step_code), result.chain_valid ? 'ring-blue-50 dark:ring-blue-950' : 'ring-transparent']"></span>
              <span v-if="idx < result.timeline.length - 1" class="w-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
            </div>
            <!-- Konten step -->
            <div class="flex-1 min-w-0" :class="idx < result.timeline.length - 1 ? 'pb-5' : 'pb-4'">
              <div class="flex items-baseline justify-between gap-2 flex-wrap">
                <p class="text-xs font-bold text-slate-900 dark:text-white leading-snug">{{ cp.step_label }}</p>
                <span class="text-[10px] font-mono text-slate-400 shrink-0">{{ formatTime(cp.created_at) }}</span>
              </div>
              <!-- Baris proses sebelum / sesudah -->
              <p v-if="cp.next_step_code" class="text-[10px] text-slate-400 mt-1">
                Selanjutnya: <span class="text-slate-500 dark:text-slate-300 font-medium">{{ cp.next_step_label }}</span>
                <span v-if="cp.next_actor_name"> oleh {{ cp.next_actor_name }}</span>
                <span class="font-mono"> · {{ shortTime(cp.next_at) }}</span>
              </p>
              <p v-else class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                Checkpoint terakhir — menunggu proses berikutnya
              </p>
              <p v-if="cp.prev_step_code" class="text-[10px] text-slate-400">
                Sebelumnya: {{ cp.prev_step_label }} oleh {{ cp.prev_actor_name }}
              </p>
              <p class="text-[10px] font-mono text-slate-400 mt-1">{{ cp.actor_name }} <span v-if="cp.actor_role" class="text-slate-300 dark:text-slate-600">· {{ cp.actor_role }}</span></p>
              <p v-if="cp.notes" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{{ cp.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!isLoading" class="p-6 text-center text-[11px] text-slate-400 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      Belum ada dokumen ditelusuri.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWmsApi } from '~/composables/useWmsApi'

const { apiFetch } = useWmsApi()
const route = useRoute()

const docNumber = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const result = ref(null)

const CP_COLORS = [
  { keys: ['PO_', 'PUTAWAY', 'INBOUND'], color: 'bg-emerald-500' },
  { keys: ['DEBULK', 'CONVERSION'], color: 'bg-amber-500' },
  { keys: ['MANIFEST', 'LOADED', 'PICK', 'PACK', 'SHIP', 'WAYBILL', 'DEPART', 'GATE', 'VENDOR', 'RECEIVED'], color: 'bg-blue-500' },
  { keys: ['POD', 'INVOICE', 'PAYMENT', 'PAID', 'CROSS_DOC'], color: 'bg-cyan-500' }
]

function cpDot(code) {
  const m = CP_COLORS.find(p => p.keys.some(k => (code || '').includes(k)))
  return m ? m.color : 'bg-slate-400'
}

function formatTime(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return v }
}

function shortTime(v) {
  if (!v) return ''
  try { return new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

async function lookup() {
  const num = docNumber.value.trim()
  if (num.length < 4) {
    errorMessage.value = 'Nomor dokumen minimal 4 karakter'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const res = await apiFetch(`/checkpoints/by-number/${encodeURIComponent(num)}`)
    if (res.success) {
      result.value = res.data
    } else {
      errorMessage.value = res.message || 'Dokumen tidak ditemukan'
    }
  } catch (err) {
    errorMessage.value = err.message || 'Gagal mengambil data checkpoint'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const q = route.query.doc
  if (q) {
    docNumber.value = String(q)
    lookup()
  }
})
</script>
