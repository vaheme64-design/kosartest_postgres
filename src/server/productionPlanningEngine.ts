import {
  CustomerOrder,
  CustomerOrderLine,
  PartNetRequirement,
  MachineEligibilityCheck,
  ProposedOperationPlan,
  ProductionPlanSuggestion,
  PlanningDashboardMetrics,
} from '../types/productionPlanning';
import { Part, Machine, DieMold, Routing, ProcessType } from '../types/inventory';
import { DetailedStockBalance, InventoryReservation } from '../types/inventory';
import { ManufacturingOrder } from '../types/productionWip';
import { INITIAL_PARTS, INITIAL_MACHINES, INITIAL_DIES_MOLDS, INITIAL_ROUTINGS } from './sampleData';
import { manufacturingOrdersStore, createManufacturingOrder } from './productionWipEngine';
import { calculateDetailedStockBalances } from './inventoryEngine';
import { INITIAL_INVENTORY_DOCUMENTS, INITIAL_INVENTORY_RESERVATIONS } from './inventorySampleData';

// Store for Open Customer Orders (Exclusively Anti-Theft ECU Bracket)
export const INITIAL_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: 'ORD-ECU-001',
    orderNumber: 'SO-SAPCO-ECU-101',
    customerName: 'شرکت ساپکو (تأمین قطعات ایران‌خودرو - خط پژو ۲۰۶/۲۰۷)',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    orderDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    priority: 1, // Urgent
    status: 'OPEN',
    notes: 'سفارش تولید و تحویل مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED (شامل صفحه اصلی با ۱۵ مهره M6 و مکمل با ۲ پیچ ۶×۲۰)',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lines: [
      {
        id: 'ORD-LN-ECU-001',
        orderId: 'ORD-ECU-001',
        partId: 'PRT-FGD-ECU-BRK',
        partCode: 'SAPCO-ASY-ECU-BRK-01',
        partName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
        orderedQuantity: 1500,
        deliveredQuantity: 0,
        remainingQuantity: 1500,
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        unitPriceRials: 2450000,
      },
    ],
  },
];

export const customerOrdersStore: CustomerOrder[] = [...INITIAL_CUSTOMER_ORDERS];

// Store for Generated Production Planning Suggestions
export const planSuggestionsStore: ProductionPlanSuggestion[] = [];

// Machine Workload Tracking (Hours scheduled on each machine)
export const machineWorkloadHoursMap: Record<string, number> = {
  'MCH-001': 4.5, // Heavy Press 800t
  'MCH-002': 6.0, // Schuler 400t
  'MCH-003': 3.0, // Press 250t
  'MCH-004': 2.0, // Press Brake
  'MCH-005': 1.5, // Shearing
  'MCH-006': 3.5, // Slitter
  'MCH-007': 5.0, // Robotic CO2
  'MCH-008': 4.0, // Spot Weld
  'MCH-009': 8.0, // Cataphoresis Paint
  'MCH-010': 3.0, // Assembly Jig
};

export function clearCustomerOrdersAndPlans() {
  customerOrdersStore.length = 0;
  planSuggestionsStore.length = 0;
  Object.keys(machineWorkloadHoursMap).forEach(k => {
    machineWorkloadHoursMap[k] = 0;
  });
}

export function reseedCustomerOrdersAndPlans() {
  customerOrdersStore.length = 0;
  customerOrdersStore.push(...JSON.parse(JSON.stringify(INITIAL_CUSTOMER_ORDERS)));
  planSuggestionsStore.length = 0;
  planSuggestionsStore.push(...generateProductionPlanSuggestions());
  Object.assign(machineWorkloadHoursMap, {
    'MCH-001': 4.5,
    'MCH-002': 6.0,
    'MCH-003': 3.0,
    'MCH-004': 2.0,
    'MCH-005': 1.5,
    'MCH-006': 3.5,
    'MCH-007': 5.0,
    'MCH-008': 4.0,
    'MCH-009': 8.0,
    'MCH-010': 3.0,
  });
}

