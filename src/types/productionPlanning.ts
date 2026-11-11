import { ProcessType, ContractRevisionEntry } from './inventory';

export interface CustomerOrderLine {
  id: string;
  orderId: string;
  partId: string;
  partCode: string;
  partName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  dueDate: string;
  unitPriceRials?: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;           // e.g. ORD-SAPCO-2026-01
  customerName: string;          // ساپکو (ایران‌خودرو)، سایپا / مگاموتور
  contractNumber: string;        // e.g. CNT-SAP-2026-001
  orderDate: string;
  dueDate: string;
  priority: 1 | 2 | 3;           // 1: فوری / بحرانی, 2: عادی, 3: کم‌اهمیت
  status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  lines: CustomerOrderLine[];
  revisions?: ContractRevisionEntry[];
  notes?: string;
  createdAt: string;
}

export interface PartNetRequirement {
  partId: string;
  partCode: string;
  partName: string;
  carModel?: string;
  dueDate: string;
  grossDemandQty: number;              // تقاضای ناخالص سفارشات
  physicalFinishedGoodsQty: number;    // موجودی فیزیکی انبار محصول
  qualityBlockedQty: number;           // موجودی مسدود کیفی (غیرقابل برنامه‌ریزی)
  reservedFinishedGoodsQty: number;    // موجودی رزرو شده
  availableFinishedGoodsQty: number;   // موجودی آزاد قابل تخصیص = max(0, physical - blocked - reserved)
  netDemandAfterFg: number;            // کسری پس از کسر موجودی انبار = max(0, gross - availableFG)
  downstreamWipByStep: Record<number, number>; // موجودی در جریان به تفکیک مراحل
  totalDownstreamWip: number;          // کل WIP فعال در خطوط
  netProductionRequirement: number;    // الزام خالص تولید از ابتدای خط
  requiredMaterialGrade: string;
  requiredMaterialKg: number;          // وزن ورق مورد نیاز با احتساب ضایعات استانداردی
  availableRawMaterialKg: number;      // کلاف‌های ورق موجود در انبار
  materialShortageKg: number;          // کسری ماده اولیه
  materialShortageDetected: boolean;
}

export interface MachineEligibilityCheck {
  machineId: string;
  machineCode: string;
  machineName: string;
  isEligible: boolean;
  ineligibilityReasons: string[];
  supportsProcess: boolean;
  tonnageSufficient: boolean;
  dieCompatible: boolean;
  isMachineActive: boolean;
  capacityAvailable: boolean;
  dailyCapacityHours: number;
  currentWorkloadHours: number;
  availableHoursRemaining: number;
  estimatedSetupTimeMin: number;
  estimatedRunTimeHours: number;
  currentWorkloadPercent: number;
  suitabilityScore: number;            // 0 تا 100 بر اساس تناسب تناژ، آزاد بودن ظرفیت، سرعت
  recommendationRank: number;          // 1: اولویت اول، 2: اولویت دوم...
  recommendationReason: string;        // تشریح دلیل انتخاب یا رتبه
}

export interface ProposedOperationPlan {
  stepNumber: number;
  stepCode: string;
  stepName: string;
  processType: ProcessType;
  requiredTonnage: number;
  plannedQuantity: number;
  standardCycleTimeSec: number;
  setupTimeMin: number;
  estimatedRunHours: number;
  dieMoldId?: string;
  dieMoldCode?: string;
  dieMoldName?: string;
  recommendedMachine: MachineEligibilityCheck | null;
  allCandidateMachines: MachineEligibilityCheck[];
  isInfeasible: boolean;
  infeasibilityReasons: string[];
}

export interface ProductionPlanSuggestion {
  id: string;                          // e.g. PPS-2026-001
  planNumber: string;                  // e.g. PLN-SUG-1405-01
  planVersion: string;                 // e.g. V1.0
  partId: string;
  partCode: string;
  partName: string;
  customerOrderIds: string[];
  customerOrderNumbers: string[];
  targetDueDate: string;
  grossDemand: number;
  availableFg: number;
  wipCredit: number;
  netRequiredQuantity: number;
  proposedQuantity: number;
  materialStatus: {
    requiredGrade: string;
    requiredWeightKg: number;
    availableWeightKg: number;
    shortageKg: number;
    hasShortage: boolean;
  };
  proposedOperations: ProposedOperationPlan[];
  overallFeasible: boolean;
  infeasibilityWarnings: string[];
  estimatedStartDate: string;
  estimatedCompletionDate: string;
  approvalStatus: 'DRAFT_SUGGESTION' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_MO';
  approvedBy?: string;
  approvedAt?: string;
  createdMoId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningDashboardMetrics {
  totalOpenOrdersCount: number;
  totalGrossDemandPieces: number;
  totalNetProductionRequirementsPieces: number;
  totalMaterialShortageKg: number;
  activeSuggestionsCount: number;
  approvedPlansCount: number;
  infeasiblePlansCount: number;
  averageMachineCapacityUtilizationPercent: number;
  criticalPartsRequiringImmediateAction: {
    partCode: string;
    partName: string;
    netShortage: number;
    dueDate: string;
    hasMaterialShortage: boolean;
  }[];
}
