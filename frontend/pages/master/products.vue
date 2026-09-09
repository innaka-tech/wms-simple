<template>
  <div class="space-y-5">
    <!-- Feedback -->
    <div v-if="masterStore.errorMessage" class="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-600 dark:text-rose-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="alert" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ masterStore.errorMessage }}</span>
      </div>
      <button type="button" @click="masterStore.errorMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>
    <div v-if="masterStore.successMessage" class="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex justify-between items-center shadow-2xs">
      <div class="flex items-center space-x-2">
        <AppIcon name="check" custom-class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ masterStore.successMessage }}</span>
      </div>
      <button type="button" @click="masterStore.successMessage = ''" class="font-bold ml-2 hover:opacity-80">✕</button>
    </div>

    <!-- Header -->
    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <p class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Master Data</p>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AppIcon name="box" custom-class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Master Barang (SKU)</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daftar barang yang dilacak lintas gudang — kargo, kemasan, satuan, dan stok minimum.</p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openForm()"
        class="self-start md:self-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition flex items-center space-x-1.5"
      >
        <AppIcon name="plus" custom-class="w-4 h-4" />
        <span>Barang Baru</span>
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div v-if="masterStore.isLoading && !masterStore.products.length" class="p-8 text-center text-xs text-slate-400">Memuat data…</div>
      <div v-else-if="!masterStore.products.length" class="p-8 text-center text-xs text-slate-400">Belum ada barang terdaftar.</div>
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
          <tr>
            <th class="px-4 py-3 font-semibold">SKU / Nama</th>
            <th class="px-4 py-3 font-semibold">Jenis Kargo</th>
            <th class="px-4 py-3 font-semibold text-right">Stok Semua Gudang</th>
            <th class="px-4 py-3 font-semibold text-right">Min. Stok</th>
            <th class="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="p in masterStore.products" :key="p.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
            <td class="px-4 py-3">
              <div class="font-mono font-semibold text-slate-900 dark:text-white">{{ p.sku_code }}</div>
              <div class="text-slate-500 dark:text-slate-400 mt-0.5">{{ p.name }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ p.cargo_type_name || '—' }}</td>
            <td class="px-4 py-3 text-right">
              <span class="font-semibold text-slate-900 dark:text-white">{{ formatQty(p.total_on_hand) }}</span>
              <span v-if="Number(p.total_in_transit) > 0" class="ml-1.5 text-[10px] text-cyan-600 dark:text-cyan-400">+{{ formatQty(p.total_in_transit) }} transit</span>
            </td>
            <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{{ formatQty(p.min_stock_qty) }}</td>
            <td class="px-4 py-3 text-right">
              <button v-if="canManage" type="button" @click="openForm(p)" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ubah</button>
              <span v-else class="text-slate-300 dark:text-slate-600">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/50" @click="showForm = false"></div>
      <form @submit.prevent="submit" class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3.5">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ editing ? 'Ubah Barang' : 'Barang Baru' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Kode SKU *</span>
            <input v-model="form.sku_code" required :disabled="editing" class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="KDMP-CHILLER-300L" />
          </label>
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Barang *</span>
            <input v-model="form.name" required class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Showcase Display Chiller 300L" />
          </label>
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Jenis Kargo *</span>
            <select v-model="form.cargo_type_id" required class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="" disabled>Pilih kargo</option>
              <option v-for="t in masterStore.cargoTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Satuan Dasar (UOM) *</span>
            <select v-model="form.default_uom_id" required class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="" disabled>Pilih satuan</option>
              <option v-for="u in masterStore.uoms" :key="u.id" :value="u.id">{{ u.code }} — {{ u.name }}</option>
            </select>
          </label>
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Berat / Unit (kg)</span>
            <input v-model.number="form.weight_kg_per_unit" type="number" step="0.01" min="0" class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block col-span-1">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Volume / Unit (m³)</span>
            <input v-model.number="form.volume_m3_per_unit" type="number" step="0.001" min="0" class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Stok Minimum (peringatan restock)</span>
            <input v-model.number="form.min_stock_qty" type="number" step="1" min="0" class="input mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label v-if="!editing" class="flex items-center space-x-2 col-span-2">
            <input v-model="form.is_debulking_target" type="checkbox" class="rounded border-slate-300 dark:border-slate-700" />
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Barang ini hasil konversi de-bulking (bongkar ulang)</span>
          </label>
        </div>
        <div class="flex justify-end space-x-2 pt-1">
          <button type="button" @click="showForm = false" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="submit" :disabled="masterStore.isLoading" class="text-xs font-semibold px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition">
            {{ masterStore.isLoading ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const masterStore = useMasterStore();
const authStore = useAuthStore();

const canManage = computed(() => ['SUPER_ADMIN', 'ADMIN_ADM', 'WH_MANAGER'].includes(authStore.user?.role));
const showForm = ref(false);
const editing = ref(null);

const emptyForm = () => ({
  sku_code: '', name: '', cargo_type_id: '', default_uom_id: '',
  weight_kg_per_unit: 1, volume_m3_per_unit: 0.001, min_stock_qty: 10, is_debulking_target: false
});
const form = ref(emptyForm());

function openForm(p = null) {
  editing.value = p;
  form.value = p
    ? {
        sku_code: p.sku_code, name: p.name, cargo_type_id: p.cargo_type_id, default_uom_id: p.default_uom_id,
        weight_kg_per_unit: p.weight_kg_per_unit, volume_m3_per_unit: p.volume_m3_per_unit,
        min_stock_qty: p.min_stock_qty, is_debulking_target: p.is_debulking_target
      }
    : emptyForm();
  showForm.value = true;
}

async function submit() {
  const payload = { ...form.value };
  const ok = editing.value
    ? await masterStore.updateProduct(editing.value.id, payload)
    : await masterStore.createProduct(payload);
  if (ok) showForm.value = false;
}

function formatQty(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('id-ID') : '—';
}

onMounted(async () => {
  await Promise.all([masterStore.fetchProducts(), masterStore.fetchReferences()]);
});
</script>
