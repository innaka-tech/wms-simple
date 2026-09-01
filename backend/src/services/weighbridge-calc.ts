export interface WeighbridgeCalculationParams {
  grossWeightKg: number;
  tareWeightKg?: number | null;
  maxVehicleCapacityKg?: number;
  weighbridgeOperator: string;
  truckPlate: string;
}

export interface WeighbridgeCalculationResult {
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  isOverloaded: boolean;
  overloadExcessKg: number;
}

/**
 * Calculates net cargo weight and checks vehicle weight limits.
 */
export function calculateWeighbridgeNetWeight(
  params: WeighbridgeCalculationParams
): WeighbridgeCalculationResult {
  if (!params.truckPlate || params.truckPlate.trim().length < 3) {
    throw new Error('Nomor plat truk wajib diisi');
  }
  if (!params.weighbridgeOperator || params.weighbridgeOperator.trim().length < 2) {
    throw new Error('Nama operator timbangan jembatan timbang wajib diisi');
  }

  const gross = Number(params.grossWeightKg);
  const tare = params.tareWeightKg !== undefined && params.tareWeightKg !== null 
    ? Number(params.tareWeightKg) 
    : 0;

  if (isNaN(gross) || gross <= 0) {
    throw new Error('Berat kotor (Gross Weight) harus berupa angka positif');
  }
  if (isNaN(tare) || tare < 0) {
    throw new Error('Berat kosong (Tare Weight) tidak boleh negatif');
  }
  if (tare > gross) {
    throw new Error(`Berat kosong (Tare: ${tare} kg) tidak boleh lebih besar dari berat kotor (Gross: ${gross} kg)`);
  }

  const netWeightKg = Number((gross - tare).toFixed(2));
  let isOverloaded = false;
  let overloadExcessKg = 0;

  if (params.maxVehicleCapacityKg && params.maxVehicleCapacityKg > 0) {
    if (netWeightKg > params.maxVehicleCapacityKg) {
      isOverloaded = true;
      overloadExcessKg = Number((netWeightKg - params.maxVehicleCapacityKg).toFixed(2));
    }
  }

  return {
    grossWeightKg: gross,
    tareWeightKg: tare,
    netWeightKg,
    isOverloaded,
    overloadExcessKg
  };
}
