<template>
  <div class="space-y-5">
    
    <!-- Control Tower Header (Clean B2B Logistics Console) -->
    <div class="p-4 sm:p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center space-x-2 text-xs font-mono">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Shift 1 (08:00 - 16:00)</span>
          </span>
          <span class="text-slate-400">/</span>
          <span class="text-slate-600 dark:text-slate-400 font-medium">{{ authStore.activeWarehouseName }}</span>
        </div>
        <h2 class="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Konsol Pengendali Logistik & Distribusi
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Petugas Aktif: <strong class="text-slate-800 dark:text-slate-200">{{ authStore.user?.full_name || 'Petugas Operasional' }}</strong> 
          <span class="text-slate-400">({{ authStore.roleLabel }})</span>
        </p>
      </div>

      <!-- Header Action Group -->
      <div class="flex items-center space-x-2 shrink-0">
        <NuxtLink 
          v-if="authStore.canAccess('stock')"
          to="/stock"
          class="px-3 py-2 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
        >
          <AppIcon name="stock" custom-class="w-3.5 h-3.5 text-slate-500" />
          <span>Buku Besar Stok</span>
        </NuxtLink>
        <NuxtLink 
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass"
          class="px-3 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <AppIcon name="truck" custom-class="w-3.5 h-3.5" />
          <span>Pos Gerbang Armada</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Peta Alur Operasional (Operational Flow Map) -->
    <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Alur Operasional Barang</h3>
        <span class="text-[10px] font-mono text-slate-400">klik fase untuk membuka modul</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <NuxtLink
          v-for="fase in alurOperasional"
          :key="fase.no"
          :to="fase.to"
          class="p-3 rounded-md border transition group hover:border-slate-400 dark:hover:border-slate-600 border-l-4"
          :class="fase.card"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono font-bold" :class="fase.text">FASE {{ fase.no }}</span>
            <span v-if="fase.kritis" class="text-[9px] font-mono px-1 py-0.5 rounded bg-rose-500 text-white font-bold" title="Titik kritis audit">!</span>
          </div>
          <p class="text-xs font-bold mt-1 leading-snug text-slate-900 dark:text-white">{{ fase.label }}</p>
          <p class="text-[10px] mt-0.5 leading-snug text-slate-500 dark:text-slate-400">{{ fase.sub }}</p>
          <p class="text-lg font-mono font-bold mt-2 text-slate-900 dark:text-white">{{ fase.count }}</p>
          <p class="text-[9px] font-mono mt-0.5 text-slate-400">{{ fase.metric }}</p>
        </NuxtLink>
      </div>
    </div>

    <!-- Strip Audit Checkpoint Terakhir (Rantai Immutable) -->
    <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
      <div class="flex items-center justify-between mb-2.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Checkpoint Audit Terakhir</h3>
        <span class="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Rantai Immutable
        </span>
      </div>
      <div v-if="recentCheckpoints.length === 0" class="p-3 text-center text-[11px] text-slate-400 font-mono">Belum ada aktivitas checkpoint.</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
        <div v-for="cp in recentCheckpoints" :key="cp.id" class="flex items-center gap-2.5 py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
          <span class="w-2 h-2 rounded-full shrink-0" :class="cpDot(cp.step_code)"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{{ cp.step_label || cp.step_code }}</p>
            <p class="text-[10px] font-mono text-slate-400 truncate">{{ cp.entity_number || cp.entity_type }} • {{ cp.actor_name }}</p>
          </div>
          <span class="text-[10px] font-mono text-slate-400 shrink-0">{{ shortTime(cp.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Operational Telemetry Bar (4 Key Metrics) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Armada di Luar</span>
          <AppIcon name="truck" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ departedVehiclesCount }}
          </p>
          <span class="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
            Gate-Out Aktif
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Trip Antar-Hub</span>
          <AppIcon name="refresh" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ availableVehiclesCount }}
          </p>
          <span class="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium">
            Siap Berangkat
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>SKU Aktif</span>
          <AppIcon name="package" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {{ stockStore.stockLevels.length || '—' }}
          </p>
          <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
            Double-Entry
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          <span>Target Dwelling</span>
          <AppIcon name="clock" custom-class="w-4 h-4 text-slate-400" />
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <p class="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            ≤ 7 <span class="text-xs font-normal text-slate-400">Hari</span>
          </p>
          <span class="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
            Flow-Through
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Action Grid (Filtered by Active Role) -->
    <div>
      <div class="flex items-center justify-between mb-2 px-1">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Modul Operasional — Urut Alur Kerja
        </h3>
        <span class="text-[11px] text-slate-400 font-mono">Akses: {{ authStore.roleLabel }}</span>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        
        <!-- FASE 1: Terima Kiriman -->
        <NuxtLink 
          v-if="authStore.canAccess('inbound')"
          to="/inbound/receive" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="inbound" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 1
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Terima Kiriman di Dock
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Scan serial number & tally fisik kedatangan
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ inboundAktif }} kiriman aktif</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- FASE 2: Bongkar Ulang & Repacking -->
        <NuxtLink 
          v-if="authStore.canAccess('debulking')"
          to="/debulking" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="debulking" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 2
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Bongkar Ulang & Repacking
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Konversi kemasan jumbo & kalkulasi susut
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ repackAktif }} work order aktif</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- FASE 3: Order & Surat Jalan -->
        <NuxtLink 
          v-if="authStore.canAccess('outbound_orders')"
          to="/outbound" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="package" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 3
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Order & Terbitkan Surat Jalan
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              SJ + nomor resi untuk semua jenis pengiriman
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ siapKirim }} order siap proses</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- FASE 3: Pos Satpam Gerbang -->
        <NuxtLink 
          v-if="authStore.canAccess('gate_pass')"
          to="/gate-pass" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="truck" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 3
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Pos Satpam: Keluar-Masuk Truk
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Cek dokumen, odometer & level solar
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ departedVehiclesCount }} truk di luar</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- FASE 4: e-POD -->
        <NuxtLink 
          v-if="authStore.canAccess('outbound_pod')"
          to="/outbound/pod" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="pod" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 4
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Pengiriman & e-POD
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Foto penyerahan barang & TTD BAST Desa
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ menungguPod }} menunggu POD</span>
            <span>→</span>
          </div>
        </NuxtLink>

        <!-- FASE 4: Faktur & Pembayaran -->
        <NuxtLink 
          v-if="authStore.canAccess('billing')"
          to="/billing" 
          class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs flex flex-col justify-between h-36 group cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
              <AppIcon name="chart" custom-class="w-4 h-4" />
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              FASE 4
            </span>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white text-xs group-hover:underline">
              Faktur & Pembayaran
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              e-POD terverifikasi → faktur → LUNAS
            </p>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{{ belumLunas }} faktur belum lunas</span>
            <span>→</span>
          </div>
        </NuxtLink>

      </div>
    </div>

    <!-- Logistics Distribution Scheme & Hub Staging (AUCMA KDKMP Reference) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Hub Distribution Allocation -->
      <div class="lg:col-span-2 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              Alokasi Hub Pergudangan & Staging
            </h4>
            <p class="text-[11px] text-slate-400 mt-0.5">Distribusi KDKMP: 20.000 Kopdes / 80.000 Unit</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
            Priok & Perak Gateway
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Hub Cikarang (Priok)</span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">7.000 m²</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Cakupan Wilayah: Jawa Bagian Barat/Tengah & Seluruh Sumatera</p>
            <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>Alokasi Unit: 60%</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">Flow-Through Ready</span>
            </div>
          </div>

          <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Hub Surabaya (Perak)</span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">3.500 m²</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Cakupan Wilayah: Jawa Timur, Bali, NTB, dan NTT</p>
            <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>Alokasi Unit: 40%</span>
              <span class="text-slate-700 dark:text-slate-300 font-semibold">Flow-Through Ready</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cold Chain & Audit Compliance Sidebar -->
      <div class="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              Standar Kepatuhan Kargo
            </h4>
            <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">ISO 27001</span>
          </div>
          <ul class="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Upright Only:</strong> Kulkas & Freezer pantang dimiringkan saat muat dan bongkar.</span>
            </li>
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Truk Tail-Lift:</strong> Khusus pengiriman Balai Desa tanpa fasilitas forklift.</span>
            </li>
            <li class="flex items-start space-x-2">
              <span class="text-emerald-500 mt-0.5 font-bold">✓</span>
              <span><strong>Resting Time 2-4 Jam:</strong> Kompresor wajib diistirahatkan sebelum colok listrik.</span>
            </li>
          </ul>
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>Audit Chain:</span>
          <span class="text-slate-700 dark:text-slate-300 font-semibold">100% Immutable Checkpoint</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useStockStore } from '~/stores/stock'
