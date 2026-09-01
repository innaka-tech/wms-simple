<template>
  <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex justify-around items-center z-50">
    <NuxtLink 
      to="/" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path === '/' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">🏠</span>
      <span class="text-[10px] mt-0.5">Home</span>
    </NuxtLink>

    <NuxtLink 
      to="/gate-pass" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path.startsWith('/gate-pass') ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">🚛</span>
      <span class="text-[10px] mt-0.5">Gate Pass</span>
    </NuxtLink>

    <NuxtLink 
      to="/inbound/receive" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path.startsWith('/inbound') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">📥</span>
      <span class="text-[10px] mt-0.5">Inbound</span>
    </NuxtLink>

    <NuxtLink 
      to="/debulking" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path.startsWith('/debulking') ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">⚖️</span>
      <span class="text-[10px] mt-0.5">De-bulk</span>
    </NuxtLink>

    <NuxtLink 
      to="/outbound/pod" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path.startsWith('/outbound') ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">✍️</span>
      <span class="text-[10px] mt-0.5">POD</span>
    </NuxtLink>

    <NuxtLink 
      to="/stock" 
      class="flex flex-col items-center py-1 px-2 rounded-xl transition-all"
      :class="$route.path.startsWith('/stock') ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <span class="text-xl">📊</span>
      <span class="text-[10px] mt-0.5">Stok</span>
    </NuxtLink>
  </nav>
</template>
