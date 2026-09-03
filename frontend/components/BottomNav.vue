<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-3 py-1 flex justify-around items-center z-50 transition-colors">
    <NuxtLink 
      v-for="item in authStore.allowedBottomNavItems"
      :key="item.path"
      :to="item.path" 
      class="flex flex-col items-center py-1 px-2.5 rounded-md transition"
      :class="$route.path === item.path || ($route.path.startsWith(item.path) && item.path !== '/') ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
    >
      <AppIcon :name="item.icon" custom-class="w-4 h-4" />
      <span class="text-[10px] mt-0.5 font-medium">{{ getShortName(item.name) }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import AppIcon from '~/components/AppIcon.vue'

const authStore = useAuthStore()

function getShortName(fullName) {
  if (fullName.includes('Dashboard')) return 'Home'
  if (fullName.includes('Gate Pass')) return 'Gate Pass'
  if (fullName.includes('Inbound')) return 'Inbound'
  if (fullName.includes('De-bulking') || fullName.includes('Repacking')) return 'De-bulk'
  if (fullName.includes('POD') || fullName.includes('Bukti')) return 'e-POD'
  if (fullName.includes('Stok') || fullName.includes('Ledger')) return 'Stok'
  return fullName
}
</script>