// =========================================================================
// 1. NET PRODUCTION REQUIREMENTS CALCULATION (WIP & RESERVATION NETTING)
// =========================================================================

export function calculateNetRequirements(params?: {
  parts?: Part[];
  orders?: CustomerOrder[];
  balances?: DetailedStockBalance[];
  reservations?: InventoryReservation[];
  activeMos?: ManufacturingOrder[];
  routings?: Routing[];
}): PartNetRequirement[] {
  const parts = params?.parts || INITIAL_PARTS;
  const orders = params?.orders || customerOrdersStore;
  const reservations = params?.reservations || INITIAL_INVENTORY_RESERVATIONS;
  const balances = params?.balances || calculateDetailedStockBalances(INITIAL_INVENTORY_DOCUMENTS, reservations, parts).balances;
  const activeMos = params?.activeMos || manufacturingOrdersStore;
  const routings = params?.routings || INITIAL_ROUTINGS;

  const results: PartNetRequirement[] = [];

  // 1. Group remaining customer demand by partId
  const demandByPart = new Map<string, { totalDemand: number; nearestDueDate: string; orderIds: string[] }>();

  orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FULFILLED').forEach(order => {
    order.lines.forEach(line => {
      if (line.remainingQuantity <= 0) return;
      const existing = demandByPart.get(line.partId) || {
        totalDemand: 0,
        nearestDueDate: line.dueDate,
        orderIds: [],
      };
      existing.totalDemand += line.remainingQuantity;
      if (new Date(line.dueDate).getTime() < new Date(existing.nearestDueDate).getTime()) {
        existing.nearestDueDate = line.dueDate;
      }
      existing.orderIds.push(order.id);
      demandByPart.set(line.partId, existing);
    });
  });

  // 2. For each part with demand, perform multi-level netting:
  demandByPart.forEach((demandInfo, partId) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const grossDemand = demandInfo.totalDemand;

    // 2.1. Available Finished Goods Stock
    // Find finished goods balance in WH-FINISHED
    const fgRecords = balances.filter(b => b.partId === part.id && b.warehouseId === 'WH-FINISHED');
    const physicalFg = fgRecords.reduce((sum, b) => sum + b.physicalQty, 0);
    const qualityBlockedFg = fgRecords.reduce((sum, b) => sum + b.qualityBlockedQty, 0);

    // Active Reservations
    const activeRes = reservations.filter(
      r => r.partId === part.id && r.status === 'ACTIVE' && r.warehouseId === 'WH-FINISHED'
    );
    const reservedFg = activeRes.reduce((sum, r) => sum + r.quantity, 0);

    // Strictly exclude blocked and reserved stock:
    const availableFg = Math.max(0, physicalFg - qualityBlockedFg - reservedFg);

    // Net Demand after Available Finished Goods
    const netDemandAfterFg = Math.max(0, grossDemand - availableFg);

    // 2.2. WIP Netting across all operations of this part
    // Inspect active manufacturing orders for this part
    const partMos = activeMos.filter(
      m => (m.partId === part.id || m.partCode === part.code) && (m.status === 'IN_PROGRESS' || m.status === 'RELEASED')
    );

    const downstreamWipByStep: Record<number, number> = {};
    let totalDownstreamWip = 0;

    partMos.forEach(mo => {
      mo.operations.forEach(op => {
        // WIP at this step = waiting input + in-progress + ready for transfer
        const stepWip = op.waitingInputQty + op.inProgressQty + op.readyForTransferQty;
        downstreamWipByStep[op.stepNumber] = (downstreamWipByStep[op.stepNumber] || 0) + stepWip;
        totalDownstreamWip += stepWip;
      });
    });

    // 2.3. Net Production Requirement from route beginning
    const netProductionRequirement = Math.max(0, netDemandAfterFg - totalDownstreamWip);

    // 2.4. Raw Material Shortage Calculation
    const routing = routings.find(r => r.partId === part.id || r.partCode === part.code) || routings[0];
    const cumulativeScrapNormPercent = routing.operations.reduce((sum, op) => sum + op.scrapNormPercent, 0);
    const scrapFactor = 1 + (cumulativeScrapNormPercent / 100);

    // Material weight required in KG
    const partUnitWeightKg = part.weightPerUnitKg || 1.0;
    const requiredMaterialKg = Math.round(netProductionRequirement * partUnitWeightKg * scrapFactor * 10) / 10;
    const requiredGrade = part.materialGrade || 'ST14';

    // Check available raw material coil stock matching materialGrade
    const rawRecords = balances.filter(
      b => b.warehouseId === 'WH-RAW' && (b.materialGrade === requiredGrade || b.partCode.includes(requiredGrade))
    );
    const availableRawKg = rawRecords.reduce((sum, b) => sum + b.availableKg, 0);
    const materialShortageKg = Math.max(0, Math.round((requiredMaterialKg - availableRawKg) * 10) / 10);

    results.push({
      partId: part.id,
      partCode: part.code,
      partName: part.name,
      carModel: part.carModel,
      dueDate: demandInfo.nearestDueDate,
      grossDemandQty: grossDemand,
      physicalFinishedGoodsQty: physicalFg,
      qualityBlockedQty: qualityBlockedFg,
      reservedFinishedGoodsQty: reservedFg,
      availableFinishedGoodsQty: availableFg,
      netDemandAfterFg,
      downstreamWipByStep,
      totalDownstreamWip,
      netProductionRequirement,
      requiredMaterialGrade: requiredGrade,
      requiredMaterialKg,
      availableRawMaterialKg: availableRawKg,
      materialShortageKg,
      materialShortageDetected: materialShortageKg > 0,
    });
  });

  return results;
}