import { useGatePassStore } from '~/stores/gatePass'
import { useInboundStore } from '~/stores/inbound'
import { useDebulkingStore } from '~/stores/debulking'
import { useOutboundStore } from '~/stores/outbound'
import { useWaybillStore } from '~/stores/waybill'
import { useBillingStore } from '~/stores/billing'
import AppIcon from '~/components/AppIcon.vue'

const authStore = useAuthStore()
const stockStore = useStockStore()
const gatePassStore = useGatePassStore()
const inboundStore = useInboundStore()
const debulkingStore = useDebulkingStore()
const outboundStore = useOutboundStore()
const waybillStore = useWaybillStore()
const billingStore = useBillingStore()

onMounted(async () => {
  try {
    await Promise.all([
      stockStore.fetchStockLevels(),
      gatePassStore.fetchLogs(),
      gatePassStore.fetchVehicles(),
      inboundStore.fetchOrders(),
      debulkingStore.fetchWorkOrders(),
      outboundStore.fetchOrders(),
      waybillStore.fetchWaybills(),
      billingStore.fetchInvoices()
    ])
    // Strip audit checkpoint (non-blocking)
    try {
      const { apiFetch } = useWmsApi()
      const cpRes = await apiFetch('/checkpoints/recent?limit=10')
      if (cpRes.success) recentCheckpoints.value = cpRes.data || []
    } catch (e) {
      console.error('Failed to load recent checkpoints:', e)
    }
  } catch (err) {
    console.error('Failed to load dashboard telemetry:', err)
  }
})

