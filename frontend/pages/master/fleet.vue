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
          <AppIcon name="truck" custom-class="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Master Armada (Kendaraan Pool)</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Armada milik sendiri yang lewat gate pass dengan odometer &amp; BBM.
          Truk vendor <span class="font-semibold">tidak</span> diperlakukan di sini — cukup dicatat petugas gerbang saat keluar-masuk.
        </p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openForm()"
        class="self-start md:self-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition flex items-center space-x-1.5"
      >
        <AppIcon name="plus" custom-class="w-4 h-4" />
        <span>Registrasi Kendaraan</span>
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div v-if="masterStore.isLoading && !masterStore.vehicles.length" class="p-8 text-center text-xs text-slate-400">Memuat data…</div>
      <div v-else-if="!masterStore.vehicles.length" class="p-8 text-center text-xs text-slate-400">Belum ada kendaraan pool terdaftar di master armada.</div>
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
          <tr>
            <th class="px-4 py-3 font-semibold">Nopol / Tipe</th>
            <th class="px-4 py-3 font-semibold">Driver Tetap</th>
            <th class="px-4 py-3 font-semibold">Gudang</th>
            <th class="px-4 py-3 font-semibold">Dokumen</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="v in masterStore.vehicles" :key="v.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
            <td class="px-4 py-3">
              <div class="font-mono font-bold text-slate-900 dark:text-white">{{ v.plate_number }}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{{ v.vehicle_type_name || '—' }}<span v-if="v.brand"> • {{ v.brand }} {{ v.model || '' }} {{ v.year_made || '' }}</span></div>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ v.driver_name || '—' }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ v.assigned_warehouse_name || 'Semua' }}</td>
            <td class="px-4 py-3">
              <div class="space-x-1.5">
                <span v-if="v.kir_expiry_date" :class="docClass(v.kir_expiry_date)" class="text-[10px] font-bold px-1.5 py-0.5 rounded">KIR {{ shortDate(v.kir_expiry_date) }}</span>
                <span v-else class="text-[10px] text-slate-400">KIR —</span>
                <span v-if="v.stnk_expiry_date" :class="docClass(v.stnk_expiry_date)" class="text-[10px] font-bold px-1.5 py-0.5 rounded">STNK {{ shortDate(v.stnk_expiry_date) }}</span>
                <span v-else class="text-[10px] text-slate-400">STNK —</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(v)" class="text-[10px] font-bold px-1.5 py-0.5 rounded">{{ statusLabel(v) }}</span>
            </td>
            <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
              <button v-if="canManage" type="button" @click="openForm(v)" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ubah</button>
              <button
                v-if="canManage && v.is_active !== false && v.status !== 'IN_USE'"
                type="button"
                @click="deactivate(v)"
                class="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >Nonaktifkan</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/50" @click="showForm = false"></div>
      <form @submit.prevent="submit" class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ editing ? `Ubah ${editing.plate_number}` : 'Registrasi Kendaraan Pool' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nomor Polisi *</span>
            <input v-model="form.plate_number" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs uppercase" placeholder="B 1234 WMS" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe Kendaraan *</span>
            <select v-model="form.vehicle_type_id" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="" disabled>Pilih tipe</option>
              <option v-for="t in masterStore.vehicleTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Merek</span>
            <input v-model="form.brand" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Hino" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Model</span>
            <input v-model="form.model" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Dutro 130" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tahun</span>
            <input v-model.number="form.year_made" type="number" min="1980" max="2100" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Status Operasional</span>
            <select v-model="form.status" :disabled="!editing" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs disabled:opacity-60">
              <option value="AVAILABLE">Tersedia</option>
              <option v-if="editing" value="IN_USE">Sedang Dipakai</option>
              <option v-if="editing" value="MAINTENANCE">Perawatan</option>
              <option v-if="editing" value="RETIRED">Dipensiunkan</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Pengemudi Tetap</span>
            <select v-model="form.current_driver_id" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="">— Belum ditentukan —</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.full_name }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Tugas</span>
            <select v-model="form.assigned_warehouse_id" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="">— Semua Gudang —</option>
              <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">KIR Berlaku s.d.</span>
            <input v-model="form.kir_expiry_date" type="date" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">STNK Berlaku s.d.</span>
            <input v-model="form.stnk_expiry_date" type="date" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Odometer Terakhir (km)</span>
            <input v-model.number="form.last_odometer_km" type="number" min="0" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">ID GPS Tracking</span>
            <input v-model="form.gps_tracking_id" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
        </div>
        <p v-if="editing && editing.status === 'IN_USE'" class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5">
          Kendaraan sedang di perjalanan — perubahan tersimpan, tetapi penonaktifan akan ditolak sampai exit log ditutup.
        </p>
        <div class="flex justify-end space-x-2 pt-1">
          <button type="button" @click="showForm = false" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="submit" :disabled="masterStore.isLoading" class="text-xs font-semibold px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition">
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
const drivers = ref([]);

