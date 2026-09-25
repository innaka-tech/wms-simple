<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
    hint?: string
    actionLabel?: string
    actionIcon?: string
  }>(),
  {
    icon: 'inbox',
    title: 'Belum Ada Data',
    description: '',
    hint: '',
    actionLabel: '',
    actionIcon: 'plus'
  }
)

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="py-12 px-4 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
    <div class="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center mb-3.5 shadow-sm">
      <AppIcon :name="icon" custom-class="w-6 h-6 stroke-[1.75]" />
    </div>
    <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
      {{ title }}
    </h3>
    <p v-if="description || hint" class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
      {{ description || hint }}
    </p>

    <div v-if="actionLabel || $slots.default" class="mt-4 flex items-center justify-center gap-2">
      <button
        v-if="actionLabel"
        type="button"
        @click="$emit('action')"
        class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow transition"
      >
        <AppIcon v-if="actionIcon" :name="actionIcon" custom-class="w-3.5 h-3.5" />
        <span>{{ actionLabel }}</span>
      </button>
      <slot />
    </div>
  </div>
</template>
