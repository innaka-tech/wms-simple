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
          <AppIcon name="warehouse" custom-class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Master Gudang &amp; Lokasi Rak</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Jaringan gudang (hub &amp; spoke) beserta zona/rak tempat barang disimpan.</p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openForm()"
        class="self-start md:self-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition flex items-center space-x-1.5"
      >
        <AppIcon name="plus" custom-class="w-4 h-4" />
        <span>Gudang Baru</span>
      </button>
    </div>

    <!-- Cards -->
    <div class="space-y-4">
      <div v-for="w in masterStore.warehouses" :key="w.id" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{{ w.code }}</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ w.name }}</h3>
              <span v-if="w.is_active === false" class="text-[10px] font-semibold text-rose-600 dark:text-rose-400">nonaktif</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{{ w.type || '—' }} • {{ w.city }} • {{ w.address }}</p>
            <div class="flex items-center space-x-3 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span v-if="w.has_weighbridge" class="font-semibold text-emerald-600 dark:text-emerald-400">✓ Jembatan Timbang</span>
              <span v-if="w.has_debulking_facility" class="font-semibold text-amber-600 dark:text-amber-400">✓ Fasilitas De-bulking</span>
              <span v-if="w.contact_name">Kontak: {{ w.contact_name }} {{ w.contact_phone ? `(${w.contact_phone})` : '' }}</span>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            <button type="button" @click="toggleLocations(w.id)" class="text-xs font-semibold px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {{ openLocations === w.id ? 'Tutup Rak' : `Lihat Rak (${w.location_count ?? '…'})` }}
            </button>
            <button v-if="canManage" type="button" @click="openForm(w)" class="text-xs font-semibold px-3 py-2 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">Ubah</button>
          </div>
        </div>

        <!-- Locations -->
        <div v-if="openLocations === w.id" class="p-4 bg-slate-50 dark:bg-slate-950/40">
          <div class="flex items-center justify-between mb-2.5">
            <h4 class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lokasi Penyimpanan</h4>
            <button v-if="canManage" type="button" @click="openLocationForm(w)" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">+ Tambah Rak</button>
          </div>
          <div v-if="!locations[w.id]?.length" class="text-[11px] text-slate-400">Belum ada lokasi terdaftar.</div>
          <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div v-for="loc in locations[w.id]" :key="loc.id" class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
              <div class="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">{{ loc.zone }}/{{ loc.aisle }}/{{ loc.rack }}/{{ loc.bin }}</div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{{ loc.location_type }} • kap {{ loc.max_weight_capacity_kg }} kg</div>
            </div>
          </div>

          <!-- Location form -->
          <form v-if="showLocationForm === w.id" @submit.prevent="submitLocation" class="mt-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <label><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Zona</span>
              <input v-model="locForm.zone" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px]" /></label>
            <label><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Aisle</span>
              <input v-model="locForm.aisle" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px]" /></label>
            <label><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Rak</span>
              <input v-model="locForm.rack" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px]" /></label>
            <label><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Bin</span>
              <input v-model="locForm.bin" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px]" /></label>
            <label><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Tipe</span>
              <select v-model="locForm.location_type" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px]">
                <option>STANDARD_RACK</option><option>FLOOR_STAGING</option><option>BULK_SILO</option><option>CROSS_DOCK_LANE</option><option>COLD_STORAGE</option>
              </select></label>
            <div class="col-span-2 md:col-span-5 flex justify-end space-x-2">
              <button type="button" @click="showLocationForm = null" class="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-500">Batal</button>
              <button type="submit" class="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">Simpan Rak</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Warehouse Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/50" @click="showForm = false"></div>
      <form @submit.prevent="submit" class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3.5">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ editing ? 'Ubah Gudang' : 'Gudang Baru' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Kode *</span>
            <input v-model="form.code" required :disabled="editing" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="WH-CGK-01" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe Gudang *</span>
            <select v-model="form.warehouse_type_id" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="" disabled>Pilih tipe</option>
              <option v-for="t in warehouseTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Gudang *</span>
            <input v-model="form.name" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Gudang Utama Jakarta Hub & Terminal Bulky" />
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat *</span>
            <input v-model="form.address" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Kota *</span>
            <input v-model="form.city" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Kontak</span>
            <input v-model="form.contact_name" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Telepon Kontak</span>
            <input v-model="form.contact_phone" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <div class="flex items-end space-x-4 pb-1">
            <label class="flex items-center space-x-2">
              <input v-model="form.has_weighbridge" type="checkbox" class="rounded border-slate-300 dark:border-slate-700" />
              <span class="text-[11px] text-slate-600 dark:text-slate-300">Jembatan timbang</span>
            </label>
            <label class="flex items-center space-x-2">
              <input v-model="form.has_debulking_facility" type="checkbox" class="rounded border-slate-300 dark:border-slate-700" />
              <span class="text-[11px] text-slate-600 dark:text-slate-300">De-bulking</span>
            </label>
          </div>
        </div>
        <div class="flex justify-end space-x-2 pt-1">
          <button type="button" @click="showForm = false" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="submit" :disabled="masterStore.isLoading" class="text-xs font-semibold px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition">
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

const canManage = computed(() => ['SUPER_ADMIN', 'ADMIN_ADM'].includes(authStore.user?.role));
const showForm = ref(false);
const editing = ref(null);
const warehouseTypes = ref([]);
const openLocations = ref(null);
const locations = ref({});
const showLocationForm = ref(null);
const locForm = ref({ zone: '', aisle: '', rack: '', bin: '', location_type: 'STANDARD_RACK' });

const emptyForm = () => ({
  code: '', name: '', warehouse_type_id: '', address: '', city: '',
  has_weighbridge: false, has_debulking_facility: false, contact_name: '', contact_phone: ''
});
const form = ref(emptyForm());

function openForm(w = null) {
  editing.value = w;
  form.value = w
    ? {
        code: w.code, name: w.name, warehouse_type_id: w.warehouse_type_id, address: w.address, city: w.city,
        has_weighbridge: !!w.has_weighbridge, has_debulking_facility: !!w.has_debulking_facility,
        contact_name: w.contact_name || '', contact_phone: w.contact_phone || ''
      }
    : emptyForm();
  showForm.value = true;
}

async function submit() {
  const ok = editing.value
    ? await masterStore.updateWarehouse(editing.value.id, { ...form.value })
    : await masterStore.createWarehouse({ ...form.value });
  if (ok) showForm.value = false;
}

async function toggleLocations(whId) {
  if (openLocations.value === whId) {
    openLocations.value = null;
    return;
  }
  const detail = await masterStore.fetchWarehouseDetail(whId);
  locations.value[whId] = detail?.locations || [];
  openLocations.value = whId;
}

function openLocationForm(w) {
  locForm.value = { zone: '', aisle: '', rack: '', bin: '', location_type: 'STANDARD_RACK' };
  showLocationForm.value = w.id;
}

async function submitLocation() {
  const whId = showLocationForm.value;
  const ok = await masterStore.createLocation(whId, { ...locForm.value });
  if (ok) {
    showLocationForm.value = null;
    const detail = await masterStore.fetchWarehouseDetail(whId);
    locations.value[whId] = detail?.locations || [];
  }
}

onMounted(async () => {
  masterStore.fetchWarehouses();
  try {
    const { useWmsApi } = await import('~/composables/useWmsApi');
    const res = await useWmsApi().apiFetch('/master/warehouse-types');
    warehouseTypes.value = res.data || [];
  } catch (e) { /* dropdown tetap muncul kosong */ }
});
</script>
