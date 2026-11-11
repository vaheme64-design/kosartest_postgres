import {
  ManufacturingOrder,
  ManufacturingOperation,
  WipTransfer,
  ProductionActivityLog,
  WipDashboardMetrics,
  MoReconciliationReport,
} from '../types/productionWip';
import { INITIAL_ROUTINGS, INITIAL_PARTS } from './sampleData';

// In-Memory Data Store for Production & WIP Execution
export const manufacturingOrdersStore: ManufacturingOrder[] = [];
export const wipTransfersStore: WipTransfer[] = [];
export const productionLogsStore: ProductionActivityLog[] = [];

// Helper to determine warehouse location based on operation process
function getLocationForProcess(processType: string, stepNumber: number): string {
  switch (processType) {
    case 'SHEARING':
      return 'LOC-RAW-B1';
    case 'BLANKING':
      return 'LOC-WIP-BLANK';
    case 'DRAWING':
      return 'LOC-WIP-DRAWN';
    case 'PUNCH_FORM':
      return 'LOC-WIP-PUNCH';
    case 'BENDING':
      return 'LOC-WIP-BEND';
    case 'SPOT_WELD':
      return 'LOC-WELD-IN';
    case 'CO2_WELD':
      return 'LOC-WELD-OUT';
    case 'PAINT':
      return 'LOC-PAINT-IN';
    case 'ASSEMBLY':
      return 'LOC-FIN-P1';
    default:
      return `LOC-WIP-OP${stepNumber}`;
  }
}

