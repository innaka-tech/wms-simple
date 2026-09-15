import { ref, readonly } from 'vue'

/**
 * useCompanyConfig — Composable for company profile configuration.
 * Stored in localStorage so it persists across sessions.
 * Used by waybill print templates to avoid hardcoded company info.
 */

const STORAGE_KEY = 'wms_company_config'

export interface CompanyConfig {
  name: string
  address: string
  phone: string
  fax: string
  npwp: string
  permit: string
  hub_name: string
  logo_url: string
  logo_initials: string
  tagline: string
}

const DEFAULT_CONFIG: CompanyConfig = {
  name: 'PT. WMS SIMPLE ENTERPRISE',
  address: 'Alamat Perusahaan Belum Diatur',
  phone: '(021) 0000-0000',
  fax: '-',
  npwp: '00.000.000.0-000.000',
  permit: '-',
  hub_name: 'Warehouse Hub',
  logo_url: '',
  logo_initials: 'WS',
  tagline: 'Sistem Pergudangan & Distribusi Terpadu'
}

function loadConfig(): CompanyConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch (e) {
    console.warn('[useCompanyConfig] Failed to load config from localStorage:', e)
  }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(config: CompanyConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('[useCompanyConfig] Failed to save config:', e)
  }
}

const config = ref<CompanyConfig>(loadConfig())

export function useCompanyConfig() {
  function update(partial: Partial<CompanyConfig>) {
    config.value = { ...config.value, ...partial }
    saveConfig(config.value)
  }

  function reset() {
    config.value = { ...DEFAULT_CONFIG }
    saveConfig(config.value)
  }

  return {
    config: readonly(config),
    update,
    reset
  }
}
