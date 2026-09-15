<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16 print:bg-white print:text-black print:p-0 print:m-0">
    <!-- ═══ TOP PORTAL HEADER (Screen Only) ═══ -->
    <header class="print:hidden bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Left: Logo & Portal Title -->
        <div class="flex items-center space-x-3">
          <NuxtLink to="/waybills" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Kembali ke Daftar SJ">
            <AppIcon name="arrow-left" custom-class="w-4 h-4" />
          </NuxtLink>
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-sm tracking-wider">
              WMS
            </div>
            <div>
              <div class="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                <span>LOGISTIK PRIMA TMS</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono">PORTAL CETAK SURAT JALAN</span>
              </div>
              <p class="text-[10px] text-slate-400 font-mono">Universal Logistics &amp; Distribution Delivery Note Engine</p>
            </div>
          </div>
        </div>

        <!-- Center: Portal Navigation Tabs -->
        <div class="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <NuxtLink to="/waybills" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition">
            Daftar Surat Jalan
          </NuxtLink>
          <span class="px-3 py-1.5 rounded-md font-semibold bg-blue-600 text-white shadow-sm">
            Pratinjau &amp; Cetak Dokumen
          </span>
          <NuxtLink to="/tms/trips" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition">
            TMS Trip Dispatcher
          </NuxtLink>
          <NuxtLink to="/checkpoints" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition">
            Audit Log Serah Terima
          </NuxtLink>
        </div>

        <!-- Right: Active Hub & User Info -->
        <div class="flex items-center space-x-2.5 text-xs">
          <span class="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            WH-JKT01 GATE 4
          </span>
          <div class="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
            {{ (authStore.user?.full_name || 'AD').substring(0, 2).toUpperCase() }}
          </div>
        </div>
      </div>
    </header>

    <!-- ═══ SUB-TOOLBAR: DOKUMEN & TEMPLATE SELECTOR (Screen Only) ═══ -->
    <section class="print:hidden bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-[57px] z-30 backdrop-blur-md">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <!-- Document Pill & Switcher -->
        <div class="flex items-center space-x-2 flex-wrap gap-y-2">
          <div class="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span class="text-slate-500">NO. DOKUMEN:</span>
            <select 
              v-model="selectedWaybillId" 
              @change="onWaybillSelect"
              class="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option v-for="w in waybillsList" :key="w.id" :value="w.id" class="bg-slate-900 text-white">
                {{ w.sj_number }} ({{ w.recipient_name || w.order_number }})
              </option>
            </select>
            <button 
              type="button" 
              @click="copyDocNumber" 
              class="text-slate-400 hover:text-white transition cursor-pointer ml-1"
              title="Salin Nomor Dokumen"
            >
              <AppIcon name="copy" custom-class="w-3.5 h-3.5" />
            </button>
          </div>

          <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{{ activeDoc?.status || 'DISPATCHED' }} / SIAP ANGKUT</span>
          </span>
        </div>

        <!-- Template Selector & Action Buttons -->
        <div class="flex items-center space-x-2 flex-wrap gap-y-2">
          <!-- Template Dropdown ("Keluarin Semua") -->
          <div class="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <span class="text-slate-400 text-xs font-semibold">Format Kertas:</span>
            <select 
              v-model="activeTemplateCode" 
              class="bg-slate-900 text-blue-400 text-xs font-semibold rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="A4_PORTRAIT">📄 A4 Portrait (210 x 297 mm)</option>
              <option value="CONTINUOUS_3PLY">🖨️ Continuous Form 3-Ply Dot Matrix (9.5 x 11 in)</option>
              <option value="CONTINUOUS_WARTEL">📑 Continuous Form Wartel 9.5 x 5.5 in (Bagi 2)</option>
              <option value="THERMAL_BLUETOOTH">🧾 Thermal Bluetooth (58mm / 80mm)</option>
            </select>
          </div>

          <!-- Quick Actions -->
          <NuxtLink 
            :to="'/checkpoints?doc=' + (activeDoc?.sj_number || '')"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 flex items-center space-x-1.5"
          >
            <AppIcon name="history" custom-class="w-3.5 h-3.5" />
            <span>Log Dispatch</span>
          </NuxtLink>

          <button 
            type="button" 
            @click="exportCsv"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
          >
            <AppIcon name="download" custom-class="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <!-- Large Print Button -->
          <button 
            type="button" 
            @click="handlePrint" 
            class="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-black tracking-wide shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <AppIcon name="printer" custom-class="w-4 h-4 text-slate-900" />
            <span>CETAK SURAT JALAN</span>
          </button>
        </div>
      </div>

      <!-- Ply Tabs Bar (Screen Only) -->
      <div class="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs overflow-x-auto">
        <div class="flex items-center space-x-1.5">
          <span class="text-[11px] text-slate-400 font-semibold mr-1">RANGKAP LEMBAR (PLY):</span>
          
          <!-- Tabs for A4 (4-Ply) -->
          <template v-if="activeTemplateCode === 'A4_PORTRAIT'">
            <button 
              v-for="p in a4Plies" 
              :key="p.code"
              type="button" 
              @click="selectedPly = p.code"
              class="px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
              :class="selectedPly === p.code ? p.activeClass : 'bg-slate-800/80 text-slate-400 hover:text-white'"
            >
              {{ p.label }}
            </button>
          </template>

          <!-- Tabs for Continuous Form 3-Ply & Wartel -->
          <template v-else-if="activeTemplateCode === 'CONTINUOUS_3PLY' || activeTemplateCode === 'CONTINUOUS_WARTEL'">
            <button 
              v-for="p in continuousPlies" 
              :key="p.code"
              type="button" 
              @click="selectedPly = p.code"
              class="px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
              :class="selectedPly === p.code ? p.activeClass : 'bg-slate-800/80 text-slate-400 hover:text-white'"
            >
              {{ p.label }}
            </button>
          </template>

          <!-- Thermal Notice -->
          <template v-else>
            <span class="text-slate-400 text-xs font-mono italic">
              Mode Struk Thermal Gulung (Roll Slip Standar POS 58/80mm)
            </span>
          </template>
        </div>

        <div class="text-[11px] font-mono text-slate-400 hidden sm:block">
          Template Default Sistem: <strong class="text-blue-400">{{ masterDefaultTemplateName }}</strong>
        </div>
      </div>
    </section>

    <!-- ═══ DOCUMENT CANVAS WRAPPER ═══ -->
    <main class="max-w-5xl mx-auto mt-6 px-3 flex justify-center print:m-0 print:p-0 print:w-full print:max-w-none">
      
      <!-- ════════════════════════════════════════════════════════════════════════
           TEMPLATE 1: A4 PORTRAIT (Official Logistics Manifest - Image 1)
           ════════════════════════════════════════════════════════════════════════ -->
      <div 
        v-if="activeTemplateCode === 'A4_PORTRAIT'"
        class="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-7 md:p-9 shadow-2xl rounded-sm print:shadow-none print:p-0 print:m-0 print:rounded-none relative text-[11px] leading-tight space-y-3.5 border border-slate-200 print:border-none"
        :class="plyBgClass"
      >
        <!-- Top Subheader / Kicker Bar -->
        <div class="flex justify-between items-center text-[9px] font-mono text-slate-500 border-b border-slate-300 pb-1 uppercase tracking-wider">
          <span>LEMBAR MANIFEST LOGISTIK RESMI • SOP DISTRIBUSI TMS/SOP-04/REV.03</span>
          <span class="font-bold border border-slate-400 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
            {{ currentPlyLabelA4 }}
          </span>
        </div>

        <!-- Main Header: Company Identity & Surat Jalan Box -->
        <div class="grid grid-cols-12 gap-3 items-start pt-1">
          <!-- Left: Shipper / WMS Enterprise Identity -->
          <div class="col-span-8 space-y-1">
            <div class="flex items-center space-x-2">
              <div class="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                LP
              </div>
              <h1 class="text-base font-black tracking-tight text-slate-950 uppercase font-sans">
                {{ activeDoc?.customer_name || 'PT. LOGISTIK PRIMA NUSANTARA' }}
              </h1>
            </div>
            <p class="text-[10px] text-slate-600 leading-snug">
              Pergudangan Marunda Center Blok B3 No. 12-15, Segaramakmur, Tarumajaya, Kab. Bekasi, Jawa Barat 17211<br />
              Telp: (021) 8892-3400 (Hunting) | Fax: (021) 8892-3401<br />
              NPWP: 01.389.204.8-412.000 | SK Kemenhub: TMS/2024/0981<br />
              <strong class="text-slate-800">Hub Operasional:</strong> DC Marunda West Gate &amp; Cross-dock CGK
            </p>
          </div>

          <!-- Right: Box Surat Jalan & Barcode -->
          <div class="col-span-4 border-2 border-slate-950 p-2 text-center bg-slate-50/70">
            <div class="bg-slate-950 text-white font-black text-xs py-1 tracking-wider uppercase">
              SURAT JALAN / DELIVERY NOTE
            </div>
            <div class="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-tight">
              BUKTI RESMI PENGHANTARAN BARANG LOGISTIK
            </div>
            <!-- Simulated Code 128 Barcode -->
            <div class="py-1.5 flex flex-col items-center justify-center">
              <div class="font-mono text-2xl tracking-[0.25em] font-black scale-y-125 select-none leading-none">
                ||| | |||| || ||| || ||||
              </div>
              <span class="text-[9px] font-mono font-bold tracking-widest text-slate-900 mt-1">
                *{{ activeDoc?.sj_number || 'SJT2AC1QCW' }}*
              </span>
            </div>
          </div>
        </div>

        <!-- 4-Column Metadata Grid -->
        <div class="grid grid-cols-4 gap-2 py-2 border-y border-slate-300 font-mono text-[10px] bg-slate-50/50">
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">NO. SURAT JALAN</span>
            <strong class="text-slate-950 text-xs">{{ activeDoc?.sj_number || 'SJT2AC1QCW' }}</strong>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">TANGGAL DISPATCH</span>
            <span class="text-slate-900 font-semibold">{{ formattedDate }}</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">NO. DO WMS</span>
            <strong class="text-blue-700 text-xs">{{ activeDoc?.order_number || '-' }}</strong>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">NO. REF PO PELANGGAN</span>
            <span class="text-slate-800 font-bold">PO-MTR/X/2025/7712</span>
          </div>
        </div>

        <!-- Origin vs Destination Boxes -->
        <div class="grid grid-cols-2 gap-3 text-[10px]">
          <!-- Box Consignor (Pengirim) -->
          <div class="border border-slate-300 p-2.5 rounded-sm space-y-1 bg-white">
            <div class="flex justify-between items-center border-b border-slate-200 pb-1">
              <span class="font-black text-slate-800 text-[10px] uppercase">PENGIRIM (CONSIGNOR / ORIGIN)</span>
              <span class="font-mono text-[9px] font-bold text-slate-500">HUB: CGK-01</span>
            </div>
            <div class="font-bold text-slate-950 text-xs">DC CAKUNG CENTRAL DISTRIBUTION</div>
            <p class="text-slate-600 leading-snug">
              Pergudangan Cakung Integrated Hub, Gate Out 4B<br />
              Jl. Raya Bekasi Km 25, Ujung Menteng, Cakung, Jakarta Timur 13960
            </p>
            <div class="pt-1 flex justify-between text-[9px] text-slate-600 font-mono">
              <span>PIC: Hendra Pratama (Spv Outbound)</span>
              <span>Telp: 0812-9871-2234</span>
            </div>
          </div>

          <!-- Box Consignee (Penerima) -->
          <div class="border border-slate-300 p-2.5 rounded-sm space-y-1 bg-white">
            <div class="flex justify-between items-center border-b border-slate-200 pb-1">
              <span class="font-black text-slate-800 text-[10px] uppercase">PENERIMA (CONSIGNEE / DESTINATION)</span>
              <span class="font-mono text-[9px] font-bold text-blue-600">CUST ID: CUS-KIIC-009</span>
            </div>
            <div class="font-bold text-slate-950 text-xs uppercase">{{ activeDoc?.recipient_name || 'PT. MITRA SUKSES DISTRIBUSI' }}</div>
            <p class="text-slate-600 leading-snug">
              {{ activeDoc?.destination_address || 'Gudang Logistik Utama Blok B-08, Kawasan Industri KIIC, Jl. Permata Raya Lot C-4, Sukaluyu, Telukjambe Timur, Karawang Barat 41361' }}
            </p>
            <div class="pt-1 flex justify-between text-[9px] text-slate-600 font-mono">
              <span>UP / Penerima: {{ activeDoc?.recipient_name || 'Bpk. Bambang Sutrisno' }}</span>
              <span>Telp: {{ activeDoc?.recipient_phone || '0811-2345-6789' }}</span>
            </div>
          </div>
        </div>

        <!-- Fleet, Transporter & Segel Bar (6 Columns) -->
        <div class="grid grid-cols-6 gap-1 p-2 border border-slate-300 bg-slate-100/80 font-mono text-[9px]">
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">ARMADA &amp; TRANSPORTER</span>
            <span class="font-bold text-slate-900 truncate block">Prima Fleet / Fuso 14T</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">JENIS KENDARAAN</span>
            <span class="font-bold text-slate-900">Wingbox 14T</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">NO. POLISI (PLAT)</span>
            <span class="font-bold text-slate-950 bg-white px-1 py-0.5 border border-slate-300 inline-block">B 9842 UXX</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">PENGEMUDI (DRIVER)</span>
            <span class="font-bold text-slate-900">{{ activeDoc?.driver_name || 'Agus Sulaeman' }}</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">NO. SEGEL PENGAMAN</span>
            <span class="font-bold text-blue-700">LP-SEAL-892103</span>
          </div>
          <div>
            <span class="text-slate-500 uppercase block text-[8px] font-bold">EST. TIBA (ETA)</span>
            <span class="font-bold text-slate-900">Hari ini / 12:00 WIB</span>
          </div>
        </div>

        <!-- Muatan Barang Table -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-slate-400 text-[10px]">
            <thead>
              <tr class="bg-slate-950 text-white font-mono text-[9px] uppercase tracking-wider">
                <th class="p-1.5 border border-slate-400 text-center w-8">NO</th>
                <th class="p-1.5 border border-slate-400 text-left w-24">KODE SKU</th>
                <th class="p-1.5 border border-slate-400 text-left">DESKRIPSI BARANG &amp; SPESIFIKASI</th>
                <th class="p-1.5 border border-slate-400 text-center w-20">BATCH / LOT</th>
                <th class="p-1.5 border border-slate-400 text-center w-12">PESAN</th>
                <th class="p-1.5 border border-slate-400 text-center w-12">KIRIM</th>
                <th class="p-1.5 border border-slate-400 text-center w-14">SATUAN</th>
                <th class="p-1.5 border border-slate-400 text-right w-16">BERAT</th>
                <th class="p-1.5 border border-slate-400 text-center w-20">CEK FISIK</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-300 font-sans">
              <tr v-for="(it, idx) in displayItems" :key="idx" class="hover:bg-slate-50">
                <td class="p-1.5 border border-slate-300 text-center font-mono font-bold">{{ String(idx + 1).padStart(2, '0') }}</td>
                <td class="p-1.5 border border-slate-300 font-mono font-bold text-blue-900">{{ it.sku_code }}</td>
                <td class="p-1.5 border border-slate-300">
                  <div class="font-bold text-slate-900">{{ it.product_name }}</div>
                  <div class="text-[9px] text-slate-500 font-mono">{{ it.specification || 'Standar Mutu SNI / QC Passed Factory Sealed' }}</div>
                </td>
                <td class="p-1.5 border border-slate-300 text-center font-mono text-[9px]">{{ it.batch_lot || '#B-202510' }}</td>
                <td class="p-1.5 border border-slate-300 text-center font-mono">{{ it.ordered_qty }}</td>
                <td class="p-1.5 border border-slate-300 text-center font-mono font-bold">{{ it.shipped_qty || it.ordered_qty }}</td>
                <td class="p-1.5 border border-slate-300 text-center font-mono">{{ it.uom || 'Unit' }}</td>
                <td class="p-1.5 border border-slate-300 text-right font-mono">{{ it.weight_kg }} kg</td>
                <td class="p-1.5 border border-slate-300 text-center font-mono text-[9px] text-slate-700">
                  <span class="px-1.5 py-0.5 border border-slate-300 rounded bg-slate-50 font-semibold">{{ it.check_status || 'Dus Utuh' }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <!-- Total Summary Row -->
              <tr class="bg-slate-100 font-mono font-bold text-slate-950 border-t-2 border-slate-950">
                <td colspan="4" class="p-1.5 border border-slate-400 text-right uppercase tracking-wider text-[9px]">
                  TOTAL MUATAN RESMI DISPATCH:
                </td>
                <td class="p-1.5 border border-slate-400 text-center">{{ totalPesanQty }}</td>
                <td class="p-1.5 border border-slate-400 text-center text-blue-700">{{ totalKirimQty }}</td>
                <td class="p-1.5 border border-slate-400 text-center">Items</td>
                <td class="p-1.5 border border-slate-400 text-right">{{ totalWeightKg }} Kg</td>
                <td class="p-1.5 border border-slate-400 text-center text-[9px]">{{ totalCbm }} CBM</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Packaging & Seal Status Row -->
        <div class="flex flex-wrap items-center justify-between gap-2 p-2 border border-slate-300 bg-slate-50 text-[9px] font-mono">
          <div>
            Total Kemasan: <strong class="text-slate-900">{{ totalColliCount }} Colli/Paket ({{ activeDoc?.total_packages || 1 }} Pallet + {{ activeDoc?.total_items || displayItems.length }} Loose)</strong>
          </div>
          <div>
            Kondisi Segel Kontainer: <span class="px-2 py-0.5 bg-slate-950 text-white font-bold rounded">TERPASANG UTUH</span>
          </div>
          <div>
            Metode Pembongkaran: <strong class="text-slate-900">Forklift Dock Bay 3</strong>
          </div>
          <div class="text-slate-500">
            Waktu Cetak: {{ currentClock }}
          </div>
        </div>

        <!-- Legal Terms & Document Distribution Notes -->
        <div class="grid grid-cols-12 gap-3 text-[8.5px] leading-tight pt-1">
          <!-- Terms -->
          <div class="col-span-7 p-2 border border-slate-300 rounded-sm bg-white space-y-1">
            <div class="font-bold uppercase tracking-wide text-slate-800">SYARAT &amp; KETENTUAN PENGHANTARAN:</div>
            <ol class="list-decimal pl-3 space-y-0.5 text-slate-600">
              <li>Penerima wajib melakukan inspeksi fisik kemasan dan nomor segel armada sebelum membubuhkan tanda tangan.</li>
              <li>Segala klaim selisih muatan (shortage) atau kerusakan (damage) harus dicatat secara sah dalam Berita Acara Serah Terima (BAST).</li>
              <li>Surat Jalan ini sah sebagai dokumen kepemilikan dan bukti perjalanan barang sesuai perundangan logistik Republik Indonesia.</li>
            </ol>
          </div>

          <!-- Distribution Legend -->
          <div class="col-span-5 p-2 border border-slate-300 rounded-sm bg-slate-50 space-y-1 font-mono">
            <div class="font-bold uppercase tracking-wide text-slate-800">DISTRIBUSI RANGKAP DOKUMEN:</div>
            <ul class="space-y-0.5 text-[8px] text-slate-700">
              <li>• <strong>Lembar 1 (Putih):</strong> Gudang Penerima &amp; Finance</li>
              <li>• <strong>Lembar 2 (Merah):</strong> Transporter / Driver Fleet</li>
              <li>• <strong>Lembar 3 (Kuning):</strong> Arsip Warehouse / Dispatched</li>
              <li>• <strong>Lembar 4 (Hijau):</strong> Security Gate Check Out</li>
            </ul>
          </div>
        </div>

        <!-- 4 Signature Sign-off Boxes -->
        <div class="grid grid-cols-4 gap-2 pt-1">
          <!-- Sign 1: Warehouse Prep -->
          <div class="border border-slate-400 p-2 text-center rounded-sm bg-white flex flex-col justify-between h-28">
            <div>
              <div class="font-bold uppercase text-[9px] text-slate-800">DISIAPKAN OLEH</div>
              <div class="text-[8px] text-slate-500">Petugas Gudang / WMS</div>
            </div>
            <div class="text-[9px] font-mono text-blue-600 font-bold tracking-wider">
              [ DIGITAL VERIFIED ]<br />
              <span class="text-[8px] text-slate-400">TMS-WMS-2K/2410</span>
            </div>
            <div class="border-t border-slate-300 pt-1 text-[8.5px] font-mono">
              <strong>( Ari Wibowo )</strong><br />
              <span class="text-slate-500 text-[8px]">Tgl: {{ formattedDateSimple }} 08:15</span>
            </div>
          </div>

          <!-- Sign 2: Driver Fleet -->
          <div class="border border-slate-400 p-2 text-center rounded-sm bg-white flex flex-col justify-between h-28">
            <div>
              <div class="font-bold uppercase text-[9px] text-slate-800">DISERAHKAN OLEH</div>
              <div class="text-[8px] text-slate-500">Pengemudi / Driver Fleet</div>
            </div>
            <div class="text-[8px] text-slate-400 italic">
              Tanda Tangan Basah:
            </div>
            <div class="border-t border-slate-300 pt-1 text-[8.5px] font-mono">
              <strong>( {{ activeDoc?.driver_name || 'Agus Sulaeman' }} )</strong><br />
              <span class="text-slate-500 text-[8px]">Tgl: {{ formattedDateSimple }} ______</span>
            </div>
          </div>

          <!-- Sign 3: Security Gate Out -->
          <div class="border border-slate-400 p-2 text-center rounded-sm bg-white flex flex-col justify-between h-28">
            <div>
              <div class="font-bold uppercase text-[9px] text-slate-800">PEMERIKSAAN KELUAR</div>
              <div class="text-[8px] text-slate-500">Security Gate Out WH</div>
            </div>
            <div class="text-[9px] font-mono text-emerald-700 font-bold">
              [ CAP STEMPEL GATE ]
            </div>
            <div class="border-t border-slate-300 pt-1 text-[8.5px] font-mono">
              <strong>( Danu Prasetyo )</strong><br />
              <span class="text-slate-500 text-[8px]">Gate Out: 08:35 WIB</span>
            </div>
          </div>

          <!-- Sign 4: Consignee Recipient -->
          <div class="border border-slate-400 p-2 text-center rounded-sm bg-white flex flex-col justify-between h-28">
            <div>
              <div class="font-bold uppercase text-[9px] text-slate-800">DITERIMA OLEH</div>
              <div class="text-[8px] text-slate-500">Gudang Penerima / Toko</div>
            </div>
            <div class="text-[8px] text-slate-400 italic">
              Cap &amp; Tanda Tangan:
            </div>
            <div class="border-t border-slate-300 pt-1 text-[8.5px] font-mono">
              <strong>( .................................... )</strong><br />
              <span class="text-slate-500 text-[8px]">Tgl / Jam: ______/______/2025</span>
            </div>
          </div>
        </div>

        <!-- Footer Verification & ISO Engine Compliance -->
        <div class="pt-2 border-t border-slate-300 flex justify-between items-center text-[8.5px] font-mono text-slate-500">
          <div class="flex items-center space-x-1.5">
            <AppIcon name="qr-code" custom-class="w-3.5 h-3.5 text-slate-700" />
            <span>QR Verification Code: <strong>TMS-AUTH-{{ (activeDoc?.sj_number || '99120491').replace(/[^0-9A-Z]/g, '') }}-ID</strong></span>
          </div>
          <div>
            Halaman 1 dari 1 • Sistem Pergudangan &amp; Transportasi Terpadu Logistik Prima
          </div>
        </div>

        <div class="text-center text-[7.5px] font-mono text-slate-400 tracking-wider pt-0.5">
          SISTEM LOGISTIK &amp; DISTRIBUSI TERPADU INDONESIA • AUDIT COMPLIANCE ISO 9001 / WMS-TMS ENGINE • © 2026 PT LOGISTIK PRIMA NUSANTARA
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════════
           TEMPLATE 2: CONTINUOUS FORM 3-PLY DOT MATRIX (9.5 x 11" - Image 2)
           ════════════════════════════════════════════════════════════════════════ -->
      <div 
        v-else-if="activeTemplateCode === 'CONTINUOUS_3PLY'"
        class="bg-[#faf9f5] text-black w-full max-w-[241mm] min-h-[279mm] p-6 shadow-2xl rounded-none print:shadow-none print:p-0 print:m-0 relative font-mono text-[10px] leading-tight space-y-3 border-2 border-slate-400 print:border-none select-text"
      >
        <!-- Continuous Form Pin-feed Sprocket Margins (Left & Right) -->
        <div class="absolute left-1 top-0 bottom-0 w-4 flex flex-col justify-around items-center py-2 pointer-events-none print:hidden opacity-70">
          <div v-for="n in 26" :key="'sprocket-l-' + n" class="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400 shadow-inner"></div>
        </div>
        <div class="absolute right-1 top-0 bottom-0 w-4 flex flex-col justify-around items-center py-2 pointer-events-none print:hidden opacity-70">
          <div v-for="n in 26" :key="'sprocket-r-' + n" class="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400 shadow-inner"></div>
        </div>

        <!-- Inner Content Padded from Sprocket Holes -->
        <div class="px-6 space-y-2.5">
          <!-- Perforation Header Banner -->
          <div class="text-center text-[9px] text-slate-500 border-b border-dashed border-slate-400 pb-1 flex justify-between">
            <span>✂ Garis Perforasi Potong Continuous Form (Tear-Off Margin 0.5")</span>
            <span>Mode Cetak: EPSON Dot Matrix ESC/P 24-Pin Emulation • 80 Kolom</span>
          </div>

          <!-- Dot Matrix Company Box & Header -->
          <div class="border-2 border-black p-2 flex justify-between items-start">
            <div>
              <div class="font-black text-sm uppercase tracking-tight">PT. LOGISTIK PRIMA NUSANTARA</div>
              <div class="text-[9px]">Pergudangan Marunda Center B3/12-15 • Telp: (021) 8892-3400 • NPWP: 01.389.204.8-412.000</div>
            </div>
            <div class="text-right">
              <div class="border-2 border-black px-2 py-0.5 font-black text-xs uppercase bg-slate-100">
                SURAT JALAN (DELIVERY ORDER)
              </div>
              <div class="text-[8px] mt-0.5">BUKTI FISIK PENGHANTARAN RESMI TMS DISPATCH</div>
            </div>
          </div>

          <!-- Format & Ply Indicator -->
          <div class="border-2 border-black p-1.5 flex justify-between items-center text-[9px] font-bold bg-slate-100">
            <span>FORMAT: CONTINUOUS FORM PIN FEED 9.5 X 11 INCH</span>
            <span class="uppercase tracking-wide text-blue-900">{{ currentPlyLabelContinuous }}</span>
          </div>

          <!-- Meta 4-Col Grid -->
          <div class="grid grid-cols-4 gap-1 border-2 border-black p-1.5 text-[9px]">
            <div>
              <span class="text-slate-600 block text-[8px]">NO. SURAT JALAN</span>
              <strong class="text-xs">{{ activeDoc?.sj_number || 'SJT2AC1QCW' }}</strong>
            </div>
            <div>
              <span class="text-slate-600 block text-[8px]">TANGGAL DISPATCH</span>
              <span>{{ formattedDateSimple }} 08:30 WIB</span>
            </div>
            <div>
              <span class="text-slate-600 block text-[8px]">NO. DO WMS / ERP</span>
              <strong class="text-xs">{{ activeDoc?.order_number || '-' }}</strong>
            </div>
            <div>
              <span class="text-slate-600 block text-[8px]">PO REF PELANGGAN</span>
              <span>PO-MTR/X/2025/7712</span>
            </div>
          </div>

          <!-- Consignor & Consignee Dual Box -->
          <div class="grid grid-cols-2 gap-2 text-[9px]">
            <div class="border-2 border-black p-2">
              <div class="font-bold border-b border-black pb-0.5 mb-1">[PENGIRIM / ORIGIN]</div>
              <div class="font-bold">DC CAKUNG CENTRAL DISTRIBUTION</div>
              <div>Kawasan Pergudangan Cakung Integrated Hub, Gate Out 4B</div>
              <div>Jl. Raya Bekasi Km 25, Ujung Menteng, Cakung, Jaktim</div>
              <div class="mt-1">PIC: Hendra Pratama | Telp: 0812-9871-2234</div>
            </div>
            <div class="border-2 border-black p-2">
              <div class="font-bold border-b border-black pb-0.5 mb-1">[PENERIMA / CONSIGNEE]</div>
              <div class="font-bold uppercase">{{ activeDoc?.recipient_name || 'PT. MITRA SUKSES DISTRIBUSI' }}</div>
              <div>{{ activeDoc?.destination_address || 'Kawasan Industri KIIC, Jl. Permata Raya Lot C-4, Karawang' }}</div>
              <div class="mt-1">UP: {{ activeDoc?.recipient_name || 'Bambang Sutrisno' }} | Telp: {{ activeDoc?.recipient_phone || '0811-2345-6789' }}</div>
            </div>
          </div>

          <!-- Transport Info -->
          <div class="grid grid-cols-5 gap-1 border-2 border-black p-1 text-[8.5px]">
            <div>TRANSPORTER: <strong>Prima Fleet</strong></div>
            <div>ARMADA: <strong>Wingbox 14T</strong></div>
            <div>NO POLISI: <strong>B 9842 UXX</strong></div>
            <div>PENGEMUDI: <strong>{{ activeDoc?.driver_name || 'Agus Sulaeman' }}</strong></div>
            <div>SEGEL: <strong>LP-SEAL-892103</strong></div>
          </div>

          <!-- Items Table Dot Matrix Style -->
          <table class="w-full border-2 border-black text-[9px]">
            <thead>
              <tr class="border-b-2 border-black bg-slate-100 font-bold">
                <th class="p-1 border-r border-black text-center w-6">NO</th>
                <th class="p-1 border-r border-black text-left w-24">KODE SKU</th>
                <th class="p-1 border-r border-black text-left">NAMA BARANG &amp; SPESIFIKASI TEKNIS</th>
                <th class="p-1 border-r border-black text-center w-20">BATCH/LOT</th>
                <th class="p-1 border-r border-black text-center w-12">PESAN</th>
                <th class="p-1 border-r border-black text-center w-12">KIRIM</th>
                <th class="p-1 border-r border-black text-center w-12">SAT</th>
                <th class="p-1 border-r border-black text-right w-16">BERAT</th>
                <th class="p-1 text-center w-16">KONDISI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in displayItems" :key="idx" class="border-b border-black">
                <td class="p-1 border-r border-black text-center">{{ idx + 1 }}</td>
                <td class="p-1 border-r border-black font-bold">{{ it.sku_code }}</td>
                <td class="p-1 border-r border-black">{{ it.product_name }}</td>
                <td class="p-1 border-r border-black text-center">{{ it.batch_lot || '#B-202510' }}</td>
                <td class="p-1 border-r border-black text-center">{{ it.ordered_qty }}</td>
                <td class="p-1 border-r border-black text-center font-bold">{{ it.shipped_qty || it.ordered_qty }}</td>
                <td class="p-1 border-r border-black text-center">{{ it.uom || 'UNIT' }}</td>
                <td class="p-1 border-r border-black text-right">{{ it.weight_kg }} KG</td>
                <td class="p-1 text-center">[DUS UTUH]</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-black font-bold bg-slate-100">
                <td colspan="4" class="p-1 text-right border-r border-black">TOTAL DISPATCHED RESMI:</td>
                <td class="p-1 border-r border-black text-center">{{ totalPesanQty }}</td>
                <td class="p-1 border-r border-black text-center">{{ totalKirimQty }}</td>
                <td class="p-1 border-r border-black text-center">COLLI</td>
                <td class="p-1 border-r border-black text-right">{{ totalWeightKg }} KG</td>
                <td class="p-1 text-center">{{ totalCbm }} CBM</td>
              </tr>
            </tfoot>
          </table>

          <!-- 4 Sign Boxes Dot Matrix -->
          <div class="grid grid-cols-4 gap-1 pt-1">
            <div class="border-2 border-black p-1.5 text-center h-20 flex flex-col justify-between text-[8px]">
              <div>DISIAPKAN / WMS</div>
              <div class="text-[7px] text-slate-600">[DIGITAL SIGNED]</div>
              <div>( Ari Wibowo )</div>
            </div>
            <div class="border-2 border-black p-1.5 text-center h-20 flex flex-col justify-between text-[8px]">
              <div>SUPIR / FLEET</div>
              <div class="text-[7px] text-slate-400">(TTD Basah Driver)</div>
              <div>( {{ activeDoc?.driver_name || 'Agus Sulaeman' }} )</div>
            </div>
            <div class="border-2 border-black p-1.5 text-center h-20 flex flex-col justify-between text-[8px]">
              <div>SECURITY GATE</div>
              <div class="text-[7px] text-slate-600">[CAP STEMPEL GATE]</div>
              <div>( Danu Prasetyo )</div>
            </div>
            <div class="border-2 border-black p-1.5 text-center h-20 flex flex-col justify-between text-[8px]">
              <div>PENERIMA / TOKO</div>
              <div class="text-[7px] text-slate-400">(Cap Toko/Gudang &amp; TTD)</div>
              <div>( ........................ )</div>
            </div>
          </div>

          <div class="text-[7.5px] border-t border-black pt-1 flex justify-between">
            <span>* DISTRIBUSI NCR: 1.PUTIH (FINANCE), 2.PINK (DRIVER/EXPEDISI), 3.KUNING (DISPATCH/GUDANG) *</span>
            <span>DOT MATRIX ESC/P24 PIN • NO: {{ activeDoc?.sj_number }}</span>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════════
           TEMPLATE 3: CONTINUOUS FORM WARTEL 9.5 x 5.5" (BAGI 2 - Image 3)
           ════════════════════════════════════════════════════════════════════════ -->
      <div 
        v-else-if="activeTemplateCode === 'CONTINUOUS_WARTEL'"
        class="bg-[#faf9f5] text-black w-full max-w-[241mm] min-h-[140mm] p-4 shadow-2xl rounded-none print:shadow-none print:p-0 print:m-0 relative font-mono text-[9px] leading-tight space-y-2 border-2 border-slate-400 print:border-none select-text"
      >
        <!-- Sprocket Holes Left & Right -->
        <div class="absolute left-1 top-0 bottom-0 w-3 flex flex-col justify-around items-center py-2 pointer-events-none print:hidden opacity-70">
          <div v-for="n in 14" :key="'wartel-l-' + n" class="w-2 h-2 rounded-full bg-slate-300 border border-slate-400 shadow-inner"></div>
        </div>
        <div class="absolute right-1 top-0 bottom-0 w-3 flex flex-col justify-around items-center py-2 pointer-events-none print:hidden opacity-70">
          <div v-for="n in 14" :key="'wartel-r-' + n" class="w-2 h-2 rounded-full bg-slate-300 border border-slate-400 shadow-inner"></div>
        </div>

        <div class="px-5 space-y-1.5">
          <!-- Top Perforation -->
          <div class="text-center text-[8px] text-slate-500 border-b border-dashed border-slate-400 pb-0.5 flex justify-between">
            <span>✂ Kertas Wartel 9.5" x 5.5" (Bagi 2 / 241 x 140 mm) - Form Feed 5.5 Inch</span>
            <span>Mode Cetak: EPSON Dot Matrix ESC/P 24-Pin • 80 Kolom</span>
          </div>

          <!-- Wartel Compact Header -->
          <div class="border border-black p-1 flex justify-between items-center">
            <div>
              <strong class="text-xs uppercase">PT. LOGISTIK PRIMA NUSANTARA</strong>
              <div class="text-[7.5px]">Marunda Center B3/12-15 • Telp: (021) 8892-3400 • NPWP: 01.389.204.8-412.000</div>
            </div>
            <div class="border border-black px-2 py-0.5 font-bold text-[10px] bg-slate-100 text-right uppercase">
              SURAT JALAN (DELIVERY ORDER)
            </div>
          </div>

          <div class="border border-black px-1.5 py-0.5 flex justify-between font-bold text-[8px] bg-slate-100">
            <span>FORMAT: WARTEL 9.5 X 5.5 INCH (BAGI 2) | NO. RESI: RESIZTB42K6S</span>
            <span class="uppercase">{{ currentPlyLabelContinuous }}</span>
          </div>

          <!-- Meta 4-Col Grid Compact -->
          <div class="grid grid-cols-4 gap-1 border border-black p-1 text-[8px]">
            <div>NO. SJ: <strong>{{ activeDoc?.sj_number || 'SJT2AC1QCW' }}</strong></div>
            <div>TGL: <strong>{{ formattedDateSimple }}</strong></div>
            <div>DO WMS: <strong>{{ activeDoc?.order_number || '-' }}</strong></div>
            <div>PO REF: <strong>PO-MTR/X/2025/7712</strong></div>
          </div>

          <!-- Origin vs Destination Compact -->
          <div class="grid grid-cols-2 gap-1 text-[8px]">
            <div class="border border-black p-1">
              <strong>[PENGIRIM / ORIGIN]</strong><br />
              DC CAKUNG CENTRAL DISTRIBUTION (0812-9871-2234)
            </div>
            <div class="border border-black p-1">
              <strong>[PENERIMA / CONSIGNEE]</strong><br />
              <span class="uppercase font-bold">{{ activeDoc?.recipient_name || 'PT. MITRA SUKSES' }}</span> ({{ activeDoc?.recipient_phone || '0811-2345-6789' }})
            </div>
          </div>

          <!-- Compact Table -->
          <table class="w-full border border-black text-[8px]">
            <thead>
              <tr class="bg-slate-100 border-b border-black font-bold">
                <th class="p-0.5 border-r border-black w-6 text-center">NO</th>
                <th class="p-0.5 border-r border-black w-24 text-left">KODE SKU</th>
                <th class="p-0.5 border-r border-black text-left">NAMA BARANG &amp; SPESIFIKASI</th>
                <th class="p-0.5 border-r border-black w-14 text-center">BATCH</th>
                <th class="p-0.5 border-r border-black w-10 text-center">QTY</th>
                <th class="p-0.5 border-r border-black w-10 text-center">SAT</th>
                <th class="p-0.5 border-r border-black w-14 text-right">BERAT</th>
                <th class="p-0.5 text-center w-14">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in displayItems.slice(0, 3)" :key="idx" class="border-b border-black">
                <td class="p-0.5 border-r border-black text-center">{{ idx + 1 }}</td>
                <td class="p-0.5 border-r border-black font-bold">{{ it.sku_code }}</td>
                <td class="p-0.5 border-r border-black truncate">{{ it.product_name }}</td>
                <td class="p-0.5 border-r border-black text-center">#B202510</td>
                <td class="p-0.5 border-r border-black text-center font-bold">{{ it.shipped_qty || it.ordered_qty }}</td>
                <td class="p-0.5 border-r border-black text-center">{{ it.uom || 'UNT' }}</td>
                <td class="p-0.5 border-r border-black text-right">{{ it.weight_kg }} KG</td>
                <td class="p-0.5 text-center">[BAIK]</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-100 font-bold border-t border-black">
                <td colspan="4" class="p-0.5 border-r border-black text-right">TOTAL RESMI DISPATCH:</td>
                <td class="p-0.5 border-r border-black text-center">{{ totalKirimQty }}</td>
                <td class="p-0.5 border-r border-black text-center">COLLI</td>
                <td class="p-0.5 border-r border-black text-right">{{ totalWeightKg }} KG</td>
                <td class="p-0.5 text-center">OK</td>
              </tr>
            </tfoot>
          </table>

          <!-- 4 Compact Sign Boxes -->
          <div class="grid grid-cols-4 gap-1 pt-0.5">
            <div class="border border-black p-1 text-center h-14 flex flex-col justify-between text-[7px]">
              <div>DISIAPKAN / WMS</div>
              <div>( Ari Wibowo )</div>
            </div>
            <div class="border border-black p-1 text-center h-14 flex flex-col justify-between text-[7px]">
              <div>SUPIR / FLEET</div>
              <div>( {{ activeDoc?.driver_name || 'Agus S.' }} )</div>
            </div>
            <div class="border border-black p-1 text-center h-14 flex flex-col justify-between text-[7px]">
              <div>SECURITY GATE</div>
              <div>( Danu P. )</div>
            </div>
            <div class="border border-black p-1 text-center h-14 flex flex-col justify-between text-[7px]">
              <div>PENERIMA / TOKO</div>
              <div>( ..................... )</div>
            </div>
          </div>

          <!-- Bottom Center Tear-Off Line Indicator -->
          <div class="text-center text-[7.5px] text-slate-500 border-t border-dashed border-slate-400 pt-1">
            ✂ Garis Sobek / Perforasi Tengah Lembar (5.5" Page Cut Continuous Form)
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════════
           TEMPLATE 4: THERMAL BLUETOOTH SLIP (58mm / 80mm POS Roll)
           ════════════════════════════════════════════════════════════════════════ -->
      <div 
        v-else-if="activeTemplateCode === 'THERMAL_BLUETOOTH'"
        class="bg-white text-slate-900 w-full max-w-[80mm] p-4 shadow-xl rounded font-mono text-xs space-y-2.5 border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0"
      >
        <div class="text-center border-b border-dashed border-slate-400 pb-2">
          <div class="font-black text-sm uppercase">LOGISTIK PRIMA WMS</div>
          <div class="text-[10px] text-slate-600">HUB MARUNDA GATE 4</div>
          <div class="text-[10px] text-slate-600">STRUK SURAT JALAN &amp; GATE PASS</div>
        </div>

        <div class="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
          <div>NO. SJ : <strong>{{ activeDoc?.sj_number }}</strong></div>
          <div>NO. DO : {{ activeDoc?.order_number }}</div>
          <div>TGL    : {{ formattedDateSimple }}</div>
          <div>DRIVER : {{ activeDoc?.driver_name || 'Agus Sulaeman' }}</div>
          <div>NO POL : B 9842 UXX</div>
        </div>

        <div class="text-[10px] border-b border-dashed border-slate-400 pb-2">
          <div class="text-slate-500 text-[9px]">PENERIMA / CONSIGNEE:</div>
          <div class="font-bold">{{ activeDoc?.recipient_name }}</div>
          <div class="text-[9px] text-slate-600">{{ activeDoc?.destination_address }}</div>
        </div>

        <!-- Items on Thermal -->
        <div class="text-[10px] border-b border-dashed border-slate-400 pb-2 space-y-1">
          <div class="font-bold flex justify-between border-b border-slate-200 pb-0.5 text-[9px]">
            <span>ITEM / SKU</span>
            <span>QTY</span>
          </div>
          <div v-for="(it, idx) in displayItems" :key="idx" class="flex justify-between">
            <span class="truncate pr-2">{{ it.product_name }}</span>
            <span class="font-bold">{{ it.shipped_qty || it.ordered_qty }} Unit</span>
          </div>
          <div class="border-t border-slate-200 pt-1 flex justify-between font-bold">
            <span>TOTAL MUATAN</span>
            <span>{{ totalKirimQty }} UNIT (~{{ totalWeightKg }} KG)</span>
          </div>
        </div>

        <div class="text-center py-1">
          <div class="font-mono text-lg tracking-widest font-black">
            |||||||||||||||||||||
          </div>
          <span class="text-[9px] font-bold">*{{ activeDoc?.sj_number }}*</span>
        </div>

        <div class="text-[9px] text-center text-slate-500 pt-1 border-t border-dashed border-slate-300">
          *** TERIMA KASIH • SELAMAT JALAN ***<br />
          Sistem WMS/TMS Logistik Prima v5.1
        </div>

        <!-- Screen Only Direct Bluetooth Trigger -->
        <div class="print:hidden pt-3 flex flex-col gap-2">
          <button 
            type="button" 
            @click="printThermalBluetooth"
            class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <AppIcon name="bluetooth" custom-class="w-3.5 h-3.5" />
            <span>Kirim Cetak ke Printer Bluetooth</span>
          </button>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWaybillStore } from '~/stores/waybill'
import { useOutboundStore } from '~/stores/outbound'
import { useAuthStore } from '~/stores/auth'
import { useWmsApi } from '~/composables/useWmsApi'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const route = useRoute()
const router = useRouter()
const waybillStore = useWaybillStore()
const outboundStore = useOutboundStore()
const authStore = useAuthStore()
const { apiFetch } = useWmsApi()
const thermalPrinter = useThermalPrinter()

const selectedWaybillId = ref('')
const activeDoc = ref(null)
const activeTemplateCode = ref('A4_PORTRAIT')
const masterDefaultTemplateName = ref('A4 Portrait (210 x 297 mm)')
const selectedPly = ref('L1')

// Plies definition
const a4Plies = [
  { code: 'L1', label: 'L-1 Asli (Putih)', activeClass: 'bg-white text-slate-900 shadow-sm' },
  { code: 'L2', label: 'L-2 Driver (Merah)', activeClass: 'bg-rose-500 text-white shadow-sm' },
  { code: 'L3', label: 'L-3 Arsip (Kuning)', activeClass: 'bg-amber-400 text-slate-900 shadow-sm' },
  { code: 'L4', label: 'L-4 Gate (Hijau)', activeClass: 'bg-emerald-500 text-white shadow-sm' }
]

const continuousPlies = [
  { code: 'P1', label: 'Ply 1: Putih (Asli)', activeClass: 'bg-white text-slate-900 shadow-sm' },
  { code: 'P2', label: 'Ply 2: Pink/Merah', activeClass: 'bg-rose-500 text-white shadow-sm' },
  { code: 'P3', label: 'Ply 3: Kuning', activeClass: 'bg-amber-400 text-slate-900 shadow-sm' }
]

const currentPlyLabelA4 = computed(() => {
  if (selectedPly.value === 'L2') return 'LEMBAR 2 (MERAH / TRANSPORTER & DRIVER FLEET)'
  if (selectedPly.value === 'L3') return 'LEMBAR 3 (KUNING / ARSIP WAREHOUSE DISPATCH)'
  if (selectedPly.value === 'L4') return 'LEMBAR 4 (HIJAU / SECURITY GATE CHECK OUT)'
  return 'LEMBAR 1 (ASLI / PUTIH - GUDANG PENERIMA & FINANCE)'
})

const currentPlyLabelContinuous = computed(() => {
  if (selectedPly.value === 'P2') return 'PLY 2 (PINK/MERAH): TRANSPORTER & DRIVER FLEET'
  if (selectedPly.value === 'P3') return 'PLY 3 (KUNING): WAREHOUSE / DISPATCH ARCHIVE'
  return 'PLY 1 (PUTIH): ASLI / FINANCE & CUSTOMER INVOICING'
})

const plyBgClass = computed(() => {
  if (selectedPly.value === 'L2') return 'bg-rose-50/40'
  if (selectedPly.value === 'L3') return 'bg-amber-50/40'
  if (selectedPly.value === 'L4') return 'bg-emerald-50/40'
  return 'bg-white'
})

const waybillsList = computed(() => waybillStore.waybills || [])

const displayItems = computed(() => {
  if (activeDoc.value?.items && activeDoc.value.items.length > 0) {
    return activeDoc.value.items.map(it => ({
      sku_code: it.sku_code || 'SKU-GENERIC',
      product_name: it.product_name || it.name || 'Barang Logistik',
      specification: it.specification || '',
      batch_lot: it.batch_lot || '#B-202510',
      ordered_qty: Number(it.ordered_qty || 1),
      shipped_qty: Number(it.ordered_qty || 1),
      uom: it.uom || 'Unit',
      weight_kg: Number((Number(it.weight_kg_per_unit || 1) * Number(it.ordered_qty || 1)).toFixed(1)),
      check_status: 'Dus Utuh'
    }))
  }
  // Default mock items matching user's Image 1 if empty
  return [
    {
      sku_code: 'SKU-ELC-8921',
      product_name: 'Schneider Power Circuit Breaker 3P 100A Compact',
      specification: 'Spec: 415V 50Hz, Fixed Thermal Magnetic Trip',
      batch_lot: '#B-202510',
      ordered_qty: 50,
      shipped_qty: 50,
      uom: 'Unit',
      weight_kg: 85.0,
      check_status: 'Dus Utuh'
    },
    {
      sku_code: 'SKU-AUT-3140',
      product_name: 'Sensor Proximity Industrial M18 Shielded PNP-NO',
      specification: 'Spec: Sensing range 8mm, IP67 Protection Grade',
      batch_lot: '#B-202509',
      ordered_qty: 200,
      shipped_qty: 200,
      uom: 'Pcs',
      weight_kg: 42.0,
      check_status: 'Pallet #1'
    },
    {
      sku_code: 'SKU-CAB-0042',
      product_name: 'Kabel Tembaga NYY 4x16mm Supreme (Roll 100m)',
      specification: 'Standar SNI/SPLN, Outer Sheath Heavy PVC Black',
      batch_lot: '#CAB-4401',
      ordered_qty: 10,
      shipped_qty: 10,
      uom: 'Roll',
      weight_kg: 260.0,
      check_status: 'Drum Kayu'
    },
    {
      sku_code: 'SKU-PNE-1109',
      product_name: 'SMC Pneumatic Cylinder Double Acting (DNC-63-250)',
      specification: 'Bore 63mm, Stroke 250mm, Adjustable Cushioning',
      batch_lot: '#SMC-9921',
      ordered_qty: 35,
      shipped_qty: 35,
      uom: 'Unit',
      weight_kg: 56.5,
      check_status: 'Bubble Wrap'
    },
    {
      sku_code: 'SKU-LUB-7782',
      product_name: 'Mobil DTE 25 Hydraulic Oil ISO VG 46 (Pail 20L)',
      specification: 'Anti-wear Premium Hydraulic Fluid, Factory Sealed',
      batch_lot: '#MOB-2510',
      ordered_qty: 15,
      shipped_qty: 15,
      uom: 'Pail',
      weight_kg: 285.0,
      check_status: 'Segel Utuh'
    }
  ]
})

const totalPesanQty = computed(() => displayItems.value.reduce((acc, it) => acc + it.ordered_qty, 0))
const totalKirimQty = computed(() => displayItems.value.reduce((acc, it) => acc + (it.shipped_qty || it.ordered_qty), 0))
const totalWeightKg = computed(() => displayItems.value.reduce((acc, it) => acc + it.weight_kg, 0).toFixed(1))
const totalCbm = computed(() => (displayItems.value.length * 0.85).toFixed(2))
const totalColliCount = computed(() => displayItems.value.length * 2)

const formattedDate = computed(() => {
  const src = activeDoc.value?.issued_at || new Date().toISOString()
  const d = new Date(src)
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} (${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB)`
})

const formattedDateSimple = computed(() => {
  const src = activeDoc.value?.issued_at || new Date().toISOString()
  const d = new Date(src)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
})

const currentClock = computed(() => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB`
})

async function loadMasterDefaultTemplate() {
  try {
    const res = await apiFetch('/master/print-templates')
    if (res.success && res.data && res.data.length > 0) {
      const def = res.data.find(t => t.is_default) || res.data[0]
      if (def) {
        masterDefaultTemplateName.value = `${def.name} (${def.paper_size})`
        activeTemplateCode.value = def.code
      }
    }
  } catch (e) {
    console.warn('Could not load default print template:', e)
  }
}

async function loadWaybillDetail(identifier) {
  try {
    const res = await apiFetch(`/fleet/lookup-doc/${encodeURIComponent(identifier)}`)
    if (res.success && res.data) {
      activeDoc.value = res.data
      if (res.data.id) selectedWaybillId.value = res.data.id
    }
  } catch (e) {
    // fallback to waybills store list
    const found = (waybillStore.waybills || []).find(w => w.id === identifier || w.sj_number === identifier)
    if (found) {
      activeDoc.value = found
      selectedWaybillId.value = found.id
    }
  }
}

async function onWaybillSelect() {
  const wb = waybillsList.value.find(w => w.id === selectedWaybillId.value)
  if (wb) {
    await loadWaybillDetail(wb.sj_number)
  }
}

function copyDocNumber() {
  const num = activeDoc.value?.sj_number || 'SJT2AC1QCW'
  if (navigator.clipboard) {
    navigator.clipboard.writeText(num)
    const { showInfo } = useSwal()
    showInfo('Disalin!', `Nomor ${num} berhasil disalin ke clipboard`)
  }
}

function handlePrint() {
  if (activeTemplateCode.value === 'THERMAL_BLUETOOTH') {
    printThermalBluetooth()
  } else {
    window.print()
  }
}

async function printThermalBluetooth() {
  try {
    await thermalPrinter.printReceipt({
      log_number: activeDoc.value?.sj_number || 'SJT2AC1QCW',
      plate_number: 'B 9842 UXX',
      driver_name: activeDoc.value?.driver_name || 'Agus Sulaeman',
      purpose: activeDoc.value?.recipient_name || 'Delivery Outbound',
      odometer_out: 45200,
      fuel_level_out: 'FULL',
      officer_name: authStore.user?.full_name || 'Admin Dispatch',
      type: 'WAYBILL_SLIP'
    })
  } catch (e) {
    // Fallback to browser print
    window.print()
  }
}

function exportCsv() {
  const headers = ['NO,KODE_SKU,DESKRIPSI_BARANG,BATCH,PESAN,KIRIM,SATUAN,BERAT_KG\n']
  const rows = displayItems.value.map((it, idx) => 
    `${idx + 1},"${it.sku_code}","${it.product_name}","${it.batch_lot}",${it.ordered_qty},${it.shipped_qty || it.ordered_qty},"${it.uom}",${it.weight_kg}`
  )
  const csvContent = 'data:text/csv;charset=utf-8,' + headers.concat(rows).join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `Surat_Jalan_${activeDoc.value?.sj_number || 'WMS'}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(async () => {
  await Promise.all([
    waybillStore.fetchWaybills(),
    loadMasterDefaultTemplate()
  ])

  const targetId = route.query.id || route.query.sj || route.query.order
  if (targetId) {
    // If targetId looks like a UUID, try to resolve it to an sj_number from the store
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(targetId)
    if (isUuid) {
      const found = waybillsList.value.find(w => w.id === targetId)
      if (found?.sj_number) {
        selectedWaybillId.value = found.id
        await loadWaybillDetail(found.sj_number)
      } else {
        // UUID not in store, try lookup anyway (will 404 gracefully)
        await loadWaybillDetail(targetId)
      }
    } else {
      await loadWaybillDetail(targetId)
    }
  } else if (waybillsList.value.length > 0) {
    const first = waybillsList.value[0]
    selectedWaybillId.value = first.id
    await loadWaybillDetail(first.sj_number)
  }
})
</script>

<style scoped>
@media print {
  body {
    background-color: white !important;
    color: black !important;
  }
  @page {
    margin: 8mm;
    size: auto;
  }
}
</style>
