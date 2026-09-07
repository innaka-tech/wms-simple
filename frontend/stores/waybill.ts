import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface Waybill {
  id: string;
  sj_number: string;
  resi_number: string;
  reference_type: 'OUTBOUND_ORDER' | 'CROSS_DOCK_MANIFEST';
  reference_id: string;
  issued_by_name: string;
  issued_at: string;
  status: 'ISSUED' | 'PRINTED' | 'IN_TRANSIT' | 'POD_VERIFIED' | 'VOID';
  notes?: string | null;
  order_number?: string | null;
  recipient_name?: string | null;
  destination_city?: string | null;
}

export const useWaybillStore = defineStore('waybill', {
  state: () => ({
    waybills: [] as Waybill[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchWaybills(status?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const qs = status ? `?status=${encodeURIComponent(status)}` : '';
        const res = await apiFetch(`/waybills${qs}`);
        if (res.success) {
          this.waybills = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async findByOrder(orderId: string): Promise<Waybill | null> {
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch('/waybills');
        if (res.success) {
          return res.data.find((w: any) => w.reference_id === orderId) || null;
        }
      } catch {
        return null;
      }
      return null;
    },

    async issueWaybill(orderId: string, actorName: string): Promise<Waybill | null> {
      this.isLoading = true;
      this.errorMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/outbound/${orderId}/issue-waybill`, {
          method: 'POST',
          body: { actor_name: actorName }
        });
        if (res.success) {
          this.successMessage = `SJ ${res.data.sj_number} & Resi ${res.data.resi_number} diterbitkan`;
          // refresh cache daftar
          this.fetchWaybills();
          return res.data;
        }
        return null;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
