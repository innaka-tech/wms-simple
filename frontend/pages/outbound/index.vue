<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <!-- Feedback: satu baris gabungan -->
    <div v-if="feedback.text" class="p-3 rounded-md text-xs flex justify-between items-center border"
         :class="feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'">
      <span class="font-medium">{{ feedback.text }}</span>
      <button type="button" @click="clearFeedback" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header ramping -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Delivery Order &amp; Surat Jalan</h2>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fase 3 · Alokasi Rak Picking, Packing Koli Fisik &amp; Pelacakan Unit KDMP, Terbitkan SJ + Resi</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" @click="showCreate = !showCreate"
                class="px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer"
                :class="showCreate ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'">
          {{ showCreate ? 'Tutup Form' : '+ Buat DO Baru' }}
        </button>
        <NuxtLink to="/waybills" class="px-3 py-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition">Daftar SJ & Resi</NuxtLink>
        <button type="button" @click="printer.connectBluetoothPrinter()"
                class="px-3 py-2 rounded-md text-xs font-medium border transition cursor-pointer"
                :class="printer.isConnected.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'">
          {{ printer.isConnected.value ? 'Printer siap' : 'Hubungkan printer' }}
        </button>
      </div>
    </div>

    <!-- Form Buat DO -->
    <div v-if="showCreate" class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buat Delivery Order</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Shipper / Customer</span>
          <select v-model="createForm.customer_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="c in masterStore.customers" :key="c.id" :value="c.id">{{ c.code }} — {{ c.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Asal</span>
          <select v-model="createForm.warehouse_id" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Penerima (Consignee) *</span>
          <input v-model="createForm.recipient_name" required type="text" placeholder="Nama / instansi penerima"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Telepon Penerima</span>
          <input v-model="createForm.recipient_phone" type="tel" placeholder="08xx (opsional)"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
        <label class="space-y-1 sm:col-span-2">
          <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat Tujuan *</span>
          <input v-model="createForm.destination_address" required type="text" placeholder="Alamat lengkap pengiriman"
                 class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none" />
        </label>
      </div>
      <div class="space-y-2">
        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Item Barang (SKU)</span>
        <div v-for="(it, idx) in createForm.items" :key="idx" class="flex gap-2 items-center">
          <select v-model="it.product_id" class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
            <option v-for="p in masterStore.products" :key="p.id" :value="p.id">{{ p.sku_code }} — {{ p.name }}</option>
          </select>
          <input v-model.number="it.ordered_qty" type="number" min="1" placeholder="Qty"
                 class="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none" />
          <button v-if="createForm.items.length > 1" type="button" @click="createForm.items.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-sm px-1 cursor-pointer">✕</button>
        </div>
        <button type="button" @click="createForm.items.push({ product_id: '', ordered_qty: 1 })" class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">+ Tambah baris item</button>
      </div>
      <button type="button" :disabled="outboundStore.isLoading" @click="handleCreateOrder"
              class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer">
        Simpan Delivery Order (ORDER_CREATED)
      </button>
    </div>

    <!-- Ringkasan status satu baris -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
      <span v-for="s in ringkasanStatus" :key="s.label" class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
        <span class="text-slate-500 dark:text-slate-400">{{ s.label }}</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ s.count }}</span>
      </span>
    </div>

    <!-- Daftar order -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors">
      <div v-if="outboundStore.isLoading" class="p-8 text-center text-xs text-slate-400">Memuat order...</div>
      <div v-else-if="outboundStore.orders.length === 0" class="p-8 text-center text-xs text-slate-400">Belum ada Delivery Order. Buat DO baru dari data shipper.</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="order in outboundStore.orders" :key="order.id" class="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors space-y-3">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">{{ order.order_number }}</span>
                <span class="text-[10px] font-medium" :class="statusTextClass(order.status)">{{ statusLabel(order.status) }}</span>
                <span v-if="waybillByOrder[order.id]" class="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {{ waybillByOrder[order.id].sj_number }} · {{ waybillByOrder[order.id].resi_number }}
                </span>
                <button
                  type="button"
                  @click="toggleOrderDetail(order)"
                  class="text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition ml-2 cursor-pointer"
                >
                  {{ expandedOrderId === order.id ? 'Sembunyikan Detail ▲' : 'Lihat Item & Koli ▼' }}
                </button>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {{ order.customer_name }} → {{ order.recipient_name }}<span v-if="order.destination_address" class="text-slate-400"> · {{ order.destination_address }}</span>
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="order.status === 'CREATED'"
                type="button"
                :disabled="outboundStore.isLoading"
                @click="openPickingModal(order)"
                class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                Proses Picking
              </button>
              <button
                v-else-if="order.status === 'PICKED'"
                type="button"
                :disabled="outboundStore.isLoading"
                @click="openPackingModal(order)"
                class="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                Proses Packing &amp; Koli
              </button>
              <button
                v-if="canIssue(order)"
                type="button"
                :disabled="waybillStore.isLoading"
                @click="handleIssueWaybill(order)"
                class="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                Terbitkan SJ + Resi
              </button>
              <NuxtLink
                v-if="['PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)"
                :to="'/waybills/print?order=' + order.order_number"
                class="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-[11px] font-semibold transition flex items-center space-x-1"
              >
                <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
                <span>Cetak SJ</span>
              </NuxtLink>
              <NuxtLink
                :to="'/checkpoints?doc=' + order.order_number"
                class="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                Audit Trail
              </NuxtLink>
            </div>
          </div>

          <!-- Expanded Order Detail Panel (Items & Packages/Koli) -->
          <div v-if="expandedOrderId === order.id" class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div v-if="isLoadingDetail" class="text-xs text-slate-400 py-2 text-center">Memuat detail item &amp; koli...</div>
            <div v-else class="space-y-3">
              <!-- Item Details & Rak -->
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Item Barang &amp; Lokasi Rak Pengambilan:</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div v-for="it in currentOrderDetail?.items || []" :key="it.id" class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div class="font-bold text-slate-900 dark:text-white">{{ it.product_name }}</div>
                    <div class="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>SKU: {{ it.sku_code }}</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">Qty: {{ it.ordered_qty }}</span>
                    </div>
                    <div class="pt-1 text-[10px]">
                      <span v-if="it.location_name || it.rack" class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        Rak: {{ it.zone || '' }} {{ it.aisle || '' }} {{ it.rack || it.location_name }} {{ it.bin || '' }}
                      </span>
                      <span v-else class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                        Lokasi: Staging Area
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Packages / Koli Fisik -->
              <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div class="flex justify-between items-center mb-1.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Daftar Koli Fisik (Packages / Karton Box):
                  </span>
                  <span class="text-[11px] font-mono text-slate-500">
                    Total: <strong class="text-slate-900 dark:text-white">{{ (currentOrderDetail?.packages || []).length }} Koli</strong>
                  </span>
                </div>

                <div v-if="(currentOrderDetail?.packages || []).length === 0" class="text-xs text-slate-400 py-1 italic">
                  Belum ada koli kemasan yang terdaftar. (Lakukan packing saat order berstatus PICKED).
                </div>
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div v-for="pkg in currentOrderDetail?.packages" :key="pkg.id" class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div class="flex justify-between items-center">
                      <span class="font-mono font-bold text-blue-600 dark:text-blue-400">{{ pkg.box_code }}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {{ pkg.packaging_type_name || 'Kardus' }}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-600 dark:text-slate-400 flex justify-between font-mono">
                      <span>Berat: <strong>{{ pkg.weight_kg }} KG</strong></span>
                      <span>Dimensi: {{ pkg.dimensions || '-' }}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 truncate">
                      Dikemas oleh: {{ pkg.packed_by_name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Picking: Pilihan Rak & Lokasi Ambil Barang -->
    <div v-if="showPickingModal && pickingOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Proses Picking &amp; Alokasi Rak (Step 2)</h3>
            <p class="text-[11px] text-slate-500">Ambil barang dari rak penyimpanan untuk order <span class="font-mono font-bold">{{ pickingOrder.order_number }}</span></p>
          </div>
          <button type="button" @click="showPickingModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
        </div>

        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div v-for="(it, idx) in pickingItems" :key="it.id" class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">{{ it.product_name }}</div>
                <div class="text-[11px] font-mono text-slate-500">SKU: {{ it.sku_code }}</div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">Order: {{ it.ordered_qty }} Unit</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Qty Diambil (Picked) *</span>
                <input
                  v-model.number="it.picked_qty"
                  type="number"
                  min="1"
                  :max="it.ordered_qty"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </label>

              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Lokasi Rak Pengambilan</span>
                <select
                  v-model="it.location_id"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option :value="null">— Pilih Rak / Staging —</option>
                  <option v-for="loc in availableLocations" :key="loc.id" :value="loc.id">
                    {{ loc.zone || '' }} {{ loc.aisle ? '· Lorong ' + loc.aisle : '' }} {{ loc.rack ? '· Rak ' + loc.rack : '' }} {{ loc.bin ? '· Bin ' + loc.bin : '' }}
                  </option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="showPickingModal = false"
            class="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="outboundStore.isLoading"
            @click="handleSubmitPicking"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {{ outboundStore.isLoading ? 'Memproses...' : 'Konfirmasi Picking Selesai' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Packing & Koli Fisik: Box Code, Berat, Dimensi, & Serial Number KDMP -->
    <div v-if="showPackingModal && packingOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Proses Packing &amp; Pencatatan Koli Fisik (Step 3)</h3>
            <p class="text-[11px] text-slate-500">Kemas barang order <span class="font-mono font-bold">{{ packingOrder.order_number }}</span> ke dalam dus/koli fisik &amp; catat serial number</p>
          </div>
          <button type="button" @click="showPackingModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
        </div>

        <!-- Daftar Koli / Boxes -->
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div v-for="(pkg, idx) in packageList" :key="idx" class="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">Koli #{{ idx + 1 }}</span>
              <button v-if="packageList.length > 1" type="button" @click="packageList.splice(idx, 1)" class="text-slate-400 hover:text-rose-500 text-xs cursor-pointer">
                Hapus Koli
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Kode Koli / Barcode Box *</span>
                <input
                  v-model="pkg.box_code"
                  type="text"
                  required
                  placeholder="BOX20260901"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none"
                />
              </label>
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Jenis Kemasan *</span>
                <select
                  v-model="pkg.packaging_type_id"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option v-for="pt in masterStore.packagingTypes" :key="pt.id" :value="pt.id">
                    {{ pt.name }} (Tara: {{ pt.tare_weight_kg || 0 }} KG)
                  </option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Berat Timbang Riil (KG) *</span>
                <input
                  v-model.number="pkg.weight_kg"
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </label>
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Dimensi (PxLxT cm)</span>
                <input
                  v-model="pkg.dimensions"
                  type="text"
                  placeholder="60x40x40"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </label>
            </div>

            <!-- KDMP Unit Tracking -->
            <div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Serial Number Unit (Opsional)</span>
                <input
                  v-model="pkg.serial_number"
                  type="text"
                  placeholder="SN998811"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </label>
              <label class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Tag Aset KDMP (Opsional)</span>
                <input
                  v-model="pkg.asset_tag_kdmp"
                  type="text"
                  placeholder="KDMPBALIDPS0012"
                  class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            @click="addPackageRow"
            class="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 transition cursor-pointer"
          >
            + Tambah Koli / Box Fisik
          </button>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="showPackingModal = false"
            class="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="outboundStore.isLoading"
            @click="handleSubmitPacking"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {{ outboundStore.isLoading ? 'Menyimpan...' : 'Selesaikan Packing & Segel Koli' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useAuthStore } from '~/stores/auth'
import { useMasterStore } from '~/stores/master'
import { useWmsApi } from '~/composables/useWmsApi'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const authStore = useAuthStore()
const masterStore = useMasterStore()
const { apiFetch } = useWmsApi()
const printer = useThermalPrinter()

// Form Buat DO
const showCreate = ref(false)
const createForm = reactive({
  customer_id: '',
  warehouse_id: authStore.activeWarehouseId || '',
  recipient_name: '',
  recipient_phone: '',
  destination_address: '',
  items: [{ product_id: '', ordered_qty: 1 }]
})

// Expanded Order Detail
const expandedOrderId = ref(null)
const currentOrderDetail = ref(null)
const isLoadingDetail = ref(false)

async function toggleOrderDetail(order) {
  if (expandedOrderId.value === order.id) {
    expandedOrderId.value = null
    currentOrderDetail.value = null
    return
  }
  expandedOrderId.value = order.id
  isLoadingDetail.value = true
  try {
    const res = await apiFetch(`/outbound/${order.id}`)
    if (res.success) {
      currentOrderDetail.value = res.data
    }
  } finally {
    isLoadingDetail.value = false
  }
}

// Picking Modal State
const showPickingModal = ref(false)
const pickingOrder = ref(null)
const pickingItems = ref([])
const availableLocations = ref([])

async function openPickingModal(order) {
  pickingOrder.value = order
  try {
    const res = await apiFetch(`/outbound/${order.id}`)
    if (res.success) {
      availableLocations.value = res.data.available_locations || []
      pickingItems.value = (res.data.items || []).map(it => ({
        id: it.id,
        product_name: it.product_name,
        sku_code: it.sku_code,
        ordered_qty: Number(it.ordered_qty),
        picked_qty: Number(it.picked_qty) > 0 ? Number(it.picked_qty) : Number(it.ordered_qty),
        location_id: it.location_id || (availableLocations.value[0]?.id || null)
      }))
      showPickingModal.value = true
    }
  } catch (err) {
    feedback.value = { type: 'error', text: 'Gagal memuat detail item untuk picking' }
  }
}

async function handleSubmitPicking() {
  if (!pickingOrder.value) return
  const ok = await outboundStore.pickOrder(pickingOrder.value.id, pickingItems.value)
  syncFeedback()
  if (ok) {
    showPickingModal.value = false
    feedback.value = { type: 'ok', text: `${pickingOrder.value.order_number} — picking selesai, barang siap dikemas.` }
    if (expandedOrderId.value === pickingOrder.value.id) {
      await toggleOrderDetail(pickingOrder.value)
    }
  }
}

// Packing Modal State
const showPackingModal = ref(false)
const packingOrder = ref(null)
const packageList = ref([])

function addPackageRow() {
  const num = packageList.value.length + 1
  const code = `BOX${Date.now().toString().slice(-4)}${num}`
  packageList.value.push({
    box_code: code,
    packaging_type_id: masterStore.packagingTypes[0]?.id || null,
    weight_kg: 10,
    dimensions: '60x40x40',
    serial_number: '',
    asset_tag_kdmp: ''
  })
}

async function openPackingModal(order) {
  packingOrder.value = order
  packageList.value = []
  addPackageRow()
  showPackingModal.value = true
}

async function handleSubmitPacking() {
  if (!packingOrder.value) return
  const ok = await outboundStore.packOrder(packingOrder.value.id, packageList.value)
  syncFeedback()
  if (ok) {
    showPackingModal.value = false
    feedback.value = { type: 'ok', text: `${packingOrder.value.order_number} — ${packageList.value.length} koli terdaftar, siap terbitkan Surat Jalan.` }
    if (expandedOrderId.value === packingOrder.value.id) {
      await toggleOrderDetail(packingOrder.value)
    }
  }
}

async function handleCreateOrder() {
  if (!createForm.customer_id || !createForm.recipient_name.trim() || !createForm.destination_address.trim()) {
    feedback.value = { type: 'error', text: 'Shipper, nama penerima, dan alamat tujuan wajib diisi.' }
    return
  }
  const validItems = createForm.items.filter(i => i.product_id && i.ordered_qty > 0)
  if (!validItems.length) {
    feedback.value = { type: 'error', text: 'Minimal 1 item dengan qty > 0.' }
    return
  }
  const created = await outboundStore.createOrder({
    customer_id: createForm.customer_id,
    warehouse_id: createForm.warehouse_id || authStore.activeWarehouseId,
    recipient_name: createForm.recipient_name.trim(),
    recipient_phone: createForm.recipient_phone.trim() || undefined,
    destination_address: createForm.destination_address.trim(),
    items: validItems
  })
  syncFeedback()
  if (created) {
    showCreate.value = false
    createForm.recipient_name = ''
    createForm.recipient_phone = ''
    createForm.destination_address = ''
    createForm.items = [{ product_id: '', ordered_qty: 1 }]
  }
}

// Feedback terpadu: error/sukses dari kedua store jadi satu notifikasi
const feedback = ref({ type: '', text: '' })
function clearFeedback() {
  feedback.value = { type: '', text: '' }
  waybillStore.errorMessage = ''
  waybillStore.successMessage = ''
  outboundStore.successMessage = ''
}
function syncFeedback() {
  if (waybillStore.errorMessage) feedback.value = { type: 'error', text: waybillStore.errorMessage }
  else if (waybillStore.successMessage) feedback.value = { type: 'ok', text: waybillStore.successMessage }
  else if (outboundStore.successMessage) feedback.value = { type: 'ok', text: outboundStore.successMessage }
}

const waybillByOrder = computed(() => {
  const map = {}
  for (const w of waybillStore.waybills) map[w.reference_id] = w
  return map
})

function canIssue(order) {
  return ['CREATED', 'PICKED', 'PACKED'].includes(order.status) && !waybillByOrder.value[order.id]
}

// Label manusia + warna penanda ringan (dot, bukan badge kotak)
function statusLabel(status) {
  const map = {
    CREATED: 'Baru (Unpicked)', PICKED: 'Picked (Siap Packing)', PACKED: 'Packed (Koli Terdaftar)',
    SHIPPED: 'Shipped', DELIVERED: 'Delivered',
    POD_VERIFIED: 'POD Terverifikasi', CANCELLED: 'Batal'
  }
  return map[status] || status
}
function statusTextClass(status) {
  const map = {
    CREATED: 'text-slate-400', PICKED: 'text-amber-600 dark:text-amber-400',
    PACKED: 'text-blue-600 dark:text-blue-400', SHIPPED: 'text-indigo-600 dark:text-indigo-400',
    DELIVERED: 'text-cyan-600 dark:text-cyan-400', POD_VERIFIED: 'text-emerald-600 dark:text-emerald-400',
    CANCELLED: 'text-rose-500'
  }
  return map[status] || 'text-slate-400'
}

const ringkasanStatus = computed(() => {
  const orders = outboundStore.orders || []
  const cnt = (arr) => orders.filter(o => arr.includes(o.status)).length
  return [
    { label: 'DO Baru', count: cnt(['CREATED']), dot: 'bg-slate-400' },
    { label: 'Picking & Packing', count: cnt(['PICKED', 'PACKED']), dot: 'bg-amber-500' },
    { label: 'SJ Terbit', count: Object.keys(waybillByOrder.value).length, dot: 'bg-blue-500' },
    { label: 'POD Terverifikasi', count: cnt(['POD_VERIFIED']), dot: 'bg-emerald-500' }
  ]
})

async function handleIssueWaybill(order) {
  const actor = authStore.user?.full_name || 'Petugas Gudang'
  const wb = await waybillStore.issueWaybill(order.id, actor)
  syncFeedback()
  if (wb) {
    await printer.printWaybillReceipt({
      order_number: order.order_number,
      sj_number: wb.sj_number,
      resi_number: wb.resi_number,
      recipient_name: order.recipient_name,
      destination: order.destination_address || order.destination_city || '',
      issued_by: actor
    })
    waybillStore.successMessage = `SJ ${wb.sj_number} / Resi ${wb.resi_number} terbit — struk tercetak untuk driver.`
    syncFeedback()
  }
}

onMounted(async () => {
  await Promise.all([
    outboundStore.fetchOrders(),
    waybillStore.fetchWaybills(),
    masterStore.fetchCustomers(),
    masterStore.fetchWarehouses(),
    masterStore.fetchProducts(),
    masterStore.fetchReferences()
  ])
  if (masterStore.customers.length && !createForm.customer_id) createForm.customer_id = masterStore.customers[0].id
  syncFeedback()
})
</script>
