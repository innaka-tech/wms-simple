<template>
  <div class="space-y-3">
    <!-- Toolbar: search + per-page -->
    <div v-if="searchable && !error" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-xs">
        <AppIcon name="search" custom-class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="searchPlaceholder"
          class="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
        />
      </div>
      <div v-if="filteredRows.length > perPageOptions[0]" class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="hidden sm:inline">Baris:</span>
        <select
          v-model.number="perPage"
          class="py-1.5 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
        >
          <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>

    <!-- Error state -->
    <AppErrorState
      v-if="error"
      :code="error.code"
      :message="error.message"
      :retryable="true"
      @retry="$emit('retry')"
    />

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-12 rounded-md bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" :style="{ animationDelay: i * 80 + 'ms' }"></div>
    </div>

    <!-- Empty states -->
    <div v-else-if="rows.length === 0" class="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
      <AppIcon name="box" custom-class="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ emptyTitle }}</p>
      <p v-if="emptyHint" class="text-xs text-slate-400 mt-1">{{ emptyHint }}</p>
      <div v-if="$slots['empty-action']" class="mt-3">
        <slot name="empty-action" />
      </div>
    </div>
    <div v-else-if="filteredRows.length === 0" class="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
      <AppIcon name="search" custom-class="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">Tidak ada yang cocok dengan "{{ searchQuery }}"</p>
      <button type="button" class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline" @click="searchQuery = ''">Bersihkan pencarian</button>
    </div>

    <!-- MOBILE: card list (base view) -->
    <ul v-else-if="!isDesktopViewport" class="space-y-2">
      <li v-for="row in pagedRows" :key="rowKey(row)">
        <component
          :is="rowClickable ? 'button' : 'div'"
          class="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 transition"
          :class="rowClickable ? 'hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/60' : ''"
          @click="rowClickable && $emit('row-click', row)"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ primaryValue(row) }}</span>
            <slot name="mobile-status" :row="row">
              <span v-if="statusOf(row)" class="shrink-0 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border" :class="statusClass(statusOf(row))">{{ statusOf(row) }}</span>
            </slot>
          </div>
          <dl class="mt-1.5 space-y-0.5">
            <div v-for="col in mobileCols" :key="col.key" class="flex items-baseline justify-between gap-3">
              <dt class="text-[11px] text-slate-400 shrink-0">{{ col.label }}</dt>
              <dd class="text-xs text-slate-700 dark:text-slate-300 text-right truncate" :class="cellClass(col)">{{ formatCell(row, col) }}</dd>
            </div>
          </dl>
          <div v-if="$slots['mobile-actions']" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
            <slot name="mobile-actions" :row="row" />
          </div>
        </component>
      </li>
    </ul>

    <!-- DESKTOP: real table -->
    <div v-else class="hidden lg:block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <th
                v-for="col in desktopCols"
                :key="col.key"
                class="px-3 py-2.5 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap"
                :class="[col.type === 'number' || col.type === 'money' ? 'text-right' : '']"
              >
                {{ col.label }}
              </th>
              <th v-if="$slots['row-actions']" class="px-3 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagedRows"
              :key="rowKey(row)"
              class="border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors"
              :class="rowClickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''"
              @click="rowClickable && $emit('row-click', row)"
            >
              <td v-for="col in desktopCols" :key="col.key" class="px-3 py-2.5 text-slate-700 dark:text-slate-300" :class="cellClass(col)">
                <template v-if="col.type === 'status'">
                  <span class="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border" :class="statusClass(value(row, col))">{{ value(row, col) || '—' }}</span>
                </template>
                <template v-else>
                  {{ formatCell(row, col) }}
                </template>
              </td>
              <td v-if="$slots['row-actions']" class="px-3 py-2.5 text-right whitespace-nowrap" @click.stop>
                <slot name="row-actions" :row="row" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!error && !loading && filteredRows.length > 0" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-[11px] text-slate-400 font-mono">
        {{ rangeText }}
      </p>
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <button
          type="button"
          :disabled="page === 1"
          class="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          @click="page--"
        >
          ‹
        </button>
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '…'" class="px-1 text-slate-400 text-xs">…</span>
          <button
            v-else
            type="button"
            class="min-w-[28px] px-2 py-1.5 rounded-md text-xs font-medium transition"
            :class="p === page ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'"
            @click="page = p"
          >
            {{ p }}
          </button>
        </template>
        <button
          type="button"
          :disabled="page === totalPages"
          class="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          @click="page++"
        >
          ›
        </button>
      </div>
      <p v-else class="sm:hidden text-[11px] text-slate-400 font-mono">Hal 1/1</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Media query responsif — sumber kebenaran render kartu (mobile) vs tabel (desktop)
