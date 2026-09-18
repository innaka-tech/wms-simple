<template>
  <div class="space-y-4">
    <!-- Header & Zone Selector Tabs -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
      <div>
        <div class="flex items-center space-x-2">
          <span class="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <AppIcon name="warehouse" custom-class="w-4 h-4" />
          </span>
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            {{ title || 'Denah & Layout Rak Gudang' }}
          </h4>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Pilih lokasi rak penyimpanan fisik berdasar lorong, bay, dan tingkat penyimpanan.
        </p>
      </div>

      <!-- Zone Filter Buttons -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          v-for="z in zoneTabs"
          :key="z.key"
          @click="activeZone = z.key"
          class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center space-x-1.5"
          :class="activeZone === z.key ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
        >
          <span>{{ z.icon }}</span>
          <span>{{ z.label }}</span>
          <span class="px-1 py-0.2 rounded-full text-[9px] font-mono" :class="activeZone === z.key ? 'bg-white/20 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'">
            {{ getZoneLocationCount(z.key) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Capacity & Legend Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 text-[11px] text-slate-500 dark:text-slate-400">
      <div class="flex items-center space-x-4 flex-wrap">
        <span class="flex items-center space-x-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
          <span>Tersedia (Kosong)</span>
        </span>
        <span class="flex items-center space-x-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20"></span>
          <span>Terisi Sebagian</span>
        </span>
        <span class="flex items-center space-x-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30 animate-pulse"></span>
          <span class="font-semibold text-blue-600 dark:text-blue-400">⭐ Rekomendasi Sistem</span>
        </span>
      </div>
      <div class="font-mono text-[10px]">
        Total Slot: <strong class="text-slate-800 dark:text-slate-200">{{ filteredLocations.length }}</strong> Bin Lokasi
      </div>
    </div>

    <!-- Visual Rack Aisles & Bays -->
    <div v-if="filteredLocations.length === 0" class="p-8 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
      Tidak ada lokasi rak terdaftar pada zona ini.
    </div>

    <div v-else class="space-y-6">
      <!-- Grouped by Zone First -->
      <div
        v-for="(zoneLocs, zoneKey) in groupedByZone"
        :key="zoneKey"
        class="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800"
      >
        <!-- Zone Header Banner -->
        <div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div class="flex items-center space-x-2.5">
            <span class="text-lg">{{ zoneLabels[zoneKey]?.icon || '📦' }}</span>
            <div>
              <div class="flex items-center space-x-2">
                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {{ zoneLabels[zoneKey]?.name || `ZONA ${zoneKey}` }}
                </h4>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  ZONA {{ zoneKey }}
                </span>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {{ zoneLabels[zoneKey]?.desc || 'Area penyimpanan rak gudang terdaftar.' }}
              </p>
            </div>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs">
            {{ zoneLocs.length }} Bin / Slot
          </span>
        </div>

        <!-- Grouped by Aisle inside Zone -->
        <div v-for="(aisleLocs, aisleName) in getAislesInZone(zoneLocs)" :key="aisleName" class="space-y-2.5 pl-1">
          <div class="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
            <span class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
              LORONG / AISLE {{ aisleName }}
            </span>
            <span class="text-[10px] text-slate-400">
              {{ Object.keys(groupedByRack(aisleLocs)).length }} Kolom Rak (Bays) &bull; {{ aisleLocs.length }} Bin Penyimpanan
            </span>
          </div>

          <!-- Racks in this Aisle -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            <div
              v-for="(rackLocs, rackNum) in groupedByRack(aisleLocs)"
              :key="rackNum"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5 transition"
            >
              <!-- Rack Bay Header -->
              <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center space-x-1.5">
                  <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  <h5 class="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    RAK / BAY {{ rackNum }}
                  </h5>
                </div>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Aisle {{ aisleName }}
                </span>
              </div>

            <!-- Vertical Shelves (Tingkat Rak - from top to bottom) -->
            <div class="space-y-2">
              <div
                v-for="loc in sortedByBin(rackLocs)"
                :key="loc.id"
                @click="onSelectLocation(loc)"
                class="p-2.5 rounded-lg border text-left transition relative cursor-pointer group"
                :class="getLocationCardClass(loc)"
              >
                <!-- Suggested Badge -->
                <div v-if="suggestedLocationId === loc.id" class="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-mono text-[9px] font-bold shadow-xs flex items-center space-x-1">
                  <span>★</span>
                  <span>Rekomendasi</span>
                </div>

                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center space-x-1.5">
                      <span class="font-mono text-xs font-bold" :class="isSelected(loc) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'">
                        Bin {{ loc.bin }}
                      </span>
                      <span class="text-[10px] font-mono text-slate-400">
                        ({{ loc.zone }}-{{ loc.aisle }}-{{ loc.rack }}-{{ loc.bin }})
                      </span>
                    </div>
                    <span class="text-[10px] block mt-0.5 text-slate-500 dark:text-slate-400">
                      {{ formatLocationType(loc.location_type) }}
                    </span>
                  </div>

                  <!-- Selection Checkmark or Status Pill -->
                  <div class="shrink-0">
                    <span v-if="isSelected(loc)" class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-xs">
                      ✓
                    </span>
                    <span
                      v-else
                      class="w-2.5 h-2.5 rounded-full inline-block mt-1"
                      :class="Number(loc.stored_qty || 0) > 0 ? 'bg-amber-500 ring-2 ring-amber-500/20' : 'bg-emerald-500 ring-2 ring-emerald-500/20'"
                    ></span>
                  </div>
                </div>

                <!-- Current Occupant / Capacity -->
                <div class="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span class="text-slate-500 truncate max-w-[130px]" :title="loc.current_occupants || 'Kosong'">
                    {{ loc.current_occupants ? `📦 ${loc.current_occupants}` : '🟢 Slot Kosong' }}
                  </span>
                  <span class="text-slate-400 font-semibold">
                    Max: {{ loc.max_weight_capacity_kg || 2000 }}kg
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  },
  suggestedLocationId: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  initialZone: {
    type: String,
    default: 'ALL'
  }
})

