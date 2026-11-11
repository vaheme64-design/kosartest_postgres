/**
 * KPIMS - OEE, Machine Utilization & Consumables Forecasting Engine
 * موتور محاسباتی ماژول OEE، ماژول گزارش بهره ماشین و ماژول پیش‌بینی مواد مصرفی کارگاه
 */

import {
  MachineUtilizationItem,
  MachineUtilizationSummary,
  ShiftFilterKey,
  OeeDashboardSummary,
  OeeMachineRecord,
  SixBigLossesItem,
  ConsumableForecastItem,
  ConsumablesForecastSummary,
  PurchaseRequisitionRecord,
  ConsumableCategory,
} from '../types/oeeAndConsumables';
import { INITIAL_MACHINES, INITIAL_DIES_MOLDS, INITIAL_PARTS } from './sampleData';
import { manufacturingOrdersStore } from './productionWipEngine';
import { customerOrdersStore } from './productionPlanningEngine';
import { toPersianDigits } from '../utils/formatters';

// ============================================================================
// RUNTIME STORES FOR INTERACTIVE LOGGING & REQUISITIONS
// ============================================================================

interface CustomDowntimeOverride {
  machineId: string;
  plannedHoursDelta: number;
  unplannedHoursDelta: number;
  extraStrokesDelta: number;
  extraScrapDelta: number;
  reasonTitleFa?: string;
  category?: 'PLANNED' | 'UNPLANNED';
  durationMinutes?: number;
}

const machineRuntimeOverrides: Map<string, CustomDowntimeOverride> = new Map();

interface ConsumableMasterSeed {
  id: string;
  code: string;
  name: string;
  category: ConsumableCategory;
  categoryLabelFa: string;
  unit: string;
  warehouseLocation: string;
  consumptionDriverType: ConsumableForecastItem['consumptionDriverType'];
  consumptionDriverLabelFa: string;
  standardRatePerDriverUnit: number;
  wasteAllowancePercent: number;
  currentStock: number;
  reservedOrQuarantined: number;
  minSafetyStock: number;
  supplierLeadTimeDays: number;
  estimatedUnitPriceRials: number;
  preferredSupplierName: string;
  consumedByMachinesOrLines: string[];
}

