<template>
  <div class="flex-1 flex flex-col max-w-md mx-auto w-full min-h-screen bg-slate-900 border-x border-slate-800 shadow-2xl relative">
    
    <!-- Mobile App Top Bar with Hamburger for App Drawer -->
    <header class="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <!-- Hamburger Menu Button -->
        <button 
          @click="isDrawerOpen = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div>
          <h1 class="text-sm font-bold tracking-tight text-white leading-tight">WMS SIMPLE</h1>
          <p class="text-[10px] text-slate-400 font-mono">WH-JKT-01 (Main Hub)</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
          ● ONLINE
        </span>
      </div>
    </header>

    <!-- App Drawer Component (Side Navigation) -->
    <AppDrawer :is-open="isDrawerOpen" @close="isDrawerOpen = false" />

    <!-- Main Content Area -->
    <main class="flex-1 p-4 overflow-y-auto pb-20">
      <slot />
    </main>

    <!-- Bottom Touch Navigation (Thumb-Zone) -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppDrawer from '~/components/AppDrawer.vue'
import BottomNav from '~/components/BottomNav.vue'

const isDrawerOpen = ref(false)
</script>
