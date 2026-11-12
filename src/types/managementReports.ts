import { ProcessType, UnitOfMeasure } from './inventory';

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  partId?: string;
  customerId?: string;
  customerName?: string;
  machineId?: string;
  processType?: ProcessType;
  status?: string;
}

export interface ReportMeta {
  reportTitle: string;
  generatedAt: string;
  generatedBy: string;
  appliedFilters: Record<string, string>;
  totalRecordsCount: number;
}

// 1. Production Plan vs Actual
export interface PlanVsActualItem {
  planId: string;
  planNumber: string;
  planVersion: string;
  partId: string;
  partCode: string;
  partName: string;
  plannedQuantity: number;
  actualProducedQuantity: number;
  actualScrapQuantity: number;
  achievementRatePercent: number; // (actual / planned) * 100
  varianceQuantity: number;       // actual - planned
  status: 'DRAFT_SUGGESTION' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_MO' | 'COMPLETED';
  targetDueDate: string;
  isEstimate: boolean;
  linkedMoNumbers: string[];
}

// 2. Customer Order Fulfillment
export interface CustomerOrderFulfillmentItem {
  orderId: string;
  orderLineId: string;
  orderNumber: string;
  contractNumber: string;
  customerName: string;
  partId: string;
  partCode: string;
  partName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  fulfillmentPercent: number;
  dueDate: string;
  status:
    | 'OPEN'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'TERMINATED'
    | 'PARTIALLY_FULFILLED'
    | 'FULFILLED'
    | 'DELAYED'
    | 'CANCELLED';
  daysOverdue: number;
  isDelayed: boolean;
}

// 3. Production Backlog
export interface ProductionBacklogItem {
  orderNumber: string;
  customerName: string;
  contractNumber: string;
  partId: string;
  partCode: string;
  partName: string;
  carModel?: string;
  backlogQuantity: number;
  dueDate: string;
  daysOverdue: number;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  requiredRawMaterialKg: number;
  materialAvailabilityStatus: 'AVAILABLE' | 'SHORTAGE' | 'PARTIAL';
}

// 4. WIP by Part and Operation
export interface WipByPartAndOperationItem {
  partId: string;
  partCode: string;
  partName: string;
  moId: string;
  moNumber: string;
  stepNumber: number;
  stepCode: string;
  stepName: string;
  processType: ProcessType;
  machineName?: string;
  warehouseLocation: string;
  waitingInputQty: number;
  inProgressQty: number;
  readyForTransferQty: number;
  transferredQty: number;
  totalActiveWipQty: number; // waiting + inProgress + readyForTransfer
  lastActivityAt: string;
}

// 5. WIP Aging
export interface WipAgingItem {
  moNumber: string;
  partCode: string;
  partName: string;
  stepNumber: number;
  stepName: string;
  warehouseLocation: string;
  quantityInStation: number;
  lastActivityDate: string;
  idleHours: number;
  idleDays: number;
  ageCategory: 'UNDER_24_HOURS' | '1_TO_3_DAYS' | '3_TO_7_DAYS' | 'OVER_7_DAYS_STAGNANT';
  statusSeverity: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
}

// 6. Material Consumption vs Standard
export interface MaterialConsumptionVsStandardItem {
  moNumber: string;
  partCode: string;
  partName: string;
  materialGrade: string;
  totalProducedPieces: number;
  standardWeightPerPieceKg: number;
  scrapNormPercent: number;
  theoreticalStandardConsumptionKg: number;
  actualIssuedMaterialKg: number;
  actualScrapKg: number;
  varianceKg: number;           // actual - theoretical
  variancePercent: number;
  isOverConsumption: boolean;
}

// 6a. Actual material consumption from the posted inventory ledger and production reports
export interface MaterialConsumptionActualItem {
  moId: string;
  moNumber: string;
  productPartCode: string;
  productPartName: string;
  operationId: string;
  operationStep: number;
  operationCode: string;
  operationName: string;
  processType: ProcessType;
  materialCode: string;
  materialName: string;
  materialGrade: string;
  actualIssuedMaterialKg: number;
  actualProducedGoodQty: number;
  actualScrapQty: number;
  actualScrapWeightKg: number;
  actualMachineNames: string[];
  actualOperatorNames: string[];
  coilNumbers: string[];
  contractNumbers: string[];
  productionReportCount: number;
  lastProductionReportAt?: string;
}

