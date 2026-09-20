<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            <AppIcon name="file-text" custom-class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Permintaan Kirim Dokumen Customer (OCR &amp; Parser)</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                Tahap C · Dual Picking
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Ekstraksi otomatis file Excel, PDF, atau Foto Scan SPPB/DO customer tanpa ketik ulang</p>
          </div>
        </div>
        <button type="button" @click="closeModal" class="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <AppIcon name="x" custom-class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        
        <!-- STEP 1: UPLOAD & SETUP (Saat belum ada file yang diparse) -->
        <div v-if="!parsedDoc && !docParser.isProcessing.value" class="space-y-4">
          <!-- Setup Shipper & Gudang -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <label class="space-y-1">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Pilih Shipper / Customer *</span>
              <select v-model="formHeader.customer_id" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option value="" disabled>-- Pilih Customer --</option>
                <option v-for="c in masterStore.customers" :key="c.id" :value="c.id">{{ c.code }} — {{ c.name }}</option>
              </select>
            </label>
            <label class="space-y-1">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">2. Gudang Asal Pengambilan Barang *</span>
              <select v-model="formHeader.warehouse_id" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
              </select>
            </label>
          </div>

          <!-- Dropzone File Upload -->
          <div class="space-y-2">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">3. Lampirkan Dokumen Permintaan Customer</span>
            <div 
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              :class="isDragging ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/30'"
              class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              @click="triggerFileInput"
            >
              <input 
                ref="fileInputRef" 
                type="file" 
                accept=".xlsx,.xls,.csv,.pdf,image/png,image/jpeg,image/webp,image/jpg" 
                class="hidden" 
                @change="handleFileSelect" 
              />

              <div class="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <AppIcon name="file-text" custom-class="w-7 h-7" />
              </div>

              <div class="space-y-1 max-w-md">
                <p class="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Klik untuk Jelajahi Berkas atau Tarik File ke Sini
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Mendukung berkas <span class="font-semibold text-indigo-600 dark:text-indigo-400">Excel (.xlsx, .xls)</span>, dokumen <span class="font-semibold text-indigo-600 dark:text-indigo-400">PDF</span>, dan foto scan fisik <span class="font-semibold text-indigo-600 dark:text-indigo-400">JPG / PNG</span>
                </p>
              </div>

              <!-- Quick formats badge -->
              <div class="flex items-center gap-2 pt-1">
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">EXCEL DIRECT</span>
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">PDF PARSER</span>
                <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">OCR SCAN FOTO</span>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 2: PROCESSING / OCR LOADER -->
        <div v-else-if="docParser.isProcessing.value" class="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div class="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-spin">
            <AppIcon name="refresh-cw" custom-class="w-7 h-7" />
          </div>
          <div class="space-y-1.5 max-w-sm">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white">{{ docParser.progressText.value || 'Sedang memproses dokumen...' }}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">Engine OCR &amp; heuristik membaca entitas nomor PO, nama penerima, dan mencocokkan SKU...</p>
          </div>
          <div class="w-64 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" :style="{ width: `${docParser.progressPercent.value}%` }"></div>
          </div>
          <span class="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{{ docParser.progressPercent.value }}% Selesai</span>
        </div>

        <!-- STEP 3: REVIEW & EDIT (SPLIT SCREEN VALIDASI) -->
        <div v-else-if="parsedDoc" class="space-y-4">
          
          <!-- Banner Status Sukses Ekstraksi -->
          <div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
            <div class="flex items-center gap-2">
              <AppIcon name="check" custom-class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Dokumen <strong>{{ parsedDoc.file_name }}</strong> ({{ parsedDoc.file_type }}) berhasil diekstrak! Tinjau dan edit data di bawah sebelum menerbitkan Picking List.
              </span>
            </div>
            <button type="button" @click="resetUpload" class="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
              Ganti Berkas
            </button>
          </div>

          <!-- Split Screen Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            <!-- Sisi Kiri: Preview Dokumen Asli (4 Kolom) -->
            <div class="lg:col-span-4 p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col space-y-3">
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lampiran Asli Customer</h4>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {{ parsedDoc.file_type }}
                </span>
              </div>

              <!-- Media Preview -->
              <div class="flex-1 min-h-[220px] max-h-[380px] overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center relative group">
                <img 
                  v-if="parsedDoc.file_type === 'IMAGE' || (parsedDoc.file_type === 'PDF' && parsedDoc.file_data_url.startsWith('data:image'))" 
                  :src="parsedDoc.file_data_url" 
                  alt="Dokumen Customer" 
                  class="w-full h-full object-contain" 
                />
                <div v-else-if="parsedDoc.file_type === 'PDF'" class="p-6 text-center space-y-2">
                  <div class="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
                    <AppIcon name="file-text" custom-class="w-6 h-6" />
                  </div>
                  <p class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ parsedDoc.file_name }}</p>
                  <a :href="parsedDoc.file_data_url" target="_blank" class="inline-block px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium">Buka PDF Dokumen</a>
                </div>
                <div v-else class="p-6 text-center space-y-2">
                  <div class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                    <AppIcon name="file-text" custom-class="w-6 h-6" />
                  </div>
                  <p class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ parsedDoc.file_name }}</p>
                  <span class="text-[11px] text-slate-400">File Spreadsheet Excel</span>
                </div>
              </div>

              <!-- Raw Text Snippet Viewer -->
              <div class="space-y-1">
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Teks Mentah Terbaca OCR:</span>
                <div class="p-2 rounded bg-slate-100 dark:bg-slate-900 text-[10px] font-mono text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {{ parsedDoc.raw_text || 'Tidak ada teks tercatat' }}
                </div>
              </div>
            </div>

            <!-- Sisi Kanan: Form Hasil Ekstraksi & Validasi (8 Kolom) -->
            <div class="lg:col-span-8 space-y-3.5">
              
              <!-- Identitas Pengiriman -->
              <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-xs">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Informasi DO &amp; Tujuan Pengiriman
                </h4>
                
                <!-- Pilihan Shipper & Gudang (Editable saat review) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Shipper / Customer *</span>
                    <select 
                      v-model="formHeader.customer_id" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option v-for="c in masterStore.customers" :key="c.id" :value="c.id">{{ c.code }} — {{ c.name }}</option>
                    </select>
                  </label>
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Asal Pengambilan Barang *</span>
                    <select 
                      v-model="formHeader.warehouse_id" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
                    </select>
                  </label>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nomor Referensi Customer (PO / DO) *</span>
                    <input 
                      v-model="parsedDoc.customer_ref_number" 
                      required 
                      type="text" 
                      placeholder="PO/DO-xxxx" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Penerima (Consignee) *</span>
                    <input 
                      v-model="parsedDoc.recipient_name" 
                      required 
                      type="text" 
                      placeholder="Nama toko / penerima" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Telepon Penerima</span>
                    <input 
                      v-model="parsedDoc.recipient_phone" 
                      type="tel" 
                      placeholder="08xx (opsional)" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label class="space-y-1">
                    <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat Lengkap Pengiriman *</span>
                    <input 
                      v-model="parsedDoc.destination_address" 
                      required 
                      type="text" 
                      placeholder="Alamat destinasi pengiriman" 
                      class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <!-- Tabel Validasi Barang (SKU & Qty) -->
              <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-xs">
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rincian Barang yang Harus Dipick
                    </h4>
                    <span class="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {{ parsedDoc.extracted_items.length }} Item
                    </span>
                  </div>
                  <button type="button" @click="addItemRow" class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer">
                    + Tambah Baris
                  </button>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                        <th class="py-2 px-2 font-semibold">Teks Terbaca Dokumen</th>
                        <th class="py-2 px-2 font-semibold">Pilih Master SKU WMS *</th>
                        <th class="py-2 px-2 font-semibold w-24">Qty Pick</th>
                        <th class="py-2 px-2 font-semibold w-28 text-right">Stok Gudang</th>
                        <th class="py-2 px-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr v-for="(it, idx) in parsedDoc.extracted_items" :key="idx" class="hover:bg-slate-50/50 dark:hover:bg-slate-950/50">
                        <!-- Teks Terbaca -->
                        <td class="py-2 px-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" :title="it.raw_line">
                          <div class="flex items-center gap-1.5">
                            <span 
                              class="w-2 h-2 rounded-full shrink-0" 
                              :class="it.match_status === 'EXACT' ? 'bg-emerald-500' : (it.match_status === 'FUZZY' ? 'bg-amber-500' : 'bg-rose-500')"
                              :title="`Status Match: ${it.match_status}`"
                            ></span>
                            <span class="truncate">{{ it.detected_name || it.raw_line }}</span>
                          </div>
                        </td>

                        <!-- Dropdown Master SKU -->
                        <td class="py-2 px-2">
                          <select 
                            v-model="it.matched_product_id" 
                            @change="onProductSelect(it)"
                            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                          >
                            <option value="" disabled>-- Pilih SKU Produk --</option>
                            <option v-for="p in masterStore.products" :key="p.id" :value="p.id">
                              {{ p.sku_code }} — {{ p.name }}
                            </option>
                          </select>
                        </td>

                        <!-- Qty -->
                        <td class="py-2 px-2">
                          <input 
                            v-model.number="it.detected_qty" 
                            type="number" 
                            min="1" 
                            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:outline-none focus:border-indigo-500" 
                          />
                        </td>

                        <!-- Stock on Hand -->
                        <td class="py-2 px-2 text-right">
                          <span 
                            class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                            :class="getStockOnHand(it.matched_product_id) >= (it.detected_qty || 1) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
                          >
                            {{ getStockOnHand(it.matched_product_id) }} Tersedia
                          </span>
                        </td>

                        <!-- Delete -->
                        <td class="py-2 px-1 text-center">
                          <button 
                            v-if="parsedDoc.extracted_items.length > 1" 
                            type="button" 
                            @click="parsedDoc.extracted_items.splice(idx, 1)" 
                            class="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
        <button type="button" @click="closeModal" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer">
          Batal
        </button>

        <div class="flex items-center gap-2.5">
          <button 
            v-if="parsedDoc" 
            type="button" 
            @click="submitCustomerOrder" 
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <AppIcon :name="isSubmitting ? 'refresh-cw' : 'check'" custom-class="w-4 h-4" :class="isSubmitting ? 'animate-spin' : ''" />
            <span>{{ isSubmitting ? 'Menerbitkan Picking List...' : 'Konfirmasi & Terbitkan Picking List' }}</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useMasterStore } from '~/stores/master';