const isDesktopViewport = ref(false)
let mq = null
function onMqChange(e) { isDesktopViewport.value = e.matches }
onMounted(() => {
  mq = window.matchMedia('(min-width: 1024px)')
  isDesktopViewport.value = mq.matches
  mq.addEventListener('change', onMqChange)
})
onUnmounted(() => mq && mq.removeEventListener('change', onMqChange))

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, required: true }, // { key, label, type?: 'mono'|'number'|'money'|'status'|'date', primary?, hideOnMobile?, hideOnDesktop? }
  rowKey: { type: Function, default: (r) => r.id },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Cari nomor, nama, status…' },
  rowClickable: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'Belum ada data' },
  emptyHint: { type: String, default: '' },
  initialPerPage: { type: Number, default: 10 }
})

const emit = defineEmits(['row-click', 'retry'])

const perPageOptions = [10, 25, 50]
const perPage = ref(props.initialPerPage)
const page = ref(1)
const searchQuery = ref('')

watch([searchQuery, perPage], () => { page.value = 1 })
watch(() => props.rows.length, () => { page.value = 1 })

const mobileCols = computed(() => props.columns.filter(c => !c.hideOnMobile && !c.primary && c.type !== 'status'))
const desktopCols = computed(() => props.columns.filter(c => !c.hideOnDesktop))
const primaryCol = computed(() => props.columns.find(c => c.primary) || props.columns[0])

function value(row, col) {
  const v = row[col.key]
  return v === null || v === undefined ? '' : v
}

function formatCell(row, col) {
  const v = value(row, col)
  if (v === '') return '—'
  if (col.type === 'money') {
    return 'Rp ' + Number(v).toLocaleString('id-ID')
  }
  if (col.type === 'date') {
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return String(v)
}

function cellClass(col) {
  if (col.type === 'number' || col.type === 'money') return 'text-right tabular-nums'
  if (col.type === 'mono') return 'font-mono text-[11px]'
  return ''
}

function primaryValue(row) {
  const v = value(row, primaryCol.value)
  return v === '' ? '—' : v
}

function statusOf(row) {
  const col = props.columns.find(c => c.type === 'status')
  return col ? value(row, col) : ''
}

const STATUS_STYLES = {
  // netral
  CREATED: 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800',
  DRAFT: 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800',
  // biru — berjalan
  ISSUED: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
  SHIPPED: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
  IN_TRANSIT: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
  IN_USE: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
  DEPARTED: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
  // amber — menunggu
  PENDING: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  RECEIVED: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  PARTIAL: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  UNPAID: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  MAINTENANCE: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  // emerald — selesai/positif
  COMPLETED: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  DELIVERED: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  ACCEPTED: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  POD_VERIFIED: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  PUTAWAY_COMPLETED: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  PAID: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  LUNAS: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  AVAILABLE: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  GOOD: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  // rose — bermasalah
  REJECTED: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  CANCELLED: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  DAMAGED: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  RETIRED: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  OVERDUE: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  VOID: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40'
}

function statusClass(status) {
  const key = String(status || '').toUpperCase().replace(/\s+/g, '_')
  return STATUS_STYLES[key] || 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
}

// Realtime search di seluruh dataset (bukan cuma halaman aktif)
const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.rows
  return props.rows.filter(row =>
    props.columns.some(col => {
      if (col.type === 'money' || col.type === 'number') return false
      return String(value(row, col)).toLowerCase().includes(q)
    })
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredRows.value.slice(start, start + perPage.value)
})

const rangeText = computed(() => {
  const total = filteredRows.value.length
  if (total === 0) return '0 data'
  const start = (page.value - 1) * perPage.value + 1
  const end = Math.min(page.value * perPage.value, total)
  const suffix = searchQuery.value ? ` (dari ${props.rows.length} total, terfilter)` : ''
  return `${start}–${end} dari ${total} data${suffix}`
})

const visiblePages = computed(() => {
  const t = totalPages.value
  const p = page.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  if (p <= 4) return [1, 2, 3, 4, 5, '…', t]
  if (p >= t - 3) return [1, '…', t - 4, t - 3, t - 2, t - 1, t]
  return [1, '…', p - 1, p, p + 1, '…', t]
})
</script>