const emptyForm = () => ({
  plate_number: '', vehicle_type_id: '', brand: '', model: '', year_made: null,
  current_driver_id: '', assigned_warehouse_id: '', kir_expiry_date: '', stnk_expiry_date: '',
  last_odometer_km: 0, gps_tracking_id: '', status: 'AVAILABLE'
});
const form = ref(emptyForm());

function statusLabel(v) {
  const map = { AVAILABLE: 'Tersedia', IN_USE: 'Di Perjalanan', MAINTENANCE: 'Perawatan', RETIRED: 'Dipensiunkan' };
  if (v.is_active === false) return 'Nonaktif';
  return map[v.status] || v.status;
}
function statusClass(v) {
  if (v.is_active === false) return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  const map = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    IN_USE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    RETIRED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  };
  return map[v.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}
function docClass(dateStr) {
  const days = Math.floor((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  if (days < 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
}
function shortDate(d) {
  return d ? String(d).slice(2).replaceAll('-', '/') : '—'; // YY/MM/DD
}

function openForm(v = null) {
  editing.value = v;
  form.value = v
    ? {
        plate_number: v.plate_number, vehicle_type_id: v.vehicle_type_id, brand: v.brand || '',
        model: v.model || '', year_made: v.year_made || null, current_driver_id: v.current_driver_id || '',
        assigned_warehouse_id: v.assigned_warehouse_id || '', kir_expiry_date: v.kir_expiry_date || '',
        stnk_expiry_date: v.stnk_expiry_date || '', last_odometer_km: v.last_odometer_km ?? 0,
        gps_tracking_id: v.gps_tracking_id || '', status: v.status || 'AVAILABLE'
      }
    : emptyForm();
  showForm.value = true;
}

async function submit() {
  const payload = { ...form.value };
  for (const k of ['current_driver_id', 'assigned_warehouse_id', 'kir_expiry_date', 'stnk_expiry_date', 'gps_tracking_id']) {
    if (payload[k] === '') payload[k] = null;
  }
  let ok;
  if (editing.value) {
    if (payload.status === 'AVAILABLE' && editing.value.status === 'AVAILABLE') delete payload.status;
    ok = await masterStore.updateVehicle(editing.value.id, payload);
  } else {
    delete payload.status;
    ok = await masterStore.createVehicle(payload);
  }
  if (ok) showForm.value = false;
}

async function deactivate(v) {
  if (!confirm(`Nonaktifkan kendaraan ${v.plate_number}? Tidak akan muncul di pilihan gate pass.`)) return;
  await masterStore.updateVehicle(v.id, { is_active: false });
}

onMounted(async () => {
  masterStore.fetchVehicles();
  masterStore.fetchWarehouses();
  masterStore.fetchVehicleTypes();
  try {
    const { useWmsApi } = await import('~/composables/useWmsApi');
    const res = await useWmsApi().apiFetch('/auth/users?role=DRIVER');
    drivers.value = res.data || [];
  } catch (e) { /* dropdown tetap kosong */ }
});
</script>
