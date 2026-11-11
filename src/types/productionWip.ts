import { ProcessType, UnitOfMeasure } from './inventory';

export type ManufacturingOrderStatus =
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type OperationExecutionStatus =
  | 'PENDING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type WipTransferStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface ManufacturingOperation {
  id: string;
  moId: string;
  moNumber: string;
  stepNumber: number;          // 10, 20, 30...
  stepCode: string;            // OP10_SHEAR, OP20_BLANK...
  stepName: string;            // برش و نواربری، بلنکینگ...
  processType: ProcessType;
  sequence: number;            // 1, 2, 3...
  machineId?: string;
  machineName?: string;
  dieMoldId?: string;
  dieMoldName?: string;
  warehouseLocation: string;   // e.g. LOC-WIP-BLANK, LOC-WIP-DRAWN
  status: OperationExecutionStatus;

  // Exact Quantities for strict mass/part conservation:
  waitingInputQty: number;     // موجودی در انتظار پردازش (ورودی دریافت شده از مرحله قبل یا انبار مواد)
  inProgressQty: number;       // موجودی پای کار / در حال اجرای دستگاه
  goodOutputQty: number;       // مجموع قطعات سالم تولید شده
  scrapQty: number;            // ضایعات قطعی و غیرقابل بازیافت
  reworkQty: number;           // قطعات نیازمند دوباره‌کاری (Rework)
  rejectedQty: number;         // قطعات نامنطبق در قرنطینه کیفی
  readyForTransferQty: number; // تولید سالم آماده ارسال به مرحله بعد = goodOutputQty - transferredQty
  transferredQty: number;      // مقداری که با حواله تأیید شده به مرحله بعد ارسال شده است

  standardCycleTimeSec: number;
  scrapNormPercent: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ManufacturingOrder {
  id: string;
  moNumber: string;            // e.g. MO-2026-001
  partId: string;
  partCode: string;
  partName: string;
  targetQuantity: number;      // تعداد برنامه‌ریزی شده برای ساخت (PCS)
  initialInputQuantity: number;// کل ماده اولیه / شیت وارد شده به مرحله اول
  completedQuantity: number;   // تعداد سالم خروجی از آخرین مرحله ساخت
  totalScrapQuantity: number;  // مجموع کل ضایعات تمام مراحل
  totalReworkQuantity: number; // مجموع قطعات دوباره‌کاری
  totalRejectedQuantity: number;// مجموع قطعات نامنطبق
  routingId: string;
  routingVersion: string;      // e.g. V2.1 (route versioning)
  status: ManufacturingOrderStatus;
  startDate: string;
  dueDate: string;
  closedAt?: string;
  operations: ManufacturingOperation[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WipTransfer {
  id: string;
  transferNumber: string;      // e.g. TRF-2026-001
  moId: string;
  moNumber: string;
  partId: string;
  partCode: string;
  partName: string;
  fromOperationId: string;
  fromStepNumber: number;
  fromStepName: string;
  fromLocation: string;
  toOperationId: string;       // ID of next operation or 'STORE-FINISHED'
  toStepNumber: number;
  toStepName: string;
  toLocation: string;
  quantity: number;            // تعداد منتقله
  status: WipTransferStatus;
  dispatchedBy: string;
  dispatchedAt: string;
  receivedBy?: string;
  receivedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface ProductionActivityLog {
  id: string;
  moId: string;
  moNumber: string;
  operationId: string;
  stepNumber: number;
  stepName: string;
  activityType:
    | 'INPUT_LOAD'
    | 'PRODUCTION_RUN'
    | 'SCRAP_REGISTER'
    | 'REWORK_REGISTER'
    | 'TRANSFER_DISPATCH'
    | 'TRANSFER_RECEIVE';
  quantity: number;
  goodQty?: number;
  scrapQty?: number;
  reworkQty?: number;
  rejectedQty?: number;
  operatorName: string;
  machineId?: string;
  scrapReason?: string;
  timestamp: string;
  notes?: string;
}

export interface WipDashboardMetrics {
  totalMoCount: number;
  activeMoCount: number;
  totalWaitingQty: number;
  totalInProgressQty: number;
  totalReadyForTransferQty: number;
  totalInTransitQty: number;
  totalCompletedQty: number;
  totalScrapQty: number;
  totalReworkQty: number;
  totalRejectedQty: number;
  overallConservationIntegrity: boolean;
  bottleneckOperations: {
    operationName: string;
    stepCode: string;
    waitingQty: number;
    inProgressQty: number;
    readyQty: number;
    agingHoursAvg: number;
  }[];
  pendingTransfersCount: number;
}

export interface MoReconciliationReport {
  moId: string;
  moNumber: string;
  partCode: string;
  partName: string;
  initialInputQuantity: number;
  totalCurrentWip: number;     // sum of waitingInput + inProgress + readyForTransfer
  totalInTransit: number;      // pending approved transfers
  totalCompleted: number;      // finished output
  totalScrap: number;          // cumulative scrap
  totalRework: number;         // rework
  totalRejected: number;       // rejected
  accountedTotal: number;      // Wip + InTransit + Completed + Scrap + Rejected
  discrepancy: number;         // accountedTotal - initialInputQuantity (MUST BE ZERO)
  isConserved: boolean;        // true if discrepancy === 0
  operationsBreakdown: {
    stepNumber: number;
    stepCode: string;
    stepName: string;
    waitingInput: number;
    inProgress: number;
    readyForTransfer: number;
    transferredOut: number;
    scrap: number;
    rework: number;
    rejected: number;
  }[];
  auditTimestamp: string;
}
