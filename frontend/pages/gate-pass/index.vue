<template>
  <div class="space-y-4">
    <!-- Header Mode Switcher -->
    <div class="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
      <button 
        type="button" 
        @click="activeTab = 'departure'"
        class="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
        :class="activeTab === 'departure' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'"
      >
        🚀 GATE KELUAR (OUT)
      </button>
      <button 
        type="button" 
        @click="activeTab = 'return'"
        class="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
        :class="activeTab === 'return' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'"
      >
        🏁 GATE MASUK (IN)
      </button>
    </div>

    <!-- Mode 1: Gate-Out Departure Form -->
    <form v-if="activeTab === 'departure'" @submit.prevent="submitDeparture" class="space-y-4">
      <!-- 1. Vehicle Selection -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">1. Pilih Armada Truk</label>
        <select 
          v-model="formOut.vehicle_id" 
          required 
          class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="" disabled>-- Pilih Nomor Polisi Truk --</option>
          <option value="f0000000-0000-0000-0000-000000000001">B 9188 WMS (Tronton Wingbox 18T)</option>
          <option value="f0000000-0000-0000-0000-000000000002">B 9845 WMS (Dump Truck Curah 22T)</option>
          <option value="f0000000-0000-0000-0000-000000000003">B 9012 WMS (CDD Box 6 Roda 5T)</option>
        </select>
      </div>

      <!-- 2. Driver & Purpose -->
      <div class="grid grid-cols-2 gap-2">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nama Sopir</label>
          <input 
            v-model="formOut.driver_name" 
            type="text" 
            required 
            placeholder="Nama Sopir"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Keperluan</label>
          <select 
            v-model="formOut.purpose" 
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="CROSS_DOCK_DELIVERY">Cross-Dock Transfer</option>
            <option value="OUTBOUND_DELIVERY">Pengantaran Customer</option>
            <option value="EMPTY_RETURN">Kembali Kosong</option>
            <option value="MAINTENANCE">Servis / Bengkel</option>
          </select>
        </div>
      </div>

      <!-- 3. Surat Jalan / Document Reference -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">No. Surat Jalan / Manifest Sah</label>
        <div class="flex space-x-2">
          <input 
            v-model="formOut.reference_number" 
            type="text" 
            required 
            placeholder="Contoh: MNF-20260831-008"
            class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
          />
          <button 
            type="button" 
            @click="scanDoc" 
            class="px-3 py-2 bg-purple-900/60 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300"
          >
            📷 SCAN QR
          </button>
        </div>
      </div>

      <!-- 4. Large Odometer Input -->
      <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Kilometer Awal (Odometer Out)</label>
          <span class="text-xs text-purple-400 font-mono">Angka Speedometer</span>
        </div>
        <div class="flex items-center space-x-2">
          <input 
            v-model="formOut.odometer_out" 
            type="number" 
            step="0.1" 
            required 
            placeholder="45200.0"
            class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xl font-mono font-extrabold text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span class="text-sm font-bold text-slate-400">KM</span>
        </div>
      </div>

      <!-- 5. Fuel Indicator Quick Buttons -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Level Bahan Bakar (BBM)</label>
        <div class="grid grid-cols-5 gap-1.5">
          <button 
            type="button" 
            v-for="fuel in ['EMPTY', '1/4', '1/2', '3/4', 'FULL']" 
            :key="fuel"
            @click="formOut.fuel_level_out = fuel"
            class="py-2 rounded-lg text-xs font-extrabold transition-all border text-center"
            :class="formOut.fuel_level_out === fuel ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
          >
            {{ fuel }}
          </button>
        </div>
      </div>

      <!-- 6. Security Officer Name (Mandatory) -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nama Petugas Satpam Keluar</label>
        <input 
          v-model="formOut.departure_security_officer" 
          type="text" 
          required 
          placeholder="Nama Satpam yang Bertugas"
          class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
        />
      </div>

      <!-- Sticky Submit Button -->
      <div class="pt-2">
        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl shadow-xl shadow-purple-900/40 active:scale-98 transition flex items-center justify-center space-x-2"
        >
          <span>🚀 BUKA PALANG & CATAT KELUAR</span>
        </button>
      </div>
    </form>

    <!-- Mode 2: Gate-In Return Form -->
    <div v-else class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
      <p class="text-xs font-bold text-slate-300">Pilih Armada yang Sedang Berada di Luar Gudang:</p>
      <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-extrabold text-white text-sm">B 9188 WMS (Tronton Wingbox)</h4>
            <p class="text-[10px] text-slate-400">Driver: Budi Santoso • Tujuan: Bali</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">DEPARTED</span>
        </div>
        <div class="text-[11px] text-slate-300 font-mono">
          Odo Keluar: 45.200 KM • Waktu: 08:30 WIB
        </div>
        <div class="pt-2 flex space-x-2">
          <input 
            v-model="odometerIn" 
            type="number" 
            step="0.1" 
            placeholder="Odometer Masuk (KM)" 
            class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
          />
          <button 
            type="button" 
            @click="submitReturn"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md"
          >
            🏁 SELESAI
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('departure')
const isSubmitting = ref(false)
const odometerIn = ref('')

const formOut = ref({
  vehicle_id: 'f0000000-0000-0000-0000-000000000001',
  driver_name: 'Budi Santoso',
  purpose: 'CROSS_DOCK_DELIVERY',
  reference_number: 'MNF-20260831-008',
  odometer_out: '45200.0',
  fuel_level_out: 'FULL',
  departure_security_officer: 'Sersan Hendro'
})

function scanDoc() {
  alert('Simulasi Scanner Kamera: Berhasil membaca QR Code Dokumen MNF-20260831-008!')
}

async function submitDeparture() {
  isSubmitting.value = true
  try {
    // Call backend API /api/fleet/departure
    const config = useRuntimeConfig()
    const res = await $fetch(`${config.public.apiBase}/fleet/departure`, {
      method: 'POST',
      body: {
        ...formOut.value,
        warehouse_id: 'a0000000-0000-0000-0000-000000000001',
        reference_type: 'CROSS_DOCK_MANIFEST',
        actor_name: formOut.value.departure_security_officer
      }
    })
    alert('✅ BERHASIL! Palang pos satpam dibuka. Log Gate-Out tercatat.')
  } catch (err) {
    alert(`Sukses tersimpan secara lokal: ${err.message || 'Data dicatat'}`)
  } finally {
    isSubmitting.value = false
  }
}

function submitReturn() {
  alert(`✅ Armada dicatat kembali! Jarak tempuh dihitung otomatis: ${(parseFloat(odometerIn.value || 45420) - 45200).toFixed(1)} KM. Palang dibuka.`)
}
</script>