const consumablesCatalogStore: ConsumableMasterSeed[] = [
  {
    id: 'CNS-WLD-001',
    code: 'CNS-CO2-WIRE-1.2',
    name: 'سیم جوش CO2 مسوار ER70S-6 قطر ۱.۲ میلی‌متر (قرقره ۱۵ کیلویی)',
    category: 'WELDING_CONSUMABLES',
    categoryLabelFa: 'مواد مصرفی جوشکاری',
    unit: 'KG',
    warehouseLocation: 'WH-CNS-A01 (انبار ملزومات جوش)',
    consumptionDriverType: 'PER_METER_CO2_WELD',
    consumptionDriverLabelFa: 'به ازای هر ۱۰۰ متر جوشکاری CO2 سازه و رام',
    standardRatePerDriverUnit: 14.5, // 14.5 kg per 100m weld
    wasteAllowancePercent: 8,
    currentStock: 165,
    reservedOrQuarantined: 15,
    minSafetyStock: 120,
    supplierLeadTimeDays: 7,
    estimatedUnitPriceRials: 1850000,
    preferredSupplierName: 'الکترود و سیم جوش میکا / آما',
    consumedByMachinesOrLines: ['خط جوش CO2 رام زیر رادیاتور', 'فیکسچر جوش رباتیک WLD-CO2-01'],
  },
  {
    id: 'CNS-WLD-002',
    code: 'CNS-SPOT-CAP-16',
    name: 'کلاهک و الکترود مسی نقطه‌جوش CuCrZr قطر ۱۶ میلی‌متر',
    category: 'WELDING_CONSUMABLES',
    categoryLabelFa: 'مواد مصرفی جوشکاری',
    unit: 'PCS',
    warehouseLocation: 'WH-CNS-A02 (انبار ملزومات جوش)',
    consumptionDriverType: 'PER_1000_SPOT_WELDS',
    consumptionDriverLabelFa: 'به ازای هر ۵,۰۰۰ نقطه جوش مقاومتی',
    standardRatePerDriverUnit: 2.0,
    wasteAllowancePercent: 5,
    currentStock: 38,
    reservedOrQuarantined: 0,
    minSafetyStock: 50,
    supplierLeadTimeDays: 10,
    estimatedUnitPriceRials: 1420000,
    preferredSupplierName: 'تأمین آلیاژ مس صنعتی سپاهان',
    consumedByMachinesOrLines: ['گان نقطه‌جوش آویز ۷۵ کاوا', 'پرس نقطه‌جوش ثابت ۱۲۰ کاوا'],
  },
  {
    id: 'CNS-WLD-003',
    code: 'CNS-GAS-CO2-40L',
    name: 'گاز محافظ جوشکاری دی‌اکسید کربن و آرگون صنعتی (کپسول ۴۰ لیتری)',
    category: 'WELDING_CONSUMABLES',
    categoryLabelFa: 'مواد مصرفی جوشکاری',
    unit: 'CYLINDER',
    warehouseLocation: 'WH-GAS-YARD (سایت کپسول‌های صنعتی)',
    consumptionDriverType: 'PER_MACHINE_HOUR',
    consumptionDriverLabelFa: 'به ازای هر ۱۰ ساعت کارکرد کابین جوش CO2',
    standardRatePerDriverUnit: 1.25,
    wasteAllowancePercent: 6,
    currentStock: 14,
    reservedOrQuarantined: 2,
    minSafetyStock: 18,
    supplierLeadTimeDays: 4,
    estimatedUnitPriceRials: 4800000,
    preferredSupplierName: 'گازهای صنعتی طوس / رهام گاز',
    consumedByMachinesOrLines: ['سالن مونتاژ و جوشکاری بدنه'],
  },
  {
    id: 'CNS-LUB-001',
    code: 'CNS-OIL-DRAW-220',
    name: 'روغن کشش عمیق و فرم‌دهی ورق روغنی (امولسیون قابل شستشو)',
    category: 'PRESS_LUBRICANTS',
    categoryLabelFa: 'روغن‌ها و روان‌کارهای پرس',
    unit: 'LITER',
    warehouseLocation: 'WH-CHEM-B01 (انبار روغن و مواد شیمیایی)',
    consumptionDriverType: 'PER_1000_STROKES',
    consumptionDriverLabelFa: 'به ازای هر ۱,۰۰۰ ضرب کشش و فرم‌دهی ورق',
    standardRatePerDriverUnit: 3.4,
    wasteAllowancePercent: 5,
    currentStock: 210,
    reservedOrQuarantined: 0,
    minSafetyStock: 220,
    supplierLeadTimeDays: 6,
    estimatedUnitPriceRials: 2150000,
    preferredSupplierName: 'پتروشیمی و روان‌کار صنعتی بهران / فوکس',
    consumedByMachinesOrLines: ['پرس هیدرولیک کشش ۶۳۰ تن', 'پرس مکانیکی ضربه‌ای ۴۰۰ تن', 'پرس ۲۵۰ تن'],
  },
  {
    id: 'CNS-LUB-002',
    code: 'CNS-OIL-HYD-HLP68',
    name: 'روغن هیدرولیک ضدسایش HLP-68 مخصوص پرس‌های هیدرولیک سنگین',
    category: 'PRESS_LUBRICANTS',
    categoryLabelFa: 'روغن‌ها و روان‌کارهای پرس',
    unit: 'LITER',
    warehouseLocation: 'WH-CHEM-B02 (انبار روغن و مواد شیمیایی)',
    consumptionDriverType: 'PER_MACHINE_HOUR',
    consumptionDriverLabelFa: 'به ازای هر ۱۰۰ ساعت کارکرد پرس‌های هیدرولیک',
    standardRatePerDriverUnit: 18.0,
    wasteAllowancePercent: 3,
    currentStock: 440,
    reservedOrQuarantined: 0,
    minSafetyStock: 250,
    supplierLeadTimeDays: 5,
    estimatedUnitPriceRials: 1680000,
    preferredSupplierName: 'شرکت نفت بهران',
    consumedByMachinesOrLines: ['پرس هیدرولیک ۶۳۰ تن', 'گیوتین هیدرولیک برش شیت'],
  },
  {
    id: 'CNS-DIE-001',
    code: 'CNS-PUNCH-HSS-10',
    name: 'سنبه پیرسینگ فولاد تندبر HSS-M2 قطر ۱۰.۵ میلی‌متر (سوراخ‌کاری براکت)',
    category: 'DIE_SPAREPARTS',
    categoryLabelFa: 'قطعات مصرفی و یدکی قالب',
    unit: 'PCS',
    warehouseLocation: 'WH-DIE-TOOL (انبار ابزار و قالب‌سازی)',
    consumptionDriverType: 'PER_1000_STROKES',
    consumptionDriverLabelFa: 'نرخ استهلاک به ازای هر ۲۵,۰۰۰ ضرب پانچ',
    standardRatePerDriverUnit: 0.16, // 4 punches per 25k strokes
    wasteAllowancePercent: 4,
    currentStock: 12,
    reservedOrQuarantined: 2,
    minSafetyStock: 20,
    supplierLeadTimeDays: 12,
    estimatedUnitPriceRials: 6900000,
    preferredSupplierName: 'ابزار دقیق قالب‌سازان صنعت',
    consumedByMachinesOrLines: ['قالب پیرسینگ و دوربری DIE-206-02', 'قالب پانچ تقویت رام تارا'],
  },
  {
    id: 'CNS-DIE-002',
    code: 'CNS-GAS-SPRING-1500',
    name: 'فنر گازی نیتروژن قالب کشش KALLER (قدرت ۱۵۰۰ دکانیوتن - کورس ۵۰)',
    category: 'DIE_SPAREPARTS',
    categoryLabelFa: 'قطعات مصرفی و یدکی قالب',
    unit: 'PCS',
    warehouseLocation: 'WH-DIE-TOOL (انبار ابزار و قالب‌سازی)',
    consumptionDriverType: 'PER_1000_STROKES',
    consumptionDriverLabelFa: 'نرخ تعویض به ازای هر ۱۰۰,۰۰۰ ضرب کشش',
    standardRatePerDriverUnit: 0.06,
    wasteAllowancePercent: 0,
    currentStock: 8,
    reservedOrQuarantined: 0,
    minSafetyStock: 6,
    supplierLeadTimeDays: 14,
    estimatedUnitPriceRials: 42000000,
    preferredSupplierName: 'نمایندگی قطعات استاندارد قالب',
    consumedByMachinesOrLines: ['قالب کشش عمیق رام زیر رادیاتور DIE-206-01'],
  },
  {
    id: 'CNS-CHM-001',
    code: 'CNS-ED-PAINT-BLK',
    name: 'رنگ و خمیر پیگمنت کاتافورز مشکی (ED Coating) استاندارد ساپکو',
    category: 'COATING_CHEMICALS',
    categoryLabelFa: 'مواد شیمیایی شستشو و پوشش ED',
    unit: 'KG',
    warehouseLocation: 'WH-CHEM-C01 (وان و مخازن خط ED)',
    consumptionDriverType: 'PER_TON_SHEET',
    consumptionDriverLabelFa: 'به ازای هر ۱ تن قطعه ورودی به وان پوشش کاتافورز',
    standardRatePerDriverUnit: 16.5,
    wasteAllowancePercent: 7,
    currentStock: 290,
    reservedOrQuarantined: 0,
    minSafetyStock: 350,
    supplierLeadTimeDays: 9,
    estimatedUnitPriceRials: 5400000,
    preferredSupplierName: 'رنگ و رزین صنعتی طیف / شیمی پوشش',
    consumedByMachinesOrLines: ['خط شستشوی فسفاته و کاتافورز ED'],
  },
  {
    id: 'CNS-PKG-001',
    code: 'CNS-STRAP-STEEL-19',
    name: 'تسمه فولادی بسته‌بندی باکس پالت ساپکو (عرض ۱۹ میلی‌متر) + بست فلزی',
    category: 'PACKAGING_SAFETY',
    categoryLabelFa: 'ملزومات بسته‌بندی و ایمنی',
    unit: 'KG',
    warehouseLocation: 'WH-PKG-D01 (انبار بسته‌بندی و ارسال)',
    consumptionDriverType: 'PER_PALLET_PACKED',
    consumptionDriverLabelFa: 'به ازای هر باکس پالت استاندارد ارسالی به ساپکو',
    standardRatePerDriverUnit: 1.8,
    wasteAllowancePercent: 5,
    currentStock: 185,
    reservedOrQuarantined: 0,
    minSafetyStock: 100,
    supplierLeadTimeDays: 4,
    estimatedUnitPriceRials: 1120000,
    preferredSupplierName: 'تسمه و بسته‌بندی پارس فولاد',
    consumedByMachinesOrLines: ['واحد بسته‌بندی، لیبل‌زنی و ارسال محصول نهایی'],
  },
  {
    id: 'CNS-PKG-002',
    code: 'CNS-VCI-FILM-120',
    name: 'نایلون و کاغذ ضدزنگ VCI مخصوص قطعات پرسی بدنه بدون رنگ',
    category: 'PACKAGING_SAFETY',
    categoryLabelFa: 'ملزومات بسته‌بندی و ایمنی',
    unit: 'KG',
    warehouseLocation: 'WH-PKG-D02 (انبار بسته‌بندی و ارسال)',
    consumptionDriverType: 'PER_PALLET_PACKED',
    consumptionDriverLabelFa: 'به ازای هر باکس پالت قطعات خام پرسی',
    standardRatePerDriverUnit: 1.2,
    wasteAllowancePercent: 4,
    currentStock: 42,
    reservedOrQuarantined: 0,
    minSafetyStock: 60,
    supplierLeadTimeDays: 6,
    estimatedUnitPriceRials: 2650000,
    preferredSupplierName: 'پلیمر محافظ صنعت',
    consumedByMachinesOrLines: ['انبار محصول نهایی و قرنطینه صادراتی'],
  },
];

const purchaseRequisitionsStore: PurchaseRequisitionRecord[] = [
  {
    id: 'PR-1404-001',
    prNumber: 'PR-1404-089',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAtFa: '۱۴۰۴/۰۸/۱۱ ۱۰:۳۰',
    requestedBy: 'مهندس حسینی (مدیر برنامه‌ریزی و کنترل تولید)',
    urgency: 'IMMEDIATE',
    status: 'APPROVED_BY_PLANT_MGR',
    itemsCount: 2,
    totalEstimatedCostRials: 158100000,
    lines: [
      {
        consumableCode: 'CNS-SPOT-CAP-16',
        consumableName: 'کلاهک و الکترود مسی نقطه‌جوش CuCrZr قطر ۱۶ میلی‌متر',
        unit: 'PCS',
        currentStock: 38,
        orderQuantity: 60,
        estimatedCostRials: 85200000,
        supplierName: 'تأمین آلیاژ مس صنعتی سپاهان',
      },
      {
        consumableCode: 'CNS-GAS-CO2-40L',
        consumableName: 'گاز محافظ جوشکاری دی‌اکسید کربن و آرگون صنعتی (کپسول ۴۰ لیتری)',
        unit: 'CYLINDER',
        currentStock: 14,
        orderQuantity: 15,
        estimatedCostRials: 72000000,
        supplierName: 'گازهای صنعتی طوس / رهام گاز',
      },
    ],
    notes: 'تأمین فوری جهت جلوگیری از توقف ایستگاه نقطه‌جوش و کابین جوش CO2 رام پژو ۲۰۶',
  },
];

// ============================================================================
// 1. MACHINE UTILIZATION REPORT ENGINE (ماژول گزارش بهره ماشین)
// ============================================================================

