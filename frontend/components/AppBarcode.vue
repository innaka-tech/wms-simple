<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import JsBarcode from 'jsbarcode'

const props = withDefaults(
  defineProps<{
    value: string | number
    format?: string
    width?: number
    height?: number
    displayValue?: boolean
    text?: string
    fontSize?: number
    font?: string
    fontOptions?: string
    textAlign?: string
    textPosition?: string
    textMargin?: number
    lineColor?: string
    background?: string
    margin?: number
    marginTop?: number
    marginBottom?: number
    marginLeft?: number
    marginRight?: number
    customClass?: string
  }>(),
  {
    value: '',
    format: 'CODE128',
    width: 1.5,
    height: 38,
    displayValue: false,
    text: '',
    fontSize: 11,
    font: 'monospace',
    fontOptions: 'bold',
    textAlign: 'center',
    textPosition: 'bottom',
    textMargin: 3,
    lineColor: '#000000',
    background: 'transparent',
    margin: 2,
    customClass: ''
  }
)

const svgRef = ref<SVGSVGElement | null>(null)
const renderError = ref(false)

const renderBarcode = () => {
  if (!svgRef.value) return
  const strVal = String(props.value || '').trim()
  if (!strVal) {
    renderError.value = true
    return
  }

  try {
    renderError.value = false
    JsBarcode(svgRef.value, strVal, {
      format: props.format,
      width: props.width,
      height: props.height,
      displayValue: props.displayValue,
      text: props.text || undefined,
      font: props.font,
      fontOptions: props.fontOptions,
      textAlign: props.textAlign,
      textPosition: props.textPosition,
      textMargin: props.textMargin,
      fontSize: props.fontSize,
      background: props.background,
      lineColor: props.lineColor,
      margin: props.margin,
      marginTop: props.marginTop,
      marginBottom: props.marginBottom,
      marginLeft: props.marginLeft,
      marginRight: props.marginRight,
      valid: (valid) => {
        if (!valid) renderError.value = true
      }
    })
  } catch (err) {
    console.warn('[AppBarcode] Render error:', err)
    renderError.value = true
  }
}

onMounted(() => {
  nextTick(renderBarcode)
})

watch(
  () => [props.value, props.width, props.height, props.displayValue, props.format, props.lineColor],
  () => {
    nextTick(renderBarcode)
  }
)
</script>

<template>
  <div class="inline-flex flex-col items-center justify-center max-w-full">
    <svg
      v-show="!renderError"
      ref="svgRef"
      :class="['barcode-svg max-w-full h-auto block', customClass]"
    ></svg>
    <div
      v-if="renderError"
      class="text-[10px] font-mono font-bold text-red-600 border border-red-300 px-2 py-1 rounded bg-red-50"
    >
      [Barcode: {{ value }}]
    </div>
  </div>
</template>

<style scoped>
.barcode-svg {
  shape-rendering: crispEdges;
}
</style>
