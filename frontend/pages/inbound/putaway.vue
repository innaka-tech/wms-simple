<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <!-- Feedback Alert -->
    <div v-if="inboundStore.errorMessage" class="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ inboundStore.errorMessage }}</span>
      </div>
      <button type="button" @click="inboundStore.errorMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>
    <div v-if="inboundStore.successMessage" class="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ inboundStore.successMessage }}</span>
      </div>
      <button type="button" @click="inboundStore.successMessage = ''" class="font-bold hover:opacity-80">✕</button>
    </div>

    <!-- Header & Statistics -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
            Inbound Logistics &bull; Tahap 2
          </span>
          <span class="text-[10px] font-mono text-slate-400">Penyimpanan Rak &amp; Bin Gudang</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AppIcon name="warehouse" custom-class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Putaway (Penempatan Rak)</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Alokasikan barang fisik yang sudah di-tally di dock menuju rak multi-tier atau staging area cross-dock.
        </p>
      </div>

      <!-- Quick Metrics & Denah Button -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          @click="showOverviewRackMap = true"
          class="px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
        >
          <span>🗺️</span>
          <span>Lihat Denah Spasial Rak ({{ warehouseLocations.length }} Bins)</span>
        </button>

        <div class="px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 text-right">
          <p class="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Perlu Putaway</p>
          <p class="text-lg font-mono font-bold text-blue-700 dark:text-blue-300">{{ pendingOrders.length }} <span class="text-xs font-normal">PO</span></p>
        </div>
        <div class="px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 text-right">
          <p class="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Selesai di Rak</p>
          <p class="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300">{{ completedOrders.length }} <span class="text-xs font-normal">PO</span></p>
        </div>
      </div>
    </div>

    <!-- Filter Tab & Search -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div class="flex items-center space-x-1 w-full sm:w-auto">
        <button
          type="button"
          @click="activeTab = 'PENDING'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
          :class="activeTab === 'PENDING' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
        >
          <span>Menunggu Putaway</span>
          <span v-if="pendingOrders.length" class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">{{ pendingOrders.length }}</span>
        </button>
        <button
          type="button"
          @click="activeTab = 'COMPLETED'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
          :class="activeTab === 'COMPLETED' ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
        >
          <span>Riwayat Selesai</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">{{ completedOrders.length }}</span>
        </button>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <div class="relative w-full sm:w-64">
          <AppIcon name="search" custom-class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nomor PO / shipper..."
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <NuxtLink
          to="/master/racks"
          title="Buka Konsol Manajemen Rak Master"
          class="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <AppIcon name="settings" custom-class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>

    <!-- Orders List -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
      <div v-if="inboundStore.isLoading && displayedOrders.length === 0" class="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <AppIcon name="refresh" custom-class="w-5 h-5 animate-spin text-sky-600" />
        <span>Memuat data antrean putaway...</span>
      </div>

      <AppEmptyState
        v-else-if="displayedOrders.length === 0"
        icon="warehouse"
        :title="activeTab === 'PENDING' ? 'Tidak Ada Antrean Putaway' : 'Belum Ada Riwayat Selesai'"
        :description="activeTab === 'PENDING' ? 'Seluruh kargo yang tiba di dock telah berhasil disimpan ke rak gudang.' : 'Belum ada data transaksi putaway yang tercatat selesai.'"
      />

      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="po in displayedOrders" :key="po.id" class="p-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-xs font-bold text-slate-900 dark:text-white">{{ po.po_number }}</span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  :class="po.status === 'RECEIVED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'"
                >
                  {{ po.status === 'RECEIVED' ? 'RECEIVED — PERLU PUTAWAY' : 'PUTAWAY COMPLETED' }}
                </span>
                <span class="text-[11px] font-mono text-slate-400">· {{ po.warehouse_name || 'WH Utama' }}</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Shipper: <strong>{{ po.customer_name }}</strong>
                <span v-if="po.truck_plate" class="text-slate-400"> &bull; Truk: {{ po.truck_plate }} (Supir: {{ po.driver_name || '-' }})</span>
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Kargo: <strong class="text-slate-800 dark:text-slate-200">{{ (po.items && po.items.length) ? `${po.items.length} SKU` : 'Memuat SKU...' }}</strong> diterima fisik di dock
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                @click="openPutawayDetail(po)"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                :class="expandedId === po.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : (po.status === 'RECEIVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200')"
              >
                <AppIcon :name="expandedId === po.id ? 'x' : 'warehouse'" custom-class="w-3.5 h-3.5" />
                <span>{{ expandedId === po.id ? 'Tutup Alokasi' : (po.status === 'RECEIVED' ? 'Alokasi Rak & Simpan' : 'Lihat Detail Rak') }}</span>
              </button>
              <NuxtLink :to="'/checkpoints?doc=' + po.po_number" class="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                Audit Trail
              </NuxtLink>
            </div>
          </div>

          <!-- Panel Form Alokasi Rak (Expandable) -->
          <div v-if="expandedId === po.id" class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  {{ po.status === 'RECEIVED' ? 'Formulir Alokasi Rak & Lokasi Penyimpanan' : 'Rincian Penempatan Rak Selesai' }}
                </h4>
                <p class="text-[11px] text-slate-400">
                  Tentukan lokasi lorong, rak, dan bin penyimpanan atau alokasi buffer staging cross-dock.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="showOverviewRackMap = true"
                  class="px-2.5 py-1 text-[11px] rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition flex items-center space-x-1"
                >
                  <span>🗺️ Denah Spasial Gudang</span>
                </button>
                <span v-if="po.status === 'PUTAWAY_COMPLETED'" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ✓ Stok Sudah Masuk Buku Besar
                </span>
              </div>
            </div>

            <!-- List SKU Items -->
            <div v-if="!po.items || po.items.length === 0" class="p-8 text-center text-xs text-slate-400 font-mono">
              Memuat detail item barang fisik...
            </div>

            <div v-else class="space-y-3.5">
              <div
                v-for="item in po.items"
                :key="item.id"
                class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs"
              >
                <!-- SKU Header & Info -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div class="flex items-center space-x-2">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {{ item.sku_code }}
                    </span>
                    <strong class="text-xs text-slate-900 dark:text-white">
                      {{ item.product_name || item.sku_code }}
                    </strong>
                  </div>
                  <div class="text-[11px] font-mono text-slate-500 space-x-2">
                    <span>Order: <strong>{{ item.ordered_qty }}</strong></span>
                    <span>&bull;</span>
                    <span>Diterima Fisik: <strong class="text-emerald-600 dark:text-emerald-400">{{ item.received_qty }} Unit</strong></span>
                  </div>
                </div>

                <!-- Smart AI/System Recommendation Box -->
                <div
                  v-if="po.status === 'RECEIVED'"
                  class="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div class="flex items-center space-x-2">
                    <span class="text-base">💡</span>
                    <div>
                      <p class="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                        Rekomendasi Rak Sistem: <strong>{{ getSmartRecommendation(item)?.zoneLabel }}</strong> &bull; Bin {{ getSmartRecommendation(item)?.locCode }}
                      </p>
                      <p class="text-[10px] text-blue-700 dark:text-blue-400">
                        {{ getSmartRecommendation(item)?.reason }} (Kapasitas: {{ getSmartRecommendation(item)?.maxWeight }} KG)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="applySmartRecommendation(item)"
                    class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                  >
                    Gunakan Rekomendasi
                  </button>
                </div>

                <!-- Input Alokasi Rak jika status RECEIVED -->
                <div v-if="po.status === 'RECEIVED'" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                  <!-- Storage Qty -->
                  <div class="sm:col-span-3 space-y-1">
                    <label class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Qty Simpan ke Rak *</label>
                    <input
                      v-model.number="putawayDraft[item.id].storage_qty"
                      type="number"
                      min="0"
                      :max="item.received_qty"
                      class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <!-- Visual Location Selector -->
                  <div class="sm:col-span-6 space-y-1">
                    <div class="flex justify-between items-center">
                      <label class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Lokasi Rak Penyimpanan *</label>
                      <button
                        type="button"
                        @click="openVisualPicker(item)"
                        class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <span>🗺️</span>
                        <span>Buka Denah Visual Rak</span>
                      </button>
                    </div>

                    <!-- Selected Location Card Display -->
                    <div
                      @click="openVisualPicker(item)"
                      class="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-lg cursor-pointer transition flex items-center justify-between shadow-2xs"
                    >
                      <div class="flex items-center space-x-2 min-w-0">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <div class="truncate">
                          <p class="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                            {{ getSelectedLocationLabel(putawayDraft[item.id]?.location_id) }}
                          </p>
                          <p class="text-[10px] text-slate-400 font-mono truncate">
                            {{ getSelectedLocationDetails(putawayDraft[item.id]?.location_id) }}
                          </p>
                        </div>
                      </div>
                      <span class="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap ml-2">
                        Ganti Rak ▾
                      </span>
                    </div>
                  </div>

                  <!-- Cross-Dock Qty -->
                  <div class="sm:col-span-2 space-y-1">
                    <label class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Qty Cross-Dock</label>
                    <input
                      v-model.number="putawayDraft[item.id].cross_dock_qty"
                      type="number"
                      min="0"
                      :max="item.received_qty"
                      class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <!-- Match Checker Indicator -->
                  <div class="sm:col-span-1 flex items-center justify-center pb-2.5">
                    <span
                      class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      :class="(Number(putawayDraft[item.id]?.storage_qty || 0) + Number(putawayDraft[item.id]?.cross_dock_qty || 0) === Number(item.received_qty)) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                    >
                      {{ (Number(putawayDraft[item.id]?.storage_qty || 0) + Number(putawayDraft[item.id]?.cross_dock_qty || 0)) }}/{{ item.received_qty }}
                    </span>
                  </div>
                </div>

                <!-- Tampilan Read-only bila sudah PUTAWAY_COMPLETED -->
                <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span class="text-[10px] text-slate-400 block">Qty Masuk Rak:</span>
                    <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.storage_qty || item.received_qty }} Unit</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span class="text-[10px] text-slate-400 block">Lokasi Rak Terdaftar:</span>
                    <span class="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      {{ getSelectedLocationLabel(item.location_id) }}
                    </span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span class="text-[10px] text-slate-400 block">Qty Cross-Dock:</span>
                    <span class="font-mono text-slate-700 dark:text-slate-300">{{ item.cross_dock_qty || 0 }} Unit</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tombol Selesaikan Putaway -->
            <div v-if="po.status === 'RECEIVED'" class="flex justify-end pt-2">
              <button
                type="button"
                :disabled="inboundStore.isLoading"
                @click="submitPutawayAction(po)"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-2"
              >
                <AppIcon name="check" custom-class="w-4 h-4" />
                <span>{{ inboundStore.isLoading ? 'Menyimpan Mutasi Stok...' : 'Selesaikan Putaway (Stok Masuk Rak)' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Interactive Visual Rack Picker -->
    <div v-if="activePickerItem" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>🗺️</span>
              <span>Pilih Lokasi Rak untuk: {{ activePickerItem.product_name || activePickerItem.sku_code }}</span>
            </h3>
            <p class="text-[11px] text-slate-400">
              Klik pada salah satu kotak bin untuk memilih rak penempatan secara visual.
            </p>
          </div>
          <button type="button" @click="activePickerItem = null" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <AppIcon name="x" custom-class="w-5 h-5" />
          </button>
        </div>

        <WarehouseRackVisualizer
          :locations="warehouseLocations"
          :model-value="putawayDraft[activePickerItem.id]?.location_id"
          :suggested-location-id="getSmartRecommendation(activePickerItem)?.id"
          @select="onBinSelectedFromModal"
        />
      </div>
    </div>

    <!-- Modal Overview Full Warehouse Rack Map -->
    <div v-if="showOverviewRackMap" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>🗺️</span>
              <span>Denah Spasial &amp; Tata Letak Rak Gudang (Overview)</span>
            </h3>
            <p class="text-[11px] text-slate-400">
              Monitoring ketersediaan rak lorong, slot kosong, dan kapasitas beban simpan gudang.
            </p>
          </div>
          <button type="button" @click="showOverviewRackMap = false" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <AppIcon name="x" custom-class="w-5 h-5" />
          </button>
        </div>

        <WarehouseRackVisualizer
          :locations="warehouseLocations"
          title="Tata Letak Keseluruhan Rak Gudang"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useInboundStore } from '~/stores/inbound'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'
import { useSwal } from '~/composables/useSwal'
import WarehouseRackVisualizer from '~/components/WarehouseRackVisualizer.vue'

const inboundStore = useInboundStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()
const swal = useSwal()

const activeTab = ref('PENDING')
const searchQuery = ref('')
const expandedId = ref('')
const warehouseLocations = ref([])
const putawayDraft = reactive({})
const activePickerItem = ref(null)
const showOverviewRackMap = ref(false)

const pendingOrders = computed(() => {
  return inboundStore.orders.filter(o => o.status === 'RECEIVED')
})

const completedOrders = computed(() => {
  return inboundStore.orders.filter(o => o.status === 'PUTAWAY_COMPLETED')
})

const displayedOrders = computed(() => {
  const base = activeTab.value === 'PENDING' ? pendingOrders.value : completedOrders.value
  if (!searchQuery.value.trim()) return base
  const q = searchQuery.value.toLowerCase()
  return base.filter(o => 
    (o.po_number || '').toLowerCase().includes(q) ||
    (o.customer_name || '').toLowerCase().includes(q) ||
    (o.truck_plate || '').toLowerCase().includes(q)
  )
})

async function loadLocations(whId) {
  if (!whId) return
  try {
    const res = await apiFetch(`/warehouses/${whId}`)
    if (res.success && res.data?.locations) {
      warehouseLocations.value = res.data.locations
    }
  } catch (err) {
    console.error('Gagal memuat lokasi rak:', err)
  }
}

function getSmartRecommendation(item) {
  if (!item || !warehouseLocations.value.length) return null
  const text = `${item.sku_code || ''} ${item.product_name || ''}`.toLowerCase()

  // 1. Cold Chain / Showcase Chiller KDMP -> Zona C
  if (text.includes('chiller') || text.includes('showcase') || text.includes('kdmp') || text.includes('dingin') || text.includes('cold')) {
    const loc = warehouseLocations.value.find(l => l.zone === 'C') || warehouseLocations.value[0]
    return {
      id: loc.id,
      zoneLabel: 'Zona C — Cold Storage KDMP',
      locCode: `${loc.zone}-${loc.aisle}-${loc.rack}-${loc.bin}`,
      reason: 'Suhu Terkontrol (-2°C s/d +4°C)',
      maxWeight: loc.max_weight_capacity_kg || 3000
    }
  }

  // 2. Bulky / 1 Ton Jumbo Bag / Pallet Berat -> Zona B
  if (text.includes('bulky') || text.includes('1 ton') || text.includes('1t') || text.includes('jumbo') || text.includes('curah')) {
    const loc = warehouseLocations.value.find(l => l.zone === 'B') || warehouseLocations.value[0]
    return {
      id: loc.id,
      zoneLabel: 'Zona B — Heavy Duty Floor',
      locCode: `${loc.zone}-${loc.aisle}-${loc.rack}-${loc.bin}`,
      reason: 'Lantai Kuat 5 Ton Beban Berat',
      maxWeight: loc.max_weight_capacity_kg || 5000
    }
  }

  // 3. Standard Retail / Sembako Karung 25KG / Elektronik -> Zona A
  const loc = warehouseLocations.value.find(l => l.zone === 'A') || warehouseLocations.value[0]
  return {
    id: loc.id,
    zoneLabel: 'Zona A — Multi-Tier Pallet Rack',
    locCode: `${loc.zone}-${loc.aisle}-${loc.rack}-${loc.bin}`,
    reason: 'Multi-Tier Racking Standar',
    maxWeight: loc.max_weight_capacity_kg || 2000
  }
}

function applySmartRecommendation(item) {
  const rec = getSmartRecommendation(item)
  if (rec && putawayDraft[item.id]) {
    putawayDraft[item.id].location_id = rec.id
  }
}

function getSelectedLocationLabel(locId) {
  if (!locId) return 'Pilih Lokasi Rak...'
  const loc = warehouseLocations.value.find(l => l.id === locId)
  if (!loc) return 'Lokasi Rak Dipilih'
  return `Zona ${loc.zone} &bull; Lorong ${loc.aisle} &bull; Rak ${loc.rack}-${loc.bin}`
}

function getSelectedLocationDetails(locId) {
  if (!locId) return 'Klik untuk membuka denah visual rak'
  const loc = warehouseLocations.value.find(l => l.id === locId)
  if (!loc) return ''
  return `Tipe: ${loc.location_type || 'Standard'} &bull; Kapasitas: ${loc.max_weight_capacity_kg || 2000} KG &bull; ${loc.current_occupants ? `Terisi: ${loc.current_occupants}` : 'Slot Kosong'}`
}

function openVisualPicker(item) {
  activePickerItem.value = item
}

function onBinSelectedFromModal(loc) {
  if (activePickerItem.value && putawayDraft[activePickerItem.value.id]) {
    putawayDraft[activePickerItem.value.id].location_id = loc.id
  }
  activePickerItem.value = null
}

async function openPutawayDetail(po) {
  if (expandedId.value === po.id) {
    expandedId.value = ''
    return
  }
  expandedId.value = po.id

  if (po.warehouse_id) {
    await loadLocations(po.warehouse_id)
  }

  // Ground-truth guarantee: Selalu pastikan item order terisi dari endpoint detail jika belum ada
  if (!po.items || po.items.length === 0) {
    try {
      const res = await apiFetch(`/inbound/${po.id}`)
      if (res.success && res.data?.items) {
        po.items = res.data.items
      }
    } catch (err) {
      console.error('Gagal memuat detail item:', err)
    }
  }

  // Inisialisasi draft alokasi rak untuk setiap item
  for (const item of (po.items || [])) {
    if (!putawayDraft[item.id]) {
      const rec = getSmartRecommendation(item)
      putawayDraft[item.id] = {
        storage_qty: Number(item.storage_qty || item.received_qty || item.ordered_qty || 0),
        cross_dock_qty: Number(item.cross_dock_qty || 0),
        location_id: item.location_id || rec?.id || (warehouseLocations.value[0]?.id || '')
      }
    }
  }
}

async function submitPutawayAction(po) {
  for (const item of (po.items || [])) {
    const d = putawayDraft[item.id]
    const storage = Number(d?.storage_qty || 0)
    const cross = Number(d?.cross_dock_qty || 0)
    const received = Number(item.received_qty || 0)
    if (storage + cross !== received) {
      swal.showError('Alokasi Tidak Sesuai', `Item ${item.sku_code}: Total simpan (${storage}) + cross-dock (${cross}) harus sama dengan diterima (${received}).`)
      return
    }
    if (storage > 0 && !d?.location_id) {
      swal.showError('Lokasi Rak Wajib Dipilih', `Pilih rak lokasi penyimpanan untuk item ${item.sku_code}.`)
      return
    }
  }

  const confirmed = await swal.confirmAction({
    title: 'Selesaikan Putaway?',
    text: `Stok untuk PO ${po.po_number} akan resmi bertambah ke buku besar gudang. Aksi ini tidak dapat dibatalkan.`,
    confirmButtonText: 'Ya, Selesaikan Putaway',
    cancelButtonText: 'Batal'
  })
  if (!confirmed) return

  const items = (po.items || []).map(it => ({
    id: it.id,
    product_id: it.product_id,
    received_qty: it.received_qty,
    cross_dock_qty: Number(putawayDraft[it.id]?.cross_dock_qty ?? 0),
    storage_qty: Number(putawayDraft[it.id]?.storage_qty ?? it.received_qty),
    location_id: putawayDraft[it.id]?.location_id || undefined
  }))

  const ok = await inboundStore.putaway(po.id, {
    items,
    actor_name: authStore.user?.full_name || 'Petugas Rak Gudang'
  })

  if (ok) {
    swal.showSuccess('Putaway Berhasil', `Penempatan rak untuk PO ${po.po_number} telah selesai dan saldo stok telah diperbarui.`)
    expandedId.value = ''
    activeTab.value = 'COMPLETED'
    await inboundStore.fetchOrders()
  }
}

onMounted(async () => {
  await inboundStore.fetchOrders()
  const whId = authStore.activeWarehouseId || (inboundStore.orders[0]?.warehouse_id)
  if (whId) {
    await loadLocations(whId)
  }
})
</script>
