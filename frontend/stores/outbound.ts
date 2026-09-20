import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';
import { useAuthStore } from '~/stores/auth';

export interface OutboundOrder {
  id: string;
  order_number: string;
  warehouse_name: string;
  customer_name: string;
  recipient_name: string;
  destination_address: string;
  status: 'CREATED' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'POD_VERIFIED' | 'CANCELLED';
  billing_ready?: number;
  payment_status?: 'UNPAID' | 'PAID';
  destination_city?: string | null;
  picking_source?: 'STANDARD' | 'CUSTOMER_DOC';
  customer_ref_number?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: 'EXCEL' | 'PDF' | 'IMAGE' | null;
  ocr_raw_text?: string | null;
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

    async createOrder(payload: {
      customer_id: string;
      warehouse_id: string;
      recipient_name: string;
      recipient_phone?: string;
      destination_address: string;
      destination_city?: string;
      items: { product_id: string; ordered_qty: number }[];
      notes?: string;
      picking_source?: 'STANDARD' | 'CUSTOMER_DOC';
      customer_ref_number?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_type?: 'EXCEL' | 'PDF' | 'IMAGE';
      ocr_raw_text?: string;
    }): Promise<OutboundOrder | null> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch('/outbound', {
          method: 'POST',
          body: payload
        });

        if (res.success && res.data) {
          this.successMessage = `Delivery Order ${res.data.order_number} dibuat`;
          await this.fetchOrders();
          return res.data;
        }
        return null;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal membuat Delivery Order';
        return false as any;
      } finally {
        this.isLoading = false;
      }
    },

    async pickOrder(orderId: string, customItems?: any[]): Promise<boolean> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();
      const authStore = useAuthStore();
      try {
        let items = customItems;
        if (!items || items.length === 0) {
          const detailRes = await apiFetch(`/outbound/${orderId}`);
          if (!detailRes.success) throw new Error('Gagal memuat detail order untuk picking');
          items = (detailRes.data.items || []).map((it: any) => ({
            id: it.id,
            picked_qty: it.picked_qty != null && Number(it.picked_qty) > 0 ? Number(it.picked_qty) : Number(it.ordered_qty),
            location_id: it.location_id || null
          }));
        }
        if (!items.length) throw new Error('Order tidak memiliki item untuk dipick');
        const res = await apiFetch(`/outbound/${orderId}/pick`, {
          method: 'POST',
          body: {
            items,
            actor_name: authStore.user?.full_name || 'Petugas Gudang',
            actor_id: authStore.user?.id || null
          }
        });
        if (res.success) {
          this.successMessage = 'Picking selesai — barang diambil dari rak lokasi';
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal proses picking';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    async packOrder(orderId: string, packages?: any[], notes?: string): Promise<boolean> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();
      const authStore = useAuthStore();
      try {
        const body: any = {
          actor_name: authStore.user?.full_name || 'Petugas Gudang',
          actor_id: authStore.user?.id || null,
          notes: notes || undefined
        };
        if (packages && packages.length > 0) {
          body.packages = packages;
        }
        const res = await apiFetch(`/outbound/${orderId}/pack`, {
          method: 'POST',
          body
        });
        if (res.success) {
          this.successMessage = 'Packing selesai — koli fisik terdaftar, siap terbitkan Surat Jalan';
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal proses packing';
        return false;
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
    },

    // ACC / Tolak POD (admin) — gateway ke modul penagihan (billing_ready=true saat diterima)
    async verifyPod(orderId: string, decision: 'ACCEPTED' | 'REJECTED', rejectionReason?: string): Promise<boolean> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/outbound/${orderId}/verify-pod`, {
          method: 'POST',
          body: {
            status: decision,
            rejection_reason: decision === 'REJECTED' ? (rejectionReason || '').trim() || undefined : undefined
          }
        });
        if (res.success) {
          this.successMessage = decision === 'ACCEPTED'
            ? 'POD diterima — order siap ditagih (terbitkan faktur di menu Faktur & Pembayaran)'
            : 'POD ditolak — order dibatalkan, penagihan tidak dapat dilanjutkan';
          await this.fetchOrders();
          await this.fetchOrderDetail(orderId);
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal verifikasi POD';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
