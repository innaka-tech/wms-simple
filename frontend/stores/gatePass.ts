import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface Vehicle {
  id: string;
  plate_number: string;
  type: string;
  brand: string;
  model: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  driver_name?: string;
  last_odometer_km?: number;
}

export interface GatePassLog {
  id: string;
  log_number: string;
  vehicle_id: string;
  plate_number: string;
  driver_name: string;
  warehouse_name: string;
  purpose: string;
  odometer_out: number;
  odometer_in?: number;
  fuel_level_out: string;
  fuel_level_in?: string;
  departure_time: string;
  actual_return_time?: string;
  departure_security_officer: string;
  return_security_officer?: string;
  status: 'DEPARTED' | 'RETURNED';
}

export const useGatePassStore = defineStore('gatePass', {
  state: () => ({
    vehicles: [] as Vehicle[],
    logs: [] as GatePassLog[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchVehicles() {
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch('/fleet/vehicles');
        if (res.success) {
          this.vehicles = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      }
    },

    async fetchLogs(status?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const query = status ? `?status=${status}` : '';
        const res = await apiFetch(`/fleet/logs${query}`);
        if (res.success) {
          this.logs = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async submitDeparture(payload: {
      vehicle_id: string;
      driver_name: string;
      warehouse_id: string;
      purpose: string;
      odometer_out: number;
      fuel_level_out: string;
      departure_security_officer: string;
      departure_notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch('/fleet/departure', {
          method: 'POST',
          body: {
            ...payload,
            actor_name: payload.departure_security_officer
          }
        });

        if (res.success) {
          this.successMessage = `Gate Out berhasil: ${res.data.log_number}`;
          await this.fetchLogs();
          await this.fetchVehicles();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal mencatat gate out';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    async submitReturn(logId: string, payload: {
      odometer_in: number;
      fuel_level_in: string;
      return_security_officer: string;
      return_notes?: string;
    }) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const { apiFetch } = useWmsApi();

      try {
        const res = await apiFetch(`/fleet/logs/${logId}/return`, {
          method: 'POST',
          body: {
            ...payload,
            actor_name: payload.return_security_officer
          }
        });

        if (res.success) {
          this.successMessage = `Gate In berhasil: Armada telah kembali`;
          await this.fetchLogs();
          await this.fetchVehicles();
          return true;
        }
        return false;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal mencatat gate in';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
