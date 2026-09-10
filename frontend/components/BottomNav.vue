<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex justify-around items-center z-50 transition-colors pb-[max(0.25rem,env(safe-area-inset-bottom))]">
    <NuxtLink
      v-for="item in authStore.allowedBottomNavItems"
      :key="item.path"
      :to="item.path"
      class="flex flex-col items-center py-1 px-2 rounded-md transition min-w-[52px]"
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
  if (fullName.startsWith('Beranda')) return 'Home'
  if (fullName.startsWith('Inbound')) return 'Inbound'
  if (fullName.startsWith('Warehouse')) return 'Gudang'
  if (fullName.startsWith('Outbound')) return 'Outbound'
  if (fullName.startsWith('Delivery & Billing')) return 'POD'
  if (fullName.startsWith('Monitoring')) return 'Monitor'
  if (fullName.startsWith('Master')) return 'Master'
  if (fullName.includes('Stock')) return 'Stok'
  if (fullName.includes('Audit')) return 'Audit'
  if (fullName.includes('Receiving')) return 'Terima'
  if (fullName.includes('Debulking')) return 'Repack'
  if (fullName.includes('Delivery Order')) return 'DO'
  if (fullName.includes('Surat Jalan')) return 'SJ'
  if (fullName.includes('Gate Pass')) return 'Gerbang'
  if (fullName.includes('POD')) return 'POD'
  if (fullName.includes('Faktur')) return 'Tagihan'
  if (fullName.includes('Barang (SKU)')) return 'Barang'
  if (fullName.includes('Gudang & Rak')) return 'Gudang'
  if (fullName.includes('Customer')) return 'Customer'
  if (fullName.includes('Pengguna')) return 'Akses'
  if (fullName.includes('Armada')) return 'Armada'
  return fullName.slice(0, 8)
}
</script>
