import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface InboundOrder {
  id: string;
  po_number: string;
  warehouse_name: string;
  customer_name: string;
  status: 'CREATED' | 'RECEIVED' | 'PUTAWAY_COMPLETED';
  truck_plate?: string;
  driver_name?: string;
  items?: any[];
  checkpoints?: any[];
  created_at: string;
}

export const useInboundStore = defineStore('inbound', {
  state: () => ({
    orders: [] as InboundOrder[],
    currentOrder: null as InboundOrder | null,
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchOrders(warehouseId?: string, status?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouse_id', warehouseId);
        if (status) params.append('status', status);

        const res = await apiFetch(`/inbound?${params.toString()}`);
        if (res.success) {
          this.orders = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchOrderDetail(orderId: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/inbound/${orderId}`);
        if (res.success) {
          this.currentOrder = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async receivePhysical(orderId: string, payload: {
      truck_plate: string;
      driver_name: string;
      items: Array<{ id: string; received_qty: number; item_condition?: string }>;
      actor_name: string;
      notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch(`/inbound/${orderId}/receive`, {
          method: 'POST',
          body: payload
        });

        if (res.success) {
          this.successMessage = 'Penerimaan fisik barang berhasil dicatat';
          await this.fetchOrderDetail(orderId);
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal mencatat penerimaan fisik';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    async putaway(orderId: string, payload: {
      items: Array<{ id: string; product_id: string; received_qty: number; cross_dock_qty: number; storage_qty: number; location_id?: string }>;
      actor_name: string;
      notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch(`/inbound/${orderId}/putaway`, {
          method: 'POST',
          body: payload
        });

        if (res.success) {
          this.successMessage = 'Putaway dan penempatan rak berhasil diselesaikan';
          await this.fetchOrderDetail(orderId);
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menyelesaikan putaway';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
