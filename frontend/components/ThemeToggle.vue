<template>
  <button 
    type="button" 
    @click="toggleTheme"
    :title="isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'"
    class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
  >
    <span v-if="isDarkMode" class="text-base">☀️</span>
    <span v-else class="text-base">🌙</span>
  </button>
</template>

<script setup>
import { useTheme } from '~/composables/useTheme'

const { isDarkMode, toggleTheme } = useTheme()
</script>
