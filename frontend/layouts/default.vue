<template>
  <div class="flex-1 flex flex-col max-w-md mx-auto w-full min-h-screen bg-slate-100 dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl relative transition-colors duration-200">
    
    <!-- Mobile App Top Bar with Hamburger & Theme Toggle -->
    <header class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between transition-colors">
      <div class="flex items-center space-x-3">
        <!-- Hamburger Menu Button -->
        <button 
          @click="isDrawerOpen = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div>
          <h1 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">WMS SIMPLE</h1>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{{ authStore.activeWarehouseName }}</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Theme Toggle (Light / Dark) -->
        <ThemeToggle />

        <!-- Status Indicator -->
        <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ● ONLINE
        </span>
      </div>
    </header>

    <!-- App Drawer Component (Side Navigation) -->
    <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

    <!-- Main Content Area -->
    <main class="flex-1 p-4 overflow-y-auto pb-24">
      <slot />
    </main>

    <!-- Bottom Touch Navigation (Thumb-Zone) -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppDrawer from '~/components/AppDrawer.vue'
import BottomNav from '~/components/BottomNav.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import { useTheme } from '~/composables/useTheme'
import { useAuthStore } from '~/stores/auth'

const isDrawerOpen = ref(false)
const { initTheme } = useTheme()
const authStore = useAuthStore()

onMounted(() => {
  initTheme()
  authStore.initAuth()
})
</script>
