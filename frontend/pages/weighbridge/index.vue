<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Feedback Alerts -->
    <div v-if="weighbridgeStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ weighbridgeStore.errorMessage }}</span>
      </div>
      <button type="button" @click="weighbridgeStore.errorMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>
    <div v-if="weighbridgeStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ weighbridgeStore.successMessage }}</span>
      </div>
      <button type="button" @click="weighbridgeStore.successMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header Console -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
            Bulk &amp; Fleet Logistics
          </span>
          <span class="text-xs text-slate-400 dark:text-slate-500">· Stasiun Timbangan Truk</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mt-1">Jembatan Timbang Truk (Weighbridge Console)</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pencatatan Gross Weight, Tare Weight, dan perhitungan Muatan Bersih (Net Cargo) untuk kargo curah, PO Inbound &amp; pengiriman armada.
        </p>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          @click="refreshData"
          :disabled="weighbridgeStore.isLoading"
          class="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <AppIcon name="refresh" custom-class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition cursor-pointer"
        >
          <AppIcon name="plus" custom-class="w-4 h-4" />
          <span>Timbang Masuk (Gross)</span>
        </button>
      </div>
    </div>

    <!-- Digital Scale Sensor Display Card -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
      <!-- Live Scale Terminal Display -->
      <div class="lg:col-span-2 p-6 bg-slate-950 text-white rounded-xl border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
        <div class="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">DIGITAL SCALE SENSOR · RS-232 TELEMETRY</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400">SATUAN: KILOGRAM (KG) · STABLE</span>
        </div>

        <!-- Big LCD Weight Display -->
        <div class="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <span class="text-xs font-mono text-slate-400 block mb-1">BOBOT AKTIF SENSOR TIMBANGAN:</span>
            <div class="flex items-baseline space-x-3">
              <span class="text-5xl md:text-6xl font-mono font-extrabold tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                {{ simulatedLiveWeight.toLocaleString() }}
              </span>
              <span class="text-xl font-mono font-bold text-slate-400">KG</span>
            </div>
          </div>

          <!-- Quick Scale Adjusters / Simulation controls -->
          <div class="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              @click="simulatedLiveWeight = 0"
              class="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700 transition"
            >
              ZERO (0 KG)
            </button>
            <button
              type="button"
              @click="simulatedLiveWeight = 7250"
              class="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700 transition"
            >
              TARE (7.250 KG)
            </button>
            <button
              type="button"
              @click="simulatedLiveWeight = 18450"
              class="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700 transition"
            >
              GROSS (18.450 KG)
            </button>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 font-mono gap-2">
          <span>Toleransi Kalibrasi: &plusmn; 0.05% (Metrologi Legal)</span>
          <span class="text-emerald-400 font-semibold">STATUS: SIAP TIMBANG</span>
        </div>
      </div>

      <!-- Quick Metrics & Operational Info -->
      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ringkasan Hari Ini</h4>
          <div class="mt-4 space-y-3">
            <div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span class="text-xs text-slate-600 dark:text-slate-400">Menunggu Timbang Kedua:</span>
              <span class="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">{{ weighbridgeStore.openTickets.length }} Armada</span>
            </div>
            <div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span class="text-xs text-slate-600 dark:text-slate-400">Timbang Selesai:</span>
              <span class="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ weighbridgeStore.completedTickets.length }} Tiket</span>
            </div>
            <div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span class="text-xs text-slate-600 dark:text-slate-400">Total Netto Kargo Hari Ini:</span>
              <span class="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{{ totalCargoNettoToday.toLocaleString() }} KG</span>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-slate-400 leading-relaxed">
          * Selisih antara Gross (Truk + Kargo) dan Tare (Truk Kosong) menghasilkan kuantitas bersih riil untuk validasi PO dan Surat Jalan.
        </p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-slate-200 dark:border-slate-800 flex space-x-6 text-xs font-semibold">
      <button
        type="button"
        @click="activeTab = 'OPEN'"
        class="pb-3 transition relative cursor-pointer"
        :class="activeTab === 'OPEN' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
      >
        <span>Tiket Aktif / Menunggu Timbang Kedua</span>
        <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
          {{ weighbridgeStore.openTickets.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'COMPLETED'"
        class="pb-3 transition relative cursor-pointer"
        :class="activeTab === 'COMPLETED' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
      >
        <span>Riwayat Selesai (Completed)</span>
        <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
          {{ weighbridgeStore.completedTickets.length }}
        </span>
      </button>
    </div>

    <!-- Tab 1: Tiket Aktif / Menunggu Timbang Kedua -->
    <div v-if="activeTab === 'OPEN'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div v-if="weighbridgeStore.openTickets.length === 0" class="p-12 text-center text-xs text-slate-400">
        Tidak ada truk yang sedang menunggu timbang kedua. Klik <span class="font-semibold text-blue-600">+ Timbang Masuk (Gross)</span> untuk memulai.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-mono">No. Tiket</th>
              <th class="px-4 py-3">Armada / Plat</th>
              <th class="px-4 py-3">Pengemudi</th>
              <th class="px-4 py-3">Referensi Order</th>
              <th class="px-4 py-3 font-mono text-right">Berat 1 (Gross)</th>
              <th class="px-4 py-3">Operator</th>
              <th class="px-4 py-3">Waktu Masuk</th>
              <th class="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="t in weighbridgeStore.openTickets" :key="t.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-950/40 transition-colors">
              <td class="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                {{ t.ticket_number }}
              </td>
              <td class="px-4 py-3.5">
                <span class="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {{ t.truck_plate }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                {{ t.driver_name || '-' }}
              </td>
              <td class="px-4 py-3.5">
                <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{{ t.reference_id }}</div>
                <div class="text-[10px] text-slate-400 font-mono uppercase">{{ t.reference_type }}</div>
              </td>
              <td class="px-4 py-3.5 font-mono font-bold text-right text-slate-900 dark:text-white">
                {{ Number(t.first_weight_gross_kg).toLocaleString() }} KG
              </td>
              <td class="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                {{ t.weighbridge_operator }}
              </td>
              <td class="px-4 py-3.5 text-[11px] text-slate-500 font-mono">
                {{ formatTime(t.created_at) }}
              </td>
              <td class="px-4 py-3.5 text-center">
                <button
                  type="button"
                  @click="openSecondWeightModal(t)"
                  class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold shadow-xs transition cursor-pointer"
                >
                  Catat Timbang Kedua (Tare)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Riwayat Selesai (Completed) -->
    <div v-if="activeTab === 'COMPLETED'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div v-if="weighbridgeStore.completedTickets.length === 0" class="p-12 text-center text-xs text-slate-400">
        Belum ada riwayat penimbangan selesai.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-mono">No. Tiket</th>
              <th class="px-4 py-3">Armada / Plat</th>
              <th class="px-4 py-3">Pengemudi</th>
              <th class="px-4 py-3">Referensi</th>
              <th class="px-4 py-3 font-mono text-right">Gross (KG)</th>
              <th class="px-4 py-3 font-mono text-right">Tare (KG)</th>
              <th class="px-4 py-3 font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">Netto (KG)</th>
              <th class="px-4 py-3">Operator</th>
              <th class="px-4 py-3">Waktu</th>
              <th class="px-4 py-3 text-center">Cetak</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="t in weighbridgeStore.completedTickets" :key="t.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-950/40 transition-colors">
              <td class="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                {{ t.ticket_number }}
              </td>
              <td class="px-4 py-3.5">
                <span class="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {{ t.truck_plate }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                {{ t.driver_name || '-' }}
              </td>
              <td class="px-4 py-3.5">
                <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{{ t.reference_id }}</div>
                <div class="text-[10px] text-slate-400 font-mono uppercase">{{ t.reference_type }}</div>
              </td>
              <td class="px-4 py-3.5 font-mono text-right text-slate-600 dark:text-slate-400">
                {{ Number(t.first_weight_gross_kg).toLocaleString() }}
              </td>
              <td class="px-4 py-3.5 font-mono text-right text-slate-600 dark:text-slate-400">
                {{ Number(t.second_weight_tare_kg || 0).toLocaleString() }}
              </td>
              <td class="px-4 py-3.5 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                {{ Number(t.net_weight_cargo_kg || 0).toLocaleString() }}
              </td>
              <td class="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                {{ t.weighbridge_operator }}
              </td>
              <td class="px-4 py-3.5 text-[11px] text-slate-500 font-mono">
                {{ formatTime(t.created_at) }}
              </td>
              <td class="px-4 py-3.5 text-center">
                <button
                  type="button"
                  @click="printTicketReceipt(t)"
                  class="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                >
                  Cetak Struk
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal 1: Catat Timbang Pertama (Gross) -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Catat Timbang Pertama (Truk Masuk / Gross)</h3>
            <p class="text-[11px] text-slate-500">Pencatatan awal berat kotor truk saat memasuki area gudang</p>
          </div>
          <button type="button" @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang *</span>
              <select v-model="createForm.warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
                <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
              </select>
            </label>
            <label class="space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe Referensi *</span>
              <select v-model="createForm.reference_type" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
                <option value="INBOUND_ORDER">Inbound PO</option>
                <option value="OUTBOUND_ORDER">Outbound DO</option>
                <option value="CROSS_DOCK_MANIFEST">Cross-Dock Manifest</option>
                <option value="VENDOR_TRUCK">Truk Vendor Eksternal</option>
                <option value="GENERAL">Kargo Umum / Curah</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nomor Plat Truk *</span>
              <input
                v-model="createForm.truck_plate"
                type="text"
                required
                placeholder="B 1234 XYZ"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none"
              />
            </label>
            <label class="space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Pengemudi</span>
              <input
                v-model="createForm.driver_name"
                type="text"
                placeholder="Nama sopir"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </label>
          </div>

          <label class="space-y-1 block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nomor Dokumen / PO / DO</span>
            <input
              v-model="createForm.reference_id"
              type="text"
              placeholder="Contoh: PO20260901 atau ORD20260901"
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
          </label>

          <!-- Weight Input with quick fill from live scale -->
          <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Berat Pertama / Gross (KG) *</span>
              <button
                type="button"
                @click="createForm.first_weight_gross_kg = simulatedLiveWeight"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Ambil dari Timbangan Digital ({{ simulatedLiveWeight }} KG)
              </button>
            </div>
            <div class="flex items-center space-x-2">
              <input
                v-model.number="createForm.first_weight_gross_kg"
                type="number"
                min="1"
                step="1"
                required
                class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
              />
              <span class="text-xs font-mono font-bold text-slate-400">KG</span>
            </div>
          </div>

          <label class="space-y-1 block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Operator Timbangan *</span>
            <input
              v-model="createForm.weighbridge_operator"
              type="text"
              required
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </label>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="showCreateModal = false"
            class="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="weighbridgeStore.isLoading || !createForm.truck_plate || !createForm.first_weight_gross_kg"
            @click="handleCreateTicket"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {{ weighbridgeStore.isLoading ? 'Menerbitkan...' : 'Terbitkan Tiket (Timbang Masuk)' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 2: Catat Timbang Kedua (Tare) -->
    <div v-if="showSecondWeightModal && selectedTicket" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Catat Timbang Kedua (Tare / Truk Keluar)</h3>
            <p class="text-[11px] text-slate-500">Tiket: <span class="font-mono font-bold">{{ selectedTicket.ticket_number }}</span> · Plat: {{ selectedTicket.truck_plate }}</p>
          </div>
          <button type="button" @click="showSecondWeightModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-slate-500">Berat Pertama (Gross / Masuk):</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ Number(selectedTicket.first_weight_gross_kg).toLocaleString() }} KG</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Referensi:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ selectedTicket.reference_id }} ({{ selectedTicket.reference_type }})</span>
          </div>
        </div>

        <!-- Tare Weight Input -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Berat Kedua / Tare (KG) *</label>
            <button
              type="button"
              @click="secondWeightForm.second_weight_tare_kg = simulatedLiveWeight"
              class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ambil dari Timbangan Digital ({{ simulatedLiveWeight }} KG)
            </button>
          </div>
          <div class="flex items-center space-x-2">
            <input
              v-model.number="secondWeightForm.second_weight_tare_kg"
              type="number"
              min="1"
              step="1"
              required
              placeholder="Contoh: 7200"
              class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
            />
            <span class="text-xs font-mono font-bold text-slate-400">KG</span>
          </div>
        </div>

        <!-- Live Net Cargo Calculation Preview -->
        <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Kalkulasi Muatan Bersih (Net Cargo):
          </span>
          <div class="flex items-baseline justify-between">
            <span class="text-xs text-slate-600 dark:text-slate-300">Gross ({{ Number(selectedTicket.first_weight_gross_kg).toLocaleString() }}) - Tare ({{ Number(secondWeightForm.second_weight_tare_kg || 0).toLocaleString() }}):</span>
            <span class="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {{ computedNetCargo.toLocaleString() }} KG
            </span>
          </div>
        </div>

        <label class="space-y-1 block">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Operator Timbangan</span>
          <input
            v-model="secondWeightForm.weighbridge_operator"
            type="text"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </label>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="showSecondWeightModal = false"
            class="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="weighbridgeStore.isLoading || !secondWeightForm.second_weight_tare_kg || secondWeightForm.second_weight_tare_kg <= 0"
            @click="handleCompleteSecondWeight"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {{ weighbridgeStore.isLoading ? 'Menyimpan...' : 'Selesaikan & Hitung Netto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useWeighbridgeStore } from '~/stores/weighbridge'
import { useMasterStore } from '~/stores/master'
import { useAuthStore } from '~/stores/auth'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const weighbridgeStore = useWeighbridgeStore()
const masterStore = useMasterStore()
const authStore = useAuthStore()
const printer = useThermalPrinter()

const activeTab = ref('OPEN')
const simulatedLiveWeight = ref(18450)

// Modal States
const showCreateModal = ref(false)
const showSecondWeightModal = ref(false)
const selectedTicket = ref(null)

const createForm = reactive({
  warehouse_id: '',
  truck_plate: '',
  driver_name: '',
  reference_type: 'INBOUND_ORDER',
  reference_id: '',
  first_weight_gross_kg: 18450,
  weighbridge_operator: ''
})

const secondWeightForm = reactive({
  second_weight_tare_kg: 7200,
  weighbridge_operator: ''
})

const computedNetCargo = computed(() => {
  if (!selectedTicket.value) return 0
  const gross = Number(selectedTicket.value.first_weight_gross_kg) || 0
  const tare = Number(secondWeightForm.second_weight_tare_kg) || 0
  return Math.max(0, gross - tare)
})

const totalCargoNettoToday = computed(() => {
  return weighbridgeStore.completedTickets.reduce((acc, t) => acc + (Number(t.net_weight_cargo_kg) || 0), 0)
})

function formatTime(iso) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function openCreateModal() {
  createForm.warehouse_id = authStore.activeWarehouseId || (masterStore.warehouses[0]?.id || '')
  createForm.truck_plate = ''
  createForm.driver_name = ''
  createForm.reference_id = ''
  createForm.first_weight_gross_kg = simulatedLiveWeight.value || 18450
  createForm.weighbridge_operator = authStore.user?.full_name || 'Petugas Timbangan'
  showCreateModal.value = true
}

async function handleCreateTicket() {
  if (!createForm.truck_plate || !createForm.first_weight_gross_kg) return
  const ticket = await weighbridgeStore.createTicket({
    warehouse_id: createForm.warehouse_id,
    truck_plate: createForm.truck_plate,
    driver_name: createForm.driver_name || undefined,
    reference_type: createForm.reference_type,
    reference_id: createForm.reference_id || 'GENERAL',
    first_weight_gross_kg: Number(createForm.first_weight_gross_kg),
    weighbridge_operator: createForm.weighbridge_operator
  })

  if (ticket) {
    showCreateModal.value = false
    activeTab.value = 'OPEN'
  }
}

function openSecondWeightModal(ticket) {
  selectedTicket.value = ticket
  secondWeightForm.second_weight_tare_kg = 7200
  secondWeightForm.weighbridge_operator = authStore.user?.full_name || ticket.weighbridge_operator || 'Petugas Timbangan'
  showSecondWeightModal.value = true
}

async function handleCompleteSecondWeight() {
  if (!selectedTicket.value || !secondWeightForm.second_weight_tare_kg) return
  const completed = await weighbridgeStore.submitSecondWeight(selectedTicket.value.id, {
    second_weight_tare_kg: Number(secondWeightForm.second_weight_tare_kg),
    weighbridge_operator: secondWeightForm.weighbridge_operator
  })

  if (completed) {
    showSecondWeightModal.value = false
    activeTab.value = 'COMPLETED'
    // Otomatis tawarkan cetak struk tiket timbang
    await printTicketReceipt(completed)
  }
}

async function printTicketReceipt(ticket) {
  await printer.printWeighbridgeReceipt({
    ticket_number: ticket.ticket_number,
    warehouse_name: ticket.warehouse_name,
    truck_plate: ticket.truck_plate,
    driver_name: ticket.driver_name || '',
    reference_id: ticket.reference_id,
    reference_type: ticket.reference_type,
    first_weight_gross_kg: ticket.first_weight_gross_kg,
    second_weight_tare_kg: ticket.second_weight_tare_kg,
    net_weight_cargo_kg: ticket.net_weight_cargo_kg,
    operator_name: ticket.weighbridge_operator,
    date: formatTime(ticket.created_at)
  })
}

async function refreshData() {
  await weighbridgeStore.fetchTickets()
}

onMounted(async () => {
  await Promise.all([
    weighbridgeStore.fetchTickets(),
    masterStore.fetchWarehouses()
  ])
  if (authStore.user?.full_name) {
    createForm.weighbridge_operator = authStore.user.full_name
  }
})
</script>
