<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
    <div class="h-14 px-4 md:px-6 flex items-center justify-between gap-3">

      <!-- Mobile: hamburger + page title -->
      <div class="flex items-center gap-2.5 min-w-0 lg:hidden">
        <button
          type="button"
          aria-label="Buka menu navigasi"
          class="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
          @click="$emit('open-drawer')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ lastCrumb.label }}</h1>
          <p class="text-[10px] text-slate-400 font-mono truncate">{{ authStore.activeWarehouseName }}</p>
        </div>
      </div>

      <!-- Desktop: breadcrumb -->
      <nav class="hidden lg:flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
        <template v-for="(crumb, i) in crumbs" :key="crumb.path">
          <svg v-if="i > 0" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <NuxtLink
            :to="crumb.path"
            class="flex items-center gap-1 text-xs transition"
            :class="i === crumbs.length - 1
              ? 'font-semibold text-slate-800 dark:text-slate-100'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          >
            <span class="truncate">{{ crumb.label }}</span>
          </NuxtLink>
        </template>
      </nav>

      <!-- Right: warehouse + clock + alerts -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Warehouse Switcher -->
        <div class="hidden md:flex items-center gap-2">
          <div v-if="availableWarehouses.length > 0" class="flex items-center">
            <select
              :value="authStore.activeWarehouseId"
              @change="onWarehouseChange($event)"
              class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[200px] truncate transition"
            >
              <option v-for="w in availableWarehouses" :key="w.id" :value="w.id">
                {{ w.code }} · {{ w.name }}
              </option>
            </select>
          </div>
          <span v-else class="text-[11px] font-medium text-slate-600 dark:text-slate-300">{{ authStore.activeWarehouseName }}</span>
        </div>

        <!-- Separator -->
        <span class="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-700"></span>

        <!-- Clock -->
        <span class="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">{{ clock }}</span>

        <!-- Separator -->
        <span class="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-700"></span>

        <!-- Notification Alert Bell -->
        <div class="relative">
          <button
            type="button"
            aria-label="Pusat Peringatan Operasional"
            class="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            @click="showAlertsDropdown = !showAlertsDropdown"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span v-if="activeAlerts.length > 0" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
          </button>

          <!-- Dropdown Popover -->
          <div
            v-if="showAlertsDropdown"
            class="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
          >
            <!-- Popover Header -->
            <div class="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900 dark:text-white">Operational Alert Center</span>
                <span 
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold" 
                  :class="activeAlerts.length > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
                >
                  {{ activeAlerts.length }} Aktif
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  type="button"
                  @click="scanOverdue" 
                  :disabled="scanning"
                  class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                  title="Pindai anomali keterlambatan armada dan SLA"
                >
                  <svg class="w-3 h-3" :class="{ 'animate-spin': scanning }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Anomali
                </button>
              </div>
            </div>

            <!-- Popover Filters & Actions Bar -->
            <div class="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="alertFilter = 'ALL'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded"
                  :class="alertFilter === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
                >
                  Semua
                </button>
                <button
                  type="button"
                  @click="alertFilter = 'CRITICAL'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded"
                  :class="alertFilter === 'CRITICAL' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'"
                >
                  Kritis ({{ criticalAlertsCount }})
                </button>
                <button
                  type="button"
                  @click="alertFilter = 'WARNING'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded"
                  :class="alertFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'"
                >
                  Peringatan
                </button>
              </div>

              <button
                v-if="activeAlerts.length > 0"
                type="button"
                @click="resolveAllAlerts"
                class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Selesaikan Semua
              </button>
            </div>

            <!-- Alerts List -->
            <div class="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <div v-if="filteredAlerts.length === 0" class="p-8 text-center text-xs text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto mb-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Semua sistem operasional normal. Tidak ada alert aktif.
              </div>
              <div v-for="alt in filteredAlerts" :key="alt.id" class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span 
                        class="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded" 
                        :class="alt.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'"
                      >
                        {{ alt.severity || 'WARNING' }}
                      </span>
                      <span v-if="alt.warehouse_name" class="text-[9px] font-medium text-slate-400 truncate">
                        📍 {{ alt.warehouse_name }}
                      </span>
                    </div>
                    <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{{ alt.title }}</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{{ alt.message }}</p>
                  </div>
                  <button
                    type="button"
                    @click="resolveAlert(alt.id)"
                    class="shrink-0 px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, PHASE_ACCENT, NAV_META } from '~/stores/auth'

const route = useRoute()

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})

