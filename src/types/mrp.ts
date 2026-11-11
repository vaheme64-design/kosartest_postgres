/**
 * KPIMS - Phase 8 & 9: Material Requirements Planning (MRP) and Forecasting Types
 * تعاریف تایپ‌های موتور پیش‌بینی نیازمندی مواد، موازنه کلاف و بررسی پیش از حواله
 */

export interface MrpMaterialDemandSource {
  partId: string;
  partCode: string;
  partName: string;
  requiredQuantity: number;
  weightKg: number;
}

export interface MrpContractCoverage {
  contractNumber: string;
  supplierName: string;
  allocatedQuotaKg: number;
  remainingKg: number;
  expectedDeliveryDate: string;
}

export interface MrpMatchingCoilInfo {
  coilId: string;
  coilNumber: string;
  materialCode: string;
  materialGrade: string;
  thicknessMm: number;
  remainingWeightKg: number;
  ownership: 'SAPCO_CONSIGNMENT' | 'FACTORY_OWNED';
  warehouseLocation: string;
  status: 'FULL' | 'PARTIAL' | 'CONSUMED' | 'BLOCKED';
}

export type MrpMaterialSeverity = 'OK' | 'SHORTAGE_COVERED_BY_CONTRACT' | 'HARD_SHORTAGE';

export interface MrpMaterialRow {
  materialId: string;
  materialCode: string;
  materialName: string;
  materialGrade: string;
  thicknessMm: number;
  widthMm: number;
  unitCode: string;
  
  // Demand breakdown
  requiredQuantity: number;
  requiredWeightKg: number;

  // On-hand stock breakdown (transparent accounting)
  onHandOwned: number;
  onHandConsignment: number;
  onHandQuarantined: number; // Excluded from supply
  reservedActive: number;
  netAvailable: number; // (owned + consignment) - reserved

  // Supply pipeline & contracts
  openContractQuantity: number;
  shortageQuantity: number;
  coveredByContract: number;
  hardShortageQuantity: number;

  severity: MrpMaterialSeverity;
  demandedByParts: MrpMaterialDemandSource[];
  contractInfo: MrpContractCoverage[];
  matchingCoils: MrpMatchingCoilInfo[];
}

export interface MrpPartRow {
  partId: string;
  partCode: string;
  partName: string;
  carModel?: string;
  isVIP?: boolean;
  grossDemand: number;
  coveredByFgStock: number;
  coveredByFgReservations: number;
  coveredByWip: number;
  coveredByActiveMos: number;
  netRequirement: number;
  hasBom: boolean;
  hasRouting: boolean;
  missingInfo: string[];
}

export interface MrpRunSummary {
  materialsConsidered: number;
  ok: number;
  contractCovered: number;
  hardShortages: number;
  totalGrossWeightKg: number;
  totalShortageWeightKg: number;
  totalFinishedGoodsDemandPieces: number;
  totalNetProductionPieces: number;
}

export interface MrpRunResult {
  ranAt: string;
  ranAtFa: string;
  scope: {
    orderLinesCount: number;
    partsCount: number;
    withNetRequirementCount: number;
  };
  parts: MrpPartRow[];
  materials: MrpMaterialRow[];
  summary: MrpRunSummary;
  notes: string[];
}

// Pre-Issue Check Types (بررسی پیش از حواله دستور کار به پای پرس)
export interface MoMaterialCheckLine {
  materialId: string;
  materialCode: string;
  materialName: string;
  materialGrade?: string;
  thicknessMm?: number;
  unitCode: string;
  requiredQuantity: number;
  requiredWeightKg?: number;
  alreadyIssuedQuantity: number;
  remainingRequired: number;
  onHandApproved: number;
  reservedForThisMo: number;
  reservedForOthers: number;
  availableForThisMo: number;
  shortageQuantity: number;
  status: 'NOT_REQUIRED' | 'READY' | 'SHORTAGE';
  notes: string[];
}

export interface MoMaterialCheckResult {
  moId: string;
  moNumber: string;
  moStatus: string;
  partId: string;
  partCode: string;
  partName: string;
  targetQuantity: number;
  lines: MoMaterialCheckLine[];
  readyToIssue: boolean;
  notes: string[];
}

// Demand Horizon & What-If Simulation
export interface MrpSimulationParams {
  demandGrowthPercent: number; // e.g. 0, 15, 30, 50%
  horizonDays: number;         // 7, 14, 30, 60, 90
  includeWip: boolean;
  includeConsignmentStock: boolean;
}
