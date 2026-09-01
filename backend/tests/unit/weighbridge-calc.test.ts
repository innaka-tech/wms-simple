import { describe, it, expect } from 'vitest';
import { calculateWeighbridgeNetWeight } from '../../src/services/weighbridge-calc.js';

describe('Weighbridge Cargo Weight Calculation Unit Tests', () => {
  it('should calculate net cargo weight correctly (Gross - Tare)', () => {
    const params = {
      grossWeightKg: 14500, // Truk + Muatan Curah
      tareWeightKg: 4500,   // Truk Kosong
      weighbridgeOperator: 'Pak Hendra (Operator Timbangan)',
      truckPlate: 'B 9876 XYZ'
    };

    const result = calculateWeighbridgeNetWeight(params);

    expect(result.grossWeightKg).toBe(14500);
    expect(result.tareWeightKg).toBe(4500);
    expect(result.netWeightKg).toBe(10000);
    expect(result.isOverloaded).toBe(false);
    expect(result.overloadExcessKg).toBe(0);
  });

  it('should flag overload when net weight exceeds vehicle payload capacity', () => {
    const params = {
      grossWeightKg: 16000,
      tareWeightKg: 4500, // Net = 11,500 kg
      maxVehicleCapacityKg: 10000, // Max Payload = 10 Ton
      weighbridgeOperator: 'Pak Hendra',
      truckPlate: 'B 9876 XYZ'
    };

    const result = calculateWeighbridgeNetWeight(params);

    expect(result.netWeightKg).toBe(11500);
    expect(result.isOverloaded).toBe(true);
    expect(result.overloadExcessKg).toBe(1500);
  });

  it('should throw an error if Tare weight is greater than Gross weight', () => {
    const params = {
      grossWeightKg: 4000,
      tareWeightKg: 4500,
      weighbridgeOperator: 'Pak Hendra',
      truckPlate: 'B 9876 XYZ'
    };

    expect(() => calculateWeighbridgeNetWeight(params)).toThrow(
      /tidak boleh lebih besar dari berat kotor/
    );
  });

  it('should throw an error on missing required fields or invalid numbers', () => {
    expect(() => calculateWeighbridgeNetWeight({
      grossWeightKg: 10000,
      weighbridgeOperator: 'Pak Hendra',
      truckPlate: ''
    })).toThrow('Nomor plat truk wajib diisi');

    expect(() => calculateWeighbridgeNetWeight({
      grossWeightKg: -100,
      weighbridgeOperator: 'Pak Hendra',
      truckPlate: 'B 1234 CD'
    })).toThrow('Berat kotor (Gross Weight) harus berupa angka positif');

    expect(() => calculateWeighbridgeNetWeight({
      grossWeightKg: 10000,
      weighbridgeOperator: '',
      truckPlate: 'B 1234 CD'
    })).toThrow('Nama operator timbangan jembatan timbang wajib diisi');
  });
});
