<template>
  <nav class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around items-center z-50 transition-colors">
    <NuxtLink 
      to="/" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path === '/' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">🏠</span>
      <span class="text-[10px] mt-0.5">Home</span>
    </NuxtLink>

    <NuxtLink 
      to="/gate-pass" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path.startsWith('/gate-pass') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">🚛</span>
      <span class="text-[10px] mt-0.5">Gate Pass</span>
    </NuxtLink>

    <NuxtLink 
      to="/inbound/receive" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path.startsWith('/inbound') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">📥</span>
      <span class="text-[10px] mt-0.5">Inbound</span>
    </NuxtLink>

    <NuxtLink 
      to="/debulking" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path.startsWith('/debulking') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">⚖️</span>
      <span class="text-[10px] mt-0.5">De-bulk</span>
    </NuxtLink>

    <NuxtLink 
      to="/outbound/pod" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path.startsWith('/outbound') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">✍️</span>
      <span class="text-[10px] mt-0.5">POD</span>
    </NuxtLink>

    <NuxtLink 
      to="/stock" 
      class="flex flex-col items-center py-1 px-2.5 rounded-xl transition-all"
      :class="$route.path.startsWith('/stock') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <span class="text-lg">📊</span>
      <span class="text-[10px] mt-0.5">Stok</span>
    </NuxtLink>
  </nav>
</template>
