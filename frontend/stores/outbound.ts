import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface OutboundOrder {
  id: string;
  order_number: string;
  warehouse_name: string;
  customer_name: string;
  recipient_name: string;
  destination_address: string;
  status: 'CREATED' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'POD_VERIFIED' | 'CANCELLED';
  items?: any[];
  packages?: any[];
  pod?: any;
  checkpoints?: any[];
  created_at: string;
}

export const useOutboundStore = defineStore('outbound', {
  state: () => ({
    orders: [] as OutboundOrder[],
    currentOrder: null as OutboundOrder | null,
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchOrders(warehouseId?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
        const res = await apiFetch(`/outbound${query}`);
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
        const res = await apiFetch(`/outbound/${orderId}`);
        if (res.success) {
          this.currentOrder = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async submitPOD(orderId: string, payload: {
      recipient_name: string;
      pod_photo_url: string;
      signature_photo_url: string;
      delivered_qty: number;
      actor_name: string;
      notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch(`/outbound/${orderId}/pod`, {
          method: 'POST',
          body: payload
        });

        if (res.success) {
          this.successMessage = 'Tanda terima POD dan tanda tangan digital berhasil disimpan';
          await this.fetchOrderDetail(orderId);
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menyimpan POD';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