// =========================================================================
// 2. MACHINE ELIGIBILITY & WORKLOAD ESTIMATION
// =========================================================================

export function evaluateMachineEligibility(params: {
  processType: ProcessType;
  requiredTonnage: number;
  plannedQuantity: number;
  standardCycleTimeSec: number;
  setupTimeMin?: number;
  targetDueDate?: string;
  assignedDieId?: string;
  assignedDieCode?: string;
  machines?: Machine[];
  dies?: DieMold[];
}): MachineEligibilityCheck[] {
  const machines = params.machines || INITIAL_MACHINES;
  const dies = params.dies || INITIAL_DIES_MOLDS;
  const setupMin = params.setupTimeMin ?? 25; // default 25 min setup
  const cycleSec = params.standardCycleTimeSec || 15;
  const plannedQty = params.plannedQuantity;

  // Estimated Run Time in Hours = Setup Hours + (Pieces * CycleSec / 3600)
  const estimatedRunHours = Math.round(((setupMin / 60) + ((plannedQty * cycleSec) / 3600)) * 10) / 10;
  const dailyShiftHours = 15; // 2 shifts of 7.5 hours

  // Find assigned die/mold if specified
  const hasAssignedDie = Boolean(params.assignedDieCode || params.assignedDieId);
  const assignedDie = params.assignedDieCode
    ? dies.find(d => d.code === params.assignedDieCode)
    : params.assignedDieId
      ? dies.find(d => d.id === params.assignedDieId)
      : undefined;

  const results: MachineEligibilityCheck[] = [];

  machines.forEach(machine => {
    const ineligibilityReasons: string[] = [];

    // 1. Process Support Check
    const supportsProcess = machine.capabilities.includes(params.processType) || machine.processType === params.processType;
    if (!supportsProcess) {
      ineligibilityReasons.push(`دستگاه فرایند ${params.processType} را پشتیبانی نمی‌کند.`);
    }

    // 2. Tonnage Check
    const machineTonnage = machine.tonnage ?? 0;
    const tonnageSufficient = params.requiredTonnage <= 0 || machineTonnage >= params.requiredTonnage;
    if (!tonnageSufficient) {
      ineligibilityReasons.push(
        `تناژ ناکافی: ظرفیت دستگاه ${machineTonnage} تن، کمتر از تناژ مورد نیاز ${params.requiredTonnage} تن است.`
      );
    }

    // 3. Die / Mold Compatibility Check
    let dieCompatible = !hasAssignedDie || Boolean(assignedDie);
    if (hasAssignedDie && !assignedDie) {
      dieCompatible = false;
      ineligibilityReasons.push(`قالب تخصیص‌یافته با شناسه «${params.assignedDieCode || params.assignedDieId}» در اطلاعات پایه یافت نشد؛ انتخاب دستگاه متوقف شد.`);
    } else if (assignedDie) {
      const compatibleCodes = assignedDie.compatibleMachineCodes || [];
      if (compatibleCodes.length === 0 || !compatibleCodes.includes(machine.code)) {
        dieCompatible = false;
        ineligibilityReasons.push(
          compatibleCodes.length === 0
            ? `فهرست سازگاری ماشین‌آلات برای قالب ${assignedDie.code} تعریف نشده است؛ انتخاب دستگاه متوقف شد.`
            : `قالب ${assignedDie.code} (${assignedDie.name}) با ابعاد میز و فک این دستگاه ناسازگار است.`
        );
      }
    }

    // 4. Machine Status Check
    const isMachineActive = machine.status === 'ACTIVE';
    if (!isMachineActive) {
      ineligibilityReasons.push(
        machine.status === 'MAINTENANCE'
          ? 'دستگاه در وضعیت تعمیرات دوره‌ای / اورهال قرار دارد.'
          : 'دستگاه به دلیل خرابی اضطراری متوقف است.'
      );
    }

    // 5. Machine Capacity Check
    const currentWorkload = machineWorkloadHoursMap[machine.id] || 0;
    const availableHoursRemaining = Math.max(0, Math.round((dailyShiftHours - currentWorkload) * 10) / 10);
    const capacityAvailable = availableHoursRemaining >= 1.0;
    if (!capacityAvailable) {
      ineligibilityReasons.push('ظرفیت شیفت‌های فعال دستگاه پر شده است (کمبود ظرفیت زمانی).');
    }

    // Overarching Eligibility Verdict
    const isEligible = supportsProcess && tonnageSufficient && dieCompatible && isMachineActive;

    // 6. Suitability Score (0 to 100) & Human Rationale
    let suitabilityScore = 0;
    let recommendationReason = '';

    if (isEligible) {
      // Base score 50
      suitabilityScore = 50;

      // Available capacity bonus (up to 30 points)
      const capacityRatio = availableHoursRemaining / dailyShiftHours;
      suitabilityScore += Math.round(capacityRatio * 30);

      // Tonnage optimality bonus (up to 15 points)
      // If tonnage is close to required, optimal power usage
      if (params.requiredTonnage > 0) {
        const excessTonnageRatio = (machineTonnage - params.requiredTonnage) / params.requiredTonnage;
        if (excessTonnageRatio <= 0.25) {
          suitabilityScore += 15; // Optimal match
        } else if (excessTonnageRatio <= 0.6) {
          suitabilityScore += 10;
        } else {
          suitabilityScore += 5; // Oversized press
        }
      } else {
        suitabilityScore += 10;
      }

      // Speed bonus (Strokes per minute) (up to 5 points)
      if ((machine.strokesPerMinute || 0) >= 30) suitabilityScore += 5;

      const workloadPercent = Math.round((currentWorkload / dailyShiftHours) * 100);
      recommendationReason = `${machine.name} به دلیل سازگاری کامل، تناژ متناسب (${machineTonnage} تن) و دارا بودن ${availableHoursRemaining} ساعت ظرفیت آزاد (${100 - workloadPercent}٪ آزادی) انتخاب شد.`;
    } else {
      suitabilityScore = 0;
      recommendationReason = ineligibilityReasons.join(' | ');
    }

    const currentWorkloadPercent = Math.round((currentWorkload / dailyShiftHours) * 100);

    results.push({
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      isEligible,
      ineligibilityReasons,
      supportsProcess,
      tonnageSufficient,
      dieCompatible,
      isMachineActive,
      capacityAvailable,
      dailyCapacityHours: dailyShiftHours,
      currentWorkloadHours: currentWorkload,
      availableHoursRemaining,
      estimatedSetupTimeMin: setupMin,
      estimatedRunTimeHours: estimatedRunHours,
      currentWorkloadPercent,
      suitabilityScore,
      recommendationRank: 999, // Assigned below
      recommendationReason,
    });
  });

  // Rank eligible machines by suitability score descending
  const eligibleSorted = results.filter(r => r.isEligible).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  eligibleSorted.forEach((item, index) => {
    item.recommendationRank = index + 1;
  });

  // Return all machines, sorted: eligible first (ranked), then ineligible
  return results.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return a.recommendationRank - b.recommendationRank;
  });
}

