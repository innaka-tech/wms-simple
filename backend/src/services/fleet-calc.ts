export interface GatePassDepartureParams {
  vehicle_id: string;
  vehicle_plate?: string;
  vehicle_status?: string;
  driver_name: string;
  odometer_out: number;
  fuel_level_out?: string;
  departure_security_officer: string;
}

export interface GatePassReturnParams {
  odometer_out: number;
  odometer_in: number;
  fuel_level_in?: string;
  return_security_officer: string;
}

export interface FleetReturnCalculationResult {
  distanceTravelledKm: number;
  odometerOut: number;
  odometerIn: number;
  isValid: boolean;
}

/**
 * Validates vehicle departure for Security Gate Pass.
 * Skenario Pengujian: GATE-02 (Pencegahan Double Departure), field validations.
 */
export function validateFleetDeparture(params: GatePassDepartureParams): void {
  if (!params.vehicle_id) {
    throw new Error('ID Kendaraan wajib diisi');
  }
  if (!params.driver_name || params.driver_name.trim().length < 2) {
    throw new Error('Nama pengemudi (driver) wajib diisi');
  }
  if (params.odometer_out === undefined || params.odometer_out === null || isNaN(Number(params.odometer_out)) || Number(params.odometer_out) < 0) {
    throw new Error('Kilometer awal (Odometer Out) wajib diisi angka non-negatif');
  }
  if (!params.departure_security_officer || params.departure_security_officer.trim().length < 2) {
    throw new Error('Nama petugas satpam pemeriksa keluar wajib diisi');
  }
  if (params.vehicle_status === 'IN_USE') {
    throw new Error(`Kendaraan plat ${params.vehicle_plate || params.vehicle_id} sedang berstatus IN_USE (belum tercatat kembali di pos satpam)`);
  }
}

/**
 * Validates and calculates distance for vehicle return at Security Gate Pass.
 * Skenario Pengujian: GATE-01 (Odo In < Odo Out validation), GATE-03 (Kalkulasi Jarak Tempuh Otomatis).
 */
export function calculateFleetReturn(params: GatePassReturnParams): FleetReturnCalculationResult {
  const odoOut = Number(params.odometer_out);
  const odoIn = Number(params.odometer_in);

  if (isNaN(odoIn) || odoIn < 0) {
    throw new Error('Kilometer kembali (Odometer In) wajib diisi angka valid non-negatif');
  }
  if (!params.return_security_officer || params.return_security_officer.trim().length < 2) {
    throw new Error('Nama petugas satpam pemeriksa masuk wajib diisi');
  }
  if (odoIn < odoOut) {
    throw new Error(`Kilometer masuk (${odoIn} KM) tidak boleh lebih kecil dari kilometer keluar (${odoOut} KM)`);
  }

  const distanceTravelledKm = Number((odoIn - odoOut).toFixed(2));

  return {
    distanceTravelledKm,
    odometerOut: odoOut,
    odometerIn: odoIn,
    isValid: true
  };
}
