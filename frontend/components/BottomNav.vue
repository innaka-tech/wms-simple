<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-1 py-1 flex justify-around items-center z-50 transition-colors pb-[max(0.25rem,env(safe-area-inset-bottom))]">
    <NuxtLink
      v-for="item in authStore.allowedBottomNavItems"
      :key="item.path"
      :to="item.path"
      class="flex flex-col items-center py-1.5 px-2 rounded-lg transition min-w-[52px]"
      :class="isItemActive(item) ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'"
    >
      <div
        class="w-8 h-8 flex items-center justify-center rounded-lg transition"
        :class="isItemActive(item) ? 'bg-blue-50 dark:bg-blue-950' : ''"
      >
        <AppIcon :name="item.icon" custom-class="w-4 h-4" />
      </div>
      <span class="text-[10px] mt-0.5 font-medium">{{ getShortName(item.name) }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import AppIcon from '~/components/AppIcon.vue'

const authStore = useAuthStore()
const route = useRoute()

function isItemActive(item) {
  return route.path === item.path || (route.path.startsWith(item.path) && item.path !== '/')
}

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
