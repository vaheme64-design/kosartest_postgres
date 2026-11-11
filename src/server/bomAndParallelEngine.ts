/**
 * KPIMS Engine for Multi-Level BOMs, Parallel & Co-Production Logic, and Traceability Tagging
 * موتور مدیریت درخت محصول پیشرفته (BOM چندسطحی)، زیرفرآیندهای موازی و صدور کارت ردیابی سری ساخت
 */

import {
  AdvancedBomDefinition,
  ParallelProductionFlow,
  TraceabilityTagData,
} from '../types/bomAndParallelFlow';
import { formatToJalali } from '../utils/jalali';

const todayJalali = () => formatToJalali(new Date());

// =========================================================================
// 1. INITIAL ADVANCED BOM (ONLY ANTI-THEFT ECU BRACKET)
// =========================================================================

export const INITIAL_ADVANCED_BOMS: AdvancedBomDefinition[] = [
  {
    id: 'BOM-ECU-ANTI-THEFT',
    assemblyPartId: 'PRT-FGD-ECU-BRK',
    assemblyPartCode: 'SAPCO-ASY-ECU-BRK-01',
    assemblyPartName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    version: 'V1.0',
    isActive: true,
    effectiveDate: todayJalali(),
    totalNetWeightKg: 1.206,
    totalGrossWeightKg: 1.506,
    yieldEfficiencyPercent: 80.1,
    notes: 'متشکل از زیرفرآیند ۱: صفحه براکت اصلی ضدسرقت رایانه موتور (ورق DC01A ضخامت 2x1140 با ۱۵ عدد مهره جوشی M6) و زیرفرآیند ۲: مکمل براکت ضدسرقت رایانه موتور (ورق DC01A ضخامت 2x1140 یا 2x1000 با ۲ عدد پیچ جوشی M6x20) که در ایستگاه جوش CO2 (OP60) به هم متصل شده و سپس رنگ کاتافورز ED می‌شوند.',
    approvedBy: 'واحد مهندسی محصول و برنامه‌ریزی تولید',
    subMoLinkedCount: 2,
    components: [
      {
        id: 'BOM-CMP-ECU-01',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-WIP-ECU-MAIN',
        componentPartCode: 'WIP-ECU-MAIN-BRK',
        componentPartName: 'صفحه براکت اصلی ضدسرقت رایانه موتور (ورق DC01A ضخامت 2mm ابعاد ۲×۱۱۴۰)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.95,
        netWeightKg: 0.75,
        scrapAllowancePercent: 21.0,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RTG-ECU-MAIN',
        stageJoinedStepNumber: 60,
        supplierSource: 'INTERNAL_FABRICATED',
        notes: 'مراحل زیرفرآیند: OP10 برش رول ۲×۱۱۴۰ -> OP15 گیوتین سایز کوچک -> OP20 بلنکینگ -> OP30 خم لبه -> OP40 پانچ ۱ -> OP45 پانچ ۲ -> OP50 پرس‌جوش ۱۵ عدد مهره M6',
      },
      {
        id: 'BOM-CMP-ECU-02',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-WIP-ECU-COMP',
        componentPartCode: 'WIP-ECU-COMP-BRK',
        componentPartName: 'مکمل براکت ضدسرقت رایانه موتور (ورق DC01A ضخامت 2mm ابعاد ۲×۱۱۴۰ یا ۲×۱۰۰۰)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.45,
        netWeightKg: 0.35,
        scrapAllowancePercent: 22.2,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RTG-ECU-COMP',
        stageJoinedStepNumber: 60,
        supplierSource: 'INTERNAL_FABRICATED',
        notes: 'مراحل زیرفرآیند: OP10 برش و سایز شیت -> OP20 بلنکینگ -> OP30 خم‌کاری -> OP40 پانچ -> OP50 پرس‌جوش ۲ عدد پیچ پایه جوشی ۶×۲۰',
      },
      {
        id: 'BOM-CMP-ECU-03',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-FST-NUT-M6',
        componentPartCode: 'FST-NUT-WELD-M6',
        componentPartName: 'مهره جوشی چهارگوش پایه‌دار M6 استاندارد DIN 928',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 15,
        unit: 'PCS',
        grossWeightKg: 0.09,
        netWeightKg: 0.09,
        scrapAllowancePercent: 0,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: false,
        stageJoinedStepNumber: 50,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'مصرف ۱۵ عدد مهره جوشی M6 روی صفحه اصلی براکت ضدسرقت در ایستگاه OP50 با تست گشتاور حداقل 40 N.m',
      },
      {
        id: 'BOM-CMP-ECU-04',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-FST-BLT-M6-20',
        componentPartCode: 'FST-BOLT-WELD-M6-20',
        componentPartName: 'پیچ پایه جوشی مقاومتی M6x20 استاندارد خودرویی',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 2,
        unit: 'PCS',
        grossWeightKg: 0.016,
        netWeightKg: 0.016,
        scrapAllowancePercent: 0,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: false,
        stageJoinedStepNumber: 50,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'مصرف ۲ عدد پیچ پایه جوشی M6x20 روی قطعه مکمل براکت ضدسرقت در ایستگاه OP50',
      },
    ],
  },
];