// Initialize Realistic Automotive Sheet Metal Demo MOs
export function initializeProductionWipSeed() {
  if (manufacturingOrdersStore.length > 0) return;

  const rtg206 = INITIAL_ROUTINGS.find(r => r.partCode === 'SAPCO-ASSY-206-001') || INITIAL_ROUTINGS[0];
  const rtgTara = INITIAL_ROUTINGS.find(r => r.partCode === 'SAPCO-ASSY-TAR-002') || INITIAL_ROUTINGS[1];

  // MO-1: Peugot 206 Radiator Crossmember Bracket (SAPCO-ASSY-206-001)
  // Target: 1000 PCS. Initial Input: 1000 Blanks loaded at OP10
  // Multi-step progression with exact quantity conservation
  const mo1Ops: ManufacturingOperation[] = rtg206.operations.map((op, idx) => ({
    id: `MOP-2026-001-${op.stepNumber}`,
    moId: 'MO-2026-001',
    moNumber: 'MO-2026-001',
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? 'COMPLETED' : idx <= 3 ? 'IN_PROGRESS' : 'READY',
    waitingInputQty: 0,
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: new Date(Date.now() - (7 - idx) * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  }));

  // Step 10: Shearing (1000 input -> 990 good + 10 scrap -> 990 transferred out)
  mo1Ops[0].waitingInputQty = 0;
  mo1Ops[0].inProgressQty = 0;
  mo1Ops[0].goodOutputQty = 990;
  mo1Ops[0].scrapQty = 10;
  mo1Ops[0].transferredQty = 990;
  mo1Ops[0].readyForTransferQty = 0;
  mo1Ops[0].status = 'COMPLETED';

  // Step 20: Blanking (received 990 -> 975 good + 15 scrap -> 975 transferred out)
  mo1Ops[1].waitingInputQty = 0;
  mo1Ops[1].inProgressQty = 0;
  mo1Ops[1].goodOutputQty = 975;
  mo1Ops[1].scrapQty = 15;
  mo1Ops[1].transferredQty = 975;
  mo1Ops[1].readyForTransferQty = 0;
  mo1Ops[1].status = 'COMPLETED';

  // Step 30: Punch & Form (received 975 -> 50 in progress, 900 good + 5 scrap + 20 rework)
  // Ready for transfer: 400 (500 already transferred to OP40)
  mo1Ops[2].waitingInputQty = 0;
  mo1Ops[2].inProgressQty = 50;
  mo1Ops[2].goodOutputQty = 900;
  mo1Ops[2].scrapQty = 5;
  mo1Ops[2].reworkQty = 20;
  mo1Ops[2].transferredQty = 500;
  mo1Ops[2].readyForTransferQty = 400; // 900 - 500
  mo1Ops[2].status = 'IN_PROGRESS';

  // Step 40: Bending (received 500 -> 150 waiting, 100 in progress, 240 good + 10 scrap)
  // Ready for transfer: 140 (100 transferred to OP50)
  mo1Ops[3].waitingInputQty = 150;
  mo1Ops[3].inProgressQty = 100;
  mo1Ops[3].goodOutputQty = 240;
  mo1Ops[3].scrapQty = 10;
  mo1Ops[3].transferredQty = 100;
  mo1Ops[3].readyForTransferQty = 140; // 240 - 100
  mo1Ops[3].status = 'IN_PROGRESS';

  // Step 50: Spot Weld (received 100 -> 100 waiting in queue)
  mo1Ops[4].waitingInputQty = 100;
  mo1Ops[4].inProgressQty = 0;
  mo1Ops[4].status = 'READY';

  const mo1: ManufacturingOrder = {
    id: 'MO-2026-001',
    moNumber: 'MO-2026-001',
    partId: rtg206.partId,
    partCode: rtg206.partCode,
    partName: rtg206.partName,
    targetQuantity: 1000,
    initialInputQuantity: 1000,
    completedQuantity: 0,
    totalScrapQuantity: 40, // 10 + 15 + 5 + 10
    totalReworkQuantity: 20,
    totalRejectedQuantity: 0,
    routingId: rtg206.id,
    routingVersion: rtg206.version,
    status: 'IN_PROGRESS',
    startDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10),
    operations: mo1Ops,
    notes: 'سفارش فوری خط مونتاژ ایران‌خودرو - کلاف ورق ST14 ساپکو',
    createdBy: 'مهندس حسینی (مدیر تولید)',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // MO-2: Tara Front Bumper Beam (SAPCO-ASSY-TAR-002) - Multiple MOs support
  const mo2Ops: ManufacturingOperation[] = rtgTara.operations.map((op, idx) => ({
    id: `MOP-2026-002-${op.stepNumber}`,
    moId: 'MO-2026-002',
    moNumber: 'MO-2026-002',
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? 'IN_PROGRESS' : 'PENDING',
    waitingInputQty: idx === 0 ? 300 : 0,
    inProgressQty: idx === 0 ? 200 : 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  }));

  const mo2: ManufacturingOrder = {
    id: 'MO-2026-002',
    moNumber: 'MO-2026-002',
    partId: rtgTara.partId,
    partCode: rtgTara.partCode,
    partName: rtgTara.partName,
    targetQuantity: 500,
    initialInputQuantity: 500,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: rtgTara.id,
    routingVersion: rtgTara.version,
    status: 'IN_PROGRESS',
    startDate: new Date(Date.now() - 12 * 3600 * 1000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 10),
    operations: mo2Ops,
    notes: 'پروژه تارا فاز ۲ - ورق گالوانیزه DX51D ساپکو',
    createdBy: 'مهندس حسینی',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // MO-3: Second batch of Peugot 206 Radiator Crossmember (Same part, independent MO)
  const mo3Ops: ManufacturingOperation[] = rtg206.operations.map((op, idx) => ({
    id: `MOP-2026-003-${op.stepNumber}`,
    moId: 'MO-2026-003',
    moNumber: 'MO-2026-003',
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? 'READY' : 'PENDING',
    waitingInputQty: idx === 0 ? 600 : 0,
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));

  const mo3: ManufacturingOrder = {
    id: 'MO-2026-003',
    moNumber: 'MO-2026-003',
    partId: rtg206.partId,
    partCode: rtg206.partCode,
    partName: rtg206.partName,
    targetQuantity: 600,
    initialInputQuantity: 600,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: rtg206.id,
    routingVersion: rtg206.version,
    status: 'RELEASED',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 96 * 3600 * 1000).toISOString().slice(0, 10),
    operations: mo3Ops,
    notes: 'بچ دوم قطعه ۲۰۶ طبق زمان‌بندی هفتگی',
    createdBy: 'مهندس حسینی',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  manufacturingOrdersStore.push(mo1, mo2, mo3);

  // Seed sample In-Transit Transfers
  wipTransfersStore.push(
    {
      id: 'TRF-2026-001',
      transferNumber: 'TRF-2026-001',
      moId: 'MO-2026-001',
      moNumber: 'MO-2026-001',
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[0].id,
      fromStepNumber: 10,
      fromStepName: mo1Ops[0].stepName,
      fromLocation: mo1Ops[0].warehouseLocation,
      toOperationId: mo1Ops[1].id,
      toStepNumber: 20,
      toStepName: mo1Ops[1].stepName,
      toLocation: mo1Ops[1].warehouseLocation,
      quantity: 990,
      status: 'APPROVED',
      dispatchedBy: 'علی رضایی (سرپرست برش)',
      dispatchedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      receivedBy: 'رضا کریمی (اپراتور پرس ۲۵۰)',
      receivedAt: new Date(Date.now() - 19 * 3600 * 1000).toISOString(),
      notes: 'پالت پلاستیکی کدرنگی آبی حاوی ۹۹۰ شیت نواربری شده',
    },
    {
      id: 'TRF-2026-002',
      transferNumber: 'TRF-2026-002',
      moId: 'MO-2026-001',
      moNumber: 'MO-2026-001',
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[1].id,
      fromStepNumber: 20,
      fromStepName: mo1Ops[1].stepName,
      fromLocation: mo1Ops[1].warehouseLocation,
      toOperationId: mo1Ops[2].id,
      toStepNumber: 30,
      toStepName: mo1Ops[2].stepName,
      toLocation: mo1Ops[2].warehouseLocation,
      quantity: 975,
      status: 'APPROVED',
      dispatchedBy: 'رضا کریمی',
      dispatchedAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
      receivedBy: 'استاد احمدی (پرس شولر ۴۰۰)',
      receivedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      notes: 'بلنک‌های تمیزکاری شده بدون پلیسه',
    },
    {
      id: 'TRF-2026-003',
      transferNumber: 'TRF-2026-003',
      moId: 'MO-2026-001',
      moNumber: 'MO-2026-001',
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[2].id,
      fromStepNumber: 30,
      fromStepName: mo1Ops[2].stepName,
      fromLocation: mo1Ops[2].warehouseLocation,
      toOperationId: mo1Ops[3].id,
      toStepNumber: 40,
      toStepName: mo1Ops[3].stepName,
      toLocation: mo1Ops[3].warehouseLocation,
      quantity: 500,
      status: 'APPROVED',
      dispatchedBy: 'استاد احمدی',
      dispatchedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      receivedBy: 'حسین مرادی (پرس برک)',
      receivedAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
      notes: 'پارت اول انتقال به خم‌کاری',
    },
    {
      id: 'TRF-2026-004',
      transferNumber: 'TRF-2026-004',
      moId: 'MO-2026-001',
      moNumber: 'MO-2026-001',
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[3].id,
      fromStepNumber: 40,
      fromStepName: mo1Ops[3].stepName,
      fromLocation: mo1Ops[3].warehouseLocation,
      toOperationId: mo1Ops[4].id,
      toStepNumber: 50,
      toStepName: mo1Ops[4].stepName,
      toLocation: mo1Ops[4].warehouseLocation,
      quantity: 100,
      status: 'APPROVED',
      dispatchedBy: 'حسین مرادی',
      dispatchedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      receivedBy: 'سعید باقری (پرس‌جوش)',
      receivedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      notes: 'پارت اول خم U جهت پرس‌جوش مهره',
    }
  );
}

// Initialize seed on module load
initializeProductionWipSeed();

export function clearProductionWipData() {
  manufacturingOrdersStore.length = 0;
  wipTransfersStore.length = 0;
  productionLogsStore.length = 0;
}

export function reseedProductionWipData() {
  manufacturingOrdersStore.length = 0;
  wipTransfersStore.length = 0;
  productionLogsStore.length = 0;
  initializeProductionWipSeed();
}

// =========================================================================
// ENGINE CORE FUNCTIONS
// =========================================================================

export function getManufacturingOrdersList(): ManufacturingOrder[] {
  return manufacturingOrdersStore;
}

export function getManufacturingOrderById(id: string): ManufacturingOrder | undefined {
  return manufacturingOrdersStore.find(m => m.id === id || m.moNumber === id);
}

export function createManufacturingOrder(params: {
  partId: string;
  targetQuantity: number;
  initialInputQuantity?: number;
  routingId?: string;
  startDate?: string;
  dueDate?: string;
  notes?: string;
  createdBy: string;
}): { success: boolean; data?: ManufacturingOrder; error?: string } {
  const part = INITIAL_PARTS.find(p => p.id === params.partId || p.code === params.partId);
  if (!part) {
    return { success: false, error: 'قطعه مورد نظر در سیستم یافت نشد.' };
  }

  // Find approved routing for this part
  let routing = params.routingId
    ? INITIAL_ROUTINGS.find(r => r.id === params.routingId)
    : INITIAL_ROUTINGS.find(r => r.partId === part.id || r.partCode === part.code);

  if (!routing) {
    // If no direct routing found, pick first compatible routing as baseline
    routing = INITIAL_ROUTINGS[0];
  }

  const moId = `MO-2026-${String(manufacturingOrdersStore.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const initialInput = params.initialInputQuantity && params.initialInputQuantity > 0
    ? params.initialInputQuantity
    : params.targetQuantity;

  // Generate operations from approved route version
  const operations: ManufacturingOperation[] = routing.operations.map((op, idx) => ({
    id: `MOP-${moId}-${op.stepNumber}`,
    moId,
    moNumber: moId,
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? 'READY' : 'PENDING',
    waitingInputQty: idx === 0 ? initialInput : 0, // Load initial raw material/blanks into OP 1
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: now,
    createdAt: now,
  }));

  const newMo: ManufacturingOrder = {
    id: moId,
    moNumber: moId,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    targetQuantity: params.targetQuantity,
    initialInputQuantity: initialInput,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: routing.id,
    routingVersion: routing.version,
    status: 'RELEASED',
    startDate: params.startDate || now.slice(0, 10),
    dueDate: params.dueDate || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    operations,
    notes: params.notes || `دستور کار تولید مبتنی بر مسیر فرآیند مصوب نسخه ${routing.version}`,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  manufacturingOrdersStore.unshift(newMo);

  // Log activity
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId,
    moNumber: moId,
    operationId: operations[0].id,
    stepNumber: operations[0].stepNumber,
    stepName: operations[0].stepName,
    activityType: 'INPUT_LOAD',
    quantity: initialInput,
    operatorName: params.createdBy,
    timestamp: now,
    notes: `بارگذاری اولیه مواد/شیت به مرحله ۱ (${operations[0].stepName})`,
  });

  return { success: true, data: newMo };
}

// Register Input Quantity (Start processing at machine)
export function registerOperationInput(params: {
  moId: string;
  operationId: string;
  quantity: number;
  operatorName: string;
  machineId?: string;
  notes?: string;
}): { success: boolean; data?: ManufacturingOrder; error?: string } {
  const mo = manufacturingOrdersStore.find(m => m.id === params.moId);
  if (!mo) return { success: false, error: 'دستور تولید یافت نشد.' };

  const op = mo.operations.find(o => o.id === params.operationId);
  if (!op) return { success: false, error: 'مرحله عملیاتی یافت نشد.' };

  if (params.quantity <= 0) {
    return { success: false, error: 'مقدار ورودی باید بزرگتر از صفر باشد.' };
  }

  if (params.quantity > op.waitingInputQty) {
    return {
      success: false,
      error: `موجودی در انتظار برای شروع پردازش کافی نیست. موجودی در انتظار: ${op.waitingInputQty}، مقدار درخواستی: ${params.quantity}`,
    };
  }

  // State Transition & Conservation
  op.waitingInputQty -= params.quantity;
  op.inProgressQty += params.quantity;
  op.status = 'IN_PROGRESS';
  op.lastActivityAt = new Date().toISOString();
  if (params.machineId) op.machineId = params.machineId;

  mo.status = 'IN_PROGRESS';
  mo.updatedAt = new Date().toISOString();

  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: op.id,
    stepNumber: op.stepNumber,
    stepName: op.stepName,
    activityType: 'INPUT_LOAD',
    quantity: params.quantity,
    operatorName: params.operatorName,
    machineId: params.machineId,
    timestamp: new Date().toISOString(),
    notes: params.notes,
  });

  return { success: true, data: mo };
}

// Register Operation Production (Good, Scrap, Rework, Rejected)
export function registerOperationProduction(params: {
  moId: string;
  operationId: string;
  goodQty: number;
  scrapQty: number;
  reworkQty?: number;
  rejectedQty?: number;
  scrapReason?: string;
  operatorName: string;
  machineId?: string;
  notes?: string;
}): { success: boolean; data?: ManufacturingOrder; error?: string } {
  const mo = manufacturingOrdersStore.find(m => m.id === params.moId);
  if (!mo) return { success: false, error: 'دستور تولید یافت نشد.' };

  const op = mo.operations.find(o => o.id === params.operationId);
  if (!op) return { success: false, error: 'مرحله عملیاتی یافت نشد.' };

  const good = Math.max(0, Number(params.goodQty) || 0);
  const scrap = Math.max(0, Number(params.scrapQty) || 0);
  const rework = Math.max(0, Number(params.reworkQty) || 0);
  const rejected = Math.max(0, Number(params.rejectedQty) || 0);
  const totalReported = good + scrap + rework + rejected;

  if (totalReported <= 0) {
    return { success: false, error: 'حداقل یکی از مقادیر تولید سالم، ضایعات یا دوباره‌کاری باید ثبت شود.' };
  }

  if (totalReported > op.inProgressQty) {
    return {
      success: false,
      error: `مجموع قطعات اعلامی (${totalReported}) از موجودی در حال ساخت پای دستگاه (${op.inProgressQty}) بیشتر است.`,
    };
  }

  if (scrap > 0 && !params.scrapReason) {
    return { success: false, error: 'در صورت وجود ضایعات، انتخاب علت ضایعات الزامی است.' };
  }

  // Atomically update operation quantities:
  op.inProgressQty -= totalReported;
  op.goodOutputQty += good;
  op.readyForTransferQty += good; // IMPORTANT: Good output is NOT transferred automatically! It is ready for explicit transfer
  op.scrapQty += scrap;
  op.reworkQty += rework;
  op.rejectedQty += rejected;
  op.lastActivityAt = new Date().toISOString();

  // If all in-progress and waiting is processed, status becomes ready or completed
  if (op.inProgressQty === 0 && op.waitingInputQty === 0) {
    op.status = op.readyForTransferQty > 0 ? 'READY' : 'COMPLETED';
  }

  // Update MO Cumulative Totals:
  mo.totalScrapQuantity += scrap;
  mo.totalReworkQuantity += rework;
  mo.totalRejectedQuantity += rejected;

  // Check if this is the final operation in the route:
  const isFinalOperation = op.sequence === mo.operations.length;
  if (isFinalOperation) {
    mo.completedQuantity += good;
    if (mo.completedQuantity >= mo.targetQuantity) {
      mo.status = 'COMPLETED';
      mo.closedAt = new Date().toISOString();
    }
  }

  mo.updatedAt = new Date().toISOString();

  // Log activity
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: op.id,
    stepNumber: op.stepNumber,
    stepName: op.stepName,
    activityType: 'PRODUCTION_RUN',
    quantity: totalReported,
    goodQty: good,
    scrapQty: scrap,
    reworkQty: rework,
    rejectedQty: rejected,
    scrapReason: params.scrapReason,
    operatorName: params.operatorName,
    machineId: params.machineId,
    timestamp: new Date().toISOString(),
    notes: params.notes,
  });

  return { success: true, data: mo };
}

// Create Inter-Operation Transfer (Dispatches output from ready-for-transfer into in-transit)
export function createOperationTransfer(params: {
  moId: string;
  fromOperationId: string;
  toOperationId: string;
  quantity: number;
  dispatchedBy: string;
  notes?: string;
}): { success: boolean; data?: WipTransfer; error?: string } {
  const mo = manufacturingOrdersStore.find(m => m.id === params.moId);
  if (!mo) return { success: false, error: 'دستور تولید یافت نشد.' };

  const fromOp = mo.operations.find(o => o.id === params.fromOperationId);
  if (!fromOp) return { success: false, error: 'مرحله مبدأ یافت نشد.' };

  const qty = Number(params.quantity);
  if (qty <= 0) return { success: false, error: 'تعداد انتقال باید بزرگتر از صفر باشد.' };

  if (qty > fromOp.readyForTransferQty) {
    return {
      success: false,
      error: `موجودی آماده انتقال (${fromOp.readyForTransferQty}) کمتر از مقدار درخواستی (${qty}) است.`,
    };
  }

  let toStepNumber = 999;
  let toStepName = 'انبار محصول نهایی';
  let toLocation = 'LOC-FIN-P1';

  if (params.toOperationId !== 'STORE-FINISHED') {
    const toOp = mo.operations.find(o => o.id === params.toOperationId);
    if (!toOp) return { success: false, error: 'مرحله مقصد یافت نشد.' };
    toStepNumber = toOp.stepNumber;
    toStepName = toOp.stepName;
    toLocation = toOp.warehouseLocation;
  }

  // Atomically hold from source operation:
  fromOp.readyForTransferQty -= qty;
  fromOp.transferredQty += qty;
  fromOp.lastActivityAt = new Date().toISOString();

  const transferNumber = `TRF-2026-${String(wipTransfersStore.length + 1).padStart(3, '0')}`;
  const transfer: WipTransfer = {
    id: transferNumber,
    transferNumber,
    moId: mo.id,
    moNumber: mo.moNumber,
    partId: mo.partId,
    partCode: mo.partCode,
    partName: mo.partName,
    fromOperationId: fromOp.id,
    fromStepNumber: fromOp.stepNumber,
    fromStepName: fromOp.stepName,
    fromLocation: fromOp.warehouseLocation,
    toOperationId: params.toOperationId,
    toStepNumber,
    toStepName,
    toLocation,
    quantity: qty,
    status: 'PENDING_APPROVAL',
    dispatchedBy: params.dispatchedBy,
    dispatchedAt: new Date().toISOString(),
    notes: params.notes,
  };

  wipTransfersStore.unshift(transfer);

  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: fromOp.id,
    stepNumber: fromOp.stepNumber,
    stepName: fromOp.stepName,
    activityType: 'TRANSFER_DISPATCH',
    quantity: qty,
    operatorName: params.dispatchedBy,
    timestamp: new Date().toISOString(),
    notes: `ارسال محموله شماره ${transferNumber} به ${toStepName} (در انتظار تأیید و تحویل)`,
  });

  return { success: true, data: transfer };
}

// Approve & Receive Transfer (Credits destination operation's waiting input)
export function approveOperationTransfer(params: {
  transferId: string;
  receivedBy: string;
  notes?: string;
}): { success: boolean; data?: WipTransfer; error?: string } {
  const transfer = wipTransfersStore.find(t => t.id === params.transferId || t.transferNumber === params.transferId);
  if (!transfer) return { success: false, error: 'حواله انتقال یافت نشد.' };

  if (transfer.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'این حواله قبلاً تعیین تکلیف شده است.' };
  }

  const mo = manufacturingOrdersStore.find(m => m.id === transfer.moId);
  if (!mo) return { success: false, error: 'دستور تولید متناظر یافت نشد.' };

  // If transfer to next operation:
  if (transfer.toOperationId !== 'STORE-FINISHED') {
    const toOp = mo.operations.find(o => o.id === transfer.toOperationId);
    if (!toOp) return { success: false, error: 'مرحله مقصد یافت نشد.' };

    // Credit destination operation
    toOp.waitingInputQty += transfer.quantity;
    if (toOp.status === 'PENDING') toOp.status = 'READY';
    toOp.lastActivityAt = new Date().toISOString();
  }

  transfer.status = 'APPROVED';
  transfer.receivedBy = params.receivedBy;
  transfer.receivedAt = new Date().toISOString();
  if (params.notes) transfer.notes = (transfer.notes ? `${transfer.notes} | ` : '') + params.notes;

  mo.updatedAt = new Date().toISOString();

  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: transfer.toOperationId,
    stepNumber: transfer.toStepNumber,
    stepName: transfer.toStepName,
    activityType: 'TRANSFER_RECEIVE',
    quantity: transfer.quantity,
    operatorName: params.receivedBy,
    timestamp: new Date().toISOString(),
    notes: `تحویل قطعی حواله شماره ${transfer.transferNumber} در مقصد`,
  });

  return { success: true, data: transfer };
}

// Reject Transfer (Returns quantity back to source operation ready-for-transfer)
export function rejectOperationTransfer(params: {
  transferId: string;
  rejectedBy: string;
  rejectionReason: string;
}): { success: boolean; data?: WipTransfer; error?: string } {
  const transfer = wipTransfersStore.find(t => t.id === params.transferId);
  if (!transfer) return { success: false, error: 'حواله انتقال یافت نشد.' };

  if (transfer.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'امکان رد این حواله وجود ندارد.' };
  }

  const mo = manufacturingOrdersStore.find(m => m.id === transfer.moId);
  if (!mo) return { success: false, error: 'دستور تولید متناظر یافت نشد.' };

  const fromOp = mo.operations.find(o => o.id === transfer.fromOperationId);
  if (!fromOp) return { success: false, error: 'مرحله مبدأ یافت نشد.' };

  // Return quantity to source ready-for-transfer
  fromOp.readyForTransferQty += transfer.quantity;
  fromOp.transferredQty -= transfer.quantity;
  fromOp.lastActivityAt = new Date().toISOString();

  transfer.status = 'REJECTED';
  transfer.rejectionReason = params.rejectionReason;

  return { success: true, data: transfer };
}

// Calculate Mathematical Reconciliation (Law of Conservation of Mass/Parts)
export function calculateMoReconciliation(moId: string): MoReconciliationReport | null {
  const mo = manufacturingOrdersStore.find(m => m.id === moId);
  if (!mo) return null;

  let totalWaiting = 0;
  let totalInProgress = 0;
  let totalReady = 0;
  let totalScrap = 0;
  let totalRework = 0;
  let totalRejected = 0;

  const operationsBreakdown = mo.operations.map(op => {
    totalWaiting += op.waitingInputQty;
    totalInProgress += op.inProgressQty;
    totalReady += op.readyForTransferQty;
    totalScrap += op.scrapQty;
    totalRework += op.reworkQty;
    totalRejected += op.rejectedQty;

    return {
      stepNumber: op.stepNumber,
      stepCode: op.stepCode,
      stepName: op.stepName,
      waitingInput: op.waitingInputQty,
      inProgress: op.inProgressQty,
      readyForTransfer: op.readyForTransferQty,
      transferredOut: op.transferredQty,
      scrap: op.scrapQty,
      rework: op.reworkQty,
      rejected: op.rejectedQty,
    };
  });

  // Calculate In-Transit (transfers for this MO that are dispatched but not yet approved)
  const inTransitTransfers = wipTransfersStore.filter(
    t => t.moId === mo.id && t.status === 'PENDING_APPROVAL'
  );
  const totalInTransit = inTransitTransfers.reduce((sum, t) => sum + t.quantity, 0);

  const totalCurrentWip = totalWaiting + totalInProgress + totalReady;
  const totalCompleted = mo.completedQuantity;

  // Accounted Total = Current Good WIP (Waiting + InProgress + Ready) + In-Transit + Completed + Scrap + Rework + Rejected
  const accountedTotal = totalCurrentWip + totalInTransit + totalCompleted + totalScrap + totalRework + totalRejected;
  const discrepancy = accountedTotal - mo.initialInputQuantity;

  return {
    moId: mo.id,
    moNumber: mo.moNumber,
    partCode: mo.partCode,
    partName: mo.partName,
    initialInputQuantity: mo.initialInputQuantity,
    totalCurrentWip,
    totalInTransit,
    totalCompleted,
    totalScrap,
    totalRework,
    totalRejected,
    accountedTotal,
    discrepancy,
    isConserved: discrepancy === 0,
    operationsBreakdown,
    auditTimestamp: new Date().toISOString(),
  };
}

// Compute Aggregate WIP Dashboard Metrics
export function getWipDashboardMetrics(): WipDashboardMetrics {
  let totalWaitingQty = 0;
  let totalInProgressQty = 0;
  let totalReadyForTransferQty = 0;
  let totalCompletedQty = 0;
  let totalScrapQty = 0;
  let totalReworkQty = 0;
  let totalRejectedQty = 0;

  const operationStatsMap = new Map<string, {
    operationName: string;
    stepCode: string;
    waitingQty: number;
    inProgressQty: number;
    readyQty: number;
    totalAgingHours: number;
    count: number;
  }>();

  const nowMs = Date.now();

  manufacturingOrdersStore.forEach(mo => {
    totalCompletedQty += mo.completedQuantity;
    totalScrapQty += mo.totalScrapQuantity;
    totalReworkQty += mo.totalReworkQuantity;
    totalRejectedQty += mo.totalRejectedQuantity;

    mo.operations.forEach(op => {
      totalWaitingQty += op.waitingInputQty;
      totalInProgressQty += op.inProgressQty;
      totalReadyForTransferQty += op.readyForTransferQty;

      const key = `${op.stepCode}_${op.stepName}`;
      const existing = operationStatsMap.get(key) || {
        operationName: op.stepName,
        stepCode: op.stepCode,
        waitingQty: 0,
        inProgressQty: 0,
        readyQty: 0,
        totalAgingHours: 0,
        count: 0,
      };

      existing.waitingQty += op.waitingInputQty;
      existing.inProgressQty += op.inProgressQty;
      existing.readyQty += op.readyForTransferQty;

      const actTime = new Date(op.lastActivityAt || op.createdAt).getTime();
      const hoursAgo = Math.max(0, (nowMs - actTime) / (3600 * 1000));
      existing.totalAgingHours += hoursAgo;
      existing.count += 1;

      operationStatsMap.set(key, existing);
    });
  });

  const pendingTransfers = wipTransfersStore.filter(t => t.status === 'PENDING_APPROVAL');
  const totalInTransitQty = pendingTransfers.reduce((s, t) => s + t.quantity, 0);

  // Check conservation for all MOs
  const allConserved = manufacturingOrdersStore.every(mo => {
    const rec = calculateMoReconciliation(mo.id);
    return rec ? rec.isConserved : true;
  });

  const bottleneckOperations = Array.from(operationStatsMap.values())
    .map(stat => ({
      operationName: stat.operationName,
      stepCode: stat.stepCode,
      waitingQty: stat.waitingQty,
      inProgressQty: stat.inProgressQty,
      readyQty: stat.readyQty,
      agingHoursAvg: stat.count > 0 ? Math.round((stat.totalAgingHours / stat.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => (b.waitingQty + b.inProgressQty) - (a.waitingQty + a.inProgressQty));

  return {
    totalMoCount: manufacturingOrdersStore.length,
    activeMoCount: manufacturingOrdersStore.filter(m => m.status === 'IN_PROGRESS' || m.status === 'RELEASED').length,
    totalWaitingQty,
    totalInProgressQty,
    totalReadyForTransferQty,
    totalInTransitQty,
    totalCompletedQty,
    totalScrapQty,
    totalReworkQty,
    totalRejectedQty,
    overallConservationIntegrity: allConserved,
    bottleneckOperations,
    pendingTransfersCount: pendingTransfers.length,
  };
}
