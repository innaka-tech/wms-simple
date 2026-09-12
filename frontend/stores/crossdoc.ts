import { defineStore } from 'pinia'
import { useWmsApi } from '~/composables/useWmsApi'

export interface CrossDoc {
  id: string
  cross_doc_number: string
  warehouse_id: string
  warehouse_name: string
  customer_id: string
  customer_name: string
  cross_doc_type: string
  reason: string
  source_document_type_name?: string
  source_document_number: string
  source_sender_name?: string
  target_document_type_name?: string
  target_document_number: string
  target_recipient_name?: string
  target_destination_address?: string
  status: string
  issued_by_name: string
  notes?: string | null
  created_at: string
}

export const useCrossDocStore = defineStore('crossdoc', {
  state: () => ({
    docs: [] as CrossDoc[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchDocs() {
      this.isLoading = true
      this.errorMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch('/crossdoc')
        if (res.success) this.docs = res.data || []
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal memuat dokumen cross-doc'
      } finally {
        this.isLoading = false
      }
    },

    async issueDoc(payload: {
      warehouse_id: string
      customer_id: string
      cross_doc_type?: string
      reason?: string
      source_document_type_id?: string
      source_document_number: string
      source_sender_name?: string
      target_document_type_id?: string
      target_document_number: string
      target_recipient_name?: string
      target_destination_address?: string
      items: { product_id: string; original_qty: number; reissued_qty: number; remarks?: string }[]
      notes?: string
      actor_name: string
    }): Promise<CrossDoc | null> {
      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch('/crossdoc', { method: 'POST', body: payload })
        if (res.success && res.data) {
          this.successMessage = `Cross-Doc ${res.data.cross_doc_number} diterbitkan`
          await this.fetchDocs()
          return res.data
        }
        return null
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal menerbitkan cross-document'
        return null
      } finally {
        this.isLoading = false
      }
    }
  }
})