// =========================================================================
// 2. INITIAL PARALLEL SUB-PROCESS FLOW (ONLY ANTI-THEFT ECU BRACKET)
// =========================================================================

export const INITIAL_PARALLEL_FLOWS: ParallelProductionFlow[] = [
  {
    id: 'FLOW-ECU-PARALLEL-WELD',
    flowCode: 'FLOW-ECU-ANTI-THEFT',
    flowName: 'جریان موازی تولید صفحه اصلی و مکمل براکت ضدسرقت رایانه موتور و الحاق در ایستگاه جوش CO2',
    patternType: 'PARALLEL_JOIN_WELD',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    inputRawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
    inputRawMaterialName: 'رول ورق روغنی DC01A ضخامت 2mm با عرض 1140mm (و ورق آلترناتیو ۲×۱۰۰۰)',
    linkedOutputs: [
      {
        partCode: 'WIP-ECU-MAIN-BRK',
        partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور (با ۱۵ مهره M6)',
        role: 'MAIN_BODY',
        subMoPrefix: 'MO-ECU-MAIN',
      },
      {
        partCode: 'WIP-ECU-COMP-BRK',
        partName: 'مکمل براکت ضدسرقت رایانه موتور (با ۲ پیچ M6x20)',
        role: 'SUB_COMPONENT',
        subMoPrefix: 'MO-ECU-COMP',
      },
      {
        partCode: 'SAPCO-ASY-ECU-BRK-01',
        partName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
        role: 'FINAL_ASSEMBLY',
        subMoPrefix: 'MO-ECU-ASY',
      },
    ],
    nodes: [
      {
        id: 'ECU-N1',
        nodeType: 'RAW_INPUT',
        stepCode: 'IN_COIL_DC01A',
        stepName: 'تغذیه رول ورق روغنی DC01A ضخامت 2mm عرض 1140mm (یا شیت آلترناتیو 2x1000)',
        branch: 'MAIN',
        machineCode: 'SLT-125-01',
        machineName: 'خط رول‌بازکن، فیدر اتوماتیک و نواربر عرض ۱۲۵۰mm ساپکو',
        description: 'تخصیص ورق DC01A از انبار رول ساپکو به دو خط زیرفرآیند صفحه اصلی و مکمل.',
      },
      {
        id: 'ECU-N2L',
        nodeType: 'BRANCH_L',
        stepCode: 'MAIN_OP10_TO_OP45',
        stepName: 'زیرفرآیند صفحه اصلی: گیوتین، بلنکینگ، خم لبه و پانچ ۱ و ۲ (۱۵ سوراخ)',
        branch: 'LEFT',
        machineCode: 'PRS-400-01',
        machineName: 'پرس ۲۵۰ تن + پرس برک CNC + پرس شولر ۴۰۰ تن',
        dieMoldCode: 'DIE-ECU-BLK-01 / DIE-ECU-PNC-03',
        dieMoldName: 'قالب‌های بلنک، خم و پانچ صفحه اصلی براکت ضدسرقت',
        description: 'تولید بدنه صفحه اصلی براکت ضدسرقت و سوراخ‌کاری دقیق نشیمنگاه ۱۵ مهره.',
      },
      {
        id: 'ECU-N3L',
        nodeType: 'BRANCH_L',
        stepCode: 'MAIN_OP50_NUT15',
        stepName: 'زیرفرآیند صفحه اصلی (OP50): پرس‌جوش مقاومتی ۱۵ عدد مهره جوشی M6',
        branch: 'LEFT',
        machineCode: 'WLD-SPT-01',
        machineName: 'دستگاه پرس‌جوش مقاومتی نقطه‌ای ۷۵ کیلوولت‌آمپر آویز ARO',
        dieMoldCode: 'JIG-ECU-NUT15',
        dieMoldName: 'فیکسچر پرس‌جوش مقاومتی ۱۵ عدد مهره M6 براکت اصلی',
        description: 'جوش مقاومتی ۱۵ عدد مهره M6 روی صفحه اصلی با کنترل گشتاور ۴۰ نیوتن‌متر.',
      },
      {
        id: 'ECU-N2R',
        nodeType: 'BRANCH_R',
        stepCode: 'COMP_OP10_TO_OP40',
        stepName: 'زیرفرآیند مکمل: برش، بلنکینگ، خم‌کاری و پانچ ۲ سوراخ پیچ',
        branch: 'RIGHT',
        machineCode: 'PRS-250-01',
        machineName: 'پرس ۲۵۰ تن + پرس برک CNC + پرس شولر ۴۰۰ تن',
        dieMoldCode: 'DIE-CMP-BLK-01 / DIE-CMP-BP-02',
        dieMoldName: 'قالب‌های بلنک، خم و پانچ مکمل براکت ضدسرقت',
        description: 'فرم‌دهی قطعه مکمل براکت ضدسرقت به صورت موازی با خط صفحه اصلی.',
      },
      {
        id: 'ECU-N3R',
        nodeType: 'BRANCH_R',
        stepCode: 'COMP_OP50_BOLT2',
        stepName: 'زیرفرآیند مکمل (OP50): پرس‌جوش مقاومتی ۲ عدد پیچ پایه جوشی M6x20',
        branch: 'RIGHT',
        machineCode: 'WLD-SPT-01',
        machineName: 'دستگاه پرس‌جوش مقاومتی نقطه‌ای ۷۵ کیلوولت‌آمپر آویز ARO',
        dieMoldCode: 'JIG-CMP-BLT2',
        dieMoldName: 'فیکسچر پرس‌جوش ۲ عدد پیچ M6x20 مکمل براکت ضدسرقت',
        description: 'جوش مقاومتی ۲ عدد پیچ M6x20 روی قطعه مکمل براکت ضدسرقت.',
      },
      {
        id: 'ECU-N4',
        nodeType: 'MERGE_POINT',
        stepCode: 'OP60_CO2_WELD',
        stepName: 'نقطه الحاق (OP60): اتصال صفحه اصلی و مکمل در ایستگاه جوشکاری CO2',
        branch: 'MERGED',
        machineCode: 'WLD-ROB-01',
        machineName: 'سلول رباتیک دو محوره جوشکاری CO2 یاسکاوا موتومن',
        dieMoldCode: 'JIG-ECU-CO2-ASY',
        dieMoldName: 'فیکسچر مونتاژ و جوش CO2 مجموعه کامل براکت ضدسرقت رایانه موتور',
        description: 'جفت شدن ۱ عدد صفحه اصلی (دارای ۱۵ مهره) و ۱ عدد مکمل (دارای ۲ پیچ) در فیکسچر و جوشکاری CO2.',
      },
      {
        id: 'ECU-N5',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OP70_OP80_ED_PACK',
        stepName: 'پوشش رنگ کاتافورز ED مشکی (OP70) و کنترل فیکسچر و بسته‌بندی نهایی (OP80)',
        branch: 'MERGED',
        machineCode: 'PNT-CAT-01',
        machineName: 'خط رنگ کاتافورز ED + ایستگاه فیکسچر کنترلی Checking Fixture',
        description: 'تحویل محصول نهایی SAPCO-ASY-ECU-BRK-01 به انبار محصول آماده ارسال به ساپکو.',
      },
    ],
    notes: 'کلیه مراحل صفحه اصلی (WIP-ECU-MAIN-BRK) و مکمل (WIP-ECU-COMP-BRK) به صورت موازی برنامه‌ریزی شده و در ایستگاه جوش CO2 به مجموعه نهایی (SAPCO-ASY-ECU-BRK-01) تبدیل می‌شوند.',
  },
];

