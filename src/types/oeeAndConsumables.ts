/**
 * KPIMS - OEE (Overall Equipment Effectiveness), Machine Utilization & Consumables Forecasting Types
 * تعاریف تایپ‌های ماژول OEE، ماژول گزارش بهره ماشین و ماژول پیش‌بینی مواد مصرفی خط تولید
 */

import { ProcessType } from './inventory';

// ============================================================================
// 1. MACHINE UTILIZATION REPORT TYPES (ماژول گزارش بهره ماشین)
// ============================================================================

export type ShiftFilterKey = 'ALL' | 'MORNING' | 'EVENING' | 'NIGHT';

export interface MachineDowntimeReason {
  reasonCode: string;
  reasonTitleFa: string;
  category: 'PLANNED' | 'UNPLANNED';
  durationMinutes: number;
  occurrencesCount: number;
  sharePercent: number;
}

export interface MachineUtilizationItem {
  machineId: string;
  machineCode: string;
  machineName: string;
  hallName: string;
  processType: ProcessType;
  tonnage: number;
  operatorName: string;
  shift: ShiftFilterKey;
  shiftLabelFa: string;

  // Time Breakdown (Hours)
  calendarAvailableHours: number;     // کل ساعات تقویمی شیفت‌ها (مثلاً ۱۵ ساعت در روز)
  plannedDowntimeHours: number;       // توقفات برنامه‌ریزی‌شده (تعویض قالب SMED، سرویس PM، استراحت)
  unplannedDowntimeHours: number;     // توقفات اضطراری (خرابی هیدرولیک/برق، شکستگی سنبه، انتظار کلاف)
  idleNoOrderHours: number;           // ساعات بیکاری / عدم تخصیص دستور کار
  netOperatingHours: number;          // ساعات کارکرد خالص تولیدی روی قطعه

  // Efficiency & Utilization Percentages
  grossUtilizationPercent: number;    // بهره‌وری کل تقویمی = (ساعات کارکرد خالص / کل ساعات تقویمی) * 100
  netLoadingEfficiencyPercent: number;// راندمان بارگذاری خالص = (ساعات کارکرد خالص / زمان در دسترس پس از کسر PM) * 100
  tonnageLoadPercent: number;         // درصد بار تناژ قالب نسبت به تناژ اسمی پرس

  // Stroke & Speed Metrics
  nominalSpm: number;                 // سرعت ضرب در دقیقه اسمی دستگاه
  actualAvgSpm: number;               // سرعت ضرب در دقیقه واقعی ثبت‌شده
  spmEfficiencyPercent: number;       // راندمان سرعت ضرب

  // Output & Energy
  totalStrokesCount: number;          // کل تعداد ضرب ثبت‌شده
  goodPartsProduced: number;          // تعداد قطعات سالم تولیدی
  scrapPartsCount: number;            // تعداد ضایعات
  activeMoNumber: string;             // دستور کار فعال روی دستگاه
  activePartName: string;             // نام قطعه در حال تولید
  activeDieCode: string;              // کد قالب نصب‌شده روی میز پرس
  dieChangeoverCount: number;         // تعداد دفعات تعویض قالب در دوره
  avgDieChangeoverMinutes: number;    // میانگین زمان تعویض قالب (SMED)
  estimatedEnergyKwh: number;         // مصرف برق تخمینی (kWh)

  status: 'ACTIVE' | 'MAINTENANCE' | 'IDLE';
  utilizationStatus: 'BOTTLENECK_OVERLOAD' | 'OPTIMAL' | 'UNDER_UTILIZED' | 'DOWNTIME_ALERT';
  downtimeBreakdown: MachineDowntimeReason[];
}

export interface MachineUtilizationSummary {
  generatedAt: string;
  periodLabelFa: string;
  totalMachinesCount: number;
  activeMachinesCount: number;
  maintenanceMachinesCount: number;

  totalCalendarHours: number;
  totalNetOperatingHours: number;
  totalPlannedDowntimeHours: number;
  totalUnplannedDowntimeHours: number;
  totalIdleHours: number;

  averageGrossUtilizationPercent: number;
  averageNetLoadingEfficiencyPercent: number;
  averageSpmEfficiencyPercent: number;
  totalStrokesExecuted: number;
  totalGoodPartsProduced: number;
  bottleneckMachinesCount: number;

  topDowntimeCauses: {
    reasonTitleFa: string;
    category: 'PLANNED' | 'UNPLANNED';
    totalHours: number;
    sharePercent: number;
    recommendedAction: string;
  }[];

  machines: MachineUtilizationItem[];
}

