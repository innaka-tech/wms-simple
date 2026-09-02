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
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            W
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white leading-tight">WMS Simple</h2>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-mono">Enterprise v1.1.0</p>
          </div>
        </div>
        <button 
          @click="$emit('close')" 
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
        >
          ✕
        </button>
      </div>

      <!-- User Profile Card -->
      <div class="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1 uppercase tracking-wider">Petugas Aktif</p>
        <div v-if="authStore.isAuthenticated" class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-xs font-black text-blue-700 dark:text-blue-300">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{{ authStore.user?.full_name || 'Petugas Operasional' }}</p>
            <p class="text-xs text-emerald-600 dark:text-emerald-400 font-mono truncate">{{ authStore.activeWarehouseName }}</p>
            <span class="inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border" :class="authStore.roleBadgeColor">
              {{ authStore.roleLabel }}
            </span>
          </div>
        </div>
        <div v-else class="mt-1">
          <NuxtLink 
            to="/login"
            @click="$emit('close')"
            class="w-full py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5"
          >
            <AppIcon name="user" custom-class="w-3.5 h-3.5" />
            <span>Masuk Akun</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Dynamic Navigation Links (Filtered by Role) -->
      <div class="flex-1 overflow-y-auto py-3">
        <nav class="space-y-4 px-3">
          <div v-for="section in authStore.allowedNavSections" :key="section.title">
            <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-3 mb-1.5">{{ section.title }}</p>
            <div class="space-y-1">
              <NuxtLink 
                v-for="item in section.items" 
                :key="item.path"
                :to="item.path" 
                @click="$emit('close')" 
                class="drawer-link flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" 
                :class="$route.path === item.path || ($route.path.startsWith(item.path) && item.path !== '/') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : ''"
              >
                <AppIcon :name="item.icon" custom-class="w-4 h-4 shrink-0" />
                <span class="flex-1 truncate">{{ item.name }}</span>
                <span v-if="item.badge" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {{ item.badge }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Drawer Footer (Theme & Logout) -->
      <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 space-y-2">
        <div class="flex items-center justify-between px-2">
          <span class="text-xs text-slate-600 dark:text-slate-400 font-medium">Tema Tampilan</span>
          <ThemeToggle />
        </div>
        <div v-if="authStore.isAuthenticated" class="space-y-1">
          <button 
            @click="handleLogout"
            class="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center space-x-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-xs cursor-pointer"
          >
            <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
          <NuxtLink 
            to="/login"
            @click="$emit('close')"
            class="w-full py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center space-x-1 text-[11px]"
          >
            <AppIcon name="user" custom-class="w-3 h-3" />
            <span>Ganti Peran / Akun</span>
          </NuxtLink>
        </div>
        <NuxtLink 
          v-else
          to="/login"
          @click="$emit('close')"
          class="w-full py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5"
        >
          <AppIcon name="user" custom-class="w-3.5 h-3.5" />
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
  @apply flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-xs;
}
.drawer-link.active {
  @apply bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20;
}
</style>
