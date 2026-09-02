<template>
  <div class="inline-block">
    <button 
      type="button" 
      @click="triggerPrint"
      :disabled="isPrinting"
      class="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
    >
      <AppIcon name="printer" custom-class="w-3.5 h-3.5" />
      <span>{{ isPrinting ? 'Mencetak...' : label }}</span>
    </button>
  </div>
</template>

<script setup>
import { useThermalPrinter } from '~/composables/useThermalPrinter'

const props = defineProps({
  label: {
    type: String,
    default: 'CETAK STRUK THERMAL'
  },
  receiptData: {
    type: Object,
    required: true
  },
  receiptType: {
    type: String,
    default: 'GATE_PASS'
  }
})

const { isPrinting, printGatePassReceipt, printSuratJalanSwap } = useThermalPrinter()

async function triggerPrint() {
  if (props.receiptType === 'GATE_PASS') {
    await printGatePassReceipt(props.receiptData)
    alert('🖨️ Struk Pos Satpam berhasil dikirim ke printer thermal / cetak simulated stream!')
  } else if (props.receiptType === 'SURAT_JALAN_SWAP') {
    await printSuratJalanSwap(props.receiptData)
    alert('🖨️ Surat Jalan Titipan 3PL berhasil dicetak!')
  }
}
</script>
