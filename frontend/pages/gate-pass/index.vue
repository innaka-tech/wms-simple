<template>
  <div class="space-y-4">
    <!-- Feedback Alerts -->
    <div v-if="gatePassStore.errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center">
      <span>⚠ {{ gatePassStore.errorMessage }}</span>
      <button type="button" @click="gatePassStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>
    <div v-if="gatePassStore.successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
      <span>✓ {{ gatePassStore.successMessage }}</span>
      <button type="button" @click="gatePassStore.successMessage = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header Mode Switcher -->
    <div class="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
      <button 
        type="button" 
        @click="activeTab = 'departure'"
        class="flex-1 py-2.5 rounded-lg text-xs font-semibold transition text-center"
        :class="activeTab === 'departure' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        Gate Keluar (Out)
      </button>
      <button 
        type="button" 
        @click="activeTab = 'return'"
        class="flex-1 py-2.5 rounded-lg text-xs font-semibold transition text-center"
        :class="activeTab === 'return' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        Gate Masuk (In)
      </button>
    </div>

    <!-- Mode 1: Gate-Out Departure Form -->
    <form v-if="activeTab === 'departure'" @submit.prevent="handleDeparture" class="space-y-4">
      <!-- 1. Vehicle Selection -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Pilih Armada Truk</label>
        <select 
          v-model="formOut.vehicle_id" 
          required 
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
      <div class="grid grid-cols-2 gap-2.5">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Sopir</label>
          <input 
            v-model="formOut.driver_name" 
            type="text" 
            required 
            placeholder="Nama Sopir"
            class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Keperluan</label>
          <select 
            v-model="formOut.purpose" 
            class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
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
            class="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
          />
          <button 
            type="button" 
            @click="triggerQrScan" 
            class="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            📷 Scan QR
          </button>
        </div>
      </div>

      <!-- 4. Large Odometer Input -->
      <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-sm">
        <div class="flex justify-between items-center">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Kilometer Awal (Odometer Out)</label>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Angka Speedometer</span>
        </div>
        <div class="flex items-center space-x-2">
          <input 
            v-model.number="formOut.odometer_out" 
            type="number" 
            step="0.1" 
            required 
            placeholder="45200.0"
            class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
          />
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">KM</span>
        </div>
      </div>

      <!-- 5. Fuel Level Selector -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Kondisi BBM Solar Saat Keluar</label>
        <div class="grid grid-cols-4 gap-1.5 font-mono text-xs">
          <button 
            v-for="lvl in ['E_RESERVE', 'QUARTER', 'HALF', 'FULL']" 
            :key="lvl"
            type="button"
            @click="formOut.fuel_level_out = lvl"
            class="py-2.5 rounded-xl border text-center font-medium transition"
            :class="formOut.fuel_level_out === lvl ? 'bg-blue-600 border-blue-500 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
          >
            {{ lvl.replace('_', ' ') }}
          </button>
        </div>
      </div>

      <!-- 6. Satpam Officer -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Petugas Satpam Pemeriksa</label>
        <input 
          v-model="formOut.departure_security_officer" 
          type="text" 
          required 
          placeholder="Sersan Hendro / Bripka Joko"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <!-- Submit Action -->
      <button 
        type="submit" 
        :disabled="gatePassStore.isLoading"
        class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <span>{{ gatePassStore.isLoading ? 'Memproses...' : 'Buka Palang & Catat Gate-Out' }}</span>
      </button>
    </form>

    <!-- Mode 2: Gate-In Return Log List -->
    <div v-else class="space-y-3">
      <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Armada di Luar (Menunggu Kembali)</h3>

      <div v-if="departedLogs.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <span class="text-2xl block mb-2 text-slate-400">🚛</span>
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Semua Armada Ada di Gudang</p>
        <p class="text-xs text-slate-500 mt-1">Tidak ada truk yang sedang berstatus keluar (DEPARTED).</p>
      </div>

      <div 
        v-for="log in departedLogs" 
        :key="log.id" 
        class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-sm"
      >
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ log.plate_number }}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Driver: {{ log.driver_name }} • Tujuan: {{ log.purpose }}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">DI LUAR</span>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Odo Keluar: {{ log.odometer_out }} KM • Dokumen: {{ log.reference_number || '-' }}
        </div>

        <div class="pt-2 flex flex-col space-y-2">
          <div class="flex space-x-2">
            <input 
              v-model.number="returnInputs[log.id]" 
              type="number" 
              step="0.1" 
              placeholder="Odometer Masuk (KM)" 
              class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
            />
            <button 
              type="button" 
              @click="handleReturn(log)"
              :disabled="gatePassStore.isLoading"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
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