const departedVehiclesCount = computed(() => {
  return (gatePassStore.logs || []).filter(gp => gp.status === 'DEPARTED').length
})

const availableVehiclesCount = computed(() => {
  return (gatePassStore.vehicles || []).filter(v => v.status === 'AVAILABLE').length
})

const inboundAktif = computed(() =>
  (inboundStore.orders || []).filter(o => !['PUTAWAY_COMPLETED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length
)
const repackAktif = computed(() =>
  (debulkingStore.workOrders || []).filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
)
const siapKirim = computed(() =>
  (outboundStore.orders || []).filter(o => ['CREATED', 'PICKED', 'PACKED'].includes(o.status)).length
)
const menungguPod = computed(() =>
  (waybillStore.waybills || []).filter(w => ['ISSUED', 'PRINTED', 'IN_TRANSIT'].includes(w.status)).length
)
const belumLunas = computed(() =>
  (billingStore.invoices || []).filter(i => i.status === 'ISSUED').length
)

// Strip audit checkpoint terakhir (rantai immutable)
const recentCheckpoints = ref([])
const CHECKPOINT_COLORS = {
  PO_CREATED: 'bg-emerald-500', PO_RECEIVED: 'bg-emerald-500', PUTAWAY_COMPLETED: 'bg-emerald-500',
  DEBULKING: 'bg-amber-500', DEBULKING_COMPLETED: 'bg-amber-500',
  MANIFEST: 'bg-blue-500', LOADED: 'bg-blue-500', DEPARTED: 'bg-blue-500', GATE: 'bg-blue-500', PICK: 'bg-blue-500', PACK: 'bg-blue-500', SHIP: 'bg-blue-500', WAYBILL: 'bg-blue-500', VENDOR_EXIT: 'bg-blue-500',
  POD: 'bg-cyan-500', POD_VERIFIED: 'bg-cyan-500', INVOICE: 'bg-cyan-500', PAYMENT: 'bg-cyan-500', PAID: 'bg-cyan-500', CROSS_DOC: 'bg-cyan-500',
  RECEIVED_AT_DEST: 'bg-blue-500'
}
function cpDot(code) {    const key = Object.keys(CHECKPOINT_COLORS).find(k => (code || '').includes(k))
    return key ? CHECKPOINT_COLORS[key] : 'bg-slate-400'
}
function shortTime(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
}

/** Peta alur operasional — warna koding per fase senada dengan sidebar */
const alurOperasional = computed(() => [
  { no: 1, label: 'Barang Masuk', sub: 'Terima di dock & simpan ke rak', to: '/inbound/receive', count: inboundAktif.value, metric: 'kiriman aktif', card: 'bg-slate-50 dark:bg-slate-950 border-emerald-500/60', text: 'text-emerald-600 dark:text-emerald-400' },
  { no: 2, label: 'Pekerjaan Gudang', sub: 'Bongkar ulang & repacking curah', to: '/debulking', count: repackAktif.value, metric: 'work order aktif', card: 'bg-slate-50 dark:bg-slate-950 border-amber-500/60', text: 'text-amber-600 dark:text-amber-400' },
  { no: 3, label: 'Barang Keluar', sub: 'Order, SJ + resi, gerbang', to: '/outbound', count: siapKirim.value, metric: 'order siap proses', kritis: true, card: 'bg-slate-50 dark:bg-slate-950 border-blue-500/60', text: 'text-blue-600 dark:text-blue-400' },
  { no: 4, label: 'Bukti & Tagihan', sub: 'e-POD → faktur → LUNAS', to: '/outbound/pod', count: menungguPod.value + belumLunas.value, metric: 'menunggu POD / bayar', card: 'bg-slate-50 dark:bg-slate-950 border-cyan-500/60', text: 'text-cyan-600 dark:text-cyan-400' },
  { no: 5, label: 'Pemantauan', sub: 'Posisi stok & mutasi real-time', to: '/stock', count: stockStore.stockLevels.length, metric: 'SKU terpantau', card: 'bg-slate-50 dark:bg-slate-950 border-slate-400/60', text: 'text-slate-500 dark:text-slate-400' }
])
</script>