// ============================================================================
// 2. OEE MODULE TYPES (ماژول اثربخشی کلی تجهیزات - OEE & Six Big Losses)
// ============================================================================

export type BigLossCategory = 'AVAILABILITY_LOSS' | 'PERFORMANCE_LOSS' | 'QUALITY_LOSS';

export interface SixBigLossesItem {
  lossNumber: 1 | 2 | 3 | 4 | 5 | 6;
  lossCode: string;
  lossTitleFa: string;
  lossTitleEn: string;
  oeeFactor: BigLossCategory;
  oeeFactorLabelFa: 'دسترس‌پذیری (Availability)' | 'عملکرد و سرعت (Performance)' | 'کیفیت (Quality)';
  lostTimeMinutes: number;
  lostPiecesEquivalent: number;
  shareOfTotalLossPercent: number;
  rootCauseExampleFa: string;
  kaizenActionFa: string;
}

export interface OeeMachineDowntimeLogItem {
  id: string;
  reasonCode: string;
  reasonTitleFa: string;
  category: 'UNPLANNED_BREAKDOWN' | 'PLANNED_SETUP' | 'MINOR_STOP';
  categoryLabelFa: string;
  durationMinutes: number;
  occurrencesCount: number;
  sharePercent: number;
  timeRangeFa: string;
  shiftLabelFa: string;
  operatorOrTechName: string;
  rootCauseFa: string;
  correctiveActionFa: string;
}

export interface OeeMachineRecord {
  machineId: string;
  machineCode: string;
  machineName: string;
  hallName: string;
  processType: ProcessType;
  tonnage: number;
  activePartCode: string;
  activePartName: string;
  operatorName?: string;
  status?: string;

  // Core OEE Factors (0 - 100%)
  availabilityPercent: number;        // دسترس‌پذیری (A)
  performancePercent: number;         // عملکرد / سرعت (P)
  qualityPercent: number;             // کیفیت (Q)
  oeePercent: number;                 // OEE = (A * P * Q) / 10000
  teepPercent: number;                // بهره‌وری کل تقویمی (TEEP)
  worldClassTargetPercent: number;    // استاندارد جهانی خودروسازی (85%)
  varianceFromTargetPercent: number;  // فاصله با هدف (مثبت یا منفی)

  // Time Metrics (Minutes per Shift/Day)
  plannedProductionMinutes: number;   // زمان برنامه‌ریزی‌شده تولید
  downtimeLossMinutes: number;        // کل توقفات (خرابی + تعویض قالب)
  plannedDowntimeMinutes?: number;    // توقفات برنامه‌ریزی‌شده و تعویض قالب (SMED / PM)
  unplannedDowntimeMinutes?: number;  // توقفات برنامه‌ریزی‌نشده و خرابی اضطراری
  minorStopLossMinutes?: number;      // توقفات جزئی و گیر کردن فیدر
  operatingRunMinutes: number;        // زمان کارکرد واقعی (Run Time)
  speedLossMinutes: number;           // افت زمان ناشی از کاهش سرعت و توقفات جزئی
  netOperatingMinutes: number;        // زمان کارکرد خالص
  qualityLossMinutes: number;         // زمان تلف‌شده بابت تولید ضایعات
  fullyProductiveMinutes: number;     // زمان کاملاً اثربخش (Value-Adding Time)

  // Reliability KPIs
  mtbfHours: number;                  // میانگین زمان بین دو خرابی (MTBF)
  mttrMinutes: number;                // میانگین زمان تعمیر (MTTR)
  idealCycleTimeSeconds: number;      // زمان سیکل ایده‌آل هر ضرب (ثانیه)
  actualCycleTimeSeconds: number;     // زمان سیکل واقعی هر ضرب (ثانیه)
  totalProducedPieces: number;        // کل قطعات تولیدی
  goodPieces: number;                 // قطعات سالم تاییدشده QC
  scrapAndReworkPieces: number;       // قطعات ضایعاتی و دوباره‌کاری
  firstPassYieldPercent: number;      // نرخ عبوری بار اول (FPY)

  gradeClass: 'WORLD_CLASS_A' | 'ACCEPTABLE_B' | 'NEEDS_IMPROVEMENT_C' | 'CRITICAL_D';
  sixBigLosses: SixBigLossesItem[];
  downtimeBreakdown?: MachineDowntimeReason[];
  downtimeLogs?: OeeMachineDowntimeLogItem[];
}

export interface OeeDashboardSummary {
  generatedAt: string;
  plantOeePercent: number;
  plantAvailabilityPercent: number;
  plantPerformancePercent: number;
  plantQualityPercent: number;
  plantTeepPercent: number;
  worldClassBenchmarkOee: number;     // 85.0%
  avgMtbfHours: number;
  avgMttrMinutes: number;
  totalHiddenCapacityPiecesPerMonth: number; // ظرفیت پنهان قابل آزادسازی با رسیدن به OEE 85%

