<template>
  <div class="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors">
    
    <!-- DESKTOP SIDEBAR (Dark Theme) -->
    <aside
      class="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-slate-800 transition-all duration-200"
      :class="uiStore.sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'"
    >
      <!-- Brand -->
      <div
        class="h-14 shrink-0 px-4 border-b border-slate-800 flex items-center gap-2.5"
        :class="uiStore.sidebarCollapsed ? 'justify-center px-0' : ''"
      >
        <div class="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center">
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div v-if="!uiStore.sidebarCollapsed" class="min-w-0">
          <h1 class="text-[13px] font-bold tracking-tight text-white leading-tight">WMS Enterprise</h1>
          <p class="text-[10px] text-slate-500 font-mono leading-none mt-0.5">KDMP 3PL Console</p>
        </div>
      </div>

      <!-- Section label: Navigation -->
      <div v-if="!uiStore.sidebarCollapsed" class="px-4 pt-4 pb-1">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Menu</p>
      </div>

      <!-- Nav -->
      <div class="flex-1 overflow-y-auto" :class="uiStore.sidebarCollapsed ? 'px-1.5 py-3' : 'px-2.5 pb-3'">
        <AppNavList
          :parents="authStore.allowedNavParents"
          :rail="uiStore.sidebarCollapsed"
          theme="dark"
        />
      </div>

      <!-- Sidebar Footer: User + Actions -->
      <div class="shrink-0 border-t border-slate-800">
        <!-- User card -->
        <div v-if="!uiStore.sidebarCollapsed" class="px-3 py-3">
          <div v-if="authStore.isAuthenticated" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
              {{ userInitials }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-200 truncate">{{ authStore.user?.full_name || 'Petugas' }}</p>
              <span class="text-[9px] font-mono font-medium text-slate-500 uppercase">
                {{ authStore.roleLabel }}
              </span>
            </div>
          </div>
          <div v-else class="space-y-1.5">
            <NuxtLink
              to="/login"
              class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs flex items-center justify-center gap-1.5 transition"
            >
              <AppIcon name="user" custom-class="w-3 h-3" />
              <span>Masuk</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Bottom actions -->
        <div
          class="px-3 py-2.5 flex items-center border-t border-slate-800"
          :class="uiStore.sidebarCollapsed ? 'flex-col gap-1.5' : 'justify-between'"
        >
          <div :class="uiStore.sidebarCollapsed ? '' : 'flex items-center gap-1.5'">
            <ThemeToggle theme="dark" />
          </div>
          <button
            type="button"
            :aria-label="uiStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            class="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            @click="uiStore.toggleSidebar()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform duration-200" :class="uiStore.sidebarCollapsed ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            v-if="authStore.isAuthenticated && !uiStore.sidebarCollapsed"
            @click="handleLogout"
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Keluar"
          >
            <AppIcon name="logout" custom-class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN COLUMN -->
    <div class="flex-1 flex flex-col min-h-screen w-full transition-all" :class="uiStore.sidebarCollapsed ? 'lg:pl-[60px]' : 'lg:pl-[260px]'">

      <!-- Shell header (mobile + desktop) -->
      <AppHeader
        :collapsed="uiStore.sidebarCollapsed"
        @open-drawer="isDrawerOpen = true"
      />

      <!-- Mobile drawer -->
      <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

      <!-- Page content -->
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
