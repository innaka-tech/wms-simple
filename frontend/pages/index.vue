<template>
  <div class="space-y-4">
    <!-- Operational Shift Banner -->
    <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-800/50 shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-blue-300 font-medium">Shift Pagi • Tim Lapangan</p>
          <h2 class="text-lg font-extrabold text-white">Menu Cepat Operasional</h2>
        </div>
        <div class="text-right">
          <span class="text-2xl">⚡</span>
        </div>
      </div>
      <p class="text-[11px] text-slate-300 mt-1">Sentuh modul di bawah untuk mulai scan atau input tugas.</p>
    </div>

    <!-- Quick Touch Grid (Thumb Friendly Buttons) -->
    <div class="grid grid-cols-2 gap-3">
      <!-- 1. Pos Satpam Gate Pass -->
      <NuxtLink 
        to="/gate-pass" 
        class="p-4 rounded-2xl bg-slate-800/90 border border-purple-500/30 hover:border-purple-500 active:scale-95 transition flex flex-col justify-between h-32 shadow-md relative overflow-hidden group"
      >
        <div class="flex justify-between items-start">
          <span class="text-3xl">🚛</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">POS SATPAM</span>
        </div>
        <div>
          <h3 class="font-bold text-white text-sm">Gate Pass Armada</h3>
          <p class="text-[10px] text-slate-400">Odometer, BBM, Surat Jalan</p>
        </div>
      </NuxtLink>

      <!-- 2. Inbound Receiving -->
      <NuxtLink 
        to="/inbound/receive" 
        class="p-4 rounded-2xl bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-500 active:scale-95 transition flex flex-col justify-between h-32 shadow-md relative overflow-hidden group"
      >
        <div class="flex justify-between items-start">
          <span class="text-3xl">📥</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">DOCK</span>
        </div>
        <div>
          <h3 class="font-bold text-white text-sm">Inbound Receive</h3>
          <p class="text-[10px] text-slate-400">Scan Barcode & Tally Fisik</p>
        </div>
      </NuxtLink>

      <!-- 3. De-bulking Work Order -->
      <NuxtLink 
        to="/debulking" 
        class="p-4 rounded-2xl bg-slate-800/90 border border-amber-500/30 hover:border-amber-500 active:scale-95 transition flex flex-col justify-between h-32 shadow-md relative overflow-hidden group"
      >
        <div class="flex justify-between items-start">
          <span class="text-3xl">⚖️</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CURAH</span>
        </div>
        <div>
          <h3 class="font-bold text-white text-sm">De-bulking Work Order</h3>
          <p class="text-[10px] text-slate-400">Bulky → Karung & Susut %</p>
        </div>
      </NuxtLink>

      <!-- 4. Driver POD -->
      <NuxtLink 
        to="/outbound/pod" 
        class="p-4 rounded-2xl bg-slate-800/90 border border-rose-500/30 hover:border-rose-500 active:scale-95 transition flex flex-col justify-between h-32 shadow-md relative overflow-hidden group"
      >
        <div class="flex justify-between items-start">
          <span class="text-3xl">✍️</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">DRIVER</span>
        </div>
        <div>
          <h3 class="font-bold text-white text-sm">Serah Terima POD</h3>
          <p class="text-[10px] text-slate-400">Foto & TTD Digital Customer</p>
        </div>
      </NuxtLink>
    </div>

    <!-- Live Operational Summary -->
    <div class="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
      <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <h4 class="text-xs font-bold text-slate-300 tracking-wider uppercase">📊 Status Armada & Stok</h4>
        <NuxtLink to="/stock" class="text-[11px] text-blue-400 font-semibold hover:underline">Lihat Semua →</NuxtLink>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p class="text-[10px] text-slate-400">Armada di Luar</p>
          <p class="text-base font-extrabold text-purple-400 mt-0.5">2 Unit</p>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p class="text-[10px] text-slate-400">In-Transit</p>
          <p class="text-base font-extrabold text-amber-400 mt-0.5">1 Trip</p>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p class="text-[10px] text-slate-400">Total SKU Aktif</p>
          <p class="text-base font-extrabold text-emerald-400 mt-0.5">4 SKU</p>
        </div>
      </div>
    </div>
  </div>
</template>
