<template>
  <div>
    <!-- Backdrop Overlay -->
    <div 
      v-if="isOpen" 
      @click="$emit('close')"
      class="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Drawer Panel -->
    <aside 
      class="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-mono font-bold text-xs tracking-tight">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">WMS Enterprise</h2>
            <p class="text-[10px] text-slate-400 font-mono">v1.1.0 • KDMP 3PL</p>
          </div>
        </div>
        <button 
          @click="$emit('close')" 
          class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          ✕
        </button>
      </div>

      <!-- User Profile Card -->
      <div class="px-3.5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-1 uppercase tracking-wider">Petugas Aktif</p>
        <div v-if="authStore.isAuthenticated" class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{{ authStore.user?.full_name || 'Petugas Operasional' }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded border" :class="authStore.roleBadgeColor">
                {{ authStore.roleLabel }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono truncate">{{ authStore.activeWarehouseName }}</span>
            </div>
          </div>
        </div>
        <div v-else class="mt-1">
          <NuxtLink 
            to="/login"
            @click="$emit('close')"
            class="w-full py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition"
          >
            <AppIcon name="user" custom-class="w-3 h-3" />
            <span>Masuk Akun</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Dynamic Navigation Links (Filtered by Role) -->
      <div class="flex-1 overflow-y-auto py-2.5">
        <nav class="space-y-3.5 px-2.5">
          <div v-for="section in authStore.allowedNavSections" :key="section.title">
            <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider px-2 mb-1">{{ section.title }}</p>
            <div class="space-y-0.5">
              <NuxtLink 
                v-for="item in section.items" 
                :key="item.path"
                :to="item.path" 
                @click="$emit('close')" 
                class="drawer-link flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition" 
                :class="$route.path === item.path || ($route.path.startsWith(item.path) && item.path !== '/') ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border-l-2 border-slate-900 dark:border-white rounded-l-none pl-2' : ''"
              >
                <AppIcon :name="item.icon" custom-class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span class="flex-1 truncate">{{ item.name }}</span>
                <span v-if="item.badge" class="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {{ item.badge }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Drawer Footer (Theme & Logout) -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Tema</span>
          <ThemeToggle />
        </div>
        <div v-if="authStore.isAuthenticated" class="space-y-1">
          <button 
            @click="handleLogout"
            class="w-full py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
          <NuxtLink 
            to="/login"
            @click="$emit('close')"
            class="w-full py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition flex items-center justify-center space-x-1 text-[11px]"
          >
            <span>Ganti Peran / Clearance</span>
          </NuxtLink>
        </div>
        <NuxtLink 
          v-else
          to="/login"
          @click="$emit('close')"
          class="w-full py-1.5 bg-blue-600 text-white font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition"
        >
          <AppIcon name="user" custom-class="w-3 h-3" />
          <span>Halaman Login</span>
        </NuxtLink>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import ThemeToggle from '~/components/ThemeToggle.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const authStore = useAuthStore()

const userInitials = computed(() => {
  const name = authStore.user?.full_name || 'Petugas WMS'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})

function handleLogout() {
  authStore.logout()
  emit('close')
  navigateTo('/login')
}
</script>

<style scoped>
.drawer-link {
  @apply transition-colors;
}
</style>
