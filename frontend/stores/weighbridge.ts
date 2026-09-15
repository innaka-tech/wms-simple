import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';
import { useAuthStore } from '~/stores/auth';

export interface WeighbridgeTicket {
  id: string;
  ticket_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  vehicle_id?: string | null;
  vehicle_plate?: string | null;
  truck_plate: string;
  driver_name?: string | null;
  reference_type: 'INBOUND_ORDER' | 'OUTBOUND_ORDER' | 'CROSS_DOCK_MANIFEST' | 'VENDOR_TRUCK' | 'GENERAL';
  reference_id: string;
  first_weight_gross_kg: number;
  second_weight_tare_kg?: number | null;
  net_weight_cargo_kg?: number | null;
  weighbridge_operator: string;
  photo_url?: string | null;
  created_at: string;
}

export const useWeighbridgeStore = defineStore('weighbridge', {
  state: () => ({
    tickets: [] as WeighbridgeTicket[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  getters: {
    openTickets: (state) => state.tickets.filter(t => t.second_weight_tare_kg === null || t.second_weight_tare_kg === undefined),
    completedTickets: (state) => state.tickets.filter(t => t.second_weight_tare_kg !== null && t.second_weight_tare_kg !== undefined)
  },

  actions: {
    async fetchTickets(warehouseId?: string, status?: 'OPEN' | 'COMPLETED') {
      this.isLoading = true;
      this.errorMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouse_id', warehouseId);
        if (status) params.append('status', status);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/weighbridge${queryStr}`);
        if (res.success) {
          this.tickets = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal memuat data tiket timbangan';
      } finally {
        this.isLoading = false;
      }
    },

    async createTicket(payload: {
      warehouse_id: string;
      truck_plate: string;
      driver_name?: string;
      vehicle_id?: string;
      reference_type: string;
      reference_id: string;
      first_weight_gross_kg: number;
      second_weight_tare_kg?: number;
      weighbridge_operator: string;
      photo_url?: string;
    }): Promise<WeighbridgeTicket | null> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch('/weighbridge', {
          method: 'POST',
          body: payload
        });
        if (res.success && res.data) {
          this.successMessage = res.message || `Tiket ${res.data.ticket_number} berhasil diterbitkan`;
          await this.fetchTickets(payload.warehouse_id);
          return res.data;
        }
        return null;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menerbitkan tiket timbangan';
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async submitSecondWeight(ticketId: string, payload: {
      second_weight_tare_kg: number;
      weighbridge_operator?: string;
      photo_url?: string;
    }): Promise<WeighbridgeTicket | null> {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/weighbridge/${ticketId}/second-weight`, {
          method: 'PUT',
          body: payload
        });
        if (res.success && res.data) {
          this.successMessage = res.message || 'Timbang kedua berhasil disimpan';
          await this.fetchTickets();
          return res.data;
        }
        return null;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menyimpan timbang kedua';
        return null;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