defineEmits(['open-drawer'])

const authStore = useAuthStore()

// Breadcrumb
const crumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const result = [{ path: '/', label: 'Beranda' }]
  let acc = ''
  for (const part of parts) {
    acc += '/' + part
    const known = NAV_META[acc]
    result.push({
      path: acc,
      label: known?.name || part.replace(/-/g, ' ')
    })
  }
  return result
})

const lastCrumb = computed(() => crumbs.value[crumbs.value.length - 1])

// Live clock
const clock = ref('')
let timer = null

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
}

// Warehouse switcher
const availableWarehouses = ref([])

async function loadWarehouses() {
  try {
    const { apiFetch } = useWmsApi()
    const res = await apiFetch('/warehouses')
    if (res.success && Array.isArray(res.data)) {
      availableWarehouses.value = res.data
      const current = availableWarehouses.value.find(w => w.id === authStore.activeWarehouseId)
      if (current) {
        authStore.setWarehouse(current.id, `${current.code} (${current.name})`)
      } else if (availableWarehouses.value.length > 0 && !authStore.activeWarehouseId) {
        const first = availableWarehouses.value[0]
        authStore.setWarehouse(first.id, `${first.code} (${first.name})`)
      }
    }
  } catch (e) {
    // offline/api failure fallback silently
  }
}

function onWarehouseChange(e) {
  const selectedId = e.target.value
  const found = availableWarehouses.value.find(w => w.id === selectedId)
  if (found) {
    authStore.setWarehouse(found.id, `${found.code} (${found.name})`)
  }
}

// Alert Center
const activeAlerts = ref([])
const showAlertsDropdown = ref(false)
const alertFilter = ref('ALL')
const scanning = ref(false)

const criticalAlertsCount = computed(() => {
  return activeAlerts.value.filter(a => a.severity === 'CRITICAL').length
})

const filteredAlerts = computed(() => {
  if (alertFilter.value === 'ALL') return activeAlerts.value
  return activeAlerts.value.filter(a => a.severity === alertFilter.value)
})

async function loadAlerts() {
  try {
    const { apiFetch } = useWmsApi()
    const res = await apiFetch('/alerts?is_resolved=false')
    if (res.success && Array.isArray(res.data)) {
      activeAlerts.value = res.data
    }
  } catch (e) {
    // silent
  }
}

async function resolveAlert(alertId) {
  try {
    const { apiFetch } = useWmsApi()
    await apiFetch(`/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: {
        resolution_notes: 'Diselesaikan via Alert Center',
        actor_name: authStore.user?.full_name || 'Admin'
      }
    })
    await loadAlerts()
  } catch (e) {
    // silent
  }
}

async function resolveAllAlerts() {
  const { confirmAction, showSuccess, showError } = useSwal()
  const confirmed = await confirmAction({
    title: 'Selesaikan Semua Alert?',
    text: `Seluruh ${activeAlerts.value.length} alert aktif akan ditandai sudah terselesaikan.`,
    confirmButtonText: 'Ya, Selesaikan',
    cancelButtonText: 'Batal'
  })

  if (!confirmed) return

  try {
    const { apiFetch } = useWmsApi()
    const res = await apiFetch('/alerts/resolve-all', {
      method: 'POST',
      body: {
        resolution_notes: 'Diselesaikan massal via Alert Center',
        actor_name: authStore.user?.full_name || 'Admin'
      }
    })
    if (res.success) {
      showSuccess('Selesai', res.message || 'Semua alert berhasil diselesaikan')
      await loadAlerts()
    }
  } catch (e) {
    showError('Error', e.message || 'Gagal menyelesaikan alert')
  }
}

async function scanOverdue() {
  scanning.value = true
  try {
    const { apiFetch } = useWmsApi()
    const { showSuccess, showInfo } = useSwal()
    const res = await apiFetch('/alerts/scan-overdue', { method: 'POST' })
    await loadAlerts()
    if (res.success) {
      if (res.new_alerts_created > 0) {
        showSuccess('Scan Selesai', `${res.new_alerts_created} armada terdeteksi overdue dan diterbitkan sebagai alert kritis.`)
      } else {
        showInfo('Scan Selesai', 'Tidak ditemukan armada yang melebihi batas waktu kembali (overdue).')
      }
    }
  } catch (e) {
    console.error('Scan overdue failed', e)
  } finally {
    scanning.value = false
  }
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 30000)
  loadWarehouses()
  loadAlerts()
})
onUnmounted(() => clearInterval(timer))
</script>