// 7. SAPCO Material Account
export interface SapcoMaterialAccountItem {
  contractId: string;
  contractNumber: string;
  title: string;
  materialGrade: string;
  allocatedQuotaKg: number;
  openingBalanceKg: number;
  totalReceivedKg: number;
  totalIssuedKg: number;
  closingBookBalanceKg: number;
  physicalStockInPlantKg: number;
  discrepancyKg: number; // physical - closingBook
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'FULFILLED' | 'SUSPENDED' | 'TERMINATED';
}

// 8. Inventory Valuation Quantities (Strictly Quantities without inventing financial rules)
export interface InventoryValuationQuantitiesItem {
  category: 'FINISHED_GOODS' | 'WIP_PARTS' | 'RAW_SHEET_METAL' | 'QUALITY_BLOCKED';
  partOrMaterialCode: string;
  description: string;
  unit: UnitOfMeasure;
  physicalQuantity: number;
  companyOwnedQuantity: number;
  sapcoConsignmentQuantity: number;
  qualityBlockedQuantity: number;
  reservedQuantity: number;
  availableFreeQuantity: number;
  totalPhysicalWeightKg: number;
}

// 9. Scrap by Part and Operation
export interface ScrapByPartAndOperationItem {
  partCode: string;
  partName: string;
  stepNumber: number;
  stepName: string;
  processType: ProcessType;
  machineCode?: string;
  machineName?: string;
  totalInputQty: number;
  scrapPieces: number;
  scrapWeightKg: number;
  scrapNormPercent: number;
  actualScrapPercent: number;
  isAboveNorm: boolean;
  commonScrapDefectType?: string;
}

// 10. Machine Workload and Available Capacity
export interface MachineWorkloadCapacityItem {
  machineId: string;
  machineCode: string;
  machineName: string;
  hall: string;
  processType: ProcessType;
  tonnage?: number;
  nominalDailyCapacityHours: number; // 15 hours standard for 2 shifts
  scheduledWorkloadHours: number;
  availableCapacityHours: number;
  utilizationRatePercent: number;
  isReliableCapacityData: boolean;
  workloadCategory: 'OPTIMAL' | 'HIGH_LOAD' | 'OVERLOADED' | 'UNDER_UTILIZED';
  machineStatus: 'ACTIVE' | 'MAINTENANCE' | 'IDLE';
}

// 11. Production Delays
export type ProductionDelaySection = 'CUSTOMER_ORDER' | 'OPEN_MO' | 'COMPLETED_LATE_MO' | 'LATE_OPERATION';

export interface ProductionDelaysItem {
  section: ProductionDelaySection;
  sectionLabelFa: string;
  documentType: 'CUSTOMER_ORDER' | 'MANUFACTURING_ORDER';
  referenceNumber: string;
  customerOrPlan: string;
  partCode: string;
  partName: string;
  quantity: number;
  plannedDueDate: string;
  estimatedCompletionDate: string;
  delayDays: number;
  primaryDelayCause: 'RAW_MATERIAL_SHORTAGE' | 'MACHINE_BREAKDOWN' | 'WIP_BOTTLENECK' | 'CAPACITY_OVERLOAD' | 'QUALITY_HOLD';
  delayDescription: string;
  isEstimate: boolean;
  machineCode?: string;
  machineName?: string;
  operationName?: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  delayPenaltyRiskRials?: number;
}

export interface DelayCauseDistribution {
  causeKey: 'RAW_MATERIAL_SHORTAGE' | 'MACHINE_BREAKDOWN' | 'WIP_BOTTLENECK' | 'CAPACITY_OVERLOAD' | 'QUALITY_HOLD';
  causeLabelFa: string;
  itemsCount: number;
  percentage: number;
  totalDelayedPieces: number;
  recommendedAction: string;
  badgeColor: string;
}

export interface ProductionDelayAnalyticsSummary {
  totalDelayedItemsCount: number;
  averageDelayDays: number;
  maxDelayDays: number;
  onTimeDeliveryRatePercent: number; // OTIF
  customerOrdersDelayedCount: number;
  openMosDelayedCount: number;
  completedLateMosCount: number;
  lateOperationsCount: number;
  criticalUrgencyCount: number;
  estimatedPenaltyRiskRials: number;
  causesBreakdown: DelayCauseDistribution[];
  topDelayedParts: {
    partCode: string;
    partName: string;
    carModel?: string;
    delayedCount: number;
    maxDelayDays: number;
    openDelayedQty: number;
    primaryCause: string;
  }[];
  notes: string[];
}

