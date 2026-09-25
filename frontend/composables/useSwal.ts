import Swal from 'sweetalert2'

/**
 * Composable SweetAlert2 untuk WMS Enterprise.
 * Menggantikan seluruh window.alert() dan window.confirm() dengan dialog
 * yang konsisten, beranimasi, dan selaras dengan design system WMS.
 *
 * Nuxt 3 auto-imports composables — cukup panggil `useSwal()` di komponen.
 */
export const useSwal = () => {
  const swal = Swal.mixin({
    allowOutsideClick: false,
    customClass: {
      popup: 'wms-swal-popup',
      title: 'wms-swal-title',
      htmlContainer: 'wms-swal-html',
      confirmButton: 'wms-swal-confirm',
      cancelButton: 'wms-swal-cancel',
      actions: 'wms-swal-actions'
    },
    buttonsStyling: false,
    showClass: {
      popup: 'animate__animated animate__fadeIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOut animate__faster'
    }
  })

  /**
   * Dialog konfirmasi — pengganti window.confirm()
   * @returns true jika user menekan tombol konfirmasi
   */
  async function confirmAction(
    title: string,
    text: string,
    options?: {
      confirmText?: string
      cancelText?: string
      icon?: 'warning' | 'question' | 'info'
    }
  ): Promise<boolean> {
    const result = await swal.fire({
      title,
      text,
      icon: options?.icon || 'question',
      showCancelButton: true,
      confirmButtonText: options?.confirmText || 'Ya, Lanjutkan',
      cancelButtonText: options?.cancelText || 'Batal',
      reverseButtons: true
    })
    return result.isConfirmed
  }

  /** Notifikasi sukses — pengganti alert() untuk operasi berhasil */
  function showSuccess(title: string, text?: string) {
    return swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'OK',
      timer: 3000,
      timerProgressBar: true
    })
  }

  /** Notifikasi error — pengganti alert() untuk kegagalan */
  function showError(title: string, text?: string) {
    return swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Tutup'
    })
  }

  /** Notifikasi peringatan — pengganti alert() untuk warning */
  function showWarning(title: string, text?: string) {
    return swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'OK'
    })
  }

  /** Notifikasi info — untuk clipboard copy, dsb */
  function showInfo(title: string, text?: string) {
    return swal.fire({
      title,
      text,
      icon: 'info',
      confirmButtonText: 'OK',
      timer: 2500,
      timerProgressBar: true
    })
  }

  return {
    swal,
    confirmAction,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