import { useStockStore } from '~/stores/stock';
import { useAuthStore } from '~/stores/auth';
import { useOutboundStore } from '~/stores/outbound';
import { useCustomerDocParser, type ParsedCustomerDoc, type ExtractedItem } from '~/composables/useCustomerDocParser';
import { useBarcodeScanner } from '~/composables/useBarcodeScanner';
import Swal from 'sweetalert2';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'order-created', orderId: string): void;
}>();

const masterStore = useMasterStore();
const stockStore = useStockStore();
const authStore = useAuthStore();
const outboundStore = useOutboundStore();
const docParser = useCustomerDocParser();
const { playAudioFeedback } = useBarcodeScanner();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isSubmitting = ref(false);
const parsedDoc = ref<ParsedCustomerDoc | null>(null);

const formHeader = reactive({
  customer_id: '',
  warehouse_id: ''
});

// Inisialisasi default customer & gudang saat dibuka
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (masterStore.customers.length === 0) await masterStore.fetchCustomers();
    if (masterStore.warehouses.length === 0) await masterStore.fetchWarehouses();
    if (masterStore.products.length === 0) await masterStore.fetchProducts();

    if (!formHeader.customer_id && masterStore.customers.length > 0) {
      formHeader.customer_id = masterStore.customers[0].id;
    }
    if (!formHeader.warehouse_id) {
      formHeader.warehouse_id = authStore.activeWarehouseId || masterStore.warehouses[0]?.id || '';
    }

    await stockStore.fetchStockLevels();
  }
}, { immediate: true });

