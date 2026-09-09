<template>
  <div class="rounded-lg border p-5 text-center" :class="tone === 'danger' ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'">
    <AppIcon :name="icon" custom-class="w-6 h-6 mx-auto mb-2" :class="tone === 'danger' ? 'text-rose-500' : 'text-slate-400'" />
    <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ title }}</p>
    <p v-if="detail" class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">{{ detail }}</p>
    <div v-if="$slots.default || retryable" class="mt-3 flex items-center justify-center gap-2">
      <button
        v-if="retryable"
        type="button"
        class="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition"
        @click="$emit('retry')"
      >
        Coba Lagi
      </button>
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  code: { type: Number, default: 0 },
  message: { type: String, default: '' },
  retryable: { type: Boolean, default: false }
})

defineEmits(['retry'])

const tone = computed(() => (props.code === 0 || props.code >= 500 || props.code === 404 ? 'neutral' : 'danger'))

const icon = computed(() => {
  if (props.code === 0) return 'offline'
  if (props.code === 403) return 'lock'
  if (props.code === 404) return 'search'
  if (props.code >= 500) return 'server'
  return 'alert'
})

const title = computed(() => {
  if (props.message) return props.message
  switch (props.code) {
    case 401: return 'Sesi lo sudah habis'
    case 403: return 'Belum punya akses ke halaman ini'
    case 404: return 'Data tidak ditemukan'
    case 0: return 'Koneksi ke server terputus'
    default: return 'Terjadi kesalahan'
  }
})

const detail = computed(() => {
  if (props.code === 401) return 'Masuk lagi dengan akun lo untuk melanjutkan pekerjaan.'
  if (props.code === 403) return 'Akun lo belum diberi izin modul ini. Hubungi admin gudang untuk akses.'
  if (props.code === 404) return 'Mungkin data sudah dihapus atau nomor dokumen salah ketik.'
  if (props.code === 0) return 'Periksa jaringan/Wi-Fi, lalu coba lagi.'
  return ''
})
</script>