// =========================================================================
// 3. INITIAL TRACEABILITY TAGS (رهگیری سری ساخت براکت ضدسرقت)
// =========================================================================

export const INITIAL_TRACEABILITY_TAGS: TraceabilityTagData[] = [
  {
    id: 'TAG-ECU-001',
    tagNumber: 'TAG-ECU-1001',
    lotNumber: 'LOT-ECU-MAIN-OP50-M1',
    partCode: 'WIP-ECU-MAIN-BRK',
    partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
    carModel: 'پژو ۲۰۶',
    manufacturingOrderNumber: 'MO-ECU-MAIN-01',
    subMoNumber: 'SUB-MO-ECU-MAIN',
    stepNumber: 50,
    stepCode: 'OP50_WELD_NUT15',
    stepName: 'پرس‌جوش مقاومتی ۱۵ عدد مهره جوشی M6',
    machineCode: 'WLD-SPT-01',
    dieMoldCode: 'JIG-ECU-NUT15',
    shift: 'MORNING',
    productionDate: todayJalali(),
    operatorName: 'سعید باقری',
    supervisorName: 'مهندس حسینی',
    sourceCoilPackNumber: 'MOB-DC01A-2.0-1140-A',
    heatNumber: 'HT-DC01A-9921',
    quantity: 420,
    unit: 'عدد',
    qualityStatus: 'APPROVED',
    barcodeValue: 'WIPECUMAIN*MOECUMAIN01*OP50*Q420',
    qrCodeValue: 'KPIMS:LOT=LOT-ECU-MAIN-OP50-M1&PART=WIP-ECU-MAIN-BRK&QTY=420',
    notes: 'تست گشتاور ۱۵ مهره M6 روی فیکسچر تایید شد.',
    issuedAt: new Date().toISOString(),
  },
  {
    id: 'TAG-ECU-002',
    tagNumber: 'TAG-ECU-1002',
    lotNumber: 'LOT-ECU-ASY-OP80-M1',
    partCode: 'SAPCO-ASY-ECU-BRK-01',
    partName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
    carModel: 'پژو ۲۰۶',
    manufacturingOrderNumber: 'MO-ECU-ASY-01',
    subMoNumber: 'MO-ECU-ASY-01',
    stepNumber: 80,
    stepCode: 'OP80_QC_PACK',
    stepName: 'کنترل کیفیت ابعادی روی فیکسچر و بسته‌بندی در پالت ساپکو',
    machineCode: 'ASM-JIG-01',
    dieMoldCode: 'JIG-ECU-CO2-ASY',
    shift: 'MORNING',
    productionDate: todayJalali(),
    operatorName: 'حمید رسولی',
    supervisorName: 'مهندس حسینی',
    sourceCoilPackNumber: 'MOB-DC01A-2.0-1140-A',
    heatNumber: 'HT-DC01A-9921',
    quantity: 350,
    unit: 'عدد',
    qualityStatus: 'APPROVED',
    barcodeValue: 'SAPCOASYECUBRK01*MOECUASY01*OP80*Q350',
    qrCodeValue: 'KPIMS:LOT=LOT-ECU-ASY-OP80-M1&PART=SAPCO-ASY-ECU-BRK-01&QTY=350',
    notes: 'ضخامت رنگ کاتافورز ۱۸ میکرون و کنترل Checking Fixture تایید شد.',
    issuedAt: new Date().toISOString(),
  },
];