// 12. Inventory Movements (Analytical Ledger)
export interface InventoryMovementItem {
  transactionId: string;
  documentNumber: string;
  transactionDate: string;
  documentType: string;
  partCode: string;
  partName: string;
  quantity: number;
  unit: UnitOfMeasure;
  sourceLocation: string;
  targetLocation: string;
  ownership: string;
  operatorOrUser: string;
  isReversed: boolean;
}

// 13. Inventory Reconciliation (Discrepancy Audit)
export interface InventoryReconciliationItem {
  locationCode: string;
  warehouseName: string;
  partCode: string;
  partName: string;
  bookQuantity: number;
  physicalCountQuantity: number;
  varianceQuantity: number;
  variancePercent: number;
  reconciliationStatus: 'BALANCED' | 'DEFICIT' | 'SURPLUS';
  lastReconciledAt: string;
  reconciledBy: string;
}

// Comprehensive Management Dashboard Summary
export interface ManagementDashboardSummary {
  activeCustomerOrdersCount: number;
  totalGrossDemandPieces: number;
  totalPlannedProductionPieces: number;
  totalActualProducedPieces: number;
  overallPlanAchievementRatePercent: number;
  totalDelayedOrdersCount: number;
  totalMaterialShortageKg: number;
  totalWipQuantityPieces: number;
  totalFinishedGoodsStockPieces: number;
  totalScrapPieces: number;
  totalScrapWeightKg: number;
  averageMachineUtilizationPercent: number;
  reliableMachinesCount: number;
  activeManufacturingOrdersCount: number;
  stagnantWipItemsCount: number;
  lastUpdatedTimestamp: string;
}

// 14. Coil Inventory (موجودی رول‌ها و کویل‌های ماده اولیه)
export interface CoilInventoryReportItem {
  coilId: string;
  coilNumber: string;
  materialCode: string;
  materialGrade: string;
  thicknessMm: number;
  widthMm: number;
  receivedWeightKg: number;
  consumedWeightKg: number;
  remainingWeightKg: number;
  warehouseLocation: string;
  ownership: 'SAPCO_CONSIGNMENT' | 'FACTORY_OWNED';
  contractNumber: string;
  heatNumber: string;
  packingNumber: string;
  status: 'FULL' | 'PARTIAL' | 'CONSUMED' | 'BLOCKED';
  receiptDate: string;
}

// 15. Lot Consumption (ردیابی مصرف رول/لوت پای پرس‌ها)
export interface LotConsumptionReportItem {
  issueDocumentNumber: string;
  issueDate: string;
  coilNumber: string;
  heatNumber: string;
  materialGrade: string;
  thicknessMm: number;
  consumedKg: number;
  destinationMachine: string;
  targetMoNumber: string;
  targetPartCode: string;
  targetPartName: string;
  piecesProduced: number;
  scrapKg: number;
  scrapPercent: number;
  operatorName: string;
}

// 16. Supplier Matrix (ماتریس حساب مواد تأمین‌کننده گرید × ضخامت)
export interface SupplierMatrixReportItem {
  grade: string;
  thicknessMm: number;
  openingBalanceKg: number;
  financialReceivedKg: number;
  consignmentReceivedKg: number;
  totalConsumptionKg: number;
  closingBalanceKg: number;
  totalCoilsCount: number;
  status: 'BALANCED' | 'DEFICIT' | 'SURPLUS';
}

export type ValueKind = 'IDENTIFIER' | 'ACTUAL' | 'PLANNED' | 'STANDARD' | 'ESTIMATED' | 'INFO';

export const VALUE_KIND_LABELS: Record<ValueKind, { label: string; color: string }> = {
  IDENTIFIER: { label: 'شناسه', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  ACTUAL: { label: 'واقعی', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  PLANNED: { label: 'برنامه‌ای', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  STANDARD: { label: 'استاندارد BOM', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  ESTIMATED: { label: 'تخمینی', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  INFO: { label: 'اطلاعاتی', color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

