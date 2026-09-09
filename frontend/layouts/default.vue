<template>
  <div class="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors">
    
    <!-- DESKTOP SIDEBAR -->
    <aside
      class="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200"
      :class="uiStore.sidebarCollapsed ? 'w-14' : 'w-64 xl:w-72'"
    >
      <!-- Brand -->
      <div class="h-14 shrink-0 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2" :class="uiStore.sidebarCollapsed ? 'justify-center px-0' : ''">
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="w-7 h-7 shrink-0 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-mono font-bold text-xs">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div v-if="!uiStore.sidebarCollapsed" class="min-w-0">
            <h1 class="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase truncate">WMS Enterprise</h1>
            <p class="text-[10px] text-slate-400 font-mono">KDMP 3PL</p>
          </div>
        </div>
        <button
          v-if="!uiStore.sidebarCollapsed"
          type="button"
          aria-label="Ringkas sidebar"
          class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          @click="uiStore.toggleSidebar()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- User card -->
      <div v-if="!uiStore.sidebarCollapsed" class="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div v-if="authStore.isAuthenticated" class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{{ authStore.user?.full_name || 'Petugas Operasional' }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border" :class="authStore.roleBadgeColor">
                {{ authStore.roleLabel }}
              </span>
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

      <!-- Nav (shared component, rail mode when collapsed) -->
      <div class="flex-1 overflow-y-auto py-3" :class="uiStore.sidebarCollapsed ? 'px-1.5' : 'px-2.5'">
        <AppNavList
          :parents="authStore.allowedNavParents"
          :rail="uiStore.sidebarCollapsed"
        />
      </div>

      <!-- Footer -->
      <div v-if="!uiStore.sidebarCollapsed" class="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
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
            class="w-full py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition flex items-center justify-center text-[11px]"
          >
            <span>Ganti Peran / Clearance</span>
          </NuxtLink>
        </div>
      </div>
      <!-- Collapsed: logout icon at bottom -->
      <div v-else class="p-2 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-1.5">
        <ThemeToggle />
        <button
          v-if="authStore.isAuthenticated"
          type="button"
          aria-label="Keluar"
          class="group relative w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition"
          @click="handleLogout"
        >
          <AppIcon name="logout" custom-class="w-4 h-4" />
          <span class="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50 shadow-lg">Keluar</span>
        </button>
      </div>
    </aside>

    <!-- MAIN COLUMN -->
    <div class="flex-1 flex flex-col min-h-screen w-full transition-all" :class="uiStore.sidebarCollapsed ? 'lg:pl-14' : 'lg:pl-64 xl:pl-72'">

      <!-- Shell header (mobile + desktop) -->
      <AppHeader
        :collapsed="uiStore.sidebarCollapsed"
        @open-drawer="isDrawerOpen = true"
        @toggle-collapse="uiStore.toggleSidebar()"
      />

      <!-- Mobile drawer -->
      <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

      <!-- Page content: full width, page controls its own max-width -->
      <main class="flex-1 w-full px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-8">
        <slot />
      </main>

      <!-- Mobile bottom nav -->
      <BottomNav class="lg:hidden" />
    </div>

    <!-- Global toasts -->
    <AppToast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '~/components/AppHeader.vue'
import AppDrawer from '~/components/AppDrawer.vue'
import AppNavList from '~/components/AppNavList.vue'
import AppToast from '~/components/AppToast.vue'
import BottomNav from '~/components/BottomNav.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import { useTheme } from '~/composables/useTheme'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'

const isDrawerOpen = ref(false)
const { initTheme } = useTheme()
const authStore = useAuthStore()
const uiStore = useUiStore()

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
  uiStore.sidebarCollapsed = localStorage.getItem('wms_sidebar_collapsed') === '1'
})
</script>