// =========================================================================
// 4. IN-MEMORY STORES & MANAGEMENT FUNCTIONS
// =========================================================================

let advancedBomsStore: AdvancedBomDefinition[] = [...INITIAL_ADVANCED_BOMS];
let parallelFlowsStore: ParallelProductionFlow[] = [...INITIAL_PARALLEL_FLOWS];
let traceabilityTagsStore: TraceabilityTagData[] = [...INITIAL_TRACEABILITY_TAGS];

export function getAllBoms(): AdvancedBomDefinition[] {
  return advancedBomsStore;
}

export function getBomByPartId(partId: string): AdvancedBomDefinition | undefined {
  return advancedBomsStore.find(
    b => b.assemblyPartId === partId || b.assemblyPartCode === partId
  );
}

export function saveAdvancedBom(bomData: Partial<AdvancedBomDefinition>): AdvancedBomDefinition {
  const existingIndex = advancedBomsStore.findIndex(
    b => b.id === bomData.id || b.assemblyPartId === bomData.assemblyPartId
  );

  const totalGross = (bomData.components || []).reduce(
    (sum, c) => sum + (c.grossWeightKg || 0),
    0
  );
  const totalNet = (bomData.components || []).reduce(
    (sum, c) => sum + (c.netWeightKg || 0),
    0
  );
  const yieldEff = totalGross > 0 ? Math.round((totalNet / totalGross) * 1000) / 10 : 85;

  const fullBom: AdvancedBomDefinition = {
    id: bomData.id || `BOM-${Date.now()}`,
    assemblyPartId: bomData.assemblyPartId || 'UNKNOWN',
    assemblyPartCode: bomData.assemblyPartCode || 'UNKNOWN',
    assemblyPartName: bomData.assemblyPartName || 'مجموعه مونتاژی خودرویی',
    carModel: bomData.carModel || 'پژو ۲۰۶',
    version: bomData.version || 'V1.0',
    isActive: bomData.isActive ?? true,
    effectiveDate: bomData.effectiveDate || todayJalali(),
    totalNetWeightKg: Math.round(totalNet * 1000) / 1000,
    totalGrossWeightKg: Math.round(totalGross * 1000) / 1000,
    yieldEfficiencyPercent: yieldEff,
    components: bomData.components || [],
    notes: bomData.notes || '',
    approvedBy: bomData.approvedBy || 'واحد مهندسی و برنامه‌ریزی تولید',
    subMoLinkedCount: (bomData.components || []).filter(c => c.subMoRequired).length,
  };

  if (existingIndex >= 0) {
    advancedBomsStore[existingIndex] = fullBom;
  } else {
    advancedBomsStore.push(fullBom);
  }

  return fullBom;
}

