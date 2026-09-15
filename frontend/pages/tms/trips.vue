<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            TMS Enterprise
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trip Dispatcher & Multi-Drop
          </h1>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Konsolidasi Delivery Order ke armada truk, validasi proteksi muatan (Overload Guard), dan pelacakan surat tugas perjalanan.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="loadTrips"
          class="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          Refresh
        </button>
        <button
          @click="openCreateModal"
          class="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow transition flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Buat Surat Tugas Jalan (Trip)
        </button>
      </div>
    </div>

    <!-- Metric Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Perjalanan</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ trips.length }}</p>
        <span class="text-[10px] text-slate-400 font-mono">Surat Tugas Diterbitkan</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-amber-600 dark:text-amber-400">Armada Siap Berangkat</p>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
          {{ trips.filter(t => t.status === 'PLANNED').length }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Status PLANNED</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-blue-600 dark:text-blue-400">Dalam Perjalanan (En-Route)</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
          {{ trips.filter(t => t.status === 'IN_TRANSIT').length }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Status IN_TRANSIT</span>
      </div>

      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Selesai Terkirim</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
          {{ trips.filter(t => t.status === 'COMPLETED').length }}
        </p>
        <span class="text-[10px] text-slate-400 font-mono">Semua Titik Drop Tuntas</span>
      </div>
    </div>

    <!-- Status Tabs Filter -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        v-for="tab in ['ALL', 'PLANNED', 'IN_TRANSIT', 'COMPLETED']"
        :key="tab"
        @click="activeStatusFilter = tab"
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        :class="activeStatusFilter === tab 
          ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        {{ tab === 'ALL' ? 'Semua Status' : tab }}
      </button>
    </div>

    <!-- Trip List Cards -->
    <div v-if="loading" class="text-center py-12 text-sm text-slate-400">
      Memuat daftar penugasan armada TMS...
    </div>

    <div v-else-if="filteredTrips.length === 0" class="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Belum ada surat tugas perjalanan pada filter ini.</p>
      <p class="text-xs text-slate-400 mt-1">Klik tombol "Buat Surat Tugas Jalan" untuk menjadwalkan rute pengiriman.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="trip in filteredTrips"
        :key="trip.id"
        class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
      >
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="font-mono text-sm font-bold text-slate-900 dark:text-white">{{ trip.trip_number }}</span>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ trip.warehouse_name }}</p>
            </div>
            <span
              class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
              :class="{
                'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': trip.status === 'PLANNED',
                'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300': trip.status === 'IN_TRANSIT',
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': trip.status === 'COMPLETED'
              }"
            >
              {{ trip.status }}
            </span>
          </div>

          <!-- Vehicle & Driver Card Info -->
          <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
            <div class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Armada Truk:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">{{ trip.plate_number }} ({{ trip.vehicle_type_name }})</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Supir (Driver):</span>
              <span class="font-medium text-slate-800 dark:text-slate-200">{{ trip.driver_name }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Titik Drop:</span>
              <span class="font-bold text-primary-600 dark:text-primary-400">
                {{ trip.delivered_stops || 0 }} / {{ trip.total_stops || 0 }} Selesai
              </span>
            </div>
          </div>

          <!-- Capacity Utilization Gauges -->
          <div class="space-y-1.5 pt-1">
            <div class="flex justify-between text-[11px]">
              <span class="text-slate-500">Muatan Berat:</span>
              <span class="font-mono font-medium text-slate-700 dark:text-slate-300">
                {{ (Number(trip.total_weight_kg) || 0).toLocaleString('id-ID') }} / {{ (Number(trip.max_payload_kg) || 0).toLocaleString('id-ID') }} kg
              </span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="getPayloadColor(trip.total_weight_kg, trip.max_payload_kg)"
                :style="{ width: Math.min(100, Math.round((trip.total_weight_kg / (trip.max_payload_kg || 1)) * 100)) + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <button
            @click="openDetailModal(trip.id)"
            class="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition"
          >
            Lihat Rute & POD Drop
          </button>

          <button
            v-if="trip.status === 'PLANNED'"
            @click="dispatchTrip(trip.id)"
            class="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            Berangkatkan
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL BUAT RENCANA TRIP ═══ -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Buat Surat Tugas Perjalanan (Trip Manifest)</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Pilih armada dan gabungkan beberapa Delivery Order (Multi-Drop).</p>
          </div>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          <!-- Form Header -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gudang Asal</label>
              <select v-model="form.warehouse_id" @change="loadAvailableOrders" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Armada</label>
              <select v-model="form.vehicle_id" @change="onVehicleSelect" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                <option value="">-- Pilih Armada Truk --</option>
                <option v-for="v in vehicles" :key="v.id" :value="v.id">
                  {{ v.plate_number }} ({{ v.type || v.brand || 'Armada' }}) - Max: {{ v.max_payload_kg || 2500 }} kg
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Supir (Driver)</label>
              <input v-model="form.driver_name" type="text" placeholder="Nama driver" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2" />
            </div>
          </div>

          <!-- OVERLOAD GUARD GAUGE PANEL -->
          <div v-if="selectedVehicle" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :class="isOverloaded ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'"></span>
                Proteksi Beban Muatan (Overload Guard ODOL)
              </span>
              <span v-if="isOverloaded" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                BAHAYA: KELEBIHAN BEBAN!
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Weight Gauge -->
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-slate-500">Berat Muatan:</span>
                  <span class="font-mono font-bold" :class="weightPct > 100 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'">
                    {{ totalSelectedWeight.toLocaleString('id-ID') }} / {{ Number(selectedVehicle.max_payload_kg || 0).toLocaleString('id-ID') }} kg ({{ weightPct }}%)
                  </span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div class="h-2 rounded-full transition-all duration-300" :class="weightPct > 100 ? 'bg-rose-600' : (weightPct > 85 ? 'bg-amber-500' : 'bg-emerald-500')" :style="{ width: Math.min(100, weightPct) + '%' }"></div>
                </div>
              </div>

              <!-- Volume Gauge -->
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-slate-500">Volume Kubikasi:</span>
                  <span class="font-mono font-bold" :class="volumePct > 100 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'">
                    {{ totalSelectedVolume.toFixed(2) }} / {{ Number(selectedVehicle.max_volume_cbm || 0).toFixed(2) }} CBM ({{ volumePct }}%)
                  </span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div class="h-2 rounded-full transition-all duration-300" :class="volumePct > 100 ? 'bg-rose-600' : 'bg-cyan-500'" :style="{ width: Math.min(100, volumePct) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- DO Multi-Select Table -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pilih Delivery Order untuk Dimuat (Multi-Drop)
              </label>
              <span class="text-[11px] text-slate-500">{{ selectedOrders.length }} Order Terpilih</span>
            </div>

            <div v-if="availableOrders.length === 0" class="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              Tidak ada Delivery Order siap kirim pada gudang ini.
            </div>

            <div v-else class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold">
                  <tr>
                    <th class="p-2.5 w-10 text-center">Pilih</th>
                    <th class="p-2.5">No. Order (DO)</th>
                    <th class="p-2.5">Penerima & Tujuan</th>
                    <th class="p-2.5 text-right">Berat (KG)</th>
                    <th class="p-2.5 text-right">Volume (CBM)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="ord in availableOrders" :key="ord.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td class="p-2.5 text-center">
                      <input
                        type="checkbox"
                        :value="ord.id"
                        v-model="selectedOrderIds"
                        class="rounded text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td class="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{{ ord.order_number }}</td>
                    <td class="p-2.5">
                      <div class="font-medium text-slate-800 dark:text-slate-200">{{ ord.recipient_name }}</div>
                      <div class="text-[11px] text-slate-400 truncate max-w-xs">{{ ord.destination_address }} ({{ ord.destination_city || '-' }})</div>
                    </td>
                    <td class="p-2.5 text-right font-mono font-medium">{{ Number(ord.total_weight_kg || 0).toLocaleString('id-ID') }} kg</td>
                    <td class="p-2.5 text-right font-mono font-medium">{{ Number(ord.total_volume_cbm || 0).toFixed(2) }} m³</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span v-if="isOverloaded" class="text-xs text-rose-600 font-semibold">
            Truk kelebihan muatan! Kurangi order untuk melanjutkan.
          </span>
          <span v-else class="text-xs text-slate-400">
            Total {{ selectedOrderIds.length }} drop stop akan ditugaskan.
          </span>

          <div class="flex items-center gap-2">
            <button @click="showCreateModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Batal
            </button>
            <button
              @click="submitCreateTrip"
              :disabled="submitting || isOverloaded || selectedOrderIds.length === 0 || !form.vehicle_id"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition"
            >
              {{ submitting ? 'Menerbitkan...' : 'Terbitkan Surat Tugas TMS' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL DETAIL TRIP & STOPS ═══ -->
    <div
      v-if="showDetailModal && currentTrip"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-base font-bold text-slate-900 dark:text-white">{{ currentTrip.trip_number }}</span>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {{ currentTrip.status }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Armada: {{ currentTrip.plate_number }} · Supir: {{ currentTrip.driver_name }}
            </p>
          </div>

          <ThermalPrintButton
            :data="{
              title: 'SURAT TUGAS PERJALANAN TMS',
              no_order: currentTrip.trip_number,
              petugas: currentTrip.driver_name,
              tujuan: currentTrip.stops?.[0]?.destination_address || 'Multi-Drop',
              items: currentTrip.stops?.map(s => ({ nama: s.recipient_name, qty: s.weight_kg + ' KG' })) || []
            }"
            label="Cetak Surat Tugas"
          />
        </div>

        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Rute Perjalanan & Titik Drop (Multi-Drop Stops)
          </h4>

          <div class="space-y-3">
            <div
              v-for="(stop, idx) in currentTrip.stops"
              :key="stop.id"
              class="p-3.5 rounded-xl border transition"
              :class="stop.status === 'DELIVERED' 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-3">
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                    :class="stop.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
                  >
                    {{ idx + 1 }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs text-slate-900 dark:text-white">{{ stop.recipient_name }}</span>
                      <span class="font-mono text-[10px] text-slate-400">({{ stop.reference_number }})</span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{{ stop.destination_address }}</p>
                    <p class="text-[11px] text-slate-400 font-mono mt-1">
                      Muatan: {{ Number(stop.weight_kg || 0).toLocaleString('id-ID') }} kg · {{ Number(stop.volume_cbm || 0).toFixed(2) }} m³
                    </p>
                    <p v-if="stop.pod_notes" class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 italic">
                      Catatan POD: {{ stop.pod_notes }}
                    </p>
                  </div>
                </div>

                <div class="shrink-0 text-right">
                  <span
                    v-if="stop.status === 'DELIVERED'"
                    class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    Terkirim
                  </span>
                  <button
                    v-else
                    @click="completeStop(currentTrip.id, stop.id)"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                  >
                    Konfirmasi Diterima (BAST)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button @click="showDetailModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWmsApi } from '~/composables/useWmsApi'
import { useAuthStore } from '~/stores/auth'

const { apiFetch } = useWmsApi()
const authStore = useAuthStore()

const trips = ref([])
const warehouses = ref([])
const vehicles = ref([])
const availableOrders = ref([])
const loading = ref(false)
const submitting = ref(false)
const activeStatusFilter = ref('ALL')

const showCreateModal = ref(false)
const showDetailModal = ref(false)
const currentTrip = ref(null)

const form = ref({
  warehouse_id: '',
  vehicle_id: '',
  driver_name: '',
  odometer_start: null,
  notes: ''
})

const selectedOrderIds = ref([])

const filteredTrips = computed(() => {
  if (activeStatusFilter.value === 'ALL') return trips.value
  return trips.value.filter(t => t.status === activeStatusFilter.value)
})

const selectedVehicle = computed(() => {
  return vehicles.value.find(v => v.id === form.value.vehicle_id) || null
})

const selectedOrders = computed(() => {
  return availableOrders.value.filter(o => selectedOrderIds.value.includes(o.id))
})

const totalSelectedWeight = computed(() => {
  return selectedOrders.value.reduce((acc, o) => acc + (Number(o.total_weight_kg) || 0), 0)
})

const totalSelectedVolume = computed(() => {
  return selectedOrders.value.reduce((acc, o) => acc + (Number(o.total_volume_cbm) || 0), 0)
})

const weightPct = computed(() => {
  if (!selectedVehicle.value || !selectedVehicle.value.max_payload_kg) return 0
  return Math.round((totalSelectedWeight.value / selectedVehicle.value.max_payload_kg) * 100)
})

const volumePct = computed(() => {
  if (!selectedVehicle.value || !selectedVehicle.value.max_volume_cbm) return 0
  return Math.round((totalSelectedVolume.value / selectedVehicle.value.max_volume_cbm) * 100)
})

const isOverloaded = computed(() => {
  return weightPct.value > 100 || volumePct.value > 100
})

function getPayloadColor(weight, max) {
  const pct = Math.round(((Number(weight) || 0) / (Number(max) || 1)) * 100)
  if (pct > 90) return 'bg-rose-500'
  if (pct > 75) return 'bg-amber-500'
  return 'bg-blue-500'
}

async function loadTrips() {
  loading.value = true
  try {
    const res = await apiFetch('/tms/trips')
    if (res.success) {
      trips.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadWarehouses() {
  try {
    const res = await apiFetch('/warehouses')
    if (res.success) {
      warehouses.value = res.data || []
      if (!form.value.warehouse_id && warehouses.value.length > 0) {
        form.value.warehouse_id = authStore.activeWarehouseId || warehouses.value[0].id
      }
    }
  } catch (e) {}
}

async function loadVehicles() {
  try {
    const res = await apiFetch('/fleet/vehicles')
    if (res.success) {
      vehicles.value = res.data || []
    }
  } catch (e) {}
}

async function loadAvailableOrders() {
  try {
    const url = form.value.warehouse_id 
      ? `/tms/available-orders?warehouse_id=${form.value.warehouse_id}`
      : '/tms/available-orders'
    const res = await apiFetch(url)
    if (res.success) {
      availableOrders.value = res.data || []
    }
  } catch (e) {}
}

function onVehicleSelect() {
  const v = selectedVehicle.value
  if (v) {
    form.value.driver_name = v.driver_name || form.value.driver_name
    form.value.odometer_start = v.last_odometer_km || 0
  }
}

function openCreateModal() {
  form.value.warehouse_id = authStore.activeWarehouseId || (warehouses.value[0]?.id || '')
  form.value.vehicle_id = ''
  form.value.driver_name = authStore.user?.full_name || ''
  selectedOrderIds.value = []
  loadAvailableOrders()
  showCreateModal.value = true
}

const { confirmAction, showSuccess, showError, showWarning } = useSwal()

async function submitCreateTrip() {
  if (isOverloaded.value) {
    showWarning('Muatan Melebihi Kapasitas', 'Muatan melebihi kapasitas armada! Harap kurangi order.')
    return
  }
  submitting.value = true
  try {
    const stops = selectedOrders.value.map((o, idx) => ({
      reference_type: 'OUTBOUND_ORDER',
      reference_id: o.id,
      reference_number: o.order_number,
      recipient_name: o.recipient_name,
      destination_address: o.destination_address,
      destination_city: o.destination_city,
      weight_kg: Number(o.total_weight_kg) || 0,
      volume_cbm: Number(o.total_volume_cbm) || 0,
      stop_sequence: idx + 1
    }))

    const payload = {
      warehouse_id: form.value.warehouse_id,
      vehicle_id: form.value.vehicle_id,
      driver_name: form.value.driver_name,
      odometer_start: form.value.odometer_start,
      notes: form.value.notes,
      stops
    }

    const res = await apiFetch('/tms/trips', {
      method: 'POST',
      body: payload
    })

    if (res.success) {
      showCreateModal.value = false
      await loadTrips()
    } else {
      showError('Gagal', res.message || 'Gagal menerbitkan trip')
    }
  } catch (err) {
    showError('Kesalahan Sistem', err.message || 'Terjadi kesalahan sistem')
  } finally {
    submitting.value = false
  }
}

async function dispatchTrip(tripId) {
  const ok = await confirmAction('Berangkatkan Armada?', 'Armada akan diberangkatkan untuk trip ini sekarang.', { icon: 'question' })
  if (!ok) return
  try {
    const res = await apiFetch(`/tms/trips/${tripId}/dispatch`, { method: 'POST' })
    if (res.success) {
      await loadTrips()
    } else {
      showError('Gagal', res.message)
    }
  } catch (e) {
    showError('Error', e.message)
  }
}

async function openDetailModal(tripId) {
  try {
    const res = await apiFetch(`/tms/trips/${tripId}`)
    if (res.success) {
      currentTrip.value = res.data
      showDetailModal.value = true
    }
  } catch (e) {}
}

async function completeStop(tripId, stopId) {
  const { swal } = useSwal()
  const { value: notes } = await swal.fire({
    title: 'Catatan Serah Terima',
    input: 'text',
    inputLabel: 'Nama penerima / catatan:',
    inputValue: 'Diterima dalam kondisi baik',
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal'
  })
  if (!notes) return
  try {
    const res = await apiFetch(`/tms/trips/${tripId}/stops/${stopId}/complete`, {
      method: 'POST',
      body: { pod_notes: notes }
    })
    if (res.success) {
      await openDetailModal(tripId)
      await loadTrips()
    }
  } catch (e) {
    showError('Error', e.message)
  }
}

onMounted(async () => {
  await Promise.all([loadTrips(), loadWarehouses(), loadVehicles()])
})
</script>
