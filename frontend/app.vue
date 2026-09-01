<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col font-sans select-none transition-colors duration-200">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { isDarkMode, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})

useHead(() => ({
  htmlAttrs: {
    class: isDarkMode.value ? 'dark' : ''
  }
}))
</script>

<style>
/* Disable pull-to-refresh & double-tap zoom on handheld devices */
html, body {
  overscroll-behavior-y: contain;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
</style>
