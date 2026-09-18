<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div>
        <div class="flex items-center space-x-2">
          <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <AppIcon name="warehouse" custom-class="w-5 h-5" />
          </span>
          <h2 class="text-base md:text-lg font-bold text-slate-900 dark:text-white">
            Denah &amp; Manajemen Rak Gudang (Enterprise Rack Console)
          </h2>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Visualisasi tata letak lorong, rak multi-tier, kapasitas beban simpan, dan denah spasial gudang.
        </p>
      </div>

      <!-- Actions & Warehouse Selector -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <select
          v-model="selectedWarehouseId"
          @change="onWarehouseChanged"
          class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
        >
          <option v-for="wh in masterStore.warehouses" :key="wh.id" :value="wh.id">
            {{ wh.code }} — {{ wh.name }}
          </option>
        </select>

        <button
          type="button"
          @click="showBatchModal = true"
          class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer flex items-center space-x-1.5"
        >
          <AppIcon name="plus" custom-class="w-3.5 h-3.5" />
          <span>Generate Rak Massal</span>
        </button>

        <NuxtLink
          to="/inbound/putaway"
          class="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer flex items-center space-x-1.5"
        >
          <AppIcon name="arrow-right" custom-class="w-3.5 h-3.5" />
          <span>Buka Putaway</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Overview KPI Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Bins / Slot Rak</span>
        <div class="flex items-baseline space-x-2 mt-1">
          <span class="text-xl font-mono font-bold text-slate-900 dark:text-white">{{ locations.length }}</span>
          <span class="text-[10px] text-emerald-600 font-semibold font-mono">Aktif Terdaftar</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Lorong (Aisles) &amp; Bays</span>
        <div class="flex items-baseline space-x-2 mt-1">
          <span class="text-xl font-mono font-bold text-slate-900 dark:text-white">{{ totalAisles }} Lorong</span>
          <span class="text-[10px] text-slate-400 font-mono">{{ totalRacks }} Kolom</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Kapasitas Beban Maksimal</span>
        <div class="flex items-baseline space-x-2 mt-1">
          <span class="text-xl font-mono font-bold text-slate-900 dark:text-white">{{ (totalWeightCapacity / 1000).toFixed(1) }} Ton</span>
          <span class="text-[10px] text-blue-600 font-mono font-semibold">{{ totalWeightCapacity.toLocaleString('id-ID') }} KG</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tingkat Okupansi Gudang</span>
        <div class="flex items-baseline space-x-2 mt-1">
          <span class="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ occupancyRate }}%</span>
          <span class="text-[10px] text-slate-400 font-mono">Slot Kosong Siap Isi</span>
        </div>
      </div>
    </div>

    <!-- Search / Filter Bar -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="relative flex-1 max-w-md">
          <AppIcon name="search" custom-class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode bin (contoh: A01-01-A) atau SKU tersimpan..."
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div class="text-[11px] text-slate-500 font-mono">
          Menampilkan <strong>{{ displayLocations.length }}</strong> dari {{ locations.length }} lokasi rak
        </div>
      </div>

      <!-- Visual Rack Visualizer Component -->
      <WarehouseRackVisualizer
        :locations="displayLocations"
        title="Layout Denah Spasial Rak & Bin Penyimpanan"
      />
    </div>

    <!-- Modal Generate Rak Massal -->
    <div v-if="showBatchModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <span class="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <AppIcon name="plus" custom-class="w-4 h-4" />
            </span>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Generate Batch Rak Baru Massal
            </h3>
          </div>
          <button type="button" @click="showBatchModal = false" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <AppIcon name="x" custom-class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="submitBatchGenerate" class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Zona Gudang *</label>
              <select v-model="batchForm.zone" required class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs">
                <option value="A">Zona A — Kargo Kering / Retail Sembako</option>
                <option value="B">Zona B — Heavy Duty Floor / Bulky 1 Ton</option>
                <option value="C">Zona C — Cold Storage Chiller KDMP</option>
                <option value="D">Zona D — Cross-Dock &amp; Fast Staging</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Nomor Lorong (Aisle) *</label>
              <input v-model="batchForm.aisle" required placeholder="Contoh: 03" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs font-mono" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Tipe Rak *</label>
              <select v-model="batchForm.location_type" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs">
                <option value="STANDARD_RACK">STANDARD_RACK (Multi-Tier Pallet)</option>
                <option value="HEAVY_DUTY_BULK">HEAVY_DUTY_BULK (Lantai Curah/Pallet Kayu)</option>
                <option value="COLD_STORAGE">COLD_STORAGE (Ruang Pendingin Chiller)</option>
                <option value="CROSS_DOCK_LANE">CROSS_DOCK_LANE (Staging Antar-Hub)</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Jumlah Kolom Rak (Bays) *</label>
              <input v-model.number="batchForm.racks_count" type="number" min="1" max="20" required class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs font-mono" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Kapasitas Beban / Bin (KG) *</label>
              <input v-model.number="batchForm.max_weight_capacity_kg" type="number" min="100" required class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs font-mono" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Kapasitas Volume (CBM) *</label>
              <input v-model.number="batchForm.max_volume_capacity_cbm" type="number" step="0.5" min="0.5" required class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs font-mono" />
            </div>
          </div>

          <div class="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-[11px] text-blue-800 dark:text-blue-300">
            Sistem akan otomatis membuat <strong>{{ batchForm.racks_count * 3 }} bin baru</strong> (Tingkat A, B, C untuk setiap rak 01 s/d {{ String(batchForm.racks_count).padStart(2, '0') }}).
          </div>

          <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" @click="showBatchModal = false" class="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
            <button type="submit" :disabled="isSubmitting" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center space-x-1.5 shadow-xs">
              <AppIcon name="check" custom-class="w-3.5 h-3.5" />
              <span>{{ isSubmitting ? 'Membuat Rak...' : 'Generate Rak Sekarang' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterStore } from '~/stores/master'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'
import { useSwal } from '~/composables/useSwal'
import WarehouseRackVisualizer from '~/components/WarehouseRackVisualizer.vue'

const masterStore = useMasterStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()
const swal = useSwal()

const selectedWarehouseId = ref('')
const locations = ref([])
const searchQuery = ref('')
const showBatchModal = ref(false)
const isSubmitting = ref(false)

const batchForm = ref({
  zone: 'A',
  aisle: '03',
  location_type: 'STANDARD_RACK',
  racks_count: 4,
  tiers: ['A', 'B', 'C'],
  max_weight_capacity_kg: 2000,
  max_volume_capacity_cbm: 5.0
})

async function loadWarehouseLocations(whId) {
  if (!whId) return
  try {
    const res = await apiFetch(`/warehouses/${whId}`)
    if (res.success && res.data?.locations) {
      locations.value = res.data.locations
    }
  } catch (err) {
    console.error('Gagal memuat lokasi:', err)
  }
}

function onWarehouseChanged() {
  loadWarehouseLocations(selectedWarehouseId.value)
}

const displayLocations = computed(() => {
  if (!searchQuery.value.trim()) return locations.value
  const q = searchQuery.value.toLowerCase()
  return locations.value.filter(l => 
    `${l.zone}-${l.aisle}-${l.rack}-${l.bin}`.toLowerCase().includes(q) ||
    (l.current_occupants || '').toLowerCase().includes(q) ||
    (l.location_type || '').toLowerCase().includes(q)
  )
})

const totalAisles = computed(() => {
  const set = new Set(locations.value.map(l => l.aisle))
  return set.size
})

const totalRacks = computed(() => {
  const set = new Set(locations.value.map(l => `${l.aisle}-${l.rack}`))
  return set.size
})

const totalWeightCapacity = computed(() => {
  return locations.value.reduce((sum, l) => sum + (Number(l.max_weight_capacity_kg) || 2000), 0)
})

const occupancyRate = computed(() => {
  if (!locations.value.length) return 0
  const occupied = locations.value.filter(l => Number(l.stored_qty || 0) > 0).length
  return Math.round((occupied / locations.value.length) * 100)
})

async function submitBatchGenerate() {
  isSubmitting.value = true
  try {
    const res = await apiFetch(`/warehouses/${selectedWarehouseId.value}/locations/batch`, {
      method: 'POST',
      body: batchForm.value
    })
    if (res.success) {
      swal.showSuccess('Berhasil', res.message || 'Lokasi rak berhasil digenerate.')
      showBatchModal.value = false
      await loadWarehouseLocations(selectedWarehouseId.value)
    }
  } catch (err) {
    swal.showError('Gagal', err.detail || err.message || 'Gagal generate lokasi rak.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await masterStore.fetchWarehouses()
  selectedWarehouseId.value = authStore.activeWarehouseId || masterStore.warehouses[0]?.id || ''
  if (selectedWarehouseId.value) {
    await loadWarehouseLocations(selectedWarehouseId.value)
  }
})
</script>
