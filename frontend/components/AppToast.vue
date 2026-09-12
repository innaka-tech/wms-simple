<template>
  <div class="pointer-events-none fixed z-[60] inset-x-3 top-3 flex flex-col items-center gap-2 lg:inset-x-auto lg:top-auto lg:bottom-5 lg:right-5 lg:items-end">
    <TransitionGroup name="toast">
      <div
        v-for="t in uiStore.toasts"
        :key="t.id"
        class="pointer-events-auto w-full max-w-sm flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-lg backdrop-blur"
        :class="styles[t.type]"
      >
        <AppIcon :name="icons[t.type]" custom-class="w-4 h-4 mt-0.5 shrink-0" />
        <p class="text-xs font-medium flex-1 leading-relaxed">{{ t.message }}</p>
        <button
          type="button"
          aria-label="Tutup notifikasi"
          class="shrink-0 opacity-50 hover:opacity-100 transition"
          @click="uiStore.dismissToast(t.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()

const styles = {
  success: 'bg-emerald-600/95 text-white border-emerald-500',
  error: 'bg-rose-600/95 text-white border-rose-500',
  info: 'bg-slate-800/95 text-white border-slate-600'
}

const icons = {
  success: 'check',
  error: 'alert',
  info: 'info'
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
