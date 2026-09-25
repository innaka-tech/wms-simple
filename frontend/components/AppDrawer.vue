<template>
  <div>
    <!-- Backdrop Overlay -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        @click="$emit('close')"
        class="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      ></div>
    </Transition>

    <!-- Drawer Panel (Dark, matching desktop sidebar) -->
    <aside
      class="fixed top-0 left-0 bottom-0 w-4/5 max-w-[280px] bg-slate-900 dark:bg-slate-950 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Header -->
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 class="text-[13px] font-bold text-white tracking-tight">WMS Enterprise</h2>
            <p class="text-[10px] text-slate-500 font-mono leading-none">KDMP 3PL Console</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          aria-label="Tutup menu"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <div class="flex-1 overflow-y-auto py-2.5 px-2.5">
        <AppNavList :parents="authStore.allowedNavParents" theme="dark" @navigate="$emit('close')" />
      </div>

      <!-- Footer: User + Actions -->
      <div class="border-t border-slate-800">
        <div class="px-3 py-3">
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
          <div v-else class="mt-1">
            <NuxtLink
              to="/login"
              @click="$emit('close')"
              class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
            >
              <AppIcon name="user" custom-class="w-3 h-3" />
              <span>Masuk</span>
            </NuxtLink>
          </div>
        </div>

        <div class="px-3 py-2.5 flex items-center justify-between border-t border-slate-800">
          <ThemeToggle theme="dark" />
          <div v-if="authStore.isAuthenticated" class="flex items-center gap-1">
            <button
              @click="handleLogout"
              class="px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <AppIcon name="logout" custom-class="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import AppNavList from '~/components/AppNavList.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const authStore = useAuthStore()

const userInitials = computed(() => {
  const name = authStore.user?.full_name || 'Petugas WMS'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})

function handleLogout() {
  authStore.logout()
  emit('close')
  navigateTo('/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