  sixBigLossesAggregate: SixBigLossesItem[];
  machines: OeeMachineRecord[];
  shiftComparison: {
    shiftCode: 'MORNING' | 'EVENING' | 'NIGHT';
    shiftNameFa: string;
    supervisorName: string;
    availabilityPercent: number;
    performancePercent: number;
    qualityPercent: number;
    oeePercent: number;
    totalPieces: number;
  }[];
}

// ============================================================================
// 3. CONSUMABLES FORECASTING MODULE TYPES (ماژول پیش‌بینی مواد مصرفی)
// ============================================================================

export type ConsumableCategory =
  | 'WELDING_CONSUMABLES'
  | 'PRESS_LUBRICANTS'
  | 'DIE_SPAREPARTS'
  | 'COATING_CHEMICALS'
  | 'PACKAGING_SAFETY';

export interface ConsumableForecastItem {
  id: string;
  code: string;
  name: string;
  category: ConsumableCategory;
  categoryLabelFa: string;
  unit: string;
  warehouseLocation: string;

  // Engineering Consumption Driver
  consumptionDriverType: 'PER_1000_STROKES' | 'PER_1000_SPOT_WELDS' | 'PER_METER_CO2_WELD' | 'PER_TON_SHEET' | 'PER_MACHINE_HOUR' | 'PER_PALLET_PACKED';
  consumptionDriverLabelFa: string;
  standardRatePerDriverUnit: number;  // ضریب مصرف استاندارد مهندسی
  wasteAllowancePercent: number;      // درصد پرت مجاز

  // Current & Forecasted Demand
  plannedDriverActivityVolume: number;// حجم فعالیت برنامه‌ریزی‌شده در افق پیش‌بینی (مثلاً ۴۵۰ هزار ضرب)
  dailyBurnRate: number;              // نرخ مصرف روزانه فعلی
  forecastedGrossRequirement: number; // نیاز ناخالص پیش‌بینی‌شده در افق زمانی

  // Inventory & Reorder Metrics
  currentStock: number;               // موجودی آزاد فعلی در انبار ملزومات
  reservedOrQuarantined: number;      // رزرو یا مسدود
  minSafetyStock: number;             // حداقل موجودی اطمینان (Safety Stock)
  reorderPoint: number;               // نقطه سفارش مجدد (ROP)
  supplierLeadTimeDays: number;       // مدت زمان تحویل تامین‌کننده (روز)
  daysOfSupplyRemaining: number;      // تعداد روز پوشش موجودی فعلی (Days of Inventory)
  estimatedRunOutDateFa: string;      // تاریخ شمسی تخمینی اتمام موجودی

  // Shortage & Purchase Suggestion
  netShortageQty: number;             // کسری خالص نسبت به نیاز دوره + موجودی اطمینان
  suggestedOrderQty: number;          // مقدار سفارش خرید پیشنهادی (با ضریب بسته استاندارد)
  estimatedUnitPriceRials: number;    // قیمت واحد تخمینی (ریال)
  estimatedTotalOrderCostRials: number; // ارزش ریالی سفارش پیشنهادی
  preferredSupplierName: string;      // تامین‌کننده منتخب

  status: 'CRITICAL_SHORTAGE' | 'BELOW_ROP' | 'ADEQUATE';
  consumedByMachinesOrLines: string[];
}

export interface PurchaseRequisitionRecord {
  id: string;
  prNumber: string;
  createdAt: string;
  createdAtFa: string;
  requestedBy: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'NORMAL';
  status: 'PENDING_APPROVAL' | 'APPROVED_BY_PLANT_MGR' | 'SENT_TO_PROCUREMENT';
  itemsCount: number;
  totalEstimatedCostRials: number;
  lines: {
    consumableCode: string;
    consumableName: string;
    unit: string;
    currentStock: number;
    orderQuantity: number;
    estimatedCostRials: number;
    supplierName: string;
  }[];
  notes: string;
}

export interface ConsumablesForecastSummary {
  generatedAt: string;
  horizonDays: number;
  demandGrowthPercent: number;
  totalItemsCount: number;
  criticalShortageCount: number;
  belowReorderPointCount: number;
  adequateStockCount: number;
  totalSuggestedProcurementBudgetRials: number;
  lowestDaysOfSupplyItem: {
    code: string;
    name: string;
    daysRemaining: number;
  } | null;

  items: ConsumableForecastItem[];
  activeRequisitions: PurchaseRequisitionRecord[];
}
