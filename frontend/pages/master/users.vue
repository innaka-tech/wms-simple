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
          <AppIcon name="shield" custom-class="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <span>Pengguna &amp; Hak Akses</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Akun petugas, peran (RBAC), dan gudang tempat tugasnya. Setiap mutasi stok tercatat atas nama akun ini.</p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openForm()"
        class="self-start md:self-auto bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-md transition flex items-center space-x-1.5"
      >
        <AppIcon name="plus" custom-class="w-4 h-4" />
        <span>Akun Baru</span>
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div v-if="masterStore.isLoading && !masterStore.users.length" class="p-8 text-center text-xs text-slate-400">Memuat data…</div>
      <div v-else-if="!masterStore.users.length" class="p-8 text-center text-xs text-slate-400">Belum ada pengguna.</div>
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
          <tr>
            <th class="px-4 py-3 font-semibold">Nama / Username</th>
            <th class="px-4 py-3 font-semibold">Peran</th>
            <th class="px-4 py-3 font-semibold">Gudang</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="u in masterStore.users" :key="u.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
            <td class="px-4 py-3">
              <div class="font-semibold text-slate-900 dark:text-white">{{ u.full_name }}</div>
              <div class="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">@{{ u.username }} • {{ u.email }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" :class="roleBadgeClass(u.role)">{{ roleLabel(u.role) }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ u.warehouse_name || (u.role === 'CUSTOMER' ? '— (customer)' : 'Semua') }}</td>
            <td class="px-4 py-3">
              <span :class="u.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'" class="font-semibold text-[11px]">
                {{ u.is_active !== false ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
              <button v-if="canManage" type="button" @click="openForm(u)" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ubah</button>
              <button
                v-if="canManage && u.id !== authStore.user?.id"
                type="button"
                @click="toggleActive(u)"
                class="font-semibold hover:underline"
                :class="u.is_active !== false ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
              >{{ u.is_active !== false ? 'Nonaktifkan' : 'Aktifkan' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/50" @click="showForm = false"></div>
      <form @submit.prevent="submit" class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3.5">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ editing ? `Ubah Akun @${editing.username}` : 'Akun Baru' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <template v-if="!editing">
            <label class="block">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Username *</span>
              <input v-model="form.username" required pattern="[a-z0-9_.]{3,32}" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="staff_dps" />
            </label>
            <label class="block">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Password Awal * (min 8)</span>
              <input v-model="form.password" required minlength="8" type="password" autocomplete="new-password" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
            </label>
          </template>
          <label class="block" :class="!editing ? 'col-span-2' : ''">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Lengkap *</span>
            <input v-model="form.full_name" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Wayan Saputra (WH Staff DPS)" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Email *</span>
            <input v-model="form.email" required type="email" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Peran (RBAC) *</span>
            <select v-model="form.role" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Gudang Tugas (kosongkan untuk akses semua)</span>
            <select v-model="form.warehouse_id" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="">— Semua Gudang —</option>
              <option v-for="w in masterStore.warehouses" :key="w.id" :value="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </label>
          <label v-if="editing" class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Reset Password (kosongkan bila tidak diubah)</span>
            <input v-model="form.new_password" type="password" autocomplete="new-password" minlength="8" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
        </div>
        <div class="flex justify-end space-x-2 pt-1">
          <button type="button" @click="showForm = false" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="submit" :disabled="masterStore.isLoading" class="text-xs font-semibold px-4 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 text-white dark:text-slate-900 transition">
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

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin (penuh)' },
  { value: 'ADMIN_ADM', label: 'Admin Administrasi' },
  { value: 'WH_MANAGER', label: 'Manajer Gudang' },
  { value: 'WH_STAFF', label: 'Petugas Gudang' },
  { value: 'GATE_OFFICER', label: 'Petugas Gerbang' },
  { value: 'DRIVER', label: 'Pengemudi' },
  { value: 'CUSTOMER', label: 'Customer' }
];

const showForm = ref(false);
const editing = ref(null);

const emptyForm = () => ({
  username: '', password: '', full_name: '', email: '', role: 'WH_STAFF',
  warehouse_id: '', new_password: ''
});
const form = ref(emptyForm());

function roleLabel(r) {
  return ROLES.find(x => x.value === r)?.label || r;
}
function roleBadgeClass(r) {
  const map = {
    SUPER_ADMIN: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    ADMIN_ADM: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    WH_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    WH_STAFF: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    GATE_OFFICER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    DRIVER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    CUSTOMER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
  };
  return map[r] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function openForm(u = null) {
  editing.value = u;
  form.value = u
    ? {
        username: u.username, password: '', full_name: u.full_name, email: u.email,
        role: u.role, warehouse_id: u.warehouse_id || '', new_password: ''
      }
    : emptyForm();
  showForm.value = true;
}

async function submit() {
  let ok;
  if (editing.value) {
    const payload = {
      full_name: form.value.full_name, email: form.value.email, role: form.value.role,
      warehouse_id: form.value.warehouse_id || null
    };
    if (form.value.new_password) payload.new_password = form.value.new_password;
    ok = await masterStore.updateUser(editing.value.id, payload);
  } else {
    ok = await masterStore.createUser({
      username: form.value.username, password: form.value.password,
      full_name: form.value.full_name, email: form.value.email,
      role: form.value.role, warehouse_id: form.value.warehouse_id || null
    });
  }
  if (ok) showForm.value = false;
}

async function toggleActive(u) {
  const target = u.is_active !== false ? false : true;
  if (!target && !confirm(`Nonaktifkan akun @${u.username}? Petugas tidak akan bisa login.`)) return;
  await masterStore.updateUser(u.id, { is_active: target });
}

onMounted(() => {
  masterStore.fetchUsers();
  masterStore.fetchWarehouses();
});
</script>
