import { defineStore } from 'pinia';
import { useWmsApi } from '~/composables/useWmsApi';

export interface Invoice {
  id: string;
  invoice_number: string;
  outbound_order_id: string;
  order_number?: string;
  recipient_name?: string;
  amount: number | null;
  currency: string;
  status: 'ISSUED' | 'PAID' | 'VOID';
  total_paid?: number;
  payment_status?: 'UNPAID' | 'PAID';
  issued_by_name: string;
  issued_at: string;
  notes?: string | null;
}

export const useBillingStore = defineStore('billing', {
  state: () => ({
    invoices: [] as Invoice[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  getters: {
    // Piutang berjalan: faktur ISSUED dikurangi pembayaran masuk
    outstandingTotal: (state) =>
      state.invoices
        .filter((i) => i.status === 'ISSUED')
        .reduce((sum, i) => sum + Number(i.amount || 0) - Number(i.total_paid || 0), 0),
    paidTotal: (state) =>
      state.invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + Number(i.total_paid || 0), 0)
  },

  actions: {
    async fetchInvoices(status?: string) {
      this.isLoading = true;
      const { apiFetch } = useWmsApi();
      try {
        const qs = status ? `?status=${encodeURIComponent(status)}` : '';
        const res = await apiFetch(`/billing/invoices${qs}`);
        if (res.success) {
          this.invoices = res.data;
        }
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async issueInvoice(orderId: string, amount: number | null, actorName: string, notes?: string) {
      this.isLoading = true;
      this.errorMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/billing/${orderId}/invoice`, {
          method: 'POST',
          body: { amount: amount ?? undefined, notes, actor_name: actorName }
        });
        if (res.success) {
          this.successMessage = `Faktur ${res.data.invoice_number} diterbitkan (IDR)`;
          this.fetchInvoices();
          return res.data;
        }
        return null;
      } catch (err: any) {
        this.errorMessage = err.detail || err.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async recordPayment(invoiceId: string, amountPaid: number, method: string, actorName: string) {
      this.isLoading = true;
      this.errorMessage = '';
      const { apiFetch } = useWmsApi();
      try {
        const res = await apiFetch(`/billing/invoices/${invoiceId}/payments`, {
          method: 'POST',
          body: { amount_paid: amountPaid, method, actor_name: actorName }
        });
        if (res.success) {
          this.successMessage = res.data.lunas
            ? `Pembayaran diterima — transaksi LUNAS (total Rp ${Number(res.data.total_paid).toLocaleString('id-ID')})`
            : `Pembayaran parsial Rp ${Number(amountPaid).toLocaleString('id-ID')} dicatat`;
          this.fetchInvoices();
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
