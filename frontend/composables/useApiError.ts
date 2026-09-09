/**
 * Peta error API → pesan manusia (tanpa JSON/stack mentah ke petugas).
 * Pemakaian:
 *   const { message, code } = describeApiError(err)
 *   uiStore.error(message)
 */

interface ApiErrorLike {
  statusCode?: number
  status?: number
  response?: { status?: number; _data?: { message?: string; code?: string } }
  data?: { message?: string; code?: string }
  message?: string
}

export function describeApiError(err: ApiErrorLike): { message: string; code: number; serverCode?: string } {
  const status =
    err.statusCode ||
    err.status ||
    err.response?.status ||
    err.data?.statusCode ||
    0

  const serverMessage = err.response?._data?.message || err.data?.message
  const serverCode = err.response?._data?.code || err.data?.code

  // Pesan bisnis dari server (mis. "Waybill sudah diterbitkan...") layak ditampilkan apa adanya —
  // itu dibuat humanis di backend. Error infrastruktur/HTTP yang diganti kalimat manusia.
  if (status >= 400 && status < 500 && serverMessage) {
    return { message: serverMessage, code: status, serverCode }
  }

  switch (status) {
    case 401:
      return { message: 'Sesi lo sudah habis. Silakan masuk lagi untuk lanjut bekerja.', code: 401 }
    case 403:
      return { message: 'Akun lo belum punya akses untuk tindakan ini. Hubungi admin gudang.', code: 403 }
    case 404:
      return { message: 'Data tidak ditemukan. Mungkin sudah dihapus atau nomornya salah ketik.', code: 404 }
    case 409:
      return { message: serverMessage || 'Data ini sudah diubah petugas lain. Muat ulang halaman dulu.', code: 409 }
    case 422:
      return { message: serverMessage || 'Ada isian yang belum lengkap atau tidak valid. Periksa form lagi.', code: 422 }
    case 500:
    case 502:
    case 503:
      return { message: 'Server lagi bermasalah. Coba beberapa saat lagi — kalau berulang, lapor ke admin IT.', code: status }
    default:
      if (!status || status === 0) {
        return { message: 'Koneksi ke server terputus. Periksa jaringan, lalu coba lagi.', code: 0 }
      }
      return { message: serverMessage || 'Terjadi kesalahan tak terduga. Coba lagi.', code: status, serverCode }
  }
}

export function useApiError() {
  return { describeApiError }
}