// =========================================================================
// 3. PRODUCTION PLAN SUGGESTIONS GENERATION
// =========================================================================

export function generateProductionPlanSuggestions(): ProductionPlanSuggestion[] {
  const netRequirements = calculateNetRequirements();
  const routings = INITIAL_ROUTINGS;
  const dies = INITIAL_DIES_MOLDS;
  const machines = INITIAL_MACHINES;

  const suggestions: ProductionPlanSuggestion[] = [];

  netRequirements.forEach((req, idx) => {
    // If no net production is needed, skip generating active plan
    const routing = routings.find(r => r.partId === req.partId || r.partCode === req.partCode) || routings[0];
    const plannedQty = req.netProductionRequirement > 0 ? req.netProductionRequirement : req.grossDemandQty;

    const proposedOperations: ProposedOperationPlan[] = [];
    const planWarnings: string[] = [];
    let overallFeasible = true;

    // Check material shortage
    if (req.materialShortageDetected) {
      planWarnings.push(
        `کسری ماده اولیه: ${req.materialShortageKg} کیلوگرم ورق گرید ${req.requiredMaterialGrade} کسری وجود دارد.`
      );
    }

    // Evaluate each operation along the route
    let cumulativeHours = 0;

    routing.operations.forEach(op => {
      // Find matching die for this step
      const assignedDie = dies.find(
        d => (d.partCode === req.partCode || d.partId === req.partId) && d.processType === op.processType
      ) || dies.find(d => d.processType === op.processType);

      const candidateMachines = evaluateMachineEligibility({
        processType: op.processType,
        requiredTonnage: op.requiredTonnage || (op.processType === 'DRAWING' ? 800 : op.processType === 'PUNCH_FORM' ? 400 : op.processType === 'BENDING' ? 160 : 0),
        plannedQuantity: plannedQty,
        standardCycleTimeSec: op.standardCycleTimeSec,
        setupTimeMin: op.setupTimeMin || 30,
        assignedDieCode: assignedDie?.code,
        machines,
        dies,
      });

      const eligibleMachines = candidateMachines.filter(m => m.isEligible);
      const recommended = eligibleMachines.length > 0 ? eligibleMachines[0] : null;

      const isInfeasible = !recommended;
      const infeasibilityReasons: string[] = [];

      if (isInfeasible) {
        overallFeasible = false;
        const topBlocker = candidateMachines[0]?.ineligibilityReasons[0] || 'هیچ دستگاه واجد شرایطی برای این مرحله یافت نشد.';
        infeasibilityReasons.push(topBlocker);
        planWarnings.push(`مرحله ${op.stepCode} (${op.stepName}) فاقد دستگاه واجد شرایط است: ${topBlocker}`);
      }

      const runHours = recommended?.estimatedRunTimeHours || Math.round(((op.standardCycleTimeSec * plannedQty) / 3600) * 10) / 10;
      cumulativeHours += runHours;

      proposedOperations.push({
        stepNumber: op.stepNumber,
        stepCode: op.stepCode,
        stepName: op.stepName,
        processType: op.processType,
        requiredTonnage: op.requiredTonnage || 0,
        plannedQuantity: plannedQty,
        standardCycleTimeSec: op.standardCycleTimeSec,
        setupTimeMin: op.setupTimeMin || 30,
        estimatedRunHours: runHours,
        dieMoldId: assignedDie?.id,
        dieMoldCode: assignedDie?.code,
        dieMoldName: assignedDie?.name,
        recommendedMachine: recommended,
        allCandidateMachines: candidateMachines,
        isInfeasible,
        infeasibilityReasons,
      });
    });

    const now = new Date();
    const daysNeeded = Math.ceil(cumulativeHours / 15) + 1; // 15h per day
    const estimatedCompletion = new Date(now.getTime() + daysNeeded * 24 * 3600 * 1000).toISOString().slice(0, 10);

    // Check due date feasibility
    if (new Date(estimatedCompletion).getTime() > new Date(req.dueDate).getTime()) {
      planWarnings.push(
        `هشدار تاخیر موعد تحویل: اتمام تخمینی (${estimatedCompletion}) پس از موعد ساپکو (${req.dueDate}) است.`
      );
    }

    const planId = `PPS-2026-${String(idx + 1).padStart(3, '0')}`;
    const planNumber = `PLN-SUG-1405-${String(idx + 1).padStart(2, '0')}`;

    suggestions.push({
      id: planId,
      planNumber,
      planVersion: 'V1.0',
      partId: req.partId,
      partCode: req.partCode,
      partName: req.partName,
      customerOrderIds: ['ORD-2026-001'],
      customerOrderNumbers: ['SO-SAPCO-1405-88'],
      targetDueDate: req.dueDate,
      grossDemand: req.grossDemandQty,
      availableFg: req.availableFinishedGoodsQty,
      wipCredit: req.totalDownstreamWip,
      netRequiredQuantity: req.netProductionRequirement,
      proposedQuantity: plannedQty,
      materialStatus: {
        requiredGrade: req.requiredMaterialGrade,
        requiredWeightKg: req.requiredMaterialKg,
        availableWeightKg: req.availableRawMaterialKg,
        shortageKg: req.materialShortageKg,
        hasShortage: req.materialShortageDetected,
      },
      proposedOperations,
      overallFeasible,
      infeasibilityWarnings: planWarnings,
      estimatedStartDate: now.toISOString().slice(0, 10),
      estimatedCompletionDate: estimatedCompletion,
      approvalStatus: 'DRAFT_SUGGESTION',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  return suggestions;
}

// Initialize seed suggestions
if (planSuggestionsStore.length === 0) {
  const generated = generateProductionPlanSuggestions();
  planSuggestionsStore.push(...generated);
}

// =========================================================================
// 4. PLAN APPROVAL & SHOP FLOOR RELEASE WORKFLOW
// =========================================================================

export function approvePlanSuggestion(planId: string, approvedBy: string): {
  success: boolean;
  data?: ProductionPlanSuggestion;
  error?: string;
} {
  const plan = planSuggestionsStore.find(p => p.id === planId);
  if (!plan) return { success: false, error: 'برنامه پیشنهادی یافت نشد.' };

  plan.approvalStatus = 'APPROVED';
  plan.approvedBy = approvedBy;
  plan.approvedAt = new Date().toISOString();
  plan.updatedAt = new Date().toISOString();

  return { success: true, data: plan };
}

export function releasePlanToManufacturingOrder(planId: string, releasedBy: string): {
  success: boolean;
  mo?: ManufacturingOrder;
  plan?: ProductionPlanSuggestion;
  error?: string;
} {
  const plan = planSuggestionsStore.find(p => p.id === planId);
  if (!plan) return { success: false, error: 'برنامه پیشنهادی یافت نشد.' };

  if (plan.approvalStatus !== 'APPROVED') {
    return { success: false, error: 'فقط برنامه‌های تأییدشده توسط مدیر تولید قابل تبدیل به دستور ساخت کارگاهی هستند.' };
  }

  // Create official Manufacturing Order
  const moResult = createManufacturingOrder({
    partId: plan.partId,
    targetQuantity: plan.proposedQuantity,
    initialInputQuantity: plan.proposedQuantity,
    startDate: plan.estimatedStartDate,
    dueDate: plan.targetDueDate,
    notes: `صادرشده از برنامه ریزی مصوب ${plan.planNumber} نسخه ${plan.planVersion}`,
    createdBy: releasedBy,
  });

  if (!moResult.success || !moResult.data) {
    return { success: false, error: moResult.error || 'خطا در ایجاد دستور ساخت' };
  }

  plan.approvalStatus = 'CONVERTED_TO_MO';
  plan.createdMoId = moResult.data.id;
  plan.updatedAt = new Date().toISOString();

  return { success: true, mo: moResult.data, plan };
}

export function revisePlanVersion(planId: string, modifiedOps: ProposedOperationPlan[], note: string): {
  success: boolean;
  data?: ProductionPlanSuggestion;
  error?: string;
} {
  const plan = planSuggestionsStore.find(p => p.id === planId);
  if (!plan) return { success: false, error: 'برنامه پیشنهادی یافت نشد.' };

  // Parse version e.g. V1.0 -> V1.1
  const currentMajorMinor = plan.planVersion.replace('V', '').split('.');
  const major = parseInt(currentMajorMinor[0] || '1', 10);
  const minor = parseInt(currentMajorMinor[1] || '0', 10) + 1;
  const newVersion = `V${major}.${minor}`;

  plan.planVersion = newVersion;
  plan.proposedOperations = modifiedOps;
  plan.notes = (plan.notes ? `${plan.notes} | ` : '') + `اصلاح به نسخه ${newVersion}: ${note}`;
  plan.updatedAt = new Date().toISOString();

  return { success: true, data: plan };
}

// =========================================================================
// 5. PLANNING DASHBOARD METRICS
// =========================================================================

export function getPlanningDashboardMetrics(): PlanningDashboardMetrics {
  const netReqs = calculateNetRequirements();
  const suggestions = planSuggestionsStore;

  const totalOpenOrders = customerOrdersStore.filter(o => o.status === 'OPEN').length;
  const totalGrossDemand = netReqs.reduce((sum, r) => sum + r.grossDemandQty, 0);
  const totalNetReq = netReqs.reduce((sum, r) => sum + r.netProductionRequirement, 0);
  const totalMaterialShortage = netReqs.reduce((sum, r) => sum + r.materialShortageKg, 0);

  const activeSuggestions = suggestions.filter(s => s.approvalStatus === 'DRAFT_SUGGESTION').length;
  const approvedPlans = suggestions.filter(s => s.approvalStatus === 'APPROVED' || s.approvalStatus === 'CONVERTED_TO_MO').length;
  const infeasiblePlans = suggestions.filter(s => !s.overallFeasible).length;

  // Calculate machine capacity utilization
  const totalCapacity = INITIAL_MACHINES.length * 15;
  const totalWorkload = Object.values(machineWorkloadHoursMap).reduce((s, h) => s + h, 0);
  const avgUtilization = Math.round((totalWorkload / totalCapacity) * 100);

  const criticalParts = netReqs
    .filter(r => r.netProductionRequirement > 0 || r.materialShortageDetected)
    .map(r => ({
      partCode: r.partCode,
      partName: r.partName,
      netShortage: r.netProductionRequirement,
      dueDate: r.dueDate,
      hasMaterialShortage: r.materialShortageDetected,
    }));

  return {
    totalOpenOrdersCount: totalOpenOrders,
    totalGrossDemandPieces: totalGrossDemand,
    totalNetProductionRequirementsPieces: totalNetReq,
    totalMaterialShortageKg: totalMaterialShortage,
    activeSuggestionsCount: activeSuggestions,
    approvedPlansCount: approvedPlans,
    infeasiblePlansCount: infeasiblePlans,
    averageMachineCapacityUtilizationPercent: avgUtilization,
    criticalPartsRequiringImmediateAction: criticalParts,
  };
}
