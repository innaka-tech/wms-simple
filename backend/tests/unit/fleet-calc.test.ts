import { describe, it, expect } from 'vitest';
import { validateFleetDeparture, calculateFleetReturn } from '../../src/services/fleet-calc.js';

describe('Fleet Exit & Gate Pass Calculation Unit Tests (Skenario GATE)', () => {
  // Skenario GATE-01: Validasi Odometer Masuk Lebih Kecil dari Keluar
  it('GATE-01: should throw an error when Odometer In is less than Odometer Out', () => {
    const returnParams = {
      odometer_out: 45200,
      odometer_in: 45100,
      fuel_level_in: 'HALF',
      return_security_officer: 'Bripka Joko'
    };

    expect(() => calculateFleetReturn(returnParams)).toThrow(
      'Kilometer masuk (45100 KM) tidak boleh lebih kecil dari kilometer keluar (45200 KM)'
    );
  });

  // Skenario GATE-02: Pencegahan Double Departure
  it('GATE-02: should prevent double departure if vehicle status is already IN_USE', () => {
    const departureParams = {
      vehicle_id: 'veh-fuso-01',
      vehicle_plate: 'B 9123 WMS',
      vehicle_status: 'IN_USE',
      driver_name: 'Pak Bambang',
      odometer_out: 45200,
      fuel_level_out: 'FULL',
      departure_security_officer: 'Sertu Slamet'
    };

    expect(() => validateFleetDeparture(departureParams)).toThrow(
      /sedang berstatus IN_USE/
    );
  });

  // Skenario GATE-03: Kalkulasi Jarak Tempuh Otomatis
  it('GATE-03: should accurately calculate distance travelled automatically', () => {
    const returnParams = {
      odometer_out: 45200.0,
      odometer_in: 45430.5,
      fuel_level_in: 'HALF',
      return_security_officer: 'Bripka Joko'
    };

    const result = calculateFleetReturn(returnParams);

    expect(result.isValid).toBe(true);
    expect(result.odometerOut).toBe(45200.0);
    expect(result.odometerIn).toBe(45430.5);
    expect(result.distanceTravelledKm).toBe(230.5);
  });

  it('should accept exact zero distance if truck just idled at gate', () => {
    const returnParams = {
      odometer_out: 45200.0,
      odometer_in: 45200.0,
      return_security_officer: 'Bripka Joko'
    };

    const result = calculateFleetReturn(returnParams);
    expect(result.distanceTravelledKm).toBe(0);
  });

  it('should validate mandatory fields on departure', () => {
    expect(() => validateFleetDeparture({
      vehicle_id: '',
      driver_name: 'Driver A',
      odometer_out: 1000,
      departure_security_officer: 'Satpam A'
    })).toThrow('ID Kendaraan wajib diisi');

    expect(() => validateFleetDeparture({
      vehicle_id: 'veh-1',
      driver_name: '',
      odometer_out: 1000,
      departure_security_officer: 'Satpam A'
    })).toThrow('Nama pengemudi (driver) wajib diisi');

    expect(() => validateFleetDeparture({
      vehicle_id: 'veh-1',
      driver_name: 'Driver A',
      odometer_out: -10,
      departure_security_officer: 'Satpam A'
    })).toThrow('Kilometer awal (Odometer Out) wajib diisi angka non-negatif');

    expect(() => validateFleetDeparture({
      vehicle_id: 'veh-1',
      driver_name: 'Driver A',
      odometer_out: 1000,
      departure_security_officer: ''
    })).toThrow('Nama petugas satpam pemeriksa keluar wajib diisi');
  });
});
