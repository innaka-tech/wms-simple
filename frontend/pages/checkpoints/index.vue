<template>
  <div class="space-y-6">
    <!-- Feedback -->
    <div v-if="errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ errorMessage }}</span>
      </div>
      <button type="button" @click="errorMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header + Pencarian -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Pemantauan • Rantai Immutable</p>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="checkpoint" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Riwayat Checkpoint Dokumen</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Telusuri perjalanan satu dokumen: PO, MNF, SJ/RESI, XDOC, VEND-OUT, ORD, INV.</p>
      </div>
      <form class="flex gap-2 shrink-0" @submit.prevent="lookup">
        <input
          v-model="docNumber"
          type="text"
          placeholder="Nomor dokumen (mis. PO-43649213)"
          class="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none w-64"
        />
        <button type="submit" :disabled="isLoading" class="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
          {{ isLoading ? 'Mencari...' : 'Telusuri' }}
        </button>
      </form>
    </div>

    <!-- Hasil -->
    <template v-if="result">
      <!-- Ringkasan + integritas rantai -->
      <div class="p-4 rounded-lg border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
           :class="result.chain_valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
               :class="result.chain_valid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'">
            <AppIcon :name="result.chain_valid ? 'check' : 'alert'" custom-class="w-5 h-5" />
          </div>
          <div>
            <p class="text-sm font-bold text-slate-900 dark:text-white font-mono">{{ result.document_number }}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              {{ result.entity_type }} • {{ result.total_checkpoints }} checkpoint
            </p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border w-fit"
              :class="result.chain_valid
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'">
          {{ result.chain_valid ? '✓ Rantai Integritas Valid' : '✕ RANTAI PUTUS di ' + result.broken_at_step }}
        </span>
      </div>

      <!-- Timeline visual -->
      <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm transition-colors">
        <div class="relative">
          <div class="absolute left-[15px] top-2 bottom-2 w-0.5" :class="result.chain_valid ? 'bg-blue-200 dark:bg-blue-900' : 'bg-rose-200 dark:bg-rose-900'"></div>
          <div v-for="(cp, idx) in result.timeline" :key="cp.id" class="relative flex gap-4 pb-6 last:pb-0">
            <!-- Node -->
            <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 z-10"
                 :class="isBrokenNode(idx) ? 'border-rose-500' : 'border-blue-500'">
              <span class="text-[10px] font-mono font-bold" :class="isBrokenNode(idx) ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'">{{ idx + 1 }}</span>
            </div>
            <!-- Konten -->
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xs font-bold text-slate-900 dark:text-white">{{ cp.step_label || cp.step_code }}</p>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border" :class="phaseChip(cp.step_code)">{{ phaseOf(cp.step_code) }}</span>
              </div>
              <p class="text-[11px] font-mono text-slate-400 mt-0.5">{{ cp.step_code }}</p>
              <p v-if="cp.notes" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{{ cp.notes }}</p>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] font-mono text-slate-400">
                <span class="flex items-center gap-1">
                  <AppIcon name="user" custom-class="w-3 h-3" />
                  {{ cp.actor_name }}<span v-if="cp.actor_role" class="text-slate-300 dark:text-slate-600"> • {{ cp.actor_role }}</span>
                </span>
                <span>{{ formatTime(cp.created_at) }}</span>
                <span v-if="cp.photo_urls && parsePhotos(cp.photo_urls).length" class="text-blue-500">{{ parsePhotos(cp.photo_urls).length }} foto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else-if="!isLoading" class="p-8 text-center text-xs text-slate-400 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      Masukkan nomor dokumen untuk melihat rantai checkpoint-nya.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWmsApi } from '~/composables/useWmsApi'
import AppIcon from '~/components/AppIcon.vue'

const { apiFetch } = useWmsApi()
const route = useRoute()

const docNumber = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const result = ref(null)

onMounted(() => {
  const q = route.query.doc
  if (q) {
    docNumber.value = String(q)
    lookup()
  }
})

const STEP_PHASE = [
  { keys: ['PO_CREATED', 'PO_RECEIVED', 'PUTAWAY', 'INBOUND'], phase: 'F1', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { keys: ['DEBULKING', 'CONVERSION'], phase: 'F2', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { keys: ['MANIFEST', 'LOADED', 'PICK', 'PACK', 'SHIP', 'WAYBILL', 'DEPART', 'GATE', 'VENDOR_EXIT', 'RECEIVED_AT_DEST'], phase: 'F3', chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { keys: ['POD', 'INVOICE', 'PAYMENT', 'PAID', 'CROSS_DOC', 'LUNAS'], phase: 'F4', chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' }
]

function phaseOf(stepCode) {
  const match = STEP_PHASE.find(p => p.keys.some(k => (stepCode || '').includes(k)))
  return match ? match.phase : 'F?'
}

function phaseChip(stepCode) {
  const match = STEP_PHASE.find(p => p.keys.some(k => (stepCode || '').includes(k)))
  return match ? match.chip : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
}

function isBrokenNode(idx) {
  return result.value && !result.value.chain_valid && idx === (result.value.total_checkpoints - 1) && result.value.broken_at_step === result.value.timeline[idx].step_code
}

function parsePhotos(v) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v || []) } catch { return [] }
}

function formatTime(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleString('id-ID') } catch { return v }
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
</script>
