<template>
  <div class="flex flex-col space-y-2">
    <div class="relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl overflow-hidden touch-none h-48 flex items-center justify-center transition-colors">
      <canvas 
        ref="canvasRef" 
        class="w-full h-full cursor-crosshair"
      ></canvas>
      <div v-if="isEmpty" class="absolute pointer-events-none text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center">
        <span>✍️ Tanda Tangan Penerima di Sini</span>
        <span class="text-[10px] text-slate-400 dark:text-slate-600">(Gunakan jari di layar sentuh)</span>
      </div>
    </div>
    <div class="flex justify-between items-center">
      <button 
        type="button" 
        @click="clear"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
      >
        🗑️ Hapus Ulang
      </button>
      <span class="text-[10px] text-slate-400 font-mono">Digital Signature Engine</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import SignaturePad from 'signature_pad'
import { useTheme } from '~/composables/useTheme'

const emit = defineEmits(['update:signature'])
const canvasRef = ref(null)
const isEmpty = ref(true)
let pad = null

const { isDarkMode } = useTheme()

function updatePenColor() {
  if (pad) {
    pad.penColor = isDarkMode.value ? '#38bdf8' : '#1e3a8a'
  }
}

watch(isDarkMode, () => {
  updatePenColor()
})

onMounted(() => {
  if (canvasRef.value) {
    const canvas = canvasRef.value
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d').scale(ratio, ratio)

    pad = new SignaturePad(canvas, {
      penColor: isDarkMode.value ? '#38bdf8' : '#1e3a8a',
      backgroundColor: 'rgba(0,0,0,0)'
    })

    pad.addEventListener('endStroke', () => {
      isEmpty.value = pad.isEmpty()
      if (!pad.isEmpty()) {
        emit('update:signature', pad.toDataURL('image/png'))
      }
    })
  }
})

function clear() {
  if (pad) {
    pad.clear()
    isEmpty.value = true
    emit('update:signature', '')
  }
}
</script>
