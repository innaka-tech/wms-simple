<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="gatePassStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ gatePassStore.errorMessage }}</span>
      </div>
      <button type="button" @click="gatePassStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="gatePassStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ gatePassStore.successMessage }}</span>
      </div>
      <button type="button" @click="gatePassStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header & Mode Switcher -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="truck" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Pos Satpam — Pemeriksaan & Gate Pass Armada</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pencatatan Odometer awal/akhir, level BBM solar, dan validasi Surat Jalan sah.</p>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 self-stretch md:self-auto min-w-[280px]">
        <button 
          type="button" 
          @click="activeTab = 'departure'"
          class="flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center space-x-1.5 cursor-pointer"
          :class="activeTab === 'departure' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
        >
          <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
          <span>Keberangkatan (Out)</span>
        </button>
        <button 
          type="button" 
          @click="activeTab = 'return'"
          class="flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center space-x-1.5 cursor-pointer"
          :class="activeTab === 'return' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
        >
          <AppIcon name="inbound" custom-class="w-3.5 h-3.5" />
          <span>Kepulangan (In)</span>
          <span v-if="departedLogs.length > 0" class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {{ departedLogs.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Mode 1: Gate-Out Departure Form (Responsive Grid) -->
    <form v-if="activeTab === 'departure'" @submit.prevent="handleDeparture" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        <!-- Left Panel: Vehicle & Driver Information -->
        <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Identitas Armada & Sopir
          </h3>

          <!-- 1. Vehicle Selection -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Pilih Armada Truk Tersedia</label>
            <select 
              v-model="formOut.vehicle_id" 
              required 
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="" disabled>-- Pilih Nomor Polisi Truk --</option>
              <option 
                v-for="veh in gatePassStore.vehicles" 
                :key="veh.id" 
                :value="veh.id"
                :disabled="veh.status === 'IN_USE'"
              >
                {{ veh.plate_number }} ({{ veh.brand || veh.type }}) - {{ veh.status }}
              </option>
            </select>
          </div>

          <!-- 2. Driver & Purpose -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Sopir</label>
              <input 
                v-model="formOut.driver_name" 
                type="text" 
                required 
                placeholder="Nama Sopir"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Keperluan Perjalanan</label>
              <select 
                v-model="formOut.purpose" 
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="CROSS_DOCK_DELIVERY">Cross-Dock Transfer</option>
                <option value="OUTBOUND_DELIVERY">Pengantaran Customer</option>
                <option value="EMPTY_RETURN">Kembali Kosong</option>
                <option value="MAINTENANCE">Servis / Bengkel</option>
              </select>
            </div>
          </div>

          <!-- 3. Surat Jalan / Document Reference -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">No. Surat Jalan / Manifest Sah</label>
            <div class="flex space-x-2">
              <input 
                v-model="formOut.reference_number" 
                type="text" 
                required 
                placeholder="Contoh: MNF-20260901-001"
                class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
              <button 
                type="button" 
                @click="triggerQrScan" 
                class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <AppIcon name="camera" custom-class="w-3.5 h-3.5" />
                <span>Scan Dokumen</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Panel: Odometer, Fuel Level & Officer Sign-off -->
        <div class="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 shadow-sm transition-colors">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Inspeksi Fisik Odometer & BBM
          </h3>

          <!-- 4. Large Odometer Input -->
          <div class="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Kilometer Awal (Odometer Out)</label>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Angka Speedometer Fisik</span>
            </div>
            <div class="flex items-center space-x-2">
              <input 
                v-model.number="formOut.odometer_out" 
                type="number" 
                step="0.1" 
                required 
                placeholder="45200.0"
                class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-md font-mono">KM</span>
            </div>
          </div>

          <!-- 5. Fuel Level Selector -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Level BBM Solar Saat Keluar</label>
            <div class="grid grid-cols-4 gap-2 font-mono text-xs">
              <button 
                v-for="lvl in ['E_RESERVE', 'QUARTER', 'HALF', 'FULL']" 
                :key="lvl"
                type="button"
                @click="formOut.fuel_level_out = lvl"
                class="py-2.5 rounded-md border text-center font-semibold transition cursor-pointer"
                :class="formOut.fuel_level_out === lvl ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
              >
                {{ lvl.replace('_', ' ') }}
              </button>
            </div>
          </div>

          <!-- 6. Satpam Officer -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Satpam Pemeriksa (Wajib)</label>
            <input 
              v-model="formOut.departure_security_officer" 
              type="text" 
              required 
              placeholder="Contoh: Sersan Hendro / Bripka Joko"
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <!-- Submit Action -->
          <button 
            type="submit" 
            :disabled="gatePassStore.isLoading"
            class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-md shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 text-sm cursor-pointer mt-2"
          >
            <AppIcon name="check" custom-class="w-4 h-4" />
            <span>{{ gatePassStore.isLoading ? 'Memproses...' : 'Catat Keberangkatan & Buka Gerbang' }}</span>
          </button>
        </div>
      </div>
    </form>

    <!-- Mode 2: Gate-In Return Log List (Responsive Card Grid) -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Daftar Armada di Luar (Menunggu Kembali ke Gudang)
        </h3>
        <span class="text-xs text-slate-400 dark:text-slate-500 font-mono">{{ departedLogs.length }} Unit Aktif</span>
      </div>

      <div v-if="departedLogs.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <AppIcon name="truck" custom-class="w-6 h-6" />
        </div>
        <h4 class="text-base font-bold text-slate-800 dark:text-slate-200">Semua Armada Berada di Gudang</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Tidak ada truk yang saat ini berstatus di luar gudang (DEPARTED). Seluruh armada terparkir aman di pool.</p>
      </div>

      <!-- Responsive Grid for Departed Vehicles -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        <div 
          v-for="log in departedLogs" 
          :key="log.id" 
          class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3.5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-black text-slate-900 dark:text-slate-100 text-base font-mono tracking-tight">{{ log.plate_number }}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sopir: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ log.driver_name }}</span></p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Tujuan: <span class="font-semibold text-blue-600 dark:text-blue-400">{{ log.purpose }}</span></p>
              </div>
              <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                DI LUAR
              </span>
            </div>

            <div class="mt-3 p-2.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono space-y-0.5">
              <div>Odo Keluar: <span class="font-bold text-slate-900 dark:text-slate-100">{{ log.odometer_out }} KM</span></div>
              <div class="truncate">Dokumen: <span class="font-bold text-slate-900 dark:text-slate-100">{{ log.reference_number || '-' }}</span></div>
            </div>
          </div>

          <div class="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <div class="flex space-x-2">
              <input 
                v-model.number="returnInputs[log.id]" 
                type="number" 
                step="0.1" 
                placeholder="Odometer Masuk (KM)" 
                class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs md:text-sm text-slate-900 dark:text-slate-100 font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
              <button 
                type="button" 
                @click="handleReturn(log)"
                :disabled="gatePassStore.isLoading"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                Gate In
              </button>
            </div>
            <div class="flex justify-end">
              <ThermalPrintButton 
                label="Cetak Struk Satpam"
                :receipt-data="{
                  log_number: log.log_number || 'GATE-OUT-LOG',
                  plate_number: log.plate_number,
                  driver_name: log.driver_name,
                  purpose: log.purpose,
                  odometer_out: log.odometer_out,
                  fuel_level_out: log.fuel_level_out || 'FULL',
                  officer_name: log.departure_security_officer || 'Sersan Hendro',
                  type: 'GATE_OUT'
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useGatePassStore } from '~/stores/gatePass'
import { useAuthStore } from '~/stores/auth'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const gatePassStore = useGatePassStore()
const authStore = useAuthStore()

const activeTab = ref('departure')
const returnInputs = reactive({})

const formOut = ref({
  vehicle_id: '',
  driver_name: 'Budi Santoso',
  purpose: 'CROSS_DOCK_DELIVERY',
  reference_number: 'MNF-20260901-001',
  odometer_out: 45200.0,
  fuel_level_out: 'FULL',
  departure_security_officer: 'Sersan Hendro'
})

const departedLogs = computed(() => {
  return gatePassStore.logs.filter(l => l.status === 'DEPARTED')
})

const { playAudioFeedback } = useBarcodeScanner((scannedCode) => {
  formOut.value.reference_number = scannedCode
})

function triggerQrScan() {
  formOut.value.reference_number = `MNF-${Date.now().toString().slice(-6)}`
  playAudioFeedback('SUCCESS')
}

async function handleDeparture() {
  const success = await gatePassStore.submitDeparture({
    ...formOut.value,
    warehouse_id: authStore.activeWarehouseId
  })

  if (success) {
    playAudioFeedback('SUCCESS')
  } else {
    playAudioFeedback('ERROR')
  }
}

async function handleReturn(log) {
  const odoIn = returnInputs[log.id]
  if (!odoIn) {
    gatePassStore.errorMessage = 'Kilometer kembali (Odometer In) wajib diisi!'
    playAudioFeedback('ERROR')
    return
  }

  const success = await gatePassStore.submitReturn(log.id, {
    odometer_in: odoIn,
    fuel_level_in: 'FULL',
    return_security_officer: 'Sersan Hendro'
  })

  if (success) {
    playAudioFeedback('SUCCESS')
  } else {
    playAudioFeedback('ERROR')
  }
}

onMounted(async () => {
  await gatePassStore.fetchVehicles()
  await gatePassStore.fetchLogs()

  if (gatePassStore.vehicles.length > 0 && !formOut.value.vehicle_id) {
    const available = gatePassStore.vehicles.find(v => v.status === 'AVAILABLE')
    if (available) {
      formOut.value.vehicle_id = available.id
      if (available.last_odometer_km) {
        formOut.value.odometer_out = available.last_odometer_km
      }
    }
  }
})
</script>
