<template>
  <!-- RAIL MODE: icon-only (sidebar collapsed) -->
  <nav v-if="rail" class="flex flex-col items-center py-2 gap-1" aria-label="Navigasi ringkas">
    <template v-for="(parent, pi) in parents" :key="parent.name">
      <div v-if="pi > 0" class="w-6 border-t border-slate-700 my-1.5"></div>
      <NuxtLink
        v-for="item in railItems(parent)"
        :key="item.path + parent.name"
        :to="item.path"
        class="group relative w-9 h-9 flex items-center justify-center rounded-lg transition"
        :class="isActive(item.path)
          ? 'bg-slate-700 text-white'
          : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'"
      >
        <AppIcon :name="item.icon" custom-class="w-4 h-4" />
        <span class="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50 shadow-lg border border-slate-700">
          {{ item.name }}
        </span>
      </NuxtLink>
    </template>
  </nav>

  <!-- FULL MODE: nav with dark/light support -->
  <nav v-else class="space-y-0.5" aria-label="Navigasi utama">
    <template v-for="(parent, pi) in parents" :key="parent.name">
      <!-- Band separator -->
      <div
        v-if="pi > 0 && parent.band && parent.band !== parents[pi - 1].band"
        class="mx-3 my-2.5"
        :class="isDark ? 'border-t border-slate-800' : 'border-t border-slate-200/80 dark:border-slate-800'"
        aria-hidden="true"
      >
        <p v-if="parent.band === 'flow'" class="text-[9px] font-semibold uppercase tracking-widest mt-2"
           :class="isDark ? 'text-slate-600' : 'text-slate-400 dark:text-slate-600'">
          Operasional
        </p>
        <p v-else-if="parent.band === 'admin'" class="text-[9px] font-semibold uppercase tracking-widest mt-2"
           :class="isDark ? 'text-slate-600' : 'text-slate-400 dark:text-slate-600'">
          Administrasi
        </p>
      </div>

      <!-- Parent without children (Beranda): direct link -->
      <NuxtLink
        v-if="parent.children.length <= 1"
        :to="parent.path"
        class="nav-parent flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition text-[13px]"
        :class="navParentClass(parent.path, false)"
        @click="$emit('navigate')"
      >
        <AppIcon :name="parent.icon" custom-class="w-4 h-4 shrink-0" />
        <span class="flex-1 truncate">{{ parent.name }}</span>
      </NuxtLink>

      <!-- Parent with children: accordion -->
      <div v-else>
        <button
          type="button"
          class="nav-parent w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition text-[13px] cursor-pointer"
          :class="navParentClass('', parentActive(parent))"
          @click="toggle(parent.name)"
        >
          <AppIcon :name="parent.icon" custom-class="w-4 h-4 shrink-0" />
          <span class="flex-1 text-left truncate">{{ parent.name }}</span>
          <svg
            class="w-3 h-3 shrink-0 transition-transform duration-200"
            :class="[isOpen(parent.name) ? 'rotate-90' : '', isDark ? 'text-slate-600' : 'text-slate-400']"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Submenu expand -->
        <div
          class="submenu-grid grid transition-[grid-template-rows] duration-200 ease-out"
          :class="isOpen(parent.name) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div class="min-h-0 overflow-hidden">
            <div class="mt-0.5 mb-1 ml-[22px] pl-3 space-y-0.5"
                 :class="isDark ? 'border-l-2 border-slate-700' : 'border-l-2 border-slate-200 dark:border-slate-700'">
              <NuxtLink
                v-for="item in parent.children"
                :key="item.path"
                :to="item.path"
                class="flex items-center min-h-[32px] px-2.5 rounded-lg text-[12.5px] transition focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
                :class="navChildClass(item.path)"
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
  rail: { type: Boolean, default: false },
  theme: { type: String, default: 'light' } // 'dark' for sidebar, 'light' for drawer
})

const emit = defineEmits(['navigate'])

const route = useRoute()

const isDark = computed(() => props.theme === 'dark')

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

function railItems(parent) {
  return parent.children.length > 0 ? [parent.children[0]] : [{ path: parent.path, icon: parent.icon, name: parent.name }]
}

// Dynamic classes based on theme prop
function navParentClass(path, isGroupActive) {
  const active = path ? isActive(path) : isGroupActive
  if (isDark.value) {
    return active
      ? 'text-white font-semibold bg-slate-800'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
  }
  return active
    ? 'text-slate-900 dark:text-white font-semibold bg-slate-100 dark:bg-slate-800'
    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
}

function navChildClass(path) {
  if (isDark.value) {
    return isActive(path)
      ? 'text-white font-semibold bg-slate-800'
      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
  }
  return isActive(path)
    ? 'text-slate-900 dark:text-white font-semibold bg-slate-100 dark:bg-slate-800'
    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
}

// Auto-open group of active page
watch(() => route.path, () => {
  for (const parent of props.parents) {
    if (parent.children.length > 1 && parentActive(parent) && !isOpen(parent.name)) {
      openGroups.value = [...openGroups.value, parent.name]
    }
  }
}, { immediate: true })
</script>

<style scoped>
.nav-parent {
  min-height: 36px;
}
@media (min-width: 1024px) {
  .nav-parent {
    min-height: 34px;
  }
}
.nav-parent:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>
