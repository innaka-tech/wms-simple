import { defineStore } from 'pinia'
import { useWmsApi } from '~/composables/useWmsApi'

export interface CrossDockItem {
  id: string
  product_id: string
  sku_code?: string
  product_name?: string
  planned_qty: number
  loaded_qty: number
  received_qty: number
}

export interface CrossDockManifest {
  id: string
  manifest_number: string
  source_warehouse_id: string
  source_warehouse_name: string
  destination_warehouse_id: string
  destination_warehouse_name: string
  customer_id: string
  customer_name: string
  vehicle_id?: string | null
  vehicle_plate?: string | null
  driver_name?: string | null
  truck_plate?: string | null
  status: 'CREATED' | 'LOADED' | 'RECEIVED_DEST'
  notes?: string | null
  items?: CrossDockItem[]
  created_at: string
}

export const useCrossDockStore = defineStore('crossdock', {
  state: () => ({
    manifests: [] as CrossDockManifest[],
    isLoading: false,
    errorMessage: '',
    successMessage: ''
  }),

  actions: {
    async fetchManifests() {
      this.isLoading = true
      this.errorMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch('/crossdock')
        if (res.success) this.manifests = res.data || []
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal memuat manifest cross-dock'
      } finally {
        this.isLoading = false
      }
    },

    async fetchManifestDetail(id: string): Promise<CrossDockManifest | null> {
      this.isLoading = true
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch(`/crossdock/${id}`)
        if (res.success) return res.data
        return null
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal memuat detail manifest'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async createManifest(payload: {
      source_warehouse_id: string
      destination_warehouse_id: string
      customer_id: string
      vehicle_id?: string
      driver_name?: string
      truck_plate?: string
      items: { product_id: string; planned_qty: number }[]
      notes?: string
      actor_name: string
    }): Promise<CrossDockManifest | null> {
      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch('/crossdock', { method: 'POST', body: payload })
        if (res.success && res.data) {
          this.successMessage = `Manifest ${res.data.manifest_number} dibuat`
          await this.fetchManifests()
          return res.data
        }
        return null
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal membuat manifest'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async loadManifest(id: string, items: { id: string; loaded_qty: number }[], actorName: string): Promise<boolean> {
      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch(`/crossdock/${id}/load`, {
          method: 'POST',
          body: { items, actor_name: actorName }
        })
        if (res.success) {
          this.successMessage = 'Pemuatan selesai — stok gudang asal dikurangi, barang in-transit'
          await this.fetchManifests()
          return true
        }
        return false
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal proses pemuatan'
        return false
      } finally {
        this.isLoading = false
      }
    },

    async receiveDest(id: string, items: { id: string; received_qty: number }[], actorName: string): Promise<boolean> {
      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''
      const { apiFetch } = useWmsApi()
      try {
        const res = await apiFetch(`/crossdock/${id}/receive-dest`, {
          method: 'POST',
          body: { items, actor_name: actorName }
        })
        if (res.success) {
          this.successMessage = 'Penerimaan di gudang tujuan selesai — stok masuk, transit beres'
          await this.fetchManifests()
          return true
        }
        return false
      } catch (err: any) {
        this.errorMessage = err.detail || err.message || 'Gagal proses penerimaan'
        return false
      } finally {
        this.isLoading = false
      }
    }
  }
})
