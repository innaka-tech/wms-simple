import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface DebulkingWorkOrder {
  id: string;
  conversion_number: string;
  warehouse_name: string;
  conversion_type: string;
  total_input_weight_kg: number;
  total_output_weight_kg: number;
  shrinkage_percentage: number;
  allowable_shrinkage_percentage: number;
  supervised_by_name: string;
  status: string;
  created_at: string;
}

export const useDebulkingStore = defineStore('debulking', {
  state: () => ({
    workOrders: [] as DebulkingWorkOrder[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchWorkOrders(warehouseId?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
        const res = await apiFetch(`/debulking${query}`);
        if (res.success) {
          this.workOrders = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async submitWorkOrder(payload: {
      warehouse_id: string;
      conversion_type: string;
      inputs: Array<{ product_id: string; qty_used: number; uom_id: string; weight_kg: number }>;
      outputs: Array<{ product_id: string; qty_produced: number; uom_id: string; weight_kg: number }>;
      allowable_shrinkage_percentage: number;
      actor_name: string;
      notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch('/debulking', {
          method: 'POST',
          body: payload
        });

        if (res.success) {
          this.successMessage = `Work order de-bulking berhasil diselesaikan: ${res.data.conversion_number}`;
          await this.fetchWorkOrders(payload.warehouse_id);
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal memproses de-bulking';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
