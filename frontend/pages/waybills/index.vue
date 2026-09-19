<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="waybillStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ waybillStore.errorMessage }}</span>
      </div>
      <button type="button" @click="waybillStore.errorMessage = ''" class="font-bold ml-2 text-rose-600 dark:text-rose-400 hover:opacity-80">✕</button>
    </div>

    <div v-if="copyFeedback" class="p-3.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-xs md:text-sm text-sky-600 dark:text-sky-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="copy" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ copyFeedback }}</span>
      </div>
      <button type="button" @click="copyFeedback = ''" class="font-bold ml-2 text-sky-600 dark:text-sky-400 hover:opacity-80">✕</button>
    </div>

    <div v-if="printSuccessFeedback" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ printSuccessFeedback }}</span>
      </div>
      <button type="button" @click="printSuccessFeedback = ''" class="font-bold ml-2 text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
    </div>

    <!-- Header Section (Consistent Enterprise Card) -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs space-y-4 transition-colors">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800">
              Fase 3 — Outbound &amp; TMS
            </span>
            <span class="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {{ waybillStore.waybills.length }} Dokumen Legal Logistik
            </span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 shadow-xs">
              <AppIcon name="printer" custom-class="w-4.5 h-4.5" />
            </div>
            <span>Daftar Surat Jalan &amp; Resi Pengiriman</span>
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Penerbitan dokumen legal transportasi logistik (SJ-XXXXXXXX / RESI-XXXXXXXX), cetak rangkap Continuous/A4/Thermal, dan audit trail checkpoint pergerakan kargo.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            @click="load"
            :disabled="waybillStore.isLoading"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition cursor-pointer"
            title="Muat ulang data surat jalan"
          >
            <AppIcon name="refresh-cw" custom-class="w-3.5 h-3.5" :class="{ 'animate-spin': waybillStore.isLoading }" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            @click="printer.connectBluetoothPrinter()"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border shadow-xs transition cursor-pointer"
            :class="printer.isConnected.value 
              ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'"
            title="Hubungkan ke mobile bluetooth thermal printer"
          >
            <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
            <span>{{ printer.isConnected.value ? 'Thermal Siap' : 'Hubungkan Thermal' }}</span>
          </button>

          <NuxtLink
            to="/outbound"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
          >
            <AppIcon name="box" custom-class="w-3.5 h-3.5" />
            <span>Delivery Order</span>
          </NuxtLink>

          <NuxtLink
            to="/waybills/print"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs hover:shadow transition"
          >
            <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
            <span>Cetak Dokumen Formatter</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Metric Cards (Pastel Palette) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
        <!-- Total Surat Jalan -->
        <div class="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-slate-600 dark:text-slate-300">Total Surat Jalan</p>
            <p class="text-xl sm:text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">
              {{ waybillStore.waybills.length }}
            </p>
            <span class="text-[10px] text-slate-400 font-medium">Dokumen Sah Diterbitkan</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <AppIcon name="file-text" custom-class="w-4 h-4" />
          </div>
        </div>

        <!-- Baru Diterbitkan (Pastel Amber) -->
        <div class="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-amber-700 dark:text-amber-300">Baru Diterbitkan</p>
            <p class="text-xl sm:text-2xl font-mono font-bold text-amber-800 dark:text-amber-200 mt-1">
              {{ countIssued }}
            </p>
            <span class="text-[10px] text-amber-600/70 dark:text-amber-400/60 font-medium">Status Siap (ISSUED)</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AppIcon name="clock" custom-class="w-4 h-4" />
          </div>
        </div>

        <!-- Di Perjalanan (Pastel Sky) -->
        <div class="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-900/40 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-sky-700 dark:text-sky-300">Dalam Perjalanan</p>
            <p class="text-xl sm:text-2xl font-mono font-bold text-sky-800 dark:text-sky-200 mt-1">
              {{ countInTransit }}
            </p>
            <span class="text-[10px] text-sky-600/70 dark:text-sky-400/60 font-medium">En-Route (IN_TRANSIT)</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-sky-100/80 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
            <AppIcon name="navigation" custom-class="w-4 h-4" />
          </div>
        </div>

        <!-- Selesai POD (Pastel Teal) -->
        <div class="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 shadow-xs flex items-start justify-between">
          <div>
            <p class="text-[11px] font-medium text-teal-700 dark:text-teal-300">Selesai Serah Terima</p>
            <p class="text-xl sm:text-2xl font-mono font-bold text-teal-800 dark:text-teal-200 mt-1">
              {{ countPodVerified }}
            </p>
            <span class="text-[10px] text-teal-600/70 dark:text-teal-400/60 font-medium">e-POD Terverifikasi Sah</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-teal-100/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <AppIcon name="check-circle" custom-class="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Toolbar Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto max-w-full">
        <button
          type="button"
          @click="activeStatusFilter = 'ALL'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'ALL'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
        >
          <span>Semua Status</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'ALL' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ waybillStore.waybills.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeStatusFilter = 'ISSUED'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'ISSUED'
            ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-200 dark:border-amber-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300'"
        >
          <span>Terbit (ISSUED)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'ISSUED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ countIssued }}
          </span>
        </button>

        <button
          type="button"
          @click="activeStatusFilter = 'PRINTED'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'PRINTED'
            ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'"
        >
          <span>Dicetak (PRINTED)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'PRINTED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ countPrinted }}
          </span>
        </button>

        <button
          type="button"
          @click="activeStatusFilter = 'IN_TRANSIT'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'IN_TRANSIT'
            ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-sky-200 dark:border-sky-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300'"
        >
          <span>Di Perjalanan</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'IN_TRANSIT' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ countInTransit }}
          </span>
        </button>

        <button
          type="button"
          @click="activeStatusFilter = 'POD_VERIFIED'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'POD_VERIFIED'
            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs border border-teal-200 dark:border-teal-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300'"
        >
          <span>Selesai POD</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'POD_VERIFIED' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ countPodVerified }}
          </span>
        </button>

        <button
          type="button"
          @click="activeStatusFilter = 'VOID'"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          :class="activeStatusFilter === 'VOID'
            ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs border border-rose-200 dark:border-rose-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300'"
        >
          <span>Batal (VOID)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                :class="activeStatusFilter === 'VOID' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'">
            {{ countVoid }}
          </span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-80">
        <AppIcon name="search" custom-class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari SJ, resi, order, penerima..."
          class="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 shadow-xs"
        />
        <button
          v-if="searchQuery"
          type="button"
          @click="searchQuery = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Data Table & Card Container -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors">
      <!-- Loading State -->
      <div v-if="waybillStore.isLoading" class="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <AppIcon name="refresh-cw" custom-class="w-5 h-5 animate-spin text-sky-600" />
        <span>Memuat data surat jalan logistik...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredWaybills.length === 0" class="p-8">
        <AppEmptyState
          icon="file-text"
          :title="waybillStore.waybills.length === 0 ? 'Belum Ada Surat Jalan Diterbitkan' : 'Tidak Ada Dokumen yang Sesuai'"
          :hint="waybillStore.waybills.length === 0 ? 'Terbitkan Surat Jalan dari menu Delivery Order setelah proses packing koli kargo tuntas.' : 'Coba ubah kata kunci pencarian atau pilih tab status yang lain.'"
        >
          <template #default>
            <div class="flex items-center gap-2 mt-2">
              <button
                v-if="searchQuery || activeStatusFilter !== 'ALL'"
                type="button"
                @click="resetFilter"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-100 transition cursor-pointer"
              >
                <AppIcon name="refresh-cw" custom-class="w-3.5 h-3.5" />
                <span>Reset Filter &amp; Pencarian</span>
              </button>
              <NuxtLink
                to="/outbound"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition"
              >
                <AppIcon name="plus" custom-class="w-3.5 h-3.5" />
                <span>Buka Order Pengiriman</span>
              </NuxtLink>
            </div>
          </template>
        </AppEmptyState>
      </div>

      <!-- Real Desktop Table (Responsive) -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th class="p-3.5 pl-4">No. Surat Jalan &amp; Resi</th>
              <th class="p-3.5">Order &amp; Penerima</th>
              <th class="p-3.5">Status Dokumen</th>
              <th class="p-3.5">Diterbitkan Oleh</th>
              <th class="p-3.5 pr-4 text-right">Aksi Operasional</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/70">
            <tr
              v-for="row in filteredWaybills"
              :key="row.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- No. Surat Jalan & Resi -->
              <td class="p-3.5 pl-4 align-top">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                      {{ row.sj_number }}
                    </span>
                    <button
                      type="button"
                      @click="copyText(row.sj_number, 'No. Surat Jalan')"
                      class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
                      title="Salin No. Surat Jalan"
                    >
                      <AppIcon name="copy" custom-class="w-3 h-3" />
                    </button>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <span class="text-slate-400 text-[10px]">RESI:</span>
                      <span>{{ row.resi_number }}</span>
                    </span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase"
                          :class="row.reference_type === 'CROSS_DOCK_MANIFEST' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'">
                      {{ row.reference_type === 'CROSS_DOCK_MANIFEST' ? 'Cross-Dock' : 'Outbound DO' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Order & Penerima -->
              <td class="p-3.5 align-top">
                <div class="space-y-1 max-w-xs">
                  <div class="flex items-center gap-1.5">
                    <NuxtLink
                      :to="'/outbound'"
                      class="font-mono font-bold text-xs text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      {{ row.order_number || 'ORDER' }}
                    </NuxtLink>
                  </div>
                  <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AppIcon name="user" custom-class="w-3 h-3 text-slate-400 shrink-0" />
                    <span class="truncate">{{ row.recipient_name || '—' }}</span>
                  </div>
                  <div v-if="row.destination_city" class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AppIcon name="map-pin" custom-class="w-3 h-3 text-slate-400 shrink-0" />
                    <span class="truncate">{{ row.destination_city }}</span>
                  </div>
                </div>
              </td>

              <!-- Status Dokumen -->
              <td class="p-3.5 align-top">
                <div class="space-y-1">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border shadow-2xs"
                    :class="statusBadgeClass(row.status)"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="{
                        'bg-amber-500 animate-pulse': row.status === 'ISSUED',
                        'bg-indigo-500': row.status === 'PRINTED',
                        'bg-sky-500 animate-ping': row.status === 'IN_TRANSIT',
                        'bg-teal-500': row.status === 'POD_VERIFIED',
                        'bg-rose-500': row.status === 'VOID'
                      }"
                    ></span>
                    <span>{{ statusText(row.status) }}</span>
                  </span>
                  <p v-if="row.notes" class="text-[10px] text-slate-400 italic max-w-xs truncate">
                    {{ row.notes }}
                  </p>
                </div>
              </td>

              <!-- Diterbitkan Oleh -->
              <td class="p-3.5 align-top">
                <div class="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  <p class="font-medium text-slate-800 dark:text-slate-200">
                    {{ row.issued_by_name || 'System Administrator' }}
                  </p>
                  <p class="text-[11px] font-mono text-slate-400">
                    {{ formatDate(row.issued_at) }}
                  </p>
                </div>
              </td>

              <!-- Aksi Operasional -->
              <td class="p-3.5 pr-4 align-top text-right">
                <div class="flex items-center justify-end gap-1.5 flex-wrap">
                  <!-- Cetak SJ Resmi (A4/Continuous) -->
                  <NuxtLink
                    :to="'/waybills/print?sj=' + row.sj_number"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-2xs transition"
                    title="Buka form cetak A4 atau Continuous Paper"
                  >
                    <AppIcon name="printer" custom-class="w-3.5 h-3.5 text-white" />
                    <span>Cetak SJ</span>
                  </NuxtLink>

                  <!-- Cetak Thermal Cepat -->
                  <button
                    type="button"
                    @click="handlePrintThermal(row)"
                    :disabled="isPrintingId === row.id"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Cetak struk thermal kasir / driver (58/80mm)"
                  >
                    <AppIcon :name="isPrintingId === row.id ? 'refresh-cw' : 'printer'" custom-class="w-3.5 h-3.5" :class="{ 'animate-spin': isPrintingId === row.id }" />
                    <span>Thermal</span>
                  </button>

                  <!-- Audit Trail -->
                  <NuxtLink
                    :to="'/checkpoints?doc=' + row.sj_number"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition shadow-2xs"
                    title="Lacak rekaman checkpoint rantai audit"
                  >
                    <AppIcon name="shield" custom-class="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Trail</span>
                  </NuxtLink>

                  <!-- Shortcut Alur Lanjutan -->
                  <NuxtLink
                    v-if="row.status === 'ISSUED' || row.status === 'PRINTED'"
                    to="/gate-pass"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition"
                    title="Izin keluar gerbang pos satpam"
                  >
                    <AppIcon name="truck" custom-class="w-3.5 h-3.5" />
                    <span>Gate Pass ➔</span>
                  </NuxtLink>

                  <NuxtLink
                    v-else-if="row.status === 'IN_TRANSIT'"
                    :to="'/outbound/pod?order=' + (row.order_number || '')"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-semibold transition"
                    title="Isi bukti tanda tangan & foto e-POD"
                  >
                    <AppIcon name="pod" custom-class="w-3.5 h-3.5" />
                    <span>e-POD ➔</span>
                  </NuxtLink>

                  <NuxtLink
                    v-else-if="row.status === 'POD_VERIFIED'"
                    :to="'/billing?order=' + (row.order_number || '')"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition"
                    title="Terbitkan faktur invoice penagihan"
                  >
                    <AppIcon name="file-text" custom-class="w-3.5 h-3.5" />
                    <span>Billing ➔</span>
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Table Summary -->
      <div class="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-1.5">
          <span>Menampilkan</span>
          <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ filteredWaybills.length }}</span>
          <span>dari total</span>
          <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ waybillStore.waybills.length }}</span>
          <span>dokumen surat jalan resmi.</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400">Barcode Scanner Siap</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWaybillStore } from '~/stores/waybill'
