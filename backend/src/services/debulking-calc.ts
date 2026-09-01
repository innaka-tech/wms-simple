export interface DebulkingItemInput {
  product_id: string;
  qty_used: number;
  uom_id: string;
  weight_kg: number;
  location_id?: string | null;
}

export interface DebulkingItemOutput {
  product_id: string;
  qty_produced: number;
  uom_id: string;
  weight_kg: number;
  destination_location_id?: string | null;
}

export interface ShrinkageCalculationResult {
  totalInputWeightKg: number;
  totalOutputWeightKg: number;
  shrinkageLossKg: number;
  shrinkagePercentage: number;
  isExceedingTolerance: boolean;
  tolerancePercentage: number;
}

/**
 * Calculates shrinkage loss and verifies tolerance for De-bulking Work Orders.
 * Skenario Pengujian: DEB-01 (Wajar), DEB-02 (High Shrinkage Alert), DEB-03 (Kekekalan Massa).
 */
export function calculateDebulkingShrinkage(
  inputs: DebulkingItemInput[],
  outputs: DebulkingItemOutput[],
  allowableTolerancePct: number = 1.0
): ShrinkageCalculationResult {
  if (!inputs || inputs.length === 0) {
    throw new Error('Input barang bulky tidak boleh kosong');
  }
  if (!outputs || outputs.length === 0) {
    throw new Error('Output barang curah/hasil konversi tidak boleh kosong');
  }

  const totalInputWeightKg = inputs.reduce((sum, item) => {
    const w = Number(item.weight_kg);
    if (isNaN(w) || w <= 0) {
      throw new Error(`Berat input barang ${item.product_id} tidak valid: ${item.weight_kg}`);
    }
    return sum + w;
  }, 0);

  const totalOutputWeightKg = outputs.reduce((sum, item) => {
    const w = Number(item.weight_kg);
    if (isNaN(w) || w <= 0) {
      throw new Error(`Berat output barang ${item.product_id} tidak valid: ${item.weight_kg}`);
    }
    return sum + w;
  }, 0);

  const shrinkageLossKg = Number((totalInputWeightKg - totalOutputWeightKg).toFixed(4));
  if (shrinkageLossKg < 0) {
    throw new Error(`Total berat output (${totalOutputWeightKg} kg) melebihi total berat input (${totalInputWeightKg} kg). Pelanggaran hukum kekekalan massa.`);
  }

  const shrinkagePercentage = totalInputWeightKg > 0 
    ? Number(((shrinkageLossKg / totalInputWeightKg) * 100).toFixed(2)) 
    : 0;

  const isExceedingTolerance = shrinkagePercentage > allowableTolerancePct;

  return {
    totalInputWeightKg: Number(totalInputWeightKg.toFixed(2)),
    totalOutputWeightKg: Number(totalOutputWeightKg.toFixed(2)),
    shrinkageLossKg: Number(shrinkageLossKg.toFixed(2)),
    shrinkagePercentage,
    isExceedingTolerance,
    tolerancePercentage: allowableTolerancePct
  };
}
