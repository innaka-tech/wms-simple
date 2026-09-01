import { describe, it, expect } from 'vitest';
import { calculateDebulkingShrinkage } from '../../src/services/debulking-calc.js';

describe('De-bulking & Shrinkage Calculation Unit Tests (Skenario DEB)', () => {
  // Skenario DEB-01: Kalkulasi Susut Wajar
  it('DEB-01: should calculate normal shrinkage loss correctly within tolerance', () => {
    const inputs = [
      { product_id: 'p-sugar-raw', qty_used: 1, uom_id: 'uom-jumbo', weight_kg: 1000 }
    ];
    const outputs = [
      { product_id: 'p-sugar-retail', qty_produced: 39.8, uom_id: 'uom-sack', weight_kg: 995 }
    ];

    const result = calculateDebulkingShrinkage(inputs, outputs, 1.0);

    expect(result.totalInputWeightKg).toBe(1000);
    expect(result.totalOutputWeightKg).toBe(995);
    expect(result.shrinkageLossKg).toBe(5);
    expect(result.shrinkagePercentage).toBe(0.5);
    expect(result.isExceedingTolerance).toBe(false);
  });

  // Skenario DEB-02: Deteksi Susut Melebihi Batas Toleransi
  it('DEB-02: should detect and flag shrinkage that exceeds allowable tolerance', () => {
    const inputs = [
      { product_id: 'p-sugar-raw', qty_used: 1, uom_id: 'uom-jumbo', weight_kg: 1000 }
    ];
    const outputs = [
      { product_id: 'p-sugar-retail', qty_produced: 39.2, uom_id: 'uom-sack', weight_kg: 980 }
    ];

    const result = calculateDebulkingShrinkage(inputs, outputs, 1.0);

    expect(result.totalInputWeightKg).toBe(1000);
    expect(result.totalOutputWeightKg).toBe(980);
    expect(result.shrinkageLossKg).toBe(20);
    expect(result.shrinkagePercentage).toBe(2.0);
    expect(result.isExceedingTolerance).toBe(true);
    expect(result.tolerancePercentage).toBe(1.0);
  });

  // Skenario DEB-03: Hukum Kekekalan Massa
  it('DEB-03: should satisfy Conservation of Mass: Total Input = Total Output + Shrinkage Loss', () => {
    const inputs = [
      { product_id: 'p-cpo-tank', qty_used: 5, uom_id: 'uom-ton', weight_kg: 5000 },
      { product_id: 'p-cpo-drum', qty_used: 2, uom_id: 'uom-drum', weight_kg: 400 }
    ];
    const outputs = [
      { product_id: 'p-cpo-retail', qty_produced: 535, uom_id: 'uom-bottle', weight_kg: 5350 }
    ];

    const result = calculateDebulkingShrinkage(inputs, outputs, 1.5);

    const calculatedMass = Number((result.totalOutputWeightKg + result.shrinkageLossKg).toFixed(2));
    expect(calculatedMass).toBe(result.totalInputWeightKg);
    expect(result.shrinkageLossKg).toBe(50);
    expect(result.shrinkagePercentage).toBe(0.93);
    expect(result.isExceedingTolerance).toBe(false);
  });

  // Edge cases & Validations
  it('should throw an error if output weight exceeds input weight (Physics violation)', () => {
    const inputs = [
      { product_id: 'p-grain', qty_used: 1, uom_id: 'uom-jumbo', weight_kg: 500 }
    ];
    const outputs = [
      { product_id: 'p-grain-packed', qty_produced: 11, uom_id: 'uom-sack', weight_kg: 550 }
    ];

    expect(() => calculateDebulkingShrinkage(inputs, outputs, 1.0)).toThrow(
      /Pelanggaran hukum kekekalan massa/
    );
  });

  it('should throw an error if inputs or outputs array is empty', () => {
    expect(() => calculateDebulkingShrinkage([], [{ product_id: 'p1', qty_produced: 1, uom_id: 'u1', weight_kg: 100 }]))
      .toThrow('Input barang bulky tidak boleh kosong');

    expect(() => calculateDebulkingShrinkage([{ product_id: 'p1', qty_used: 1, uom_id: 'u1', weight_kg: 100 }], []))
      .toThrow('Output barang curah/hasil konversi tidak boleh kosong');
  });

  it('should throw an error on invalid or negative weight inputs', () => {
    expect(() => calculateDebulkingShrinkage(
      [{ product_id: 'p1', qty_used: 1, uom_id: 'u1', weight_kg: -100 }],
      [{ product_id: 'p2', qty_produced: 1, uom_id: 'u1', weight_kg: 100 }]
    )).toThrow(/tidak valid/);
  });
});