import { useThermalPrinter } from '~/composables/useThermalPrinter'
import { useBarcodeScanner } from '~/composables/useBarcodeScanner'

const waybillStore = useWaybillStore()
const printer = useThermalPrinter()

const searchQuery = ref('')
const activeStatusFilter = ref('ALL')
const copyFeedback = ref('')
const printSuccessFeedback = ref('')
const isPrintingId = ref(null)

// Automatic Barcode Scanner Listener
useBarcodeScanner((barcode) => {
  searchQuery.value = barcode
  activeStatusFilter.value = 'ALL'
})

// Counts
const countIssued = computed(() => waybillStore.waybills.filter(w => w.status === 'ISSUED').length)
const countPrinted = computed(() => waybillStore.waybills.filter(w => w.status === 'PRINTED').length)
const countInTransit = computed(() => waybillStore.waybills.filter(w => w.status === 'IN_TRANSIT').length)
const countPodVerified = computed(() => waybillStore.waybills.filter(w => w.status === 'POD_VERIFIED').length)
const countVoid = computed(() => waybillStore.waybills.filter(w => w.status === 'VOID').length)

// Filtered List
const filteredWaybills = computed(() => {
  let list = waybillStore.waybills

  // Status Filter Tab
  if (activeStatusFilter.value !== 'ALL') {
    list = list.filter(w => w.status === activeStatusFilter.value)
  }

  // Search Filter
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(w => {
      const sj = (w.sj_number || '').toLowerCase()
      const resi = (w.resi_number || '').toLowerCase()
      const ord = (w.order_number || '').toLowerCase()
      const rec = (w.recipient_name || '').toLowerCase()
      const city = (w.destination_city || '').toLowerCase()
      const issuer = (w.issued_by_name || '').toLowerCase()
      return sj.includes(q) || resi.includes(q) || ord.includes(q) || rec.includes(q) || city.includes(q) || issuer.includes(q)
    })
  }

  return list
})