export function getAllParallelFlows(): ParallelProductionFlow[] {
  return parallelFlowsStore;
}

export function saveParallelFlow(flowData: Partial<ParallelProductionFlow>): ParallelProductionFlow {
  const existingIndex = parallelFlowsStore.findIndex(f => f.id === flowData.id);

  const fullFlow: ParallelProductionFlow = {
    id: flowData.id || `FLOW-${Date.now()}`,
    flowCode: flowData.flowCode || `FLOW-${Date.now()}`,
    flowName: flowData.flowName || 'جریان تولید موازی قطعات',
    patternType: flowData.patternType || 'PARALLEL_JOIN_WELD',
    carModel: flowData.carModel || 'پژو ۲۰۶',
    inputRawMaterialCode: flowData.inputRawMaterialCode || 'RM-COIL-DC01A-2.0-1140',
    inputRawMaterialName: flowData.inputRawMaterialName || 'کویل ورق خام ورودی',
    nodes: flowData.nodes || [],
    linkedOutputs: flowData.linkedOutputs || [],
    notes: flowData.notes || '',
  };

  if (existingIndex >= 0) {
    parallelFlowsStore[existingIndex] = fullFlow;
  } else {
    parallelFlowsStore.push(fullFlow);
  }

  return fullFlow;
}

