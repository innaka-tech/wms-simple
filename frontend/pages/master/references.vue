<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800">
            Master Data &bull; Kamus Sistem
          </span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Master Referensi Sistem
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Konsol terpadu pengelolaan kamus data master: Tipe Kargo, Kemasan, Satuan &amp; Konversi UOM, Tipe Armada, Dokumen, dan Template Cetak.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="loadActiveTab"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition cursor-pointer"
        >
          <AppIcon name="refresh" custom-class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>Refresh</span>
        </button>

        <button
          v-if="activeTab !== 'uom_conv'"
          type="button"
          @click="openAddModal"
          class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow transition cursor-pointer"
        >
          <AppIcon name="plus" custom-class="w-4 h-4" />
          <span>Tambah {{ currentTabLabel }}</span>
        </button>

        <button
          v-else
          type="button"
          @click="openAddConversionModal"
          class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Aturan Konversi UOM
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        @click="activeTab = t.key"
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5"
        :class="activeTab === t.key 
          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
      >
        <span>{{ t.label }}</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" :class="activeTab === t.key ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'">
          {{ t.count }}
        </span>
      </button>
    </div>

    <!-- ═══ TAB 1: TIPE KARGO ═══ -->
    <div v-if="activeTab === 'cargo'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Kargo</th>
            <th class="p-3">Nama Kargo</th>
            <th class="p-3">Kategori</th>
            <th class="p-3">Instruksi Penanganan Khusus</th>
            <th class="p-3 text-center">Timbangan?</th>
            <th class="p-3 text-center">Cold Chain?</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="c in cargoTypes" :key="c.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ c.code }}</td>
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ c.name }}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {{ c.category }}
              </span>
            </td>
            <td class="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{{ c.handling_instructions || '-' }}</td>
            <td class="p-3 text-center font-bold" :class="c.requires_weighbridge ? 'text-blue-600' : 'text-slate-400'">
              {{ c.requires_weighbridge ? 'YA' : 'TIDAK' }}
            </td>
            <td class="p-3 text-center font-bold" :class="c.requires_temperature_control ? 'text-cyan-600' : 'text-slate-400'">
              {{ c.requires_temperature_control ? 'YA' : 'TIDAK' }}
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditModal(c)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('cargo', c)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 2: TIPE KEMASAN ═══ -->
    <div v-if="activeTab === 'packaging'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Kemasan</th>
            <th class="p-3">Nama Kemasan</th>
            <th class="p-3 text-center">Wadah Curah (Bulk)?</th>
            <th class="p-3 text-right">Berat Tare (KG)</th>
            <th class="p-3 text-right">Kapasitas Nominal (KG)</th>
            <th class="p-3 text-right">Kapasitas (Liter)</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="pkg in packagingTypes" :key="pkg.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ pkg.code }}</td>
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ pkg.name }}</td>
            <td class="p-3 text-center font-bold" :class="pkg.is_bulk_container ? 'text-amber-600' : 'text-slate-400'">
              {{ pkg.is_bulk_container ? 'YA' : 'TIDAK' }}
            </td>
            <td class="p-3 text-right font-mono font-medium">{{ Number(pkg.tare_weight_kg || 0).toFixed(2) }} kg</td>
            <td class="p-3 text-right font-mono font-medium">{{ Number(pkg.nominal_capacity_kg || 0).toLocaleString('id-ID') }} kg</td>
            <td class="p-3 text-right font-mono font-medium">{{ Number(pkg.nominal_capacity_liter || 0).toLocaleString('id-ID') }} L</td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditModal(pkg)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('packaging', pkg)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 3: SATUAN UOM ═══ -->
    <div v-if="activeTab === 'uom'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Satuan</th>
            <th class="p-3">Nama Satuan</th>
            <th class="p-3">Kategori Dasar</th>
            <th class="p-3 text-center">Satuan Baku (Base Unit)?</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="u in uoms" :key="u.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ u.code }}</td>
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ u.name }}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {{ u.base_category }}
              </span>
            </td>
            <td class="p-3 text-center font-bold" :class="u.is_base_unit ? 'text-emerald-600' : 'text-slate-400'">
              {{ u.is_base_unit ? 'YA' : 'TIDAK' }}
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditModal(u)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('uom', u)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 3B: ATURAN KONVERSI UOM ═══ -->
    <div v-if="activeTab === 'uom_conv'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div class="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Tabel Rasio Konversi Satuan UOM Otomatis (De-bulking &amp; Gudang)
          </h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Rasio pengali digunakan pada formulir De-bulking dan kalkulasi stok untuk mengonversi satuan parent ke satuan ritel secara otomatis.
          </p>
        </div>
      </div>

      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Satuan Asal (From)</th>
            <th class="p-3 text-center">Arah</th>
            <th class="p-3">Satuan Tujuan (To)</th>
            <th class="p-3 text-right">Nilai Pengali (Multiplier)</th>
            <th class="p-3">Rumus Operasional</th>
            <th class="p-3">Catatan</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="uomConversions.length === 0">
            <td colspan="7" class="p-6 text-center text-slate-400">
              Belum ada aturan konversi satuan. Klik "Tambah Aturan Konversi UOM" untuk membuat baru.
            </td>
          </tr>
          <tr v-for="c in uomConversions" :key="c.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
              {{ c.from_code }} <span class="text-slate-400 font-normal">({{ c.from_name || '-' }})</span>
            </td>
            <td class="p-3 text-center text-slate-400">➔</td>
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
              {{ c.to_code }} <span class="text-slate-400 font-normal">({{ c.to_name || '-' }})</span>
            </td>
            <td class="p-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
              × {{ Number(c.conversion_multiplier).toLocaleString('id-ID') }}
            </td>
            <td class="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
              1 {{ c.from_code }} = {{ Number(c.conversion_multiplier).toLocaleString('id-ID') }} {{ c.to_code }}
            </td>
            <td class="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{{ c.notes || '-' }}</td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditConversionModal(c)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('uom_conv', c)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 4: TIPE ARMADA ═══ -->
    <div v-if="activeTab === 'vehicle'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Armada</th>
            <th class="p-3">Tipe &amp; Karoseri</th>
            <th class="p-3">Bentuk Bodi</th>
            <th class="p-3 text-right">Max Payload (KG)</th>
            <th class="p-3 text-right">Max Kubikasi (CBM)</th>
            <th class="p-3">Bahan Bakar &amp; Rasio</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="v in vehicleTypes" :key="v.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ v.code }}</td>
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ v.name }}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {{ v.body_type }}
              </span>
            </td>
            <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
              {{ Number(v.max_payload_kg).toLocaleString('id-ID') }} kg
            </td>
            <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
              {{ Number(v.max_volume_cbm).toFixed(2) }} m³
            </td>
            <td class="p-3 text-slate-600 dark:text-slate-400">
              {{ v.fuel_type }} ({{ v.avg_fuel_consumption_km_per_liter }} km/L)
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditModal(v)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('vehicle', v)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 5: TIPE DOKUMEN ═══ -->
    <div v-if="activeTab === 'document'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Dokumen</th>
            <th class="p-3">Nama Dokumen Resmi</th>
            <th class="p-3">Kategori</th>
            <th class="p-3 text-center">Bisa Dititip (Cross-Doc)?</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="d in documentTypes" :key="d.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ d.code }}</td>
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ d.name }}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {{ d.category }}
              </span>
            </td>
            <td class="p-3 text-center font-bold" :class="d.is_cross_doc_eligible ? 'text-emerald-600' : 'text-slate-400'">
              {{ d.is_cross_doc_eligible ? 'YA' : 'TIDAK' }}
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  @click="openEditModal(d)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('document', d)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TAB 6: TEMPLATE CETAK DOKUMEN ═══ -->
    <div v-if="activeTab === 'print_template'" class="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div class="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Daftar Template Cetak Surat Jalan &amp; Dokumen Operasional
          </h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Tentukan template default yang langsung terbuka saat staf gudang mencetak Surat Jalan atau resi.
          </p>
        </div>
      </div>

      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="p-3">Kode Template</th>
            <th class="p-3">Nama Template</th>
            <th class="p-3">Ukuran Kertas</th>
            <th class="p-3">Tipe Printer</th>
            <th class="p-3">Deskripsi &amp; Rekomendasi</th>
            <th class="p-3 text-center">Status Default</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="t in printTemplates" :key="t.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{{ t.code }}</td>
            <td class="p-3 font-bold text-slate-800 dark:text-slate-200">{{ t.name }}</td>
            <td class="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{{ t.paper_size }}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold" 
                    :class="t.printer_type === 'DOT_MATRIX' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' : (t.printer_type === 'THERMAL' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800')">
                {{ t.printer_type }}
              </span>
            </td>
            <td class="p-3 text-slate-600 dark:text-slate-400 max-w-sm">{{ t.description || '-' }}</td>
            <td class="p-3 text-center">
              <span v-if="t.is_default" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                ✓ DEFAULT AKTIF
              </span>
              <span v-else class="text-[11px] text-slate-400 font-medium">Opsional</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  v-if="!t.is_default"
                  type="button"
                  @click="setDefaultTemplate(t)"
                  :disabled="submitting"
                  class="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 rounded font-semibold text-[11px] transition border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  Default
                </button>
                <button
                  type="button"
                  @click="openEditModal(t)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="confirmDelete('print_template', t)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ MODAL TAMBAH / EDIT DATA MASTER ═══ -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ isEditing ? 'Edit ' + currentTabLabel : 'Tambah ' + currentTabLabel + ' Baru' }}
          </h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kode Unik (Non-Hyphen / Alphanumeric)
            </label>
            <input 
              v-model="form.code" 
              :disabled="isEditing"
              @input="form.code = form.code.toUpperCase().replace(/[^A-Z0-9_]/g, '')" 
              type="text" 
              placeholder="Contoh: COLDCHAIN, CDEBOX, JUMBOSACK" 
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5 font-mono font-bold disabled:opacity-60" 
            />
            <p v-if="!isEditing" class="text-[10px] text-slate-400 mt-0.5">Sesuai konvensi: karakter tanpa tanda hubung (-).</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Tampilan</label>
            <input v-model="form.name" type="text" placeholder="Nama lengkap referensi..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5" />
          </div>

          <!-- Cargo Type specific fields -->
          <template v-if="activeTab === 'cargo'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Kargo</label>
              <select v-model="form.category" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5">
                <option value="GENERAL">GENERAL (Umum / FMCG)</option>
                <option value="TEMPERATURE_CONTROLLED">TEMPERATURE_CONTROLLED (Cold Chain)</option>
                <option value="HEAVY">HEAVY (Bulky / Berat)</option>
                <option value="BULK_DRY">BULK_DRY (Curah Kering)</option>
                <option value="BULK_LIQUID">BULK_LIQUID (Curah Cair)</option>
                <option value="CHEMICAL">CHEMICAL (Kimia / B3)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Instruksi Penanganan</label>
              <textarea v-model="form.handling_instructions" rows="2" placeholder="Contoh: Wajib Upright Only, Jangan dibalik..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2"></textarea>
            </div>
            <div class="flex items-center gap-4 pt-1">
              <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.requires_weighbridge" type="checkbox" class="rounded text-blue-600 focus:ring-0" />
                <span>Wajib Jembatan Timbang</span>
              </label>
              <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.requires_temperature_control" type="checkbox" class="rounded text-cyan-600 focus:ring-0" />
                <span>Kontrol Suhu (Cold Chain)</span>
              </label>
            </div>
          </template>

          <!-- Packaging specific fields -->
          <template v-if="activeTab === 'packaging'">
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tare (KG)</label>
                <input v-model.number="form.tare_weight_kg" type="number" step="0.01" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kapasitas (KG)</label>
                <input v-model.number="form.nominal_capacity_kg" type="number" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kapasitas (L)</label>
                <input v-model.number="form.nominal_capacity_liter" type="number" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
            </div>
            <div class="pt-1">
              <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.is_bulk_container" type="checkbox" class="rounded text-amber-600 focus:ring-0" />
                <span>Wadah Curah / Bulk Container (Silo, ISO Tank, Tangki)</span>
              </label>
            </div>
          </template>

          <!-- UOM specific fields -->
          <template v-if="activeTab === 'uom'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Dasar</label>
              <select v-model="form.base_category" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5">
                <option value="MASS">MASS (Berat / Massa: KG, TON, GRAM)</option>
                <option value="VOLUME">VOLUME (Volume / Liter: LITER, M3, CBM)</option>
                <option value="PIECES">PIECES (Kemasan / Unit: PCS, BOX, DUS, UNIT)</option>
              </select>
            </div>
            <div class="pt-1">
              <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.is_base_unit" type="checkbox" class="rounded text-emerald-600 focus:ring-0" />
                <span>Satuan Baku Standar SI (Base Unit)</span>
              </label>
            </div>
          </template>

          <!-- Vehicle specific fields -->
          <template v-if="activeTab === 'vehicle'">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bentuk Bodi</label>
                <select v-model="form.body_type" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                  <option value="BOX">BOX (Tertutup)</option>
                  <option value="WINGBOX">WINGBOX (Sayap)</option>
                  <option value="BAK_TERBUKA">BAK_TERBUKA</option>
                  <option value="DUMP">DUMP (Curah)</option>
                  <option value="TANK">TANK (Tangki Cair)</option>
                  <option value="TRAILER">TRAILER (Kontainer)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jumlah Gandar</label>
                <input v-model.number="form.axle_count" type="number" min="2" max="6" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Payload (KG)</label>
                <input v-model.number="form.max_payload_kg" type="number" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Kubikasi (CBM)</label>
                <input v-model.number="form.max_volume_cbm" type="number" step="0.1" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bahan Bakar</label>
                <select v-model="form.fuel_type" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                  <option value="SOLAR">SOLAR (Diesel)</option>
                  <option value="BENSIN">BENSIN</option>
                  <option value="ELECTRIC">ELECTRIC (Listrik)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Konsumsi (km/L)</label>
                <input v-model.number="form.avg_fuel_consumption_km_per_liter" type="number" step="0.1" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono" />
              </div>
            </div>
          </template>

          <!-- Document specific fields -->
          <template v-if="activeTab === 'document'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Dokumen</label>
              <select v-model="form.category" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5">
                <option value="SHIPPING">SHIPPING (Surat Jalan / Waybill)</option>
                <option value="INBOUND">INBOUND (PO / Delivery Note)</option>
                <option value="BAST">BAST (Berita Acara Serah Terima)</option>
                <option value="INVOICE">INVOICE (Faktur Komersial)</option>
              </select>
            </div>
            <div class="pt-1">
              <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.is_cross_doc_eligible" type="checkbox" class="rounded text-emerald-600 focus:ring-0" />
                <span>Eligibel untuk Titip Dokumen (Cross-Doc Swap)</span>
              </label>
            </div>
          </template>

          <!-- Print Template specific fields -->
          <template v-if="activeTab === 'print_template'">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ukuran Kertas</label>
                <select v-model="form.paper_size" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                  <option value="A4">A4</option>
                  <option value="CONTINUOUS_3PLY">Continuous 3-Ply</option>
                  <option value="CONTINUOUS_WARTEL">Continuous Wartel</option>
                  <option value="THERMAL_80MM">Thermal 80mm</option>
                  <option value="THERMAL_58MM">Thermal 58mm</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipe Printer</label>
                <select v-model="form.printer_type" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2">
                  <option value="LASER_INKJET">Laser / Inkjet</option>
                  <option value="DOT_MATRIX">Dot Matrix (Epson dsb)</option>
                  <option value="THERMAL">Thermal (ESC/POS)</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi &amp; Panduan</label>
              <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2"></textarea>
            </div>
          </template>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button @click="showModal = false" type="button" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button
            @click="submitSave"
            :disabled="submitting || !form.code || !form.name"
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition flex items-center gap-1.5"
          >
            <span v-if="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ submitting ? 'Menyimpan...' : (isEditing ? 'Perbarui Data' : 'Simpan Data') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL TAMBAH / EDIT KONVERSI UOM ═══ -->
    <div
      v-if="showConvModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ isEditingConv ? 'Edit Aturan Konversi UOM' : 'Tambah Aturan Konversi UOM' }}
          </h3>
          <button @click="showConvModal = false" class="text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Satuan Asal (From)</label>
              <select 
                v-model="convForm.from_uom_id" 
                :disabled="isEditingConv"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono disabled:opacity-60"
              >
                <option value="">Pilih Satuan...</option>
                <option v-for="u in uoms" :key="u.id" :value="u.id">
                  {{ u.code }} ({{ u.name }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Satuan Tujuan (To)</label>
              <select 
                v-model="convForm.to_uom_id" 
                :disabled="isEditingConv"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2 font-mono disabled:opacity-60"
              >
                <option value="">Pilih Satuan...</option>
                <option v-for="u in uoms" :key="u.id" :value="u.id">
                  {{ u.code }} ({{ u.name }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nilai Pengali Konversi (Multiplier)
            </label>
            <input 
              v-model.number="convForm.conversion_multiplier" 
              type="number" 
              step="any" 
              placeholder="Contoh: 1000 (1 TON = 1000 KG)" 
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5 font-mono font-bold" 
            />
            <p class="text-[10px] text-slate-400 mt-0.5">
              1 Satuan Asal = [Multiplier] Satuan Tujuan. Misal 1 TON = 1.000 KG, masukkan 1000.
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
            <input 
              v-model="convForm.notes" 
              type="text" 
              placeholder="Contoh: Konversi standar gula curah 1 ton ke kg..." 
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5" 
            />
          </div>
        </div>

        <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button @click="showConvModal = false" type="button" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button
            @click="submitSaveConversion"
            :disabled="submitting || !convForm.from_uom_id || !convForm.to_uom_id || !convForm.conversion_multiplier"
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition flex items-center gap-1.5"
          >
            <span v-if="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ submitting ? 'Menyimpan...' : (isEditingConv ? 'Perbarui Konversi' : 'Simpan Konversi') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWmsApi } from '~/composables/useWmsApi'
import { useSwal } from '~/composables/useSwal'

const { apiFetch } = useWmsApi()
const { confirmAction, showSuccess, showError } = useSwal()

const activeTab = ref('cargo')
const loading = ref(false)
const submitting = ref(false)

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const showConvModal = ref(false)
const isEditingConv = ref(false)
const editingConvId = ref(null)

const cargoTypes = ref([])
const packagingTypes = ref([])
const uoms = ref([])
const uomConversions = ref([])
const vehicleTypes = ref([])
const documentTypes = ref([])
const printTemplates = ref([])

const tabs = computed(() => [
  { key: 'cargo', label: 'Tipe Kargo', count: cargoTypes.value.length },
  { key: 'packaging', label: 'Tipe Kemasan', count: packagingTypes.value.length },
  { key: 'uom', label: 'Satuan UOM', count: uoms.value.length },
  { key: 'uom_conv', label: 'Aturan Konversi UOM', count: uomConversions.value.length },
  { key: 'vehicle', label: 'Tipe Armada', count: vehicleTypes.value.length },
  { key: 'document', label: 'Tipe Dokumen', count: documentTypes.value.length },
  { key: 'print_template', label: 'Template Cetak', count: printTemplates.value.length }
])

const currentTabLabel = computed(() => {
  return tabs.value.find(t => t.key === activeTab.value)?.label || 'Data'
})

const form = ref({
  code: '',
  name: '',
  category: 'GENERAL',
  handling_instructions: '',
  requires_weighbridge: false,
  requires_temperature_control: false,
  is_bulk_container: false,
  tare_weight_kg: 0,
  nominal_capacity_kg: 0,
  nominal_capacity_liter: 0,
  base_category: 'PIECES',
  is_base_unit: false,
  body_type: 'BOX',
  axle_count: 2,
  max_payload_kg: 2000,
  max_volume_cbm: 10,
  fuel_type: 'SOLAR',
  avg_fuel_consumption_km_per_liter: 4.0,
  is_cross_doc_eligible: true,
  paper_size: 'A4',
  printer_type: 'LASER_INKJET',
  description: ''
})

const convForm = ref({
  from_uom_id: '',
  to_uom_id: '',
  conversion_multiplier: 1,
  notes: ''
})

async function loadCargoTypes() {
  try {
    const res = await apiFetch('/master/cargo-types')
    if (res.success) cargoTypes.value = res.data || []
  } catch (e) {}
}

async function loadPackagingTypes() {
  try {
    const res = await apiFetch('/master/packaging-types')
    if (res.success) packagingTypes.value = res.data || []
  } catch (e) {}
}

async function loadUoms() {
  try {
    const res = await apiFetch('/master/uoms')
    if (res.success) {
      uoms.value = res.data?.uoms || []
      uomConversions.value = res.data?.conversions || []
    }
  } catch (e) {}
}

async function loadVehicleTypes() {
  try {
    const res = await apiFetch('/master/vehicle-types')
    if (res.success) vehicleTypes.value = res.data || []
  } catch (e) {}
}

async function loadDocumentTypes() {
  try {
    const res = await apiFetch('/master/document-types')
    if (res.success) documentTypes.value = res.data || []
  } catch (e) {}
}

async function loadPrintTemplates() {
  try {
    const res = await apiFetch('/master/print-templates')
    if (res.success) printTemplates.value = res.data || []
  } catch (e) {}
}

async function loadActiveTab() {
  loading.value = true
  await Promise.all([
    loadCargoTypes(),
    loadPackagingTypes(),
    loadUoms(),
    loadVehicleTypes(),
    loadDocumentTypes(),
    loadPrintTemplates()
  ])
  loading.value = false
}

function openAddModal() {
  isEditing.value = false
  editingId.value = null
  form.value = {
    code: '',
    name: '',
    category: activeTab.value === 'document' ? 'SHIPPING' : 'GENERAL',
    handling_instructions: '',
    requires_weighbridge: false,
    requires_temperature_control: false,
    is_bulk_container: false,
    tare_weight_kg: 0,
    nominal_capacity_kg: 0,
    nominal_capacity_liter: 0,
    base_category: 'PIECES',
    is_base_unit: false,
    body_type: 'BOX',
    axle_count: 2,
    max_payload_kg: 2000,
    max_volume_cbm: 10,
    fuel_type: 'SOLAR',
    avg_fuel_consumption_km_per_liter: 4.0,
    is_cross_doc_eligible: true,
    paper_size: 'A4',
    printer_type: 'LASER_INKJET',
    description: ''
  }
  showModal.value = true
}

function openEditModal(item) {
  isEditing.value = true
  editingId.value = item.id
  form.value = {
    code: item.code || '',
    name: item.name || '',
    category: item.category || 'GENERAL',
    handling_instructions: item.handling_instructions || '',
    requires_weighbridge: !!item.requires_weighbridge,
    requires_temperature_control: !!item.requires_temperature_control,
    is_bulk_container: !!item.is_bulk_container,
    tare_weight_kg: item.tare_weight_kg || 0,
    nominal_capacity_kg: item.nominal_capacity_kg || 0,
    nominal_capacity_liter: item.nominal_capacity_liter || 0,
    base_category: item.base_category || 'PIECES',
    is_base_unit: !!item.is_base_unit,
    body_type: item.body_type || 'BOX',
    axle_count: item.axle_count || 2,
    max_payload_kg: item.max_payload_kg || 0,
    max_volume_cbm: item.max_volume_cbm || 0,
    fuel_type: item.fuel_type || 'SOLAR',
    avg_fuel_consumption_km_per_liter: item.avg_fuel_consumption_km_per_liter || 4.0,
    is_cross_doc_eligible: item.is_cross_doc_eligible ?? true,
    paper_size: item.paper_size || 'A4',
    printer_type: item.printer_type || 'LASER_INKJET',
    description: item.description || ''
  }
  showModal.value = true
}

function openAddConversionModal() {
  isEditingConv.value = false
  editingConvId.value = null
  convForm.value = {
    from_uom_id: '',
    to_uom_id: '',
    conversion_multiplier: 1,
    notes: ''
  }
  showConvModal.value = true
}

function openEditConversionModal(item) {
  isEditingConv.value = true
  editingConvId.value = item.id
  convForm.value = {
    from_uom_id: item.from_uom_id,
    to_uom_id: item.to_uom_id,
    conversion_multiplier: item.conversion_multiplier,
    notes: item.notes || ''
  }
  showConvModal.value = true
}

async function submitSave() {
  submitting.value = true
  try {
    let baseEndpoint = '/master/cargo-types'
    if (activeTab.value === 'packaging') baseEndpoint = '/master/packaging-types'
    if (activeTab.value === 'uom') baseEndpoint = '/master/uoms'
    if (activeTab.value === 'vehicle') baseEndpoint = '/master/vehicle-types'
    if (activeTab.value === 'document') baseEndpoint = '/master/document-types'
    if (activeTab.value === 'print_template') baseEndpoint = '/master/print-templates'

    const endpoint = isEditing.value ? `${baseEndpoint}/${editingId.value}` : baseEndpoint
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: form.value
    })

    if (res.success) {
      showModal.value = false
      await loadActiveTab()
      showSuccess('Berhasil', res.message || `${currentTabLabel.value} berhasil disimpan`)
    } else {
      showError('Gagal', res.message || 'Gagal menyimpan data')
    }
  } catch (err) {
    showError('Error', err.message || 'Terjadi kesalahan sistem')
  } finally {
    submitting.value = false
  }
}

async function submitSaveConversion() {
  submitting.value = true
  try {
    const endpoint = isEditingConv.value ? `/master/uom-conversions/${editingConvId.value}` : '/master/uom-conversions'
    const method = isEditingConv.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: convForm.value
    })

    if (res.success) {
      showConvModal.value = false
      await loadUoms()
      showSuccess('Berhasil', res.message || 'Aturan konversi UOM berhasil disimpan')
    } else {
      showError('Gagal', res.message || 'Gagal menyimpan aturan konversi')
    }
  } catch (err) {
    showError('Error', err.message || 'Terjadi kesalahan sistem')
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(tab, item) {
  let title = `Nonaktifkan ${item.name || item.code}?`
  let text = `Data ${item.code} tidak akan lagi aktif untuk transaksi baru.`
  let endpoint = `/master/cargo-types/${item.id}`

  if (tab === 'packaging') endpoint = `/master/packaging-types/${item.id}`
  if (tab === 'uom') endpoint = `/master/uoms/${item.id}`
  if (tab === 'vehicle') endpoint = `/master/vehicle-types/${item.id}`
  if (tab === 'document') endpoint = `/master/document-types/${item.id}`
  if (tab === 'print_template') endpoint = `/master/print-templates/${item.id}`
  if (tab === 'uom_conv') {
    title = `Hapus Konversi ${item.from_code} ➔ ${item.to_code}?`
    text = `Aturan konversi ${item.from_code} ke ${item.to_code} akan dihapus permanen.`
    endpoint = `/master/uom-conversions/${item.id}`
  }

  const confirmed = await confirmAction({
    title,
    text,
    confirmButtonText: 'Ya, Lanjutkan',
    cancelButtonText: 'Batal',
    isDanger: true
  })

  if (confirmed) {
    try {
      const res = await apiFetch(endpoint, { method: 'DELETE' })
      if (res.success) {
        showSuccess('Berhasil', res.message || 'Data berhasil dinonaktifkan/dihapus')
        await loadActiveTab()
      } else {
        showError('Gagal', res.message || 'Gagal memproses penghapusan')
      }
    } catch (err) {
      showError('Error', err.message || 'Gagal menghubungi server')
    }
  }
}

async function setDefaultTemplate(tpl) {
  submitting.value = true
  try {
    const res = await apiFetch(`/master/print-templates/${tpl.id}/default`, {
      method: 'PUT'
    })
    if (res.success) {
      showSuccess('Default Diperbarui', res.message || 'Template berhasil dijadikan default')
      await loadPrintTemplates()
    } else {
      showError('Gagal', res.message || 'Gagal mengubah template default')
    }
  } catch (e) {
    showError('Error', e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadActiveTab()
})
</script>
