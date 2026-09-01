import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface StockLevel {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_type: string;
  product_id: string;
  sku_code: string;
  product_name: string;
  unit: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_in_transit: number;
  min_stock_qty: number;
  is_low_stock: boolean;
}

export interface StockMovement {
  id: string;
  warehouse_name: string;
  sku_code: string;
  product_name: string;
  movement_type: string;
  qty_change: number;
  qty_before: number;
  qty_after: number;
  performed_by_name: string;
  notes?: string;
  created_at: string;
}

export const useStockStore = defineStore('stock', {
  state: () => ({
    stockLevels: [] as StockLevel[],
    movements: [] as StockMovement[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchStockLevels(warehouseId?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
        const res = await apiFetch(`/stock/levels${query}`);
        if (res.success) {
          this.stockLevels = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchMovements(warehouseId?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
        const res = await apiFetch(`/stock/movements${query}`);
        if (res.success) {
          this.movements = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async adjustStock(payload: {
      warehouse_id: string;
      product_id: string;
      qty_change: number;
      notes: string;
      actor_name: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch('/stock/adjust', {
          method: 'POST',
          body: payload
        });

        if (res.success) {
          this.successMessage = 'Penyesuaian stok opname berhasil disimpan';
          await this.fetchStockLevels(payload.warehouse_id);
          await this.fetchMovements(payload.warehouse_id);
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menyesuaikan stok';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
