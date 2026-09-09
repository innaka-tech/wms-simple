<template>
  <!-- RAIL MODE: icon-only parent (sidebar collapsed) -->
  <nav v-if="rail" class="flex flex-col items-center py-2 gap-1" aria-label="Navigasi ringkas">
    <template v-for="(parent, pi) in parents" :key="parent.name">
      <div v-if="pi > 0" class="w-6 border-t border-slate-200 dark:border-slate-800 my-1.5"></div>
      <NuxtLink
        v-for="item in railItems(parent)"
        :key="item.path + parent.name"
        :to="item.path"
        class="group relative w-9 h-9 flex items-center justify-center rounded-md transition"
        :class="isActive(item.path)
          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
      >
        <span v-if="parent.accent && parent.children.length > 1" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" :class="parent.accent"></span>
        <AppIcon :name="item.icon" custom-class="w-4 h-4" />
        <span class="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50 shadow-lg">
          {{ item.name }}
        </span>
      </NuxtLink>
    </template>
  </nav>

  <!-- FULL MODE: accordion dua tingkat dengan ritme band -->
  <nav class="space-y-1" aria-label="Navigasi utama">
    <template v-for="(parent, pi) in parents" :key="parent.name">
      <!-- Pemisah antar band: main | flow | admin -->
      <div
        v-if="pi > 0 && parent.band && parent.band !== parents[pi - 1].band"
        class="mx-3 my-2 border-t border-slate-200/80 dark:border-slate-800"
        aria-hidden="true"
      ></div>
      <!-- Parent tanpa anak (Beranda): link langsung -->
      <NuxtLink
        v-if="parent.children.length <= 1"
        :to="parent.path"
        class="nav-parent flex items-center space-x-2.5 px-2.5 py-2 rounded-md transition text-xs"
        :class="isActive(parent.path)
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'"
        @click="$emit('navigate')"
      >
        <span v-if="parent.accent" class="w-1.5 h-1.5 rounded-full shrink-0" :class="parent.accent"></span>
        <AppIcon :name="parent.icon" custom-class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
        <span class="flex-1 truncate">{{ parent.name }}</span>
      </NuxtLink>

      <!-- Parent dengan anak: accordion -->
      <div v-else>
        <button
          type="button"
          class="nav-parent w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md transition text-xs cursor-pointer"
          :class="parentActive(parent)
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'"
          @click="toggle(parent.name)"
        >
          <span v-if="parent.accent" class="w-1.5 h-1.5 rounded-full shrink-0" :class="parent.accent"></span>
          <AppIcon :name="parent.icon" custom-class="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span class="flex-1 text-left truncate">{{ parent.name }}</span>
          <svg
            class="w-3 h-3 shrink-0 text-slate-400 transition-transform duration-200"
            :class="isOpen(parent.name) ? 'rotate-90' : ''"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Animasi expand via CSS grid rows (0fr → 1fr), tanpa JS height hack -->
        <div
          class="submenu-grid grid transition-[grid-template-rows] duration-200 ease-out"
          :class="isOpen(parent.name) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div class="min-h-0 overflow-hidden">
            <div class="mt-0.5 mb-1 ml-[19px] pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5">
              <NuxtLink
                v-for="item in parent.children"
                :key="item.path"
                :to="item.path"
                class="flex items-center min-h-[32px] lg:min-h-0 lg:py-1.5 px-2 rounded-md text-xs transition focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:outline-none"
                :class="isActive(item.path)
                  ? 'text-slate-900 dark:text-white font-semibold bg-slate-100 dark:bg-slate-800'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                @click="$emit('navigate')"
              >
                <span class="truncate">{{ item.name }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </nav>
</template>

<script setup>
const props = defineProps({
  parents: { type: Array, required: true },
  rail: { type: Boolean, default: false }
})

const emit = defineEmits(['navigate'])

const route = useRoute()

// Auto-buka grup yang sedang aktif; user bisa tutup/buka manual
const openGroups = ref([])

function isOpen(name) {
  return openGroups.value.includes(name)
}

function toggle(name) {
  openGroups.value = isOpen(name)
    ? openGroups.value.filter(n => n !== name)
    : [...openGroups.value, name]
}

function parentActive(parent) {
  return parent.children.some((item) => isActive(item.path))
}

function isActive(path) {
  return route.path === path || (path !== '/' && route.path.startsWith(path))
}

// Rail: parent multi-anak direpresentasikan modul pertamanya; single = dirinya
function railItems(parent) {
  return parent.children.length > 0 ? [parent.children[0]] : [{ path: parent.path, icon: parent.icon, name: parent.name }]
}

// Saat pindah halaman, pastikan grup halaman aktif terbuka
watch(() => route.path, () => {
  for (const parent of props.parents) {
    if (parent.children.length > 1 && parentActive(parent) && !isOpen(parent.name)) {
      openGroups.value = [...openGroups.value, parent.name]
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* Touch target & hover nyaman di drawer mobile; rapat elegan di desktop */
.nav-parent {
  min-height: 36px;
}
@media (min-width: 1024px) {
  .nav-parent {
    min-height: 32px;
  }
}
.nav-parent:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.5);
}
</style>
