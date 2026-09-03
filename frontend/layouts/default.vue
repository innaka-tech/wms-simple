<template>
  <div class="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
    
    <!-- DESKTOP SIDEBAR (Visible on lg: screens and up) -->
    <aside class="hidden lg:flex lg:w-64 xl:w-72 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 transition-colors">
      <!-- Brand Logo Header -->
      <div class="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-mono font-bold text-xs tracking-tight">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 class="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase">WMS Enterprise</h1>
            <p class="text-[10px] text-slate-400 font-mono">v1.1.0 • KDMP 3PL</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Online</span>
        </div>
      </div>

      <!-- User Profile Card -->
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
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
        <div v-else class="space-y-1.5">
          <p class="text-xs font-medium text-slate-600 dark:text-slate-400">Belum masuk akun</p>
          <NuxtLink 
            to="/login"
            class="w-full py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <AppIcon name="user" custom-class="w-3 h-3" />
            <span>Masuk ke Akun</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Desktop Dynamic Navigation Menu (Filtered by Active Role) -->
      <div class="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        <div v-for="section in authStore.allowedNavSections" :key="section.title">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-1">{{ section.title }}</p>
          <nav class="space-y-0.5">
            <NuxtLink 
              v-for="item in section.items" 
              :key="item.path"
              :to="item.path" 
              class="desktop-nav-link" 
              :class="$route.path === item.path || ($route.path.startsWith(item.path) && item.path !== '/') ? 'active' : ''"
            >
              <AppIcon :name="item.icon" custom-class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span class="text-xs flex-1 truncate">{{ item.name }}</span>
              <span v-if="item.badge" class="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {{ item.badge }}
              </span>
            </NuxtLink>
          </nav>
        </div>
      </div>

      <!-- Desktop Sidebar Footer -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Tema</span>
          <ThemeToggle />
        </div>
        <div v-if="authStore.isAuthenticated" class="space-y-1">
          <button 
            @click="handleLogout"
            type="button"
            class="w-full py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
          <NuxtLink 
            to="/login"
            class="w-full py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition flex items-center justify-center space-x-1 text-[11px]"
          >
            <span>Ganti Peran / Clearance</span>
          </NuxtLink>
        </div>
        <NuxtLink 
          v-else
          to="/login"
          class="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition"
        >
          <AppIcon name="user" custom-class="w-3 h-3" />
          <span>Halaman Login</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- MAIN CONTENT CONTAINER (Responsive with pl-0 on mobile, lg:pl-64 xl:pl-72 on desktop) -->
    <div class="flex-1 flex flex-col min-h-screen w-full lg:pl-64 xl:pl-72 transition-all">
      
      <!-- DESKTOP TOP HEADER (Visible on lg: screens) -->
      <header class="hidden lg:flex sticky top-0 z-20 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 items-center justify-between transition-colors">
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span class="text-slate-400">Node Gudang:</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {{ authStore.activeWarehouseName }}
            </span>
          </div>
          <span class="text-slate-300 dark:text-slate-700">/</span>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Shift 1 (08:00 - 16:00 WIB)</span>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span class="text-slate-700 dark:text-slate-300 font-medium">Scanner Active</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <!-- MOBILE TOP HEADER (Visible on < lg: screens) -->
      <header class="lg:hidden sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between transition-colors">
        <div class="flex items-center space-x-2.5">
          <!-- Hamburger Menu Button -->
          <button 
            @click="isDrawerOpen = true"
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 class="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase">WMS Enterprise</h1>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[170px]">{{ authStore.activeWarehouseName }}</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <ThemeToggle />
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </span>
        </div>
      </header>

      <!-- Mobile App Drawer Component -->
      <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

      <!-- Main Responsive Content Area -->
      <main class="flex-1 p-4 md:p-6 lg:p-7 w-full max-w-7xl mx-auto pb-24 lg:pb-8 overflow-y-auto">
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
  @apply flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-normal;
}
.desktop-nav-link.active {
  @apply bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border-l-2 border-slate-900 dark:border-white rounded-l-none pl-2;
}
</style>
