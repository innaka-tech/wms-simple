<template>
  <!-- RAIL MODE: icon-only (sidebar collapsed) -->
  <nav v-if="rail" class="flex flex-col items-center py-2 gap-1" aria-label="Navigasi ringkas">
    <template v-for="(section, si) in sections" :key="section.title">
      <div v-if="si > 0" class="w-6 border-t border-slate-200 dark:border-slate-800 my-1.5"></div>
      <p class="sr-only">{{ section.title }}</p>
      <NuxtLink
        v-for="item in section.items"
        :key="item.path"
        :to="item.path"
        class="group relative w-9 h-9 flex items-center justify-center rounded-md transition"
        :class="isActive(item.path)
          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
      >
        <span v-if="item.accent" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" :class="item.accent"></span>
        <AppIcon :name="item.icon" custom-class="w-4 h-4" />
        <!-- Tooltip -->
        <span class="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50 shadow-lg">
          {{ item.name }}
        </span>
      </NuxtLink>
    </template>
  </nav>

  <!-- FULL MODE: sectioned list (sidebar expanded + drawer) -->
  <nav v-else class="space-y-4" aria-label="Navigasi utama">
    <div v-for="section in sections" :key="section.title">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-1">{{ section.title }}</p>
      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="nav-item flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
          :class="isActive(item.path) ? 'active bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border-l-2 border-slate-900 dark:border-white rounded-l-none pl-2' : ''"
        >
          <span v-if="item.accent" class="w-1.5 h-1.5 rounded-full shrink-0" :class="item.accent" :title="'Fase ' + item.phase + ' alur operasional'"></span>
          <AppIcon :name="item.icon" custom-class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span class="flex-1 truncate">{{ item.name }}</span>
          <span v-if="item.phase" class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border" :class="phaseAccent(item.phase).chip" :title="'Fase ' + item.phase + ' alur operasional'">
            F{{ item.phase }}
          </span>
          <span v-if="item.badge" class="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {{ item.badge }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore, PHASE_ACCENT } from '~/stores/auth'

const props = defineProps({
  sections: { type: Array, required: true },
  rail: { type: Boolean, default: false }
})

const emit = defineEmits(['navigate'])

const route = useRoute()
const authStore = useAuthStore()

const phaseAccent = (p) => PHASE_ACCENT[p || 5] || PHASE_ACCENT[5]

function isActive(path) {
  return route.path === path || (path !== '/' && route.path.startsWith(path))
}
</script>

<style scoped>
.nav-item {
  cursor: pointer;
}
</style>
