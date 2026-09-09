import { defineStore } from 'pinia';

interface MasterItem {
  id: string;
  [key: string]: any;
}

export const useMasterStore = defineStore('master', {
  state: () => ({
    products: [] as MasterItem[],
    warehouses: [] as MasterItem[],
    customers: [] as MasterItem[],
    users: [] as MasterItem[],
    cargoTypes: [] as MasterItem[],
    uoms: [] as MasterItem[],
    packagingTypes: [] as MasterItem[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    _reset() {
      this.errorMessage = '';
      this.successMessage = '';
    },

    _apply(res: any, okMessage: string) {
      if (res.success) {
        this.successMessage = okMessage;
        return true;
      }
      this.errorMessage = res.message || 'Permintaan gagal';
      return false;
    },

    _err(err: any, fallback: string) {
      this.errorMessage = err?.data?.message || err?.message || fallback;
      return false;
    },

    async fetchProducts() {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/products');
        this.products = res.data || [];
      } catch (err: any) { this._err(err, 'Gagal memuat master barang'); }
      finally { this.isLoading = false; }
    },

    async createProduct(payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/products', { method: 'POST', body: payload });
        if (this._apply(res, 'Barang baru tersimpan')) { await this.fetchProducts(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal menyimpan barang'); }
      finally { this.isLoading = false; }
    },

    async updateProduct(id: string, payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/products/${id}`, { method: 'PUT', body: payload });
        if (this._apply(res, 'Barang diperbarui')) { await this.fetchProducts(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal memperbarui barang'); }
      finally { this.isLoading = false; }
    },

    async fetchWarehouses() {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/warehouses');
        this.warehouses = res.data || [];
      } catch (err: any) { this._err(err, 'Gagal memuat master gudang'); }
      finally { this.isLoading = false; }
    },

    async fetchWarehouseDetail(id: string) {
      const res = await useWmsApi().apiFetch(`/warehouses/${id}`);
      return res.data || null;
    },

    async createWarehouse(payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/warehouses', { method: 'POST', body: payload });
        if (this._apply(res, 'Gudang baru tersimpan')) { await this.fetchWarehouses(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal menyimpan gudang'); }
      finally { this.isLoading = false; }
    },

    async updateWarehouse(id: string, payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/warehouses/${id}`, { method: 'PUT', body: payload });
        if (this._apply(res, 'Gudang diperbarui')) { await this.fetchWarehouses(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal memperbarui gudang'); }
      finally { this.isLoading = false; }
    },

    async createLocation(warehouseId: string, payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/warehouses/${warehouseId}/locations`, { method: 'POST', body: payload });
        return this._apply(res, 'Lokasi rak tersimpan');
      } catch (err: any) { return this._err(err, 'Gagal menyimpan lokasi rak'); }
      finally { this.isLoading = false; }
    },

    async fetchCustomers(includeInactive = true) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/master/customers?include_inactive=${includeInactive}`);
        this.customers = res.data || [];
      } catch (err: any) { this._err(err, 'Gagal memuat master customer'); }
      finally { this.isLoading = false; }
    },

    async createCustomer(payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/master/customers', { method: 'POST', body: payload });
        if (this._apply(res, 'Customer baru tersimpan')) { await this.fetchCustomers(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal menyimpan customer'); }
      finally { this.isLoading = false; }
    },

    async updateCustomer(id: string, payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/master/customers/${id}`, { method: 'PUT', body: payload });
        if (this._apply(res, 'Customer diperbarui')) { await this.fetchCustomers(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal memperbarui customer'); }
      finally { this.isLoading = false; }
    },

    async fetchUsers(includeInactive = true) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/auth/users?include_inactive=${includeInactive}`);
        this.users = res.data || [];
      } catch (err: any) { this._err(err, 'Gagal memuat daftar pengguna'); }
      finally { this.isLoading = false; }
    },

    async createUser(payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch('/auth/users', { method: 'POST', body: payload });
        if (this._apply(res, 'Akun pengguna dibuat')) { await this.fetchUsers(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal membuat akun pengguna'); }
      finally { this.isLoading = false; }
    },

    async updateUser(id: string, payload: any) {
      this.isLoading = true; this._reset();
      try {
        const res = await useWmsApi().apiFetch(`/auth/users/${id}`, { method: 'PUT', body: payload });
        if (this._apply(res, 'Akun pengguna diperbarui')) { await this.fetchUsers(); return true; }
        return false;
      } catch (err: any) { return this._err(err, 'Gagal memperbarui akun'); }
      finally { this.isLoading = false; }
    },

    async fetchReferences() {
      try {
        const [cargo, uom, pack] = await Promise.all([
          useWmsApi().apiFetch('/master/cargo-types'),
          useWmsApi().apiFetch('/master/uoms'),
          useWmsApi().apiFetch('/master/packaging-types')
        ]);
        this.cargoTypes = cargo.data || [];
        this.uoms = uom.data?.uoms || [];
        this.packagingTypes = pack.data || [];
      } catch (err: any) { this._err(err, 'Gagal memuat data referensi'); }
    }
  }
});
