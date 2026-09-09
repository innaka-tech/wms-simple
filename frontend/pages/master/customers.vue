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
          <AppIcon name="users" custom-class="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>Master Customer &amp; Vendor</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pengirim/penerima barang (PO, order) dan vendor armada pihak ketiga.</p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openForm()"
        class="self-start md:self-auto bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition flex items-center space-x-1.5"
      >
        <AppIcon name="plus" custom-class="w-4 h-4" />
        <span>Customer Baru</span>
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div v-if="masterStore.isLoading && !masterStore.customers.length" class="p-8 text-center text-xs text-slate-400">Memuat data…</div>
      <div v-else-if="!masterStore.customers.length" class="p-8 text-center text-xs text-slate-400">Belum ada customer terdaftar.</div>
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
          <tr>
            <th class="px-4 py-3 font-semibold">Kode / Nama</th>
            <th class="px-4 py-3 font-semibold">Tipe</th>
            <th class="px-4 py-3 font-semibold">Kontak</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="cu in masterStore.customers" :key="cu.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
            <td class="px-4 py-3">
              <div class="font-mono font-semibold text-slate-900 dark:text-white">{{ cu.code }}</div>
              <div class="text-slate-500 dark:text-slate-400 mt-0.5">{{ cu.name }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{{ cu.type }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              <div>{{ cu.contact_name || '—' }}</div>
              <div class="text-[10px] text-slate-400">{{ cu.contact_phone || '' }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="cu.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'" class="font-semibold text-[11px]">
                {{ cu.is_active !== false ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button v-if="canManage" type="button" @click="openForm(cu)" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ubah</button>
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
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ editing ? 'Ubah Customer' : 'Customer Baru' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Kode *</span>
            <input v-model="form.code" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="CUST-KDMP" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipe *</span>
            <select v-model="form.type" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs">
              <option value="INTERNAL">INTERNAL (grup sendiri)</option>
              <option value="PRINCIPAL">PRINCIPAL (prinsipal barang)</option>
              <option value="EXTERNAL">EXTERNAL (pelanggan luar)</option>
              <option value="VENDOR">VENDOR (armada/pihak ketiga)</option>
            </select>
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama *</span>
            <input v-model="form.name" required class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" placeholder="Koperasi Desa Merah Putih (KDMP Sukamaju)" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nama Kontak</span>
            <input v-model="form.contact_name" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Telepon</span>
            <input v-model="form.contact_phone" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Email</span>
            <input v-model="form.contact_email" type="email" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs" />
          </label>
          <label class="block col-span-2">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Alamat</span>
            <textarea v-model="form.address" rows="2" class="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs"></textarea>
          </label>
          <label v-if="editing" class="flex items-center space-x-2 col-span-2">
            <input v-model="form.is_active" type="checkbox" class="rounded border-slate-300 dark:border-slate-700" />
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Aktif (tampil di dropdown operasional)</span>
          </label>
        </div>
        <div class="flex justify-end space-x-2 pt-1">
          <button type="button" @click="showForm = false" class="text-xs font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Batal</button>
          <button type="submit" :disabled="masterStore.isLoading" class="text-xs font-semibold px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white transition">
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

const emptyForm = () => ({
  code: '', name: '', type: 'INTERNAL', contact_name: '', contact_phone: '',
  contact_email: '', address: '', is_active: true
});
const form = ref(emptyForm());

function openForm(cu = null) {
  editing.value = cu;
  form.value = cu
    ? {
        code: cu.code, name: cu.name, type: cu.type || 'INTERNAL',
        contact_name: cu.contact_name || '', contact_phone: cu.contact_phone || '',
        contact_email: cu.contact_email || '', address: cu.address || '',
        is_active: cu.is_active !== false
      }
    : emptyForm();
  showForm.value = true;
}

async function submit() {
  const payload = { ...form.value };
  if (!editing.value) delete payload.is_active;
  const ok = editing.value
    ? await masterStore.updateCustomer(editing.value.id, payload)
    : await masterStore.createCustomer(payload);
  if (ok) showForm.value = false;
}

onMounted(() => {
  masterStore.fetchCustomers();
});
</script>