function resetFilter() {
  searchQuery.value = ''
  activeStatusFilter.value = 'ALL'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

async function copyText(text, label) {
  if (!text) return
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
    copyFeedback.value = `${label} "${text}" berhasil disalin ke papan klip!`
    setTimeout(() => {
      copyFeedback.value = ''
    }, 2800)
  } catch {
    copyFeedback.value = `Gagal menyalin: ${text}`
  }
}

async function handlePrintThermal(row) {
  isPrintingId.value = row.id
  try {
    await printer.printWaybillReceipt({
      order_number: row.order_number || 'ORDER',
      sj_number: row.sj_number,
      resi_number: row.resi_number,
      recipient_name: row.recipient_name || 'Pelanggan',
      destination: row.destination_city || undefined,
      issued_by: row.issued_by_name || 'Petugas Logistik'
    })
    printSuccessFeedback.value = `Struk thermal untuk ${row.sj_number} berhasil dicetak!`
    setTimeout(() => {
      printSuccessFeedback.value = ''
    }, 3000)
  } catch (err) {
    waybillStore.errorMessage = err?.message || 'Gagal mencetak struk thermal.'
  } finally {
    isPrintingId.value = null
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'ISSUED':
      return 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/50'
    case 'PRINTED':
      return 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/50'
    case 'IN_TRANSIT':
      return 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-900/50'
    case 'POD_VERIFIED':
      return 'bg-teal-50/80 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-900/50'
    case 'VOID':
      return 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/50'
    default:
      return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

function statusText(status) {
  switch (status) {
    case 'ISSUED':
      return 'Terbit (ISSUED)'
    case 'PRINTED':
      return 'Dicetak (PRINTED)'
    case 'IN_TRANSIT':
      return 'En-Route (Jalan)'
    case 'POD_VERIFIED':
      return 'POD Verified'
    case 'VOID':
      return 'Batal (VOID)'
    default:
      return status || '—'
  }
}

async function load() {
  await waybillStore.fetchWaybills()
}

onMounted(load)
</script>