const emit = defineEmits(['update:modelValue', 'select'])
const { playAudioFeedback } = useBarcodeScanner()

const activeZone = ref(props.initialZone || 'ALL')

const zoneTabs = [
  { key: 'ALL', label: 'Semua Zona', icon: '🌐' },
  { key: 'A', label: 'Zona A (Dry / Sembako)', icon: '🏢' },
  { key: 'B', label: 'Zona B (Bulky / Heavy)', icon: '🏗️' },
  { key: 'C', label: 'Zona C (Cold Storage KDMP)', icon: '❄️' },
  { key: 'D', label: 'Zona D (Cross-Dock Lane)', icon: '🚚' }
]

function getZoneLocationCount(zoneKey) {
  if (zoneKey === 'ALL') return props.locations.length
  return props.locations.filter(l => l.zone === zoneKey).length
}

const filteredLocations = computed(() => {
  if (activeZone.value === 'ALL') return props.locations
  return props.locations.filter(l => l.zone === activeZone.value)
})

const zoneLabels = {
  A: { name: 'Zona A — Multi-Tier Dry Pallet Racks', icon: '🏢', desc: 'Rak bertingkat untuk sembako, karton, dan barang retail umum' },
  B: { name: 'Zona B — Heavy Duty Floor Staging & Bulky Area', icon: '🏗️', desc: 'Area lantai beton untuk komoditas berat / jumbo bag 1 ton' },
  C: { name: 'Zona C — Cold Storage Chiller (-2°C s/d +4°C)', icon: '❄️', desc: 'Ruang berpendingin untuk komoditas pertanian KDMP & bahan segar' },
  D: { name: 'Zona D — Cross-Docking & Fast-Moving Transit', icon: '🚚', desc: 'Staging transit cepat untuk barang langsung kirim / konsolidasi armada' }
}

const groupedByZone = computed(() => {
  const map = {}
  for (const loc of filteredLocations.value) {
    const z = loc.zone || 'A'
    if (!map[z]) map[z] = []
    map[z].push(loc)
  }
  return map
})

function getAislesInZone(zoneLocs) {
  const map = {}
  for (const loc of zoneLocs) {
    const a = loc.aisle || '01'
    if (!map[a]) map[a] = []
    map[a].push(loc)
  }
  return map
}

function groupedByRack(aisleLocs) {
  const map = {}
  for (const loc of aisleLocs) {
    const r = loc.rack || '01'
    if (!map[r]) map[r] = []
    map[r].push(loc)
  }
  return map
}

function sortedByBin(rackLocs) {
  return [...rackLocs].sort((a, b) => (a.bin || '').localeCompare(b.bin || ''))
}

function isSelected(loc) {
  return props.modelValue === loc.id
}

function getLocationCardClass(loc) {
  if (isSelected(loc)) {
    return 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
  }
  if (props.suggestedLocationId === loc.id) {
    return 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 border-dashed hover:border-blue-500'
  }
  if (Number(loc.stored_qty || 0) > 0) {
    return 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
  }
  return 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
}

function formatLocationType(t) {
  const dict = {
    STANDARD_RACK: 'Standard Pallet Rack',
    HEAVY_DUTY_BULK: 'Heavy-Duty Floor Staging',
    COLD_STORAGE: 'Cold Storage Room (-2°C)',
    CROSS_DOCK_LANE: 'Fast-Moving Transit Bay',
    FLOOR_STAGING: 'Floor Staging'
  }
  return dict[t] || t || 'Standard Rack'
}

function onSelectLocation(loc) {
  playAudioFeedback('SUCCESS')
  emit('update:modelValue', loc.id)
  emit('select', loc)
}
</script>
