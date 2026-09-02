<template>
  <div class="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
    
    <!-- DESKTOP SIDEBAR (Visible on lg: screens and up) -->
    <aside class="hidden lg:flex lg:w-64 xl:w-72 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 transition-colors">
      <!-- Brand Logo Header -->
      <div class="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 text-base">
            W
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">WMS SIMPLE</h1>
            <p class="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">Enterprise v1.1.0</p>
          </div>
        </div>
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ● ONLINE
        </span>
      </div>

      <!-- User Profile Card -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div v-if="authStore.isAuthenticated" class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-xs font-black text-blue-700 dark:text-blue-300 shadow-inner">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{{ authStore.user?.full_name || 'Petugas Operasional' }}</p>
            <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">{{ authStore.activeWarehouseName }}</p>
            <span class="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border" :class="authStore.roleBadgeColor">
              {{ authStore.roleLabel }}
            </span>
          </div>
        </div>
        <div v-else class="space-y-2">
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Masuk Akun</p>
          <NuxtLink 
            to="/login"
            class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
          >
            <AppIcon name="user" custom-class="w-3.5 h-3.5" />
            <span>Masuk ke Akun</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Desktop Dynamic Navigation Menu (Filtered by Active Role) -->
      <div class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div v-for="section in authStore.allowedNavSections" :key="section.title">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">{{ section.title }}</p>
          <nav class="space-y-1">
            <NuxtLink 
              v-for="item in section.items" 
              :key="item.path"
              :to="item.path" 
              class="desktop-nav-link" 
              :class="$route.path === item.path || ($route.path.startsWith(item.path) && item.path !== '/') ? 'active' : ''"
            >
              <AppIcon :name="item.icon" custom-class="w-4 h-4 shrink-0" />
              <span class="font-medium text-xs flex-1 truncate">{{ item.name }}</span>
              <span v-if="item.badge" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {{ item.badge }}
              </span>
            </NuxtLink>
          </nav>
        </div>
      </div>

      <!-- Desktop Sidebar Footer -->
      <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
        <div class="flex items-center justify-between px-2">
          <span class="text-xs text-slate-600 dark:text-slate-400 font-medium">Tema Tampilan</span>
          <ThemeToggle />
        </div>
        <div v-if="authStore.isAuthenticated" class="space-y-1">
          <button 
            @click="handleLogout"
            type="button"
            class="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 active:scale-98 transition-all flex items-center justify-center space-x-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-xs cursor-pointer"
          >
            <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
          <NuxtLink 
            to="/login"
            class="w-full py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center space-x-1 text-[11px]"
          >
            <AppIcon name="user" custom-class="w-3 h-3" />
            <span>Ganti Peran / Akun</span>
          </NuxtLink>
        </div>
        <NuxtLink 
          v-else
          to="/login"
          class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition"
        >
          <AppIcon name="user" custom-class="w-3.5 h-3.5" />
          <span>Halaman Login</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- MAIN CONTENT CONTAINER (Responsive with pl-0 on mobile, lg:pl-64 xl:pl-72 on desktop) -->
    <div class="flex-1 flex flex-col min-h-screen w-full lg:pl-64 xl:pl-72 transition-all">
      
      <!-- DESKTOP TOP HEADER (Visible on lg: screens) -->
      <header class="hidden lg:flex sticky top-0 z-20 h-16 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 items-center justify-between transition-colors">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Gudang Aktif:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {{ authStore.activeWarehouseName }}
            </span>
          </div>
          <span class="text-slate-300 dark:text-slate-700">|</span>
          <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">Enterprise Console</span>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="hidden xl:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <AppIcon name="scan" custom-class="w-3.5 h-3.5 text-slate-500" />
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Scanner Ready</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <!-- MOBILE TOP HEADER (Visible on < lg: screens) -->
      <header class="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between transition-colors">
        <div class="flex items-center space-x-3">
          <!-- Hamburger Menu Button -->
          <button 
            @click="isDrawerOpen = true"
            type="button"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">WMS SIMPLE</h1>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">{{ authStore.activeWarehouseName }}</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <ThemeToggle />
          <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ● ONLINE
          </span>
        </div>
      </header>

      <!-- Mobile App Drawer Component -->
      <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

      <!-- Main Responsive Content Area -->
      <main class="flex-1 p-4 md:p-6 lg:p-8 xl:p-10 w-full max-w-7xl mx-auto pb-24 lg:pb-8 overflow-y-auto">
        <slot />
      </main>

      <!-- Bottom Touch Navigation (Visible only on mobile devices < lg) -->
      <BottomNav class="lg:hidden" />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppDrawer from '~/components/AppDrawer.vue'
import BottomNav from '~/components/BottomNav.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import { useTheme } from '~/composables/useTheme'
import { useAuthStore } from '~/stores/auth'

const isDrawerOpen = ref(false)
const { initTheme } = useTheme()
const authStore = useAuthStore()

const userInitials = computed(() => {
  const name = authStore.user?.full_name || 'Petugas WMS'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})

function handleLogout() {
  authStore.logout()
  navigateTo('/login')
}

onMounted(() => {
  initTheme()
  authStore.initAuth()
})
</script>

<style scoped>
.desktop-nav-link {
  @apply flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-xs;
}
.desktop-nav-link.active {
  @apply bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20;
}
</style>
