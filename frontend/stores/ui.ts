import { defineStore } from 'pinia'

export type UiToastType = 'success' | 'error' | 'info'

export interface UiToast {
  id: number
  type: UiToastType
  message: string
}

let toastSeq = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as UiToast[],
    sidebarCollapsed: false
  }),
  actions: {
    notify(type: UiToastType, message: string, timeout = 4000) {
      const id = ++toastSeq
      this.toasts.push({ id, type, message })
      if (this.toasts.length > 4) this.toasts.shift()
      if (timeout > 0) {
        setTimeout(() => this.dismissToast(id), timeout)
        if (import.meta.client) {
          // timeout handled by component; setTimeout is safe on client only
        }
      }
    },
    success(message: string) {
      this.notify('success', message)
    },
    error(message: string) {
      this.notify('error', message, 6000)
    },
    info(message: string) {
      this.notify('info', message)
    },
    dismissToast(id: number) {
      this.toasts = this.toasts.filter(t => t.id !== id)
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    }
  }
})
