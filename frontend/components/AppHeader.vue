<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
    <div class="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
      <!-- Mobile: hamburger + last breadcrumb segment -->
      <div class="flex items-center gap-2.5 min-w-0 lg:hidden">
        <button
          type="button"
          aria-label="Buka menu navigasi"
          class="w-9 h-9 shrink-0 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
          @click="$emit('open-drawer')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span v-if="crumbs.length > 1" class="w-1.5 h-1.5 rounded-full shrink-0" :class="lastCrumb.accent"></span>
            <h1 class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ lastCrumb.label }}</h1>
          </div>
          <p class="text-[10px] text-slate-400 font-mono truncate">{{ authStore.activeWarehouseName }}</p>
        </div>
      </div>

      <!-- Desktop: full breadcrumb -->
      <nav class="hidden lg:flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
        <template v-for="(crumb, i) in crumbs" :key="crumb.path">
          <span v-if="i > 0" class="text-slate-300 dark:text-slate-600 text-xs">/</span>
          <NuxtLink
            :to="crumb.path"
            class="flex items-center gap-1.5 text-xs transition"
            :class="i === crumbs.length - 1
              ? 'font-semibold text-slate-800 dark:text-slate-100'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          >
            <span v-if="crumb.accent" class="w-1.5 h-1.5 rounded-full shrink-0" :class="crumb.accent"></span>
            <span class="truncate">{{ crumb.label }}</span>
          </NuxtLink>
        </template>
      </nav>

      <!-- Right: warehouse + live clock + collapse -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="hidden md:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span class="font-medium text-slate-700 dark:text-slate-200">{{ authStore.activeWarehouseName }}</span>
          <span class="text-slate-300 dark:text-slate-700">·</span>
          <span class="font-mono tabular-nums">{{ clock }}</span>
        </div>
        <span class="md:hidden font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">{{ clock }}</span>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Ringkas menu navigasi"
          class="hidden lg:flex w-8 h-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          @click="$emit('toggle-collapse')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="collapsed" stroke-linecap="round" stroke-linejoin="round" d="M8 9l-4 3 4 3m8-6l-4 3 4 3m-4-6v12" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, PHASE_ACCENT, NAV_META } from '~/stores/auth'

const route = useRoute()

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})

defineEmits(['open-drawer', 'toggle-collapse'])

const authStore = useAuthStore()

// Breadcrumb dibangun dari route path + metadata nav (nama + fase) — tanpa hardcode
const crumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const result = [{ path: '/', label: 'Beranda', accent: PHASE_ACCENT[5].dot }]
  let acc = ''
  for (const part of parts) {
    acc += '/' + part
    const known = NAV_META[acc]
    result.push({
      path: acc,
      label: known?.name || part.replace(/-/g, ' '),
      accent: PHASE_ACCENT[known?.phase || 5].dot
    })
  }
  return result
})

const lastCrumb = computed(() => crumbs.value[crumbs.value.length - 1])

// Jam WIB live (update tiap 30 detik)
const clock = ref('')
let timer = null

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 30000)
})
onUnmounted(() => clearInterval(timer))
</script>