export function issueTraceabilityTag(params: {
  partCode: string;
  partName: string;
  carModel?: string;
  manufacturingOrderNumber: string;
  subMoNumber?: string;
  stepNumber: number;
  stepCode: string;
  stepName: string;
  machineCode: string;
  dieMoldCode?: string;
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  operatorName: string;
  supervisorName?: string;
  sourceCoilPackNumber: string;
  heatNumber?: string;
  quantity: number;
  unit?: string;
  qualityStatus?: 'APPROVED' | 'IN_INSPECTION' | 'QUARANTINE';
  notes?: string;
}): TraceabilityTagData {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '').slice(2);
  const seq = Math.floor(1000 + Math.random() * 9000);
  const lotNumber = `LOT-${dateStr}-${params.partCode.replace(/[^a-zA-Z0-9]/g, '')}-${params.stepCode}-${params.shift.slice(0, 1)}-${seq}`;
  const tagNumber = `TAG-${dateStr}-${seq}`;

  const barcodeValue = `${params.partCode}*${params.manufacturingOrderNumber}*${params.stepCode}*${seq}*Q${params.quantity}`;
  const qrCodeValue = `KPIMS:LOT=${lotNumber}&PART=${params.partCode}&QTY=${params.quantity}&MO=${params.manufacturingOrderNumber}&MCH=${params.machineCode}`;

  const newTag: TraceabilityTagData = {
    id: `TAG-${Date.now()}`,
    tagNumber,
    lotNumber,
    partCode: params.partCode,
    partName: params.partName,
    carModel: params.carModel || 'پژو ۲۰۶',
    manufacturingOrderNumber: params.manufacturingOrderNumber,
    subMoNumber: params.subMoNumber,
    stepNumber: params.stepNumber,
    stepCode: params.stepCode,
    stepName: params.stepName,
    machineCode: params.machineCode,
    dieMoldCode: params.dieMoldCode,
    shift: params.shift,
    productionDate: todayJalali(),
    operatorName: params.operatorName,
    supervisorName: params.supervisorName || 'سرپرست شیفت تولید',
    sourceCoilPackNumber: params.sourceCoilPackNumber,
    heatNumber: params.heatNumber || 'HT-DC01A-9921',
    quantity: params.quantity,
    unit: params.unit || 'عدد',
    qualityStatus: params.qualityStatus || 'APPROVED',
    barcodeValue,
    qrCodeValue,
    notes: params.notes || '',
    issuedAt: now.toISOString(),
  };

  traceabilityTagsStore.unshift(newTag);
  return newTag;
}

export function getAllTraceabilityTags(): TraceabilityTagData[] {
  return traceabilityTagsStore;
}

export function deleteAdvancedBom(id: string): boolean {
  const init = advancedBomsStore.length;
  advancedBomsStore = advancedBomsStore.filter(b => b.id !== id && b.assemblyPartId !== id && b.assemblyPartCode !== id);
  return advancedBomsStore.length < init;
}

export function deleteParallelFlow(id: string): boolean {
  const init = parallelFlowsStore.length;
  parallelFlowsStore = parallelFlowsStore.filter(f => f.id !== id && f.flowCode !== id);
  return parallelFlowsStore.length < init;
}
