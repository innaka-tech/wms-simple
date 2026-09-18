<template>
  <div class="inline-flex items-center space-x-2">
    <button 
      type="button" 
      @click="triggerPrint"
      :disabled="isPrinting"
      class="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
    >
      <AppIcon :name="justPrinted ? 'check' : 'printer'" :custom-class="justPrinted ? 'w-3.5 h-3.5 text-emerald-600' : 'w-3.5 h-3.5'" />
      <span>{{ isPrinting ? 'Mencetak...' : (justPrinted ? 'Tercetak ✓' : label) }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const props = defineProps({
  label: {
    type: String,
    default: 'CETAK STRUK THERMAL'
  },
  receiptData: {
    type: Object,
    default: null
  },
  data: {
    type: Object,
    default: null
  },
  receiptType: {
    type: String,
    default: 'AUTO'
  }
})

const emit = defineEmits(['printed'])

const {
  isPrinting,
  printGatePassReceipt,
  printSuratJalanSwap,
  printWaybillReceipt,
  printWeighbridgeReceipt,
  printOpnameWorksheet,
  printTmsTripManifest,
  printGenericReceipt
} = useThermalPrinter()

const justPrinted = ref(false)

const payload = computed(() => props.receiptData || props.data || {})

async function triggerPrint() {
  const d = payload.value
  const t = props.receiptType

  if (t === 'OPNAME' || d.title?.includes('OPNAME') || d.no_order?.startsWith('OPNAME')) {
    await printOpnameWorksheet(d)
  } else if (t === 'TMS_TRIP' || d.title?.includes('TMS') || d.no_order?.startsWith('TRIP')) {
    await printTmsTripManifest(d)
  } else if (t === 'SURAT_JALAN_SWAP') {
    await printSuratJalanSwap(d)
  } else if (t === 'WAYBILL') {
    await printWaybillReceipt(d)
  } else if (t === 'WEIGHBRIDGE') {
    await printWeighbridgeReceipt(d)
  } else if (t === 'GATE_PASS') {
    await printGatePassReceipt(d)
  } else {
    await printGenericReceipt(props.label, d)
  }

  justPrinted.value = true
  emit('printed')
  setTimeout(() => {
    justPrinted.value = false
  }, 2500)
}
</script>