export function getMachineUtilizationReport(options?: {
  shift?: ShiftFilterKey;
  hallFilter?: string;
  processType?: string;
}): MachineUtilizationSummary {
  const shiftFilter: ShiftFilterKey = options?.shift || 'ALL';
  const machines = INITIAL_MACHINES;
  const dies = INITIAL_DIES_MOLDS;
  const mos = manufacturingOrdersStore;

  const shiftMultiplier = shiftFilter === 'ALL' ? 1 : 0.5;
  const shiftLabelMap: Record<ShiftFilterKey, string> = {
    ALL: 'مجموع دو شیفت (صبح و عصر - ۱۵ ساعت)',
    MORNING: 'شیفت صبح (A - ۷.۵ ساعت)',
    EVENING: 'شیفت عصر (B - ۷.۵ ساعت)',
    NIGHT: 'شیفت شب (C - ۷ ساعت)',
  };

  //Deterministic baseline profiles per machine
  const machineProfiles: Record<
    string,
    {
      plannedPmSmedH: number;
      unplannedBreakH: number;
      idleH: number;
      nominalSpm: number;
      actualSpm: number;
      dieChangeCount: number;
      avgSmedMin: number;
      tonnageLoadPct: number;
      kwRating: number;
      reasons: { code: string; title: string; cat: 'PLANNED' | 'UNPLANNED'; min: number; count: number }[];
    }
  > = {
    'MCH-01': {
      plannedPmSmedH: 1.5,
      unplannedBreakH: 0.5,
      idleH: 1.2,
      nominalSpm: 35,
      actualSpm: 31,
      dieChangeCount: 2,
      avgSmedMin: 28,
      tonnageLoadPct: 78,
      kwRating: 32,
      reasons: [
        { code: 'DT-SMED', title: 'تعویض تیغه گیوتین و تنظیم فیدر رول‌بازکن', cat: 'PLANNED', min: 65, count: 2 },
        { code: 'DT-PM', title: 'روغن‌کاری و بازدید دوره‌ای فک هیدرولیک', cat: 'PLANNED', min: 25, count: 1 },
        { code: 'DT-CRANE', title: 'انتظار جرثقیل سقفی جهت بارگذاری کلاف ۱۴ تنی', cat: 'UNPLANNED', min: 30, count: 2 },
      ],
    },
    'MCH-02': {
      plannedPmSmedH: 1.8,
      unplannedBreakH: 1.1,
      idleH: 0.4,
      nominalSpm: 16,
      actualSpm: 14.2,
      dieChangeCount: 3,
      avgSmedMin: 36,
      tonnageLoadPct: 94,
      kwRating: 75,
      reasons: [
        { code: 'DT-SMED', title: 'تعویض قالب کشش سنگین و تنظیم ورق‌گیر (SMED)', cat: 'PLANNED', min: 108, count: 3 },
        { code: 'DT-HYD', title: 'افت فشار شیر تناسبی کوشن هیدرولیک پرس', cat: 'UNPLANNED', min: 42, count: 1 },
        { code: 'DT-LUB', title: 'تنظیم افشانک روغن کشش ورق DC04', cat: 'UNPLANNED', min: 24, count: 2 },
      ],
    },
    'MCH-03': {
      plannedPmSmedH: 1.4,
      unplannedBreakH: 0.6,
      idleH: 0.8,
      nominalSpm: 28,
      actualSpm: 25,
      dieChangeCount: 2,
      avgSmedMin: 30,
      tonnageLoadPct: 86,
      kwRating: 45,
      reasons: [
        { code: 'DT-SMED', title: 'بستن قالب پانچ و تنظیم ارتفاع ضرب (Shut Height)', cat: 'PLANNED', min: 60, count: 2 },
        { code: 'DT-QC', title: 'توقف تأیید قطعه اول (First Piece QC Approval)', cat: 'PLANNED', min: 24, count: 2 },
        { code: 'DT-PUNCH', title: 'تعویض سنبه پیرسینگ لب‌پر شده قطر ۱۰mm', cat: 'UNPLANNED', min: 36, count: 1 },
      ],
    },
    'MCH-04': {
      plannedPmSmedH: 1.2,
      unplannedBreakH: 0.3,
      idleH: 3.0,
      nominalSpm: 24,
      actualSpm: 21.5,
      dieChangeCount: 1,
      avgSmedMin: 32,
      tonnageLoadPct: 68,
      kwRating: 38,
      reasons: [
        { code: 'DT-SMED', title: 'تعویض قالب خم و کالیبراسیون زاویه', cat: 'PLANNED', min: 45, count: 1 },
        { code: 'DT-PM', title: 'بازدید کلاچ و ترمز پنوماتیکی پرس', cat: 'PLANNED', min: 27, count: 1 },
        { code: 'DT-WIP', title: 'انتظار دریافت پالت نیمه‌ساخته از ایستگاه کشش', cat: 'UNPLANNED', min: 18, count: 1 },
      ],
    },
    'MCH-05': {
      plannedPmSmedH: 1.1,
      unplannedBreakH: 0.9,
      idleH: 1.5,
      nominalSpm: 22,
      actualSpm: 19,
      dieChangeCount: 2,
      avgSmedMin: 20,
      tonnageLoadPct: 82,
      kwRating: 55,
      reasons: [
        { code: 'DT-TIP', title: 'تراش و تعویض کلاهک الکترود نقطه‌جوش (Tip Dressing)', cat: 'PLANNED', min: 46, count: 4 },
        { code: 'DT-JIG', title: 'کالیبراسیون کلمپ‌های پنوماتیک فیکسچر مونتاژ', cat: 'PLANNED', min: 20, count: 1 },
        { code: 'DT-WLD', title: 'گیر کردن سیم جوش CO2 در تورچ و تعویض نازل', cat: 'UNPLANNED', min: 54, count: 3 },
      ],
    },
  };

  const items: MachineUtilizationItem[] = [];

  machines.forEach((m, idx) => {
    if (options?.hallFilter && options.hallFilter !== 'ALL' && !m.location.includes(options.hallFilter)) {
      return;
    }
    if (options?.processType && options.processType !== 'ALL' && m.processType !== options.processType) {
      return;
    }

    const base = machineProfiles[m.id] || {
      plannedPmSmedH: 1.3,
      unplannedBreakH: 0.5,
      idleH: 2.0,
      nominalSpm: m.strokesPerMinute || 25,
      actualSpm: Math.round((m.strokesPerMinute || 25) * 0.86),
      dieChangeCount: 2,
      avgSmedMin: 30,
      tonnageLoadPct: 75,
      kwRating: 40,
      reasons: [
        { code: 'DT-SMED', title: 'تعویض قالب و تنظیمات خط', cat: 'PLANNED' as const, min: 55, count: 2 },
        { code: 'DT-UNP', title: 'توقفات فنی و انتظار مواد پای خط', cat: 'UNPLANNED' as const, min: 30, count: 1 },
      ],
    };

    const override = machineRuntimeOverrides.get(m.id);

    const calendarAvailableHours = Math.round(15 * shiftMultiplier * 10) / 10;
    const isMaintenance = m.status === 'MAINTENANCE';

    let plannedDowntimeHours = Math.round((base.plannedPmSmedH * shiftMultiplier + (override?.plannedHoursDelta || 0)) * 10) / 10;
    let unplannedDowntimeHours = isMaintenance
      ? Math.round(calendarAvailableHours * 0.65 * 10) / 10
      : Math.round((base.unplannedBreakH * shiftMultiplier + (override?.unplannedHoursDelta || 0)) * 10) / 10;
    let idleNoOrderHours = isMaintenance ? 0 : Math.round(base.idleH * shiftMultiplier * 10) / 10;

    // Ensure sum does not exceed calendar hours
    const totalNonOperating = plannedDowntimeHours + unplannedDowntimeHours + idleNoOrderHours;
    if (totalNonOperating > calendarAvailableHours) {
      const scale = calendarAvailableHours / totalNonOperating;
      plannedDowntimeHours = Math.round(plannedDowntimeHours * scale * 10) / 10;
      unplannedDowntimeHours = Math.round(unplannedDowntimeHours * scale * 10) / 10;
      idleNoOrderHours = Math.max(0, Math.round((calendarAvailableHours - plannedDowntimeHours - unplannedDowntimeHours) * 10) / 10);
    }

    const netOperatingHours = Math.max(
      0,
      Math.round((calendarAvailableHours - plannedDowntimeHours - unplannedDowntimeHours - idleNoOrderHours) * 10) / 10
    );

    const grossUtilizationPercent =
      calendarAvailableHours > 0 ? Math.round((netOperatingHours / calendarAvailableHours) * 1000) / 10 : 0;

    const availableAfterPlanned = Math.max(0.5, calendarAvailableHours - plannedDowntimeHours);
    const netLoadingEfficiencyPercent = Math.min(
      100,
      Math.round((netOperatingHours / availableAfterPlanned) * 1000) / 10
    );

    const spmEfficiencyPercent =
      base.nominalSpm > 0 ? Math.round((base.actualSpm / base.nominalSpm) * 1000) / 10 : 88;

    const totalStrokesCount =
      Math.round(netOperatingHours * 60 * base.actualSpm * 0.42) + (override?.extraStrokesDelta || 0);
    const scrapPartsCount = Math.round(totalStrokesCount * 0.018) + (override?.extraScrapDelta || 0);
    const goodPartsProduced = Math.max(0, totalStrokesCount - scrapPartsCount);

    // Match active MO & Die
    const activeMo = mos.find(mo => mo.operations.some(op => op.machineId === m.id)) || mos[idx % Math.max(1, mos.length)];
    const matchingDie = dies.find(d => d.compatibleMachineCodes?.includes(m.code)) || dies[idx % Math.max(1, dies.length)];

    // Build downtime reasons
    const rawReasons = [...base.reasons];
    if (override?.reasonTitleFa && override.durationMinutes) {
      rawReasons.unshift({
        code: 'DT-USER',
        title: override.reasonTitleFa,
        cat: override.category || 'UNPLANNED',
        min: override.durationMinutes,
        count: 1,
      });
    }
    const totalReasonMins = Math.max(1, rawReasons.reduce((s, r) => s + r.min, 0));
    const downtimeBreakdown = rawReasons.map(r => ({
      reasonCode: r.code,
      reasonTitleFa: r.title,
      category: r.cat,
      durationMinutes: Math.round(r.min * shiftMultiplier),
      occurrencesCount: r.count,
      sharePercent: Math.round((r.min / totalReasonMins) * 1000) / 10,
    }));

    let utilizationStatus: MachineUtilizationItem['utilizationStatus'] = 'OPTIMAL';
    if (isMaintenance || unplannedDowntimeHours >= 1.5) {
      utilizationStatus = 'DOWNTIME_ALERT';
    } else if (grossUtilizationPercent >= 80 || base.tonnageLoadPct >= 90) {
      utilizationStatus = 'BOTTLENECK_OVERLOAD';
    } else if (grossUtilizationPercent < 60) {
      utilizationStatus = 'UNDER_UTILIZED';
    }

    items.push({
      machineId: m.id,
      machineCode: m.code,
      machineName: m.name,
      hallName: m.location || 'سالن پرس سنگین',
      processType: m.processType,
      tonnage: m.tonnage || 250,
      operatorName: m.operatorName || 'اپراتور ارشد شیفت',
      shift: shiftFilter,
      shiftLabelFa: shiftLabelMap[shiftFilter],
      calendarAvailableHours,
      plannedDowntimeHours,
      unplannedDowntimeHours,
      idleNoOrderHours,
      netOperatingHours,
      grossUtilizationPercent,
      netLoadingEfficiencyPercent,
      tonnageLoadPercent: base.tonnageLoadPct,
      nominalSpm: base.nominalSpm,
      actualAvgSpm: base.actualSpm,
      spmEfficiencyPercent,
      totalStrokesCount,
      goodPartsProduced,
      scrapPartsCount,
      activeMoNumber: activeMo?.moNumber || 'MO-2026-001',
      activePartName: activeMo?.partName || 'براکت رام زیر رادیاتور پژو ۲۰۶',
      activeDieCode: matchingDie?.code || 'DIE-206-01',
      dieChangeoverCount: base.dieChangeCount,
      avgDieChangeoverMinutes: base.avgSmedMin,
      estimatedEnergyKwh: Math.round(netOperatingHours * base.kwRating + idleNoOrderHours * 4),
      status: m.status,
      utilizationStatus,
      downtimeBreakdown,
    });
  });

  const totalCalendarHours = Math.round(items.reduce((s, i) => s + i.calendarAvailableHours, 0) * 10) / 10;
  const totalNetOperatingHours = Math.round(items.reduce((s, i) => s + i.netOperatingHours, 0) * 10) / 10;
  const totalPlannedDowntimeHours = Math.round(items.reduce((s, i) => s + i.plannedDowntimeHours, 0) * 10) / 10;
  const totalUnplannedDowntimeHours = Math.round(items.reduce((s, i) => s + i.unplannedDowntimeHours, 0) * 10) / 10;
  const totalIdleHours = Math.round(items.reduce((s, i) => s + i.idleNoOrderHours, 0) * 10) / 10;

  const averageGrossUtilizationPercent =
    items.length > 0
      ? Math.round((items.reduce((s, i) => s + i.grossUtilizationPercent, 0) / items.length) * 10) / 10
      : 0;
  const averageNetLoadingEfficiencyPercent =
    items.length > 0
      ? Math.round((items.reduce((s, i) => s + i.netLoadingEfficiencyPercent, 0) / items.length) * 10) / 10
      : 0;
  const averageSpmEfficiencyPercent =
    items.length > 0
      ? Math.round((items.reduce((s, i) => s + i.spmEfficiencyPercent, 0) / items.length) * 10) / 10
      : 0;

  // Aggregate downtime causes
  const causeAgg = new Map<string, { cat: 'PLANNED' | 'UNPLANNED'; min: number }>();
  items.forEach(m => {
    m.downtimeBreakdown.forEach(d => {
      const prev = causeAgg.get(d.reasonTitleFa) || { cat: d.category, min: 0 };
      prev.min += d.durationMinutes;
      causeAgg.set(d.reasonTitleFa, prev);
    });
  });
  const totalDowntimeMinutes = Math.max(1, Array.from(causeAgg.values()).reduce((s, v) => s + v.min, 0));
  const topDowntimeCauses = Array.from(causeAgg.entries())
    .map(([title, v]) => ({
      reasonTitleFa: title,
      category: v.cat,
      totalHours: Math.round((v.min / 60) * 10) / 10,
      sharePercent: Math.round((v.min / totalDowntimeMinutes) * 1000) / 10,
      recommendedAction:
        v.cat === 'PLANNED'
          ? 'پیاده‌سازی استاندارد SMED و آماده‌سازی پیشاپیش قالب و ابزار کنار پرس'
          : 'بازرسی پیشگیرانه (PM) مدار هیدرولیک، تیزکاری سنبه‌ها و شارژ به‌موقع کلاف پای خط',
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    periodLabelFa: shiftLabelMap[shiftFilter],
    totalMachinesCount: items.length,
    activeMachinesCount: items.filter(i => i.status === 'ACTIVE').length,
    maintenanceMachinesCount: items.filter(i => i.status === 'MAINTENANCE').length,
    totalCalendarHours,
    totalNetOperatingHours,
    totalPlannedDowntimeHours,
    totalUnplannedDowntimeHours,
    totalIdleHours,
    averageGrossUtilizationPercent,
    averageNetLoadingEfficiencyPercent,
    averageSpmEfficiencyPercent,
    totalStrokesExecuted: items.reduce((s, i) => s + i.totalStrokesCount, 0),
    totalGoodPartsProduced: items.reduce((s, i) => s + i.goodPartsProduced, 0),
    bottleneckMachinesCount: items.filter(i => i.utilizationStatus === 'BOTTLENECK_OVERLOAD').length,
    topDowntimeCauses,
    machines: items,
  };
}

export function logMachineDowntimeOrRuntime(payload: {
  machineId: string;
  eventType: 'PLANNED_DOWNTIME' | 'UNPLANNED_DOWNTIME' | 'PRODUCTION_RUN';
  durationMinutes: number;
  strokesExecuted?: number;
  scrapCount?: number;
  reasonTitleFa?: string;
}): MachineUtilizationSummary {
  const existing = machineRuntimeOverrides.get(payload.machineId) || {
    machineId: payload.machineId,
    plannedHoursDelta: 0,
    unplannedHoursDelta: 0,
    extraStrokesDelta: 0,
    extraScrapDelta: 0,
  };

  const hours = Math.round((Number(payload.durationMinutes || 0) / 60) * 10) / 10;
  if (payload.eventType === 'PLANNED_DOWNTIME') {
    existing.plannedHoursDelta += hours;
    existing.category = 'PLANNED';
  } else if (payload.eventType === 'UNPLANNED_DOWNTIME') {
    existing.unplannedHoursDelta += hours;
    existing.category = 'UNPLANNED';
  } else {
    existing.extraStrokesDelta += Number(payload.strokesExecuted || 0);
    existing.extraScrapDelta += Number(payload.scrapCount || 0);
  }

  if (payload.reasonTitleFa) {
    existing.reasonTitleFa = payload.reasonTitleFa;
    existing.durationMinutes = Number(payload.durationMinutes || 30);
  }

  machineRuntimeOverrides.set(payload.machineId, existing);
  return getMachineUtilizationReport();
}

// ============================================================================
// 2. OEE MODULE ENGINE (ماژول OEE و تحلیل شش ضایعه بزرگ)
// ============================================================================

export function getOeeDashboardSummary(options?: {
  hallFilter?: string;
  shift?: ShiftFilterKey;
}): OeeDashboardSummary {
  const utilReport = getMachineUtilizationReport({
    shift: options?.shift,
    hallFilter: options?.hallFilter,
  });

  const oeeMachines: OeeMachineRecord[] = utilReport.machines.map(m => {
    const plannedProductionMinutes = Math.max(60, Math.round((m.calendarAvailableHours - m.idleNoOrderHours) * 60));
    const downtimeLossMinutes = Math.round((m.plannedDowntimeHours + m.unplannedDowntimeHours) * 60);
    const operatingRunMinutes = Math.max(15, plannedProductionMinutes - downtimeLossMinutes);

    // 1. Availability = Operating Run Time / Planned Production Time
    const availabilityPercent = Math.min(
      99.5,
      Math.max(40, Math.round((operatingRunMinutes / plannedProductionMinutes) * 1000) / 10)
    );

    // 2. Performance = Actual SPM / Nominal SPM (adjusted for minor stops)
    const performancePercent = Math.min(
      99.0,
      Math.max(55, Math.round(m.spmEfficiencyPercent * 0.98 * 10) / 10)
    );

    const speedLossMinutes = Math.max(
      5,
      Math.round(operatingRunMinutes * (1 - performancePercent / 100))
    );
    const netOperatingMinutes = Math.max(10, operatingRunMinutes - speedLossMinutes);

    // 3. Quality = Good Parts / Total Produced Parts
    const totalProducedPieces = Math.max(100, m.totalStrokesCount);
    const scrapAndReworkPieces = m.scrapPartsCount;
    const goodPieces = Math.max(0, totalProducedPieces - scrapAndReworkPieces);
    const qualityPercent = Math.min(
      99.9,
      Math.max(85, Math.round((goodPieces / totalProducedPieces) * 1000) / 10)
    );

    const qualityLossMinutes = Math.max(1, Math.round(netOperatingMinutes * (1 - qualityPercent / 100)));
    const fullyProductiveMinutes = Math.max(5, netOperatingMinutes - qualityLossMinutes);

    // OEE = A * P * Q
    const oeePercent =
      Math.round(((availabilityPercent * performancePercent * qualityPercent) / 10000) * 10) / 10;

    // TEEP = OEE * (Planned Production Time / Calendar Time)
    const calendarMinutes = Math.max(plannedProductionMinutes, Math.round(m.calendarAvailableHours * 60));
    const loadingRatio = plannedProductionMinutes / calendarMinutes;
    const teepPercent = Math.round(oeePercent * loadingRatio * 10) / 10;

    const worldClassTargetPercent = 85.0;
    const varianceFromTargetPercent = Math.round((oeePercent - worldClassTargetPercent) * 10) / 10;

    const idealCycleTimeSeconds = Math.round((60 / Math.max(1, m.nominalSpm)) * 100) / 100;
    const actualCycleTimeSeconds = Math.round((60 / Math.max(1, m.actualAvgSpm)) * 100) / 100;

    // Six Big Losses per machine
    const breakdownMin = Math.round(m.unplannedDowntimeHours * 60);
    const setupSmedMin = Math.round(m.plannedDowntimeHours * 60);
    const minorStopsMin = Math.round(speedLossMinutes * 0.42);
    const reducedSpeedMin = Math.max(1, speedLossMinutes - minorStopsMin);
    const processScrapMin = Math.round(qualityLossMinutes * 0.7);
    const startupScrapMin = Math.max(1, qualityLossMinutes - processScrapMin);

    const totalLostMinutes = Math.max(
      1,
      breakdownMin + setupSmedMin + minorStopsMin + reducedSpeedMin + processScrapMin + startupScrapMin
    );

    const avgPiecesPerMin = Math.max(1, m.actualAvgSpm * 0.42);

    const sixBigLosses: SixBigLossesItem[] = [
      {
        lossNumber: 1,
        lossCode: 'LOSS-01-BREAKDOWN',
        lossTitleFa: '۱. خرابی‌های اضطراری تجهیزات و قالب (Breakdowns)',
        lossTitleEn: 'Equipment Failure',
        oeeFactor: 'AVAILABILITY_LOSS',
        oeeFactorLabelFa: 'دسترس‌پذیری (Availability)',
        lostTimeMinutes: breakdownMin,
        lostPiecesEquivalent: Math.round(breakdownMin * avgPiecesPerMin),
        shareOfTotalLossPercent: Math.round((breakdownMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'افت فشار کوشن هیدرولیک، شکستگی سنبه پانچ یا خطای PLC پرس',
        kaizenActionFa: 'اجرای نت پیشگیرانه (PM) هفتگی و پایش عمر ضرب قالب',
      },
      {
        lossNumber: 2,
        lossCode: 'LOSS-02-SETUP',
        lossTitleFa: '۲. تعویض قالب و تنظیمات خط (Setup & SMED)',
        lossTitleEn: 'Setup & Adjustments',
        oeeFactor: 'AVAILABILITY_LOSS',
        oeeFactorLabelFa: 'دسترس‌پذیری (Availability)',
        lostTimeMinutes: setupSmedMin,
        lostPiecesEquivalent: Math.round(setupSmedMin * avgPiecesPerMin),
        shareOfTotalLossPercent: Math.round((setupSmedMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'زمان باز و بستن کلمپ‌های قالب، تنظیم Shut Height و بارگذاری کلاف روی کویل‌بازکن',
        kaizenActionFa: 'استانداردسازی SMED، کلمپ هیدرولیک سریع و آماده‌سازی قالب بعدی پیش از توقف پرس',
      },
      {
        lossNumber: 3,
        lossCode: 'LOSS-03-MINOR-STOPS',
        lossTitleFa: '۳. توقفات جزئی و گیر کردن فیدر (Idling & Minor Stops)',
        lossTitleEn: 'Idling & Minor Stops',
        oeeFactor: 'PERFORMANCE_LOSS',
        oeeFactorLabelFa: 'عملکرد و سرعت (Performance)',
        lostTimeMinutes: minorStopsMin,
        lostPiecesEquivalent: Math.round(minorStopsMin * avgPiecesPerMin),
        shareOfTotalLossPercent: Math.round((minorStopsMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'خطای سنسور گام فیدر ورق، گیر کردن ضایعات کناره ورق در شوت خروجی',
        kaizenActionFa: 'تنظیم غلتک‌های صاف‌کن (Leveler) و نصب شوت تخلیه اتوماتیک ضایعات',
      },
      {
        lossNumber: 4,
        lossCode: 'LOSS-04-SPEED',
        lossTitleFa: '۴. کارکرد با سرعت کمتر از ضرب اسمی (Reduced Speed)',
        lossTitleEn: 'Reduced Operating Speed',
        oeeFactor: 'PERFORMANCE_LOSS',
        oeeFactorLabelFa: 'عملکرد و سرعت (Performance)',
        lostTimeMinutes: reducedSpeedMin,
        lostPiecesEquivalent: Math.round(reducedSpeedMin * avgPiecesPerMin),
        shareOfTotalLossPercent: Math.round((reducedSpeedMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'کاهش دستی SPM توسط اپراتور یا محدودیت جابجایی دستی قطعه بین قالب‌ها',
        kaizenActionFa: 'توازن بار اپراتورها و استفاده از بازوی انتقال بین‌پرسی',
      },
      {
        lossNumber: 5,
        lossCode: 'LOSS-05-DEFECTS',
        lossTitleFa: '۵. ضایعات فرآیندی و دوباره‌کاری (Process Defects)',
        lossTitleEn: 'Process Defects & Scrap',
        oeeFactor: 'QUALITY_LOSS',
        oeeFactorLabelFa: 'کیفیت (Quality)',
        lostTimeMinutes: processScrapMin,
        lostPiecesEquivalent: Math.round(scrapAndReworkPieces * 0.72),
        shareOfTotalLossPercent: Math.round((processScrapMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'چروکیدگی یا ترک کشش عمیق ورق، پاشش جوش یا عدم استحکام نقطه‌جوش',
        kaizenActionFa: 'کنترل ضخامت و روانکاری ورق ورودی و کالیبراسیون آمپراژ گان جوش',
      },
      {
        lossNumber: 6,
        lossCode: 'LOSS-06-STARTUP',
        lossTitleFa: '۶. ضایعات راه‌اندازی و تایید قطعه اول (Startup Rejects)',
        lossTitleEn: 'Reduced Yield / Startup Rejects',
        oeeFactor: 'QUALITY_LOSS',
        oeeFactorLabelFa: 'کیفیت (Quality)',
        lostTimeMinutes: startupScrapMin,
        lostPiecesEquivalent: Math.max(1, scrapAndReworkPieces - Math.round(scrapAndReworkPieces * 0.72)),
        shareOfTotalLossPercent: Math.round((startupScrapMin / totalLostMinutes) * 1000) / 10,
        rootCauseExampleFa: 'قطعات آزمایشی اولیه پس از بستن قالب برای تنظیم فشار کوشن و لقی سنبه',
        kaizenActionFa: 'ثبت دیجیتال پارامترهای فشار کوشن و ارتفاع ضرب به تفکیک هر کد قالب (Recipe)',
      },
    ];

    let gradeClass: OeeMachineRecord['gradeClass'] = 'ACCEPTABLE_B';
    if (oeePercent >= 85) gradeClass = 'WORLD_CLASS_A';
    else if (oeePercent >= 72) gradeClass = 'ACCEPTABLE_B';
    else if (oeePercent >= 60) gradeClass = 'NEEDS_IMPROVEMENT_C';
    else gradeClass = 'CRITICAL_D';

    // Build granular downtime logs for slide-over drill-down drawer
    const timeWindows = [
      '۰۷:۴۰ تا ۰۸:۲۵ (شیفت صبح)',
      '۱۰:۱۵ تا ۱۰:۴۵ (شیفت صبح)',
      '۱۳:۱۰ تا ۱۳:۳۵ (شیفت صبح)',
      '۱۵:۲۰ تا ۱۶:۰۵ (شیفت عصر)',
      '۱۸:۱۰ تا ۱۸:۴۰ (شیفت عصر)',
    ];

    const baseDowntimeLogs = m.downtimeBreakdown.map((d, dIdx) => {
      const isUnplanned = d.category === 'UNPLANNED';
      return {
        id: `${m.machineId}-DT-${dIdx + 1}`,
        reasonCode: d.reasonCode,
        reasonTitleFa: d.reasonTitleFa,
        category: isUnplanned ? ('UNPLANNED_BREAKDOWN' as const) : ('PLANNED_SETUP' as const),
        categoryLabelFa: isUnplanned
          ? 'توقف برنامه‌ریزی‌نشده / خرابی اضطراری'
          : 'توقف برنامه‌ریزی‌شده / تعویض قالب (SMED)',
        durationMinutes: d.durationMinutes,
        occurrencesCount: d.occurrencesCount,
        sharePercent: Math.round((d.durationMinutes / Math.max(1, downtimeLossMinutes + minorStopsMin)) * 1000) / 10,
        timeRangeFa: timeWindows[dIdx % timeWindows.length],
        shiftLabelFa: dIdx % 2 === 0 ? 'شیفت صبح (A)' : 'شیفت عصر (B)',
        operatorOrTechName: isUnplanned
          ? 'تیم نت اضطراری (مهندس کریمی) + ' + m.operatorName
          : 'تیم قالب‌بند SMED + ' + m.operatorName,
        rootCauseFa: isUnplanned
          ? 'خرابی و توقف ناگهانی ناشی از استهلاک قطعه، افت فشار هیدرولیک یا تأخیر تغذیه ورق پای خط'
          : 'زمان توقف مصوب جهت باز و بستن کلمپ‌های قالب، تنظیم Shut Height و تایید قطعه اول QC',
        correctiveActionFa: isUnplanned
          ? 'ثبت دستور کار تعمیرات اضطراری (EM)، تعویض قطعه معیوب و بازنگری چک‌لیست PM هفتگی'
          : 'اجرای استاندارد SMED، پیش‌تنظیم ارتفاع ضرب و آماده‌سازی کلاف بعدی کنار کویل‌بازکن',
      };
    });

    // Add minor stops & speed loss entry so user sees all stop categories in the drawer
    const downtimeLogs = [
      ...baseDowntimeLogs,
      {
        id: `${m.machineId}-DT-MINOR`,
        reasonCode: 'DT-MICRO-STOP',
        reasonTitleFa: 'توقفات جزئی سنسور گام فیدر و تخلیه شوت ضایعات کناره ورق',
        category: 'MINOR_STOP' as const,
        categoryLabelFa: 'توقفات جزئی و افت سرعت (Minor Stops)',
        durationMinutes: minorStopsMin,
        occurrencesCount: Math.max(3, Math.round(minorStopsMin / 4)),
        sharePercent: Math.round((minorStopsMin / Math.max(1, downtimeLossMinutes + minorStopsMin)) * 1000) / 10,
        timeRangeFa: 'پراکنده در طول شیفت کاری',
        shiftLabelFa: m.shiftLabelFa,
        operatorOrTechName: m.operatorName,
        rootCauseFa: 'توقفات زیر ۵ دقیقه ناشی از گیر کردن ورق در غلتک صاف‌کن (Leveler) و پر شدن باکس ضایعات',
        correctiveActionFa: 'تنظیم کشش کویل‌بازکن، روغن‌کاری نوار ورودی و تخلیه نوبتی شوت ضایعات بدون توقف پرس',
      },
    ];

    return {
      machineId: m.machineId,
      machineCode: m.machineCode,
      machineName: m.machineName,
      hallName: m.hallName,
      processType: m.processType,
      tonnage: m.tonnage,
      activePartCode: m.activeDieCode.replace('DIE', 'SAPCO'),
      activePartName: m.activePartName,
      operatorName: m.operatorName,
      status: m.status,
      availabilityPercent,
      performancePercent,
      qualityPercent,
      oeePercent,
      teepPercent,
      worldClassTargetPercent,
      varianceFromTargetPercent,
      plannedProductionMinutes,
      downtimeLossMinutes,
      plannedDowntimeMinutes: setupSmedMin,
      unplannedDowntimeMinutes: breakdownMin,
      minorStopLossMinutes: minorStopsMin,
      operatingRunMinutes,
      speedLossMinutes,
      netOperatingMinutes,
      qualityLossMinutes,
      fullyProductiveMinutes,
      mtbfHours: m.unplannedDowntimeHours > 0.8 ? 38.5 : 64.0,
      mttrMinutes: m.unplannedDowntimeHours > 0.8 ? 42 : 24,
      idealCycleTimeSeconds,
      actualCycleTimeSeconds,
      totalProducedPieces,
      goodPieces,
      scrapAndReworkPieces,
      firstPassYieldPercent: qualityPercent,
      gradeClass,
      sixBigLosses,
      downtimeBreakdown: m.downtimeBreakdown,
      downtimeLogs,
    };
  });

  const count = Math.max(1, oeeMachines.length);
  const plantAvailabilityPercent =
    Math.round((oeeMachines.reduce((s, m) => s + m.availabilityPercent, 0) / count) * 10) / 10;
  const plantPerformancePercent =
    Math.round((oeeMachines.reduce((s, m) => s + m.performancePercent, 0) / count) * 10) / 10;
  const plantQualityPercent =
    Math.round((oeeMachines.reduce((s, m) => s + m.qualityPercent, 0) / count) * 10) / 10;
  const plantOeePercent =
    Math.round(((plantAvailabilityPercent * plantPerformancePercent * plantQualityPercent) / 10000) * 10) / 10;
  const plantTeepPercent =
    Math.round((oeeMachines.reduce((s, m) => s + m.teepPercent, 0) / count) * 10) / 10;

  // Aggregate Six Big Losses across the plant
  const lossMap = new Map<number, SixBigLossesItem>();
  oeeMachines.forEach(m => {
    m.sixBigLosses.forEach(loss => {
      const existing = lossMap.get(loss.lossNumber);
      if (!existing) {
        lossMap.set(loss.lossNumber, { ...loss });
      } else {
        existing.lostTimeMinutes += loss.lostTimeMinutes;
        existing.lostPiecesEquivalent += loss.lostPiecesEquivalent;
      }
    });
  });

  const aggLosses = Array.from(lossMap.values());
  const totalPlantLossMin = Math.max(1, aggLosses.reduce((s, l) => s + l.lostTimeMinutes, 0));
  aggLosses.forEach(l => {
    l.shareOfTotalLossPercent = Math.round((l.lostTimeMinutes / totalPlantLossMin) * 1000) / 10;
  });

  const currentMonthlyGood = oeeMachines.reduce((s, m) => s + m.goodPieces, 0) * 26;
  const gapRatio = Math.max(0, (85 - plantOeePercent) / Math.max(50, plantOeePercent));
  const totalHiddenCapacityPiecesPerMonth = Math.round(currentMonthlyGood * gapRatio);

  return {
    generatedAt: new Date().toISOString(),
    plantOeePercent,
    plantAvailabilityPercent,
    plantPerformancePercent,
    plantQualityPercent,
    plantTeepPercent,
    worldClassBenchmarkOee: 85.0,
    avgMtbfHours: Math.round((oeeMachines.reduce((s, m) => s + m.mtbfHours, 0) / count) * 10) / 10,
    avgMttrMinutes: Math.round(oeeMachines.reduce((s, m) => s + m.mttrMinutes, 0) / count),
    totalHiddenCapacityPiecesPerMonth,
    sixBigLossesAggregate: aggLosses,
    machines: oeeMachines,
    shiftComparison: [
      {
        shiftCode: 'MORNING',
        shiftNameFa: 'شیفت صبح (A - ۰۶:۰۰ تا ۱۴:۰۰)',
        supervisorName: 'مهندس رضایی',
        availabilityPercent: Math.min(99, Math.round((plantAvailabilityPercent + 2.4) * 10) / 10),
        performancePercent: Math.min(99, Math.round((plantPerformancePercent + 1.8) * 10) / 10),
        qualityPercent: Math.min(99.8, Math.round((plantQualityPercent + 0.3) * 10) / 10),
        oeePercent: Math.min(98, Math.round((plantOeePercent + 3.2) * 10) / 10),
        totalPieces: Math.round(utilReport.totalGoodPartsProduced * 0.54),
      },
      {
        shiftCode: 'EVENING',
        shiftNameFa: 'شیفت عصر (B - ۱۴:۰۰ تا ۲۲:۰۰)',
        supervisorName: 'مهندس کاظمی',
        availabilityPercent: Math.max(50, Math.round((plantAvailabilityPercent - 1.9) * 10) / 10),
        performancePercent: Math.max(50, Math.round((plantPerformancePercent - 1.4) * 10) / 10),
        qualityPercent: Math.max(85, Math.round((plantQualityPercent - 0.2) * 10) / 10),
        oeePercent: Math.max(45, Math.round((plantOeePercent - 2.6) * 10) / 10),
        totalPieces: Math.round(utilReport.totalGoodPartsProduced * 0.46),
      },
      {
        shiftCode: 'NIGHT',
        shiftNameFa: 'شیفت شب (C - شیفت پشتیبان و نت)',
        supervisorName: 'مهندس مرادی',
        availabilityPercent: 84.5,
        performancePercent: 86.0,
        qualityPercent: 98.1,
        oeePercent: 71.3,
        totalPieces: Math.round(utilReport.totalGoodPartsProduced * 0.22),
      },
    ],
  };
}

// ============================================================================
// 3. CONSUMABLES FORECASTING ENGINE (ماژول پیش‌بینی مواد مصرفی خط تولید)
// ============================================================================

export function getConsumablesForecastReport(options?: {
  horizonDays?: number;
  demandGrowthPercent?: number;
  category?: string;
}): ConsumablesForecastSummary {
  const horizonDays = Math.max(7, Math.min(180, Number(options?.horizonDays) || 30));
  const demandGrowthPercent = Number(options?.demandGrowthPercent) || 0;
  const growthFactor = 1 + demandGrowthPercent / 100;
  const horizonRatio = horizonDays / 30;

  // Compute baseline shop-floor activity from open MOs and Customer Orders
  const mos = manufacturingOrdersStore;
  const customerOrders = customerOrdersStore;

  const totalMoTargetPieces = mos.reduce((s, m) => s + m.targetQuantity, 0) || 4500;
  const totalOpenOrderPieces =
    customerOrders.reduce((s, o) => s + o.lines.reduce((ls, l) => ls + l.remainingQuantity, 0), 0) || 8500;

  const monthlyProjectedPieces = Math.round((totalMoTargetPieces + totalOpenOrderPieces) * growthFactor);
  // Each stamped/assembled automotive part averages ~3.5 press strokes, ~8 spot welds, ~0.35m CO2 weld
  const projectedStrokesInHorizon = Math.round(monthlyProjectedPieces * 3.5 * horizonRatio);
  const projectedSpotWeldsInHorizon = Math.round(monthlyProjectedPieces * 8.0 * horizonRatio);
  const projectedCo2MetersInHorizon = Math.round(monthlyProjectedPieces * 0.35 * horizonRatio);
  const projectedSheetTonsInHorizon = Math.round(((monthlyProjectedPieces * 1.35) / 1000) * horizonRatio * 10) / 10;
  const projectedMachineHoursInHorizon = Math.round(420 * horizonRatio * growthFactor);
  const projectedPalletsInHorizon = Math.max(10, Math.round((monthlyProjectedPieces / 120) * horizonRatio));

  const items: ConsumableForecastItem[] = [];

  consumablesCatalogStore.forEach(seed => {
    if (options?.category && options.category !== 'ALL' && seed.category !== options.category) {
      return;
    }

    let activityVolume = 0;
    let driverMultiplier = 1;

    switch (seed.consumptionDriverType) {
      case 'PER_1000_STROKES':
        activityVolume = projectedStrokesInHorizon;
        driverMultiplier = projectedStrokesInHorizon / 1000;
        break;
      case 'PER_1000_SPOT_WELDS':
        activityVolume = projectedSpotWeldsInHorizon;
        driverMultiplier = projectedSpotWeldsInHorizon / 1000;
        break;
      case 'PER_METER_CO2_WELD':
        activityVolume = projectedCo2MetersInHorizon;
        driverMultiplier = projectedCo2MetersInHorizon / 100; // rate is per 100m
        break;
      case 'PER_TON_SHEET':
        activityVolume = projectedSheetTonsInHorizon;
        driverMultiplier = projectedSheetTonsInHorizon;
        break;
      case 'PER_MACHINE_HOUR':
        activityVolume = projectedMachineHoursInHorizon;
        driverMultiplier = projectedMachineHoursInHorizon / (seed.code.includes('GAS') ? 10 : 100);
        break;
      case 'PER_PALLET_PACKED':
        activityVolume = projectedPalletsInHorizon;
        driverMultiplier = projectedPalletsInHorizon;
        break;
    }

    const wasteFactor = 1 + seed.wasteAllowancePercent / 100;
    const forecastedGrossRequirement =
      Math.round(driverMultiplier * seed.standardRatePerDriverUnit * wasteFactor * 10) / 10;
    const dailyBurnRate = Math.max(0.2, Math.round((forecastedGrossRequirement / horizonDays) * 10) / 10);

    const usableStock = Math.max(0, seed.currentStock - seed.reservedOrQuarantined);
    const reorderPoint = Math.round(dailyBurnRate * seed.supplierLeadTimeDays + seed.minSafetyStock);
    const daysOfSupplyRemaining = Math.round((usableStock / dailyBurnRate) * 10) / 10;

    // Estimate run-out Jalali date
    const runOutMs = Date.now() + daysOfSupplyRemaining * 86400000;
    const rDate = new Date(runOutMs);
    const jy = rDate.getFullYear() - 621;
    const jm = String(rDate.getMonth() + 1).padStart(2, '0');
    const jd = String(rDate.getDate()).padStart(2, '0');
    const estimatedRunOutDateFa = `${toPersianDigits(jy)}/${toPersianDigits(jm)}/${toPersianDigits(jd)}`;

    const totalTargetNeeded = forecastedGrossRequirement + seed.minSafetyStock;
    const netShortageQty = Math.max(0, Math.round((totalTargetNeeded - usableStock) * 10) / 10);

    // Round up suggested order quantity to practical industrial pack size
    let suggestedOrderQty = 0;
    if (netShortageQty > 0 || usableStock <= reorderPoint) {
      const rawOrder = Math.max(netShortageQty, reorderPoint - usableStock + seed.minSafetyStock * 0.5);
      suggestedOrderQty = Math.max(5, Math.ceil(rawOrder / 5) * 5);
    }

    const estimatedTotalOrderCostRials = Math.round(suggestedOrderQty * seed.estimatedUnitPriceRials);

    let status: ConsumableForecastItem['status'] = 'ADEQUATE';
    if (usableStock < seed.minSafetyStock || daysOfSupplyRemaining <= seed.supplierLeadTimeDays) {
      status = 'CRITICAL_SHORTAGE';
    } else if (usableStock <= reorderPoint || netShortageQty > 0) {
      status = 'BELOW_ROP';
    }

    items.push({
      id: seed.id,
      code: seed.code,
      name: seed.name,
      category: seed.category,
      categoryLabelFa: seed.categoryLabelFa,
      unit: seed.unit,
      warehouseLocation: seed.warehouseLocation,
      consumptionDriverType: seed.consumptionDriverType,
      consumptionDriverLabelFa: seed.consumptionDriverLabelFa,
      standardRatePerDriverUnit: seed.standardRatePerDriverUnit,
      wasteAllowancePercent: seed.wasteAllowancePercent,
      plannedDriverActivityVolume: activityVolume,
      dailyBurnRate,
      forecastedGrossRequirement,
      currentStock: usableStock,
      reservedOrQuarantined: seed.reservedOrQuarantined,
      minSafetyStock: seed.minSafetyStock,
      reorderPoint,
      supplierLeadTimeDays: seed.supplierLeadTimeDays,
      daysOfSupplyRemaining,
      estimatedRunOutDateFa,
      netShortageQty,
      suggestedOrderQty,
      estimatedUnitPriceRials: seed.estimatedUnitPriceRials,
      estimatedTotalOrderCostRials,
      preferredSupplierName: seed.preferredSupplierName,
      status,
      consumedByMachinesOrLines: seed.consumedByMachinesOrLines,
    });
  });

  // Sort: CRITICAL_SHORTAGE first, then BELOW_ROP, then by daysOfSupplyRemaining ascending
  const statusRank = { CRITICAL_SHORTAGE: 3, BELOW_ROP: 2, ADEQUATE: 1 };
  items.sort((a, b) => statusRank[b.status] - statusRank[a.status] || a.daysOfSupplyRemaining - b.daysOfSupplyRemaining);

  const lowestItem = items.length > 0
    ? [...items].sort((a, b) => a.daysOfSupplyRemaining - b.daysOfSupplyRemaining)[0]
    : null;

  return {
    generatedAt: new Date().toISOString(),
    horizonDays,
    demandGrowthPercent,
    totalItemsCount: items.length,
    criticalShortageCount: items.filter(i => i.status === 'CRITICAL_SHORTAGE').length,
    belowReorderPointCount: items.filter(i => i.status === 'BELOW_ROP').length,
    adequateStockCount: items.filter(i => i.status === 'ADEQUATE').length,
    totalSuggestedProcurementBudgetRials: items.reduce((s, i) => s + i.estimatedTotalOrderCostRials, 0),
    lowestDaysOfSupplyItem: lowestItem
      ? {
          code: lowestItem.code,
          name: lowestItem.name,
          daysRemaining: lowestItem.daysOfSupplyRemaining,
        }
      : null,
    items,
    activeRequisitions: purchaseRequisitionsStore,
  };
}

export function createConsumablesPurchaseRequisition(payload: {
  itemCodes?: string[];
  requestedBy?: string;
  urgency?: 'IMMEDIATE' | 'HIGH' | 'NORMAL';
  notes?: string;
}): PurchaseRequisitionRecord {
  const forecast = getConsumablesForecastReport();
  const targetItems = payload.itemCodes && payload.itemCodes.length > 0
    ? forecast.items.filter(i => payload.itemCodes!.includes(i.code))
    : forecast.items.filter(i => i.status === 'CRITICAL_SHORTAGE' || i.status === 'BELOW_ROP');

  const lines = (targetItems.length > 0 ? targetItems : forecast.items.slice(0, 2)).map(item => {
    const orderQty = item.suggestedOrderQty > 0 ? item.suggestedOrderQty : Math.max(10, Math.round(item.minSafetyStock * 0.5));
    return {
      consumableCode: item.code,
      consumableName: item.name,
      unit: item.unit,
      currentStock: item.currentStock,
      orderQuantity: orderQty,
      estimatedCostRials: orderQty * item.estimatedUnitPriceRials,
      supplierName: item.preferredSupplierName,
    };
  });

  const totalEstimatedCostRials = lines.reduce((s, l) => s + l.estimatedCostRials, 0);
  const now = new Date();
  const jy = now.getFullYear() - 621;
  const jm = String(now.getMonth() + 1).padStart(2, '0');
  const jd = String(now.getDate()).padStart(2, '0');
  const jh = String(now.getHours()).padStart(2, '0');
  const jmin = String(now.getMinutes()).padStart(2, '0');

  const newPr: PurchaseRequisitionRecord = {
    id: `PR-${Date.now()}`,
    prNumber: `PR-1404-${String(purchaseRequisitionsStore.length + 90).padStart(3, '0')}`,
    createdAt: now.toISOString(),
    createdAtFa: `${toPersianDigits(jy)}/${toPersianDigits(jm)}/${toPersianDigits(jd)} ${toPersianDigits(jh)}:${toPersianDigits(jmin)}`,
    requestedBy: payload.requestedBy || 'مهندس حسینی (مدیر برنامه‌ریزی و کنترل تولید)',
    urgency: payload.urgency || 'IMMEDIATE',
    status: 'PENDING_APPROVAL',
    itemsCount: lines.length,
    totalEstimatedCostRials,
    lines,
    notes: payload.notes || 'درخواست خرید خودکار صادره از موتور پیش‌بینی مواد مصرفی و نقطه سفارش (ROP)',
  };

  purchaseRequisitionsStore.unshift(newPr);
  return newPr;
}

export function updateConsumableStockOrRate(payload: {
  code: string;
  newStock?: number;
  newStandardRate?: number;
  newMinSafetyStock?: number;
}): boolean {
  const item = consumablesCatalogStore.find(c => c.code === payload.code || c.id === payload.code);
  if (!item) return false;
  if (typeof payload.newStock === 'number' && payload.newStock >= 0) {
    item.currentStock = payload.newStock;
  }
  if (typeof payload.newStandardRate === 'number' && payload.newStandardRate > 0) {
    item.standardRatePerDriverUnit = payload.newStandardRate;
  }
  if (typeof payload.newMinSafetyStock === 'number' && payload.newMinSafetyStock >= 0) {
    item.minSafetyStock = payload.newMinSafetyStock;
  }
  return true;
}