watch(() => formHeader.warehouse_id, async () => {
  await stockStore.fetchStockLevels();
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function closeModal() {
  emit('update:modelValue', false);
}

function resetUpload() {
  parsedDoc.value = null;
}

function getStockOnHand(productId: string): number {
  if (!productId) return 0;
  const list = stockStore.stockLevels || [];
  if (formHeader.warehouse_id) {
    const matchWh = list.find((s: any) => s.product_id === productId && s.warehouse_id === formHeader.warehouse_id);
    if (matchWh) return Number(matchWh.qty_on_hand);
  }
  const matchAny = list.find((s: any) => s.product_id === productId);
  return matchAny ? Number(matchAny.qty_on_hand) : 0;
}

function onProductSelect(item: ExtractedItem) {
  const prod = masterStore.products.find(p => p.id === item.matched_product_id);
  if (prod) {
    item.matched_sku_code = prod.sku_code;
    item.matched_product_name = prod.name;
    item.unit = prod.unit || 'PCS';
  }
}

function addItemRow() {
  if (!parsedDoc.value) return;
  const firstProd = masterStore.products[0];
  parsedDoc.value.extracted_items.push({
    raw_line: 'Item Tambahan',
    detected_name: firstProd?.name || 'Item Tambahan',
    detected_qty: 1,
    matched_product_id: firstProd?.id || '',
    matched_product_name: firstProd?.name || '',
    matched_sku_code: firstProd?.sku_code || '',
    unit: firstProd?.unit || 'PCS',
    match_status: 'EXACT'
  });
}

async function processFile(file: File) {
  if (!formHeader.customer_id) {
    Swal.fire({
      icon: 'warning',
      title: 'Pilih Customer Terlebih Dahulu',
      text: 'Harap pilih shipper/customer sebelum memproses dokumen.',
      confirmButtonColor: '#4f46e5'
    });
    return;
  }

  try {
    const result = await docParser.parseCustomerFile(file, masterStore.products);
    parsedDoc.value = result;
    playAudioFeedback('SUCCESS');
  } catch (err: any) {
    playAudioFeedback('ERROR');
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memproses Dokumen',
      text: err.message || 'Terjadi kesalahan saat memproses OCR dokumen customer.',
      confirmButtonColor: '#4f46e5'
    });
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    processFile(input.files[0]);
  }
}

function handleFileDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    processFile(event.dataTransfer.files[0]);
  }
}

async function submitCustomerOrder() {
  if (!parsedDoc.value) return;

  if (!parsedDoc.value.recipient_name || !parsedDoc.value.destination_address) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Belum Lengkap',
      text: 'Nama penerima dan alamat pengiriman wajib diisi.',
      confirmButtonColor: '#4f46e5'
    });
    return;
  }

  const validItems = parsedDoc.value.extracted_items
    .filter(it => it.matched_product_id && it.detected_qty > 0)
    .map(it => ({
      product_id: it.matched_product_id!,
      ordered_qty: Number(it.detected_qty)
    }));

  if (validItems.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Barang Belum Valid',
      text: 'Minimal 1 item barang yang valid wajib dipilih dari daftar master produk.',
      confirmButtonColor: '#4f46e5'
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const newOrder = await outboundStore.createOrder({
      customer_id: formHeader.customer_id,
      warehouse_id: formHeader.warehouse_id,
      recipient_name: parsedDoc.value.recipient_name,
      recipient_phone: parsedDoc.value.recipient_phone || undefined,
      destination_address: parsedDoc.value.destination_address,
      destination_city: parsedDoc.value.destination_city || undefined,
      items: validItems,
      notes: `Order via Dokumen Customer (${parsedDoc.value.file_type}: ${parsedDoc.value.file_name}) - Ref: ${parsedDoc.value.customer_ref_number}`,
      picking_source: 'CUSTOMER_DOC',
      customer_ref_number: parsedDoc.value.customer_ref_number,
      attachment_url: parsedDoc.value.file_data_url,
      attachment_name: parsedDoc.value.file_name,
      attachment_type: parsedDoc.value.file_type,
      ocr_raw_text: parsedDoc.value.raw_text,
      actor_name: authStore.user?.full_name || 'Siti Rahmawati (Admin Logistik)',
      actor_id: authStore.user?.id || undefined
    });

    if (newOrder) {
      playAudioFeedback('SUCCESS');
      await Swal.fire({
        icon: 'success',
        title: 'Picking List Berhasil Diterbitkan!',
        html: `Delivery Order <strong>${newOrder.order_number}</strong> telah dibuat dari dokumen <strong>${parsedDoc.value.customer_ref_number}</strong>.<br><br>Staf gudang dapat langsung mengambil barang fisik di rak sesuai instruksi picking.`,
        confirmButtonText: 'Buka Daftar DO & Picking',
        confirmButtonColor: '#4f46e5'
      });
      closeModal();
      emit('order-created', newOrder.id);
    } else {
      playAudioFeedback('ERROR');
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Order',
        text: outboundStore.errorMessage || 'Terjadi kesalahan pada server saat membuat pesanan.',
        confirmButtonColor: '#4f46e5'
      });
    }
  } catch (err: any) {
    playAudioFeedback('ERROR');
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyimpan Order',
      text: err.message || outboundStore.errorMessage || 'Terjadi kesalahan pada server saat membuat pesanan.',
      confirmButtonColor: '#4f46e5'
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>
