/**
 * KPIMS Engine for Multi-Level BOMs, Parallel & Co-Production Logic, and Traceability Tagging
 * موتور مدیریت درخت محصول پیشرفته (BOM چندسطحی)، انشعاب و ادغام چپ و راست، و صدور کارت ردیابی سری ساخت
 */

import {
  AdvancedBomDefinition,
  BomComponentItem,
  ParallelProductionFlow,
  TraceabilityTagData,
} from '../types/bomAndParallelFlow';

// =========================================================================
// 1. INITIAL SAMPLE ADVANCED BOMS
// =========================================================================

export const INITIAL_ADVANCED_BOMS: AdvancedBomDefinition[] = [
  // BOM 1: مجموعه کامل تقویتی قفل ضد سرقت کلاف درب پژو ۲۰۶ / ۲۰۷
  // این قطعه متشکل از ۲ نوع ورق با گرید و ضخامت مختلف، ۲ عدد پیچ جوشی، ۲ عدد مهره جوشی و ۱ بوش لاستیکی است.
  {
    id: 'BOM-206-SEC-01',
    assemblyPartId: 'PRT-FGD-015',
    assemblyPartCode: 'SAPCO-ASSY-206-SEC01',
    assemblyPartName: 'مجموعه کامل تقویتی قفل ضد سرقت کلاف درب ۲۰۶/۲۰۷ (پوسته دوبل و مهره‌های جوشی)',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    version: 'V2.1',
    isActive: true,
    effectiveDate: '1403/06/15',
    totalNetWeightKg: 0.98,
    totalGrossWeightKg: 1.25,
    yieldEfficiencyPercent: 78.4,
    notes: 'تولید ورق‌های پوسته و لچکی در دو خط پرس مجزا با دستورات ساخت فرعی آغاز شده و در مرحله OP30 جوش مقاومتی مونتاژ می‌شوند.',
    approvedBy: 'مهندس کاظمی (مدیر مهندسی محصول ساپکو)',
    subMoLinkedCount: 2,
    components: [
      {
        id: 'BOM-CMP-01',
        bomId: 'BOM-206-SEC-01',
        componentPartId: 'PRT-WIP-020',
        componentPartCode: 'WIP-206-SEC-PLT1',
        componentPartName: 'پوسته اصلی تقویتی قفل ضد سرقت (ورق روغنی ST14 ضخامت 1.5mm کشش سنگین)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.68,
        netWeightKg: 0.52,
        scrapAllowancePercent: 23.5,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: true,
        subRoutingId: 'RT-206-SEC-SHELL',
        stageJoinedStepNumber: 30,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'مرحله OP10 بلنک، OP20 کشش هیدرولیک، سپس انتقال به ایستگاه جوش',
      },
      {
        id: 'BOM-CMP-02',
        bomId: 'BOM-206-SEC-01',
        componentPartId: 'PRT-WIP-021',
        componentPartCode: 'WIP-206-SEC-BRK2',
        componentPartName: 'لچکی نگهدارنده زبانه قفل (ورق روغنی DC04 ضخامت 1.0mm فرم‌دهی)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.28,
        netWeightKg: 0.21,
        scrapAllowancePercent: 25.0,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: true,
        subRoutingId: 'RT-206-SEC-GUSSET',
        stageJoinedStepNumber: 30,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'خط پرس مکانیکی ۴۰۰ تن، پانچ و خم ۹۰ درجه، سپس اتصال با ۲ نقطه جوش',
      },
      {
        id: 'BOM-CMP-03',
        bomId: 'BOM-206-SEC-01',
        componentPartId: 'PRT-FST-004',
        componentPartCode: 'FST-BOLT-M6-20',
        componentPartName: 'پیچ آلن پایه جوشی M6x20 گرید 8.8 پوشش داکرومات (تأمین ساپکو)',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 2,
        unit: 'PCS',
        grossWeightKg: 0.016,
        netWeightKg: 0.016,
        scrapAllowancePercent: 0,
        joiningProcess: 'FASTENING',
        subMoRequired: false,
        stageJoinedStepNumber: 40,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'بستن با ترک رنچ الکتریکی گشتاور 9.5 N.m',
      },
      {
        id: 'BOM-CMP-04',
        bomId: 'BOM-206-SEC-01',
        componentPartId: 'PRT-FST-005',
        componentPartCode: 'FST-NUT-WELD-M6',
        componentPartName: 'مهره جوشی چهارگوش پایه‌دار M6 استاندارد DIN 928 (جوش مقاومتی)',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 2,
        unit: 'PCS',
        grossWeightKg: 0.012,
        netWeightKg: 0.012,
        scrapAllowancePercent: 0,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: false,
        stageJoinedStepNumber: 30,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'جوش مقاومتی با پرس‌جوش ۷۵ کیلوولت‌آمپر روی صفحه اصلی',
      },
      {
        id: 'BOM-CMP-05',
        bomId: 'BOM-206-SEC-01',
        componentPartId: 'PRT-RUB-003',
        componentPartCode: 'RUB-BSH-VIB-01',
        componentPartName: 'بوش و ضربه‌گیر لاستیکی ضد لرزش زبانه قفل EPDM',
        componentType: 'RUBBER_SEAL',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.035,
        netWeightKg: 0.035,
        scrapAllowancePercent: 0,
        joiningProcess: 'PRESS_FIT',
        subMoRequired: false,
        stageJoinedStepNumber: 40,
        supplierSource: 'SAPCO_CONSIGNMENT',
        notes: 'جا زدن فشاری روی پین مرکزی قبل از بسته‌بندی نهایی',
      },
    ],
  },

  // BOM 2: مجموعه دیاق تقویتی سپر جلو تارا با براکت‌های سنسور رادار و پیچ‌های جوشی
  {
    id: 'BOM-TAR-BUM-01',
    assemblyPartId: 'PRT-FGD-001',
    assemblyPartCode: 'SAPCO-ASSY-TAR-001',
    assemblyPartName: 'مجموعه دیاق تقویتی سپر جلو تارا با پیچ‌های جوشی و ضربه‌گیر لاستیکی',
    carModel: 'تارا',
    version: 'V1.3',
    isActive: true,
    effectiveDate: '1403/05/10',
    totalNetWeightKg: 2.85,
    totalGrossWeightKg: 3.45,
    yieldEfficiencyPercent: 82.6,
    notes: 'پوسته از کویل ST14 و براکت‌ها از کویل DC04 تولید شده و در ایستگاه CO2 جوشکاری می‌شوند.',
    approvedBy: 'اداره مهندسی بدنه ایران‌خودرو',
    subMoLinkedCount: 2,
    components: [
      {
        id: 'BOM-CMP-10',
        bomId: 'BOM-TAR-BUM-01',
        componentPartId: 'PRT-WIP-004',
        componentPartCode: 'WIP-TAR-BUM-FORM',
        componentPartName: 'پوسته فرم کشش عمیق دیاق سپر جلو تارا (ورق ST14 ضخامت 1.5mm)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 2.45,
        netWeightKg: 2.10,
        scrapAllowancePercent: 14.2,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RT-TAR-BUM-BEAM',
        stageJoinedStepNumber: 30,
        supplierSource: 'SAPCO_CONSIGNMENT',
      },
      {
        id: 'BOM-CMP-11',
        bomId: 'BOM-TAR-BUM-01',
        componentPartId: 'PRT-WIP-022',
        componentPartCode: 'WIP-TAR-RAD-BRK',
        componentPartName: 'براکت نگهدارنده سنسور رادار جلو (ورق DC04 ضخامت 1.0mm)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 2,
        unit: 'PCS',
        grossWeightKg: 0.42,
        netWeightKg: 0.32,
        scrapAllowancePercent: 23.8,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RT-TAR-RADAR-BRK',
        stageJoinedStepNumber: 30,
        supplierSource: 'INTERNAL_FABRICATED',
      },
      {
        id: 'BOM-CMP-12',
        bomId: 'BOM-TAR-BUM-01',
        componentPartId: 'PRT-FST-001',
        componentPartCode: 'FST-BOLT-M8-25',
        componentPartName: 'پیچ شش‌گوش فولادی M8x25 گرید 8.8 (تأمین مستقیم ساپکو)',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 4,
        unit: 'PCS',
        grossWeightKg: 0.072,
        netWeightKg: 0.072,
        scrapAllowancePercent: 0,
        joiningProcess: 'FASTENING',
        subMoRequired: false,
        stageJoinedStepNumber: 40,
        supplierSource: 'SAPCO_CONSIGNMENT',
      },
      {
        id: 'BOM-CMP-13',
        bomId: 'BOM-TAR-BUM-01',
        componentPartId: 'PRT-RUB-001',
        componentPartCode: 'RUB-DAMP-BUM-01',
        componentPartName: 'دمپر و ضربه‌گیر لاستیکی دیاق جلو EPDM مقاوم در برابر حرارت',
        componentType: 'RUBBER_SEAL',
        quantityPerAssembly: 2,
        unit: 'PCS',
        grossWeightKg: 0.17,
        netWeightKg: 0.17,
        scrapAllowancePercent: 0,
        joiningProcess: 'PRESS_FIT',
        subMoRequired: false,
        stageJoinedStepNumber: 40,
        supplierSource: 'SAPCO_CONSIGNMENT',
      },
    ],
  },

  // BOM 3 (سناریوی ۱ کاربر): مجموعه براکت ضدسرقت رایانه موتور
  {
    id: 'BOM-ECU-ANTI-THEFT',
    assemblyPartId: 'PRT-FGD-ECU-BRK',
    assemblyPartCode: 'SAPCO-ASY-ECU-BRK-01',
    assemblyPartName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
    carModel: 'پژو ۲۰۶',
    version: 'V1.0',
    isActive: true,
    effectiveDate: '1403/08/01',
    totalNetWeightKg: 1.19,
    totalGrossWeightKg: 1.55,
    yieldEfficiencyPercent: 76.8,
    notes: 'متشکل از صفحه براکت اصلی (ورق DC01A ضخامت 2x1140 با 15 مهره M6) و مکمل براکت ضدسرقت (با 2 پیچ جوشی M6x20) که در ایستگاه جوش CO2 متصل و سپس رنگ ED مشکی می‌شوند.',
    approvedBy: 'مدیریت مهندسی قطعات بدنه',
    subMoLinkedCount: 2,
    components: [
      {
        id: 'BOM-CMP-ECU-01',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-WIP-ECU-MAIN',
        componentPartCode: 'WIP-ECU-MAIN-BRK',
        componentPartName: 'صفحه براکت اصلی ضدسرقت رایانه موتور (ورق DC01A ضخامت 2mm ابعاد 2x1140)',
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
        notes: 'مراحل: برش رول -> گیوتین سایز کوچک -> بلنک -> خم لبه -> پانچ ۱ -> پانچ ۲ -> پرس‌جوش ۱۵ مهره M6',
      },
      {
        id: 'BOM-CMP-ECU-02',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-WIP-ECU-COMP',
        componentPartCode: 'WIP-ECU-COMP-BRK',
        componentPartName: 'مکمل براکت ضدسرقت رایانه موتور (ورق DC01A ضخامت 2mm ابعاد 2x1140 یا 2x1000)',
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
        notes: 'مراحل: برش و سایز -> بلنک -> خم‌کاری -> پانچ -> پرس‌جوش ۲ پیچ جوشی ۶×۲۰',
      },
      {
        id: 'BOM-CMP-ECU-03',
        bomId: 'BOM-ECU-ANTI-THEFT',
        componentPartId: 'PRT-FST-NUT-M6',
        componentPartCode: 'FST-NUT-WELD-M6',
        componentPartName: 'مهره جوشی چهارگوش پایه‌دار M6 استاندارد DIN 928 (جوش مقاومتی)',
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
        notes: 'تعداد ۱۵ مهره جوش مقاومتی روی صفحه براکت اصلی با تست گشتاور 40 N.m',
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
        notes: 'تعداد ۲ عدد پیچ پایه جوشی روی مکمل براکت ضدسرقت',
      },
    ],
  },

  // BOM 4 (سناریوی ۲ کاربر): مجموعه براکت تارا (حاصل از انشعاب و ادغام)
  {
    id: 'BOM-TARA-BRK-ASY',
    assemblyPartId: 'PRT-FGD-TARA-BRK',
    assemblyPartCode: 'SAPCO-ASY-TARA-BRK-01',
    assemblyPartName: 'مجموعه براکت تارا با پوشش کاتافورز ED',
    carModel: 'تارا',
    version: 'V1.0',
    isActive: true,
    effectiveDate: '1403/08/01',
    totalNetWeightKg: 1.87,
    totalGrossWeightKg: 2.30,
    yieldEfficiencyPercent: 81.3,
    notes: 'متشکل از براکت تارا بزرگ (با ۸ مهره M6) و براکت تارا کوچک (با ۱۲ مهره M6) که از رول DC01A ضخامت 2x1140 منشعب شده و با جوشکاری به هم متصل می‌شوند.',
    approvedBy: 'مهندسی ساپکو و ایران‌خودرو',
    subMoLinkedCount: 2,
    components: [
      {
        id: 'BOM-CMP-TAR-01',
        bomId: 'BOM-TARA-BRK-ASY',
        componentPartId: 'PRT-WIP-TARA-LG',
        componentPartCode: 'WIP-TARA-BRK-LARGE',
        componentPartName: 'براکت تارا بزرگ (ورق DC01A با ۳ مرحله خم و ۸ مهره)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 1.35,
        netWeightKg: 1.10,
        scrapAllowancePercent: 18.5,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RTG-TARA-LG',
        stageJoinedStepNumber: 70,
        supplierSource: 'INTERNAL_FABRICATED',
      },
      {
        id: 'BOM-CMP-TAR-02',
        bomId: 'BOM-TARA-BRK-ASY',
        componentPartId: 'PRT-WIP-TARA-SM',
        componentPartCode: 'WIP-TARA-BRK-SMALL',
        componentPartName: 'براکت تارا کوچک (ورق DC01A با ۳ مرحله خم و ۱۲ مهره)',
        componentType: 'RAW_SHEET',
        quantityPerAssembly: 1,
        unit: 'PCS',
        grossWeightKg: 0.83,
        netWeightKg: 0.65,
        scrapAllowancePercent: 21.6,
        joiningProcess: 'CO2_WELD',
        subMoRequired: true,
        subRoutingId: 'RTG-TARA-SM',
        stageJoinedStepNumber: 70,
        supplierSource: 'INTERNAL_FABRICATED',
      },
      {
        id: 'BOM-CMP-TAR-03',
        bomId: 'BOM-TARA-BRK-ASY',
        componentPartId: 'PRT-FST-NUT-M6',
        componentPartCode: 'FST-NUT-WELD-M6',
        componentPartName: 'مهره جوشی چهارگوش پایه‌دار M6 (مجموعاً ۲۰ عدد در مجموعه تارا)',
        componentType: 'FASTENER_HARDWARE',
        quantityPerAssembly: 20,
        unit: 'PCS',
        grossWeightKg: 0.12,
        netWeightKg: 0.12,
        scrapAllowancePercent: 0,
        joiningProcess: 'SPOT_WELD',
        subMoRequired: false,
        stageJoinedStepNumber: 60,
        supplierSource: 'SAPCO_CONSIGNMENT',
      },
    ],
  },
];

// =========================================================================
// 2. INITIAL PARALLEL & CO-PRODUCTION FLOWS
// =========================================================================

export const INITIAL_PARALLEL_FLOWS: ParallelProductionFlow[] = [
  // جریان ۱: سناریوی ۲ کاربر - انشعاب و جداسازی مشترک براکت تارا (Branching / Split & Merge Flow)
  {
    id: 'FLOW-TARA-SPLIT',
    flowCode: 'FLOW-SPLIT-TARA-BRK',
    flowName: 'جریان انشعاب و جداسازی براکت تارا (تولید بزرگ و کوچک از رول ۲×۱۱۴۰ و الحاق در جوش)',
    patternType: 'SPLIT_AND_MERGE',
    carModel: 'تارا',
    inputRawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
    inputRawMaterialName: 'رول ورق روغنی DC01A ضخامت 2mm ابعاد ۲×۱۱۴۰',
    linkedOutputs: [
      { partCode: 'WIP-TARA-BRK-LARGE', partName: 'براکت تارا بزرگ', role: 'MAIN_BODY' },
      { partCode: 'WIP-TARA-BRK-SMALL', partName: 'براکت تارا کوچک', role: 'SUB_COMPONENT' },
      { partCode: 'SAPCO-ASY-TARA-BRK-01', partName: 'مجموعه براکت تارا', role: 'FINAL_ASSEMBLY' },
    ],
    nodes: [
      {
        id: 'TAR-N1',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP10_SLIT',
        stepName: 'برش اولیه رول ورق در خط برشکاری',
        branch: 'MAIN',
        machineName: 'خط برش کویل و رول‌بازکن',
        description: 'برش شیت با ابعاد دقیق ۲×۱۱۴۰ میلیمتر',
      },
      {
        id: 'TAR-N2',
        nodeType: 'SPLIT_POINT',
        stepCode: 'OP20_SPLIT_STAMP',
        stepName: 'پرسکاری بلنک، پانچ و خم اولیه مشترک (نقطه جداسازی و انشعاب)',
        branch: 'MAIN',
        machineName: 'پرس مکانیکی ضربه‌ای ۶۳۰ تن',
        dieMoldName: 'قالب چندمرحله‌ای انشعاب تارا',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'در این مرحله ورق منشعب و جدا شده و دو قطعه مستقل براکت تارا بزرگ و براکت تارا کوچک بیرون می‌آیند.',
      },
      {
        id: 'TAR-N3L',
        nodeType: 'BRANCH_L',
        stepCode: 'OP30_LG_BEND',
        stepName: 'خم اول، دوم و سوم براکت تارا بزرگ',
        branch: 'LEFT',
        machineName: 'پرس برک CNC خط ۱',
        description: 'اجرای ۳ مرحله خم‌کاری زاویه‌دار روی براکت تارا بزرگ',
      },
      {
        id: 'TAR-N4L',
        nodeType: 'BRANCH_L',
        stepCode: 'OP60_LG_NUT8',
        stepName: 'پرس‌جوش مقاومتی ۸ عدد مهره جوشی M6 روی براکت بزرگ',
        branch: 'LEFT',
        machineName: 'دستگاه پرس‌جوش ۷۵kVA',
        description: 'جوش مقاومتی ۸ مهره M6',
      },
      {
        id: 'TAR-N3R',
        nodeType: 'BRANCH_R',
        stepCode: 'OP30_SM_BEND',
        stepName: 'خم اول، دوم و سوم براکت تارا کوچک',
        branch: 'RIGHT',
        machineName: 'پرس برک CNC خط ۲',
        description: 'اجرای ۳ مرحله خم‌کاری زاویه‌دار روی براکت تارا کوچک',
      },
      {
        id: 'TAR-N4R',
        nodeType: 'BRANCH_R',
        stepCode: 'OP60_SM_NUT12',
        stepName: 'پرس‌جوش مقاومتی ۱۲ عدد مهره جوشی M6 روی براکت کوچک',
        branch: 'RIGHT',
        machineName: 'دستگاه پرس‌جوش ۷۵kVA',
        description: 'جوش مقاومتی ۱۲ مهره M6',
      },
      {
        id: 'TAR-N5',
        nodeType: 'MERGE_POINT',
        stepCode: 'OP70_WELD_MERGE',
        stepName: 'نقطه الحاق: جوشکاری اتصال براکت بزرگ و کوچک به هم',
        branch: 'MERGED',
        machineName: 'سلول جوشکاری CO2 رباتیک',
        description: 'اتصال دائم براکت تارا بزرگ و کوچک در فیکسچر دقیق مونتاژ',
      },
      {
        id: 'TAR-N6',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OP80_PAINT_ED',
        stepName: 'شستشو، رنگ‌آمیزی کاتافورز ED و بسته‌بندی در پالت ساپکو',
        branch: 'MERGED',
        machineName: 'خط رنگ الکتروفورز و سالن بسته‌بندی',
        description: 'پوشش محافظتی و تحویل محصول نهایی به خودروساز',
      },
    ],
    notes: 'جریان انشعاب و ادغام براکت تارا: ورق از مرحله بلنک/پانچ/خم اولیه به ۲ قطعه تفکیک شده و پس از فرآیندهای مجزا، در جوشکاری مجدداً الحاق می‌گردد.',
  },

  // جریان ۲: سناریوی ۳ کاربر - تولید متقارن قالب ۲ کویتی قطعه پشت صندلی چپ و راست (Co-Production)
  {
    id: 'FLOW-SEAT-BACK-LR',
    flowCode: 'FLOW-COPROD-SEAT-LR',
    flowName: 'تولید متقارن در قالب مشترک ۲ کویتی (قطعه پشت صندلی چپ و راست)',
    patternType: 'CO_PRODUCTION_LR',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    inputRawMaterialCode: 'RM-SHT-1.47-900',
    inputRawMaterialName: 'ورق فرم‌دهی صندلی ضخامت 1.47mm با عرض 900mm (ابعاد 1.47×900)',
    linkedOutputs: [
      { partCode: 'SAPCO-ST-BACK-LH', partName: 'قطعه پشت صندلی چپ', role: 'LEFT_HAND' },
      { partCode: 'SAPCO-ST-BACK-RH', partName: 'قطعه پشت صندلی راست', role: 'RIGHT_HAND' },
    ],
    nodes: [
      {
        id: 'ST-N1',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP10_SHEAR',
        stepName: 'برش ورق و سایز شیت در خط گیوتین',
        branch: 'MAIN',
        machineName: 'قیچی گیوتین هیدرولیک',
        description: 'برش ورق با ابعاد مهندسی 1.47×900 میلیمتر',
      },
      {
        id: 'ST-N2',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP20_HYD_DRAW',
        stepName: 'فرم‌دهی و کشش در پرس هیدرولیک ۸۰۰ تن (قالب ۲ کویتی مشترک)',
        branch: 'MAIN',
        machineName: 'پرس هیدرولیک کشش سنگین ۸۰۰ تن هیدرولیک شرق',
        dieMoldName: 'قالب ۲ کویتی کشش پشت صندلی چپ/راست',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'کشش همزمان هر دو سمت چپ و راست در یک قالب',
      },
      {
        id: 'ST-N3',
        nodeType: 'SPLIT_POINT',
        stepCode: 'OP30_PNCH_TRIM',
        stepName: 'پانچ و دوربری در پرس ضربه‌ای ۲۵۰ تن (خروج همزمان هر دو قطعه)',
        branch: 'MAIN',
        machineName: 'پرس مکانیکی ۲۵۰ تن',
        dieMoldName: 'قالب ۲ کویتی پانچ و برش محیطی صندلی',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'پانچ کلیه سوراخ‌ها و دوربری در همان قالب و خروج همزمان قطعه پشت صندلی چپ و راست',
      },
      {
        id: 'ST-N4L',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OUT_SEAT_LH',
        stepName: 'محصول نهایی قطعه پشت صندلی چپ (LH)',
        branch: 'LEFT',
        description: 'خروج محصول نهایی سمت چپ با بالشتک هیدرولیک',
      },
      {
        id: 'ST-N4R',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OUT_SEAT_RH',
        stepName: 'محصول نهایی قطعه پشت صندلی راست (RH)',
        branch: 'RIGHT',
        description: 'خروج محصول نهایی سمت راست با بالشتک هیدرولیک',
      },
    ],
    notes: 'تولید متقارن صندلی خودرو: تمامی مراحل در یک قالب ۲ کویتی انجام شده و در هر ضرب پرس، همزمان ۱ قطعه چپ و ۱ قطعه راست محصول نهایی خارج می‌شود.',
  },
  // جریان ۱: تولید همزمان قطعات قرینه چپ و راست در قالب دوگانه (Co-Production)
  // ۱ کلاف ورق تا انتهای مرحله فرم‌دهی به صورت دوبل جلو می‌رود و در مرحله دوربری و قیچی به چپ و راست جدا می‌شود.
  {
    id: 'FLOW-206-LR-BRACKET',
    flowCode: 'FLOW-COPROD-206-LR',
    flowName: 'جریان تولید موازی قالب مشترک ۲ حفره‌ای (چپ و راست دیاق رادیاتور ۲۰۶)',
    patternType: 'CO_PRODUCTION_LR',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    inputRawMaterialCode: 'SAPCO-COIL-DC04-0.8',
    inputRawMaterialName: 'کویل ورق روغنی DC04 ضخامت 0.8mm ساپکو',
    nodes: [
      {
        id: 'NODE-1',
        nodeType: 'RAW_INPUT',
        stepCode: 'IN_COIL',
        stepName: 'بارگیری کویل و فیدر تغذیه خودکار',
        branch: 'MAIN',
        machineCode: 'FEED-NC-01',
        machineName: 'فیدر و رول‌بازکن CNC',
        description: 'کویل با عرض ۴۲۰ میلیمتر وارد پرس خط اصلی می‌شود.',
      },
      {
        id: 'NODE-2',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP10_BLANK_DUAL',
        stepName: 'بلنکینگ دوبل سنبه ماتریس همزمان چپ و راست',
        branch: 'MAIN',
        machineCode: 'PRS-630-01',
        machineName: 'پرس مکانیکی ۶۳۰ تن',
        dieMoldCode: 'DIE-206-DUAL-BLNK',
        dieMoldName: 'قالب دوبل برش همزمان ۲ قطعه متقارن',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'هر ضرب پرس دقیقاً ۱ بلنک پیوسته شامل فرم چپ و راست تولید می‌کند.',
      },
      {
        id: 'NODE-3',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP20_DRAW_DUAL',
        stepName: 'کشش عمیق دوطرفه در قالب پروگرسیو',
        branch: 'MAIN',
        machineCode: 'PRS-800-01',
        machineName: 'پرس هیدرولیک ۸۰۰ تن',
        dieMoldCode: 'DIE-206-DUAL-DRAW',
        dieMoldName: 'قالب کشش دوطرفه هماهنگ',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'کشش همزمان هر دو قرینه با کنترل فشار بالشتک هیدرولیک.',
      },
      {
        id: 'NODE-4',
        nodeType: 'SPLIT_POINT',
        stepCode: 'OP30_PARTING_CUT',
        stepName: 'برش جداسازی و انشعاب به دو قطعه چپ و راست (Parting Shear)',
        branch: 'MAIN',
        machineCode: 'PRS-400-01',
        machineName: 'پرس مکانیکی ۴۰۰ تن',
        dieMoldCode: 'DIE-206-SEPARATE',
        dieMoldName: 'قالب برش و تیغه جداساز مرکزی',
        isDualCavityDie: true,
        yieldPerStroke: { left: 1, right: 1 },
        description: 'تیغه مرکزی ورق را برش داده و محصول به دو کانوایر مستقل چپ و راست هدایت می‌شود.',
      },
      {
        id: 'NODE-5L',
        nodeType: 'BRANCH_L',
        stepCode: 'OP40L_BEND',
        stepName: 'خم‌کاری و لبه‌برگردان اختصاصی سمت چپ (LH)',
        branch: 'LEFT',
        machineCode: 'BRK-160-01',
        machineName: 'پرس برک یا پرس فرم ۱۶۰ تن چپ',
        dieMoldCode: 'DIE-206-LH-FORM',
        dieMoldName: 'قالب فرمینگ گوشواره چپ',
        description: 'انجام زاویه خم ۹۲ درجه سمت چپ.',
      },
      {
        id: 'NODE-5R',
        nodeType: 'BRANCH_R',
        stepCode: 'OP40R_BEND',
        stepName: 'خم‌کاری و لبه‌برگردان اختصاصی سمت راست (RH)',
        branch: 'RIGHT',
        machineCode: 'BRK-160-02',
        machineName: 'پرس برک یا پرس فرم ۱۶۰ تن راست',
        dieMoldCode: 'DIE-206-RH-FORM',
        dieMoldName: 'قالب فرمینگ گوشواره راست',
        description: 'انجام زاویه خم ۹۲ درجه سمت راست قرینه.',
      },
      {
        id: 'NODE-6L',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OUT_LH',
        stepName: 'محصول نهایی براکت رادیاتور چپ (LH)',
        branch: 'LEFT',
        description: 'کارتن‌بندی و برچسب بارکد دار سمت چپ ساپکو.',
      },
      {
        id: 'NODE-6R',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'OUT_RH',
        stepName: 'محصول نهایی براکت رادیاتور راست (RH)',
        branch: 'RIGHT',
        description: 'کارتن‌بندی و برچسب بارکد دار سمت راست ساپکو.',
      },
    ],
    linkedOutputs: [
      {
        partCode: 'IKCO-206-BRK-LH',
        partName: 'براکت دیاق رادیاتور جلو چپ ۲۰۶ (LH)',
        role: 'LEFT_HAND',
        subMoPrefix: 'MO-206-LH',
      },
      {
        partCode: 'IKCO-206-BRK-RH',
        partName: 'براکت دیاق رادیاتور جلو راست ۲۰۶ (RH)',
        role: 'RIGHT_HAND',
        subMoPrefix: 'MO-206-RH',
      },
    ],
    notes: 'ضریب بهره‌وری خط: به ازای ۱۰۰ ضرب پرس در مراحل اول تا سوم، ۱۰۰ قطعه چپ و ۱۰۰ قطعه راست تولید می‌شود.',
  },

  // جریان ۲: انشعاب دو ورق و ادغام مجدد در جوشکاری (Split & Merge / Parallel Weld)
  // سناریوی قفل ضد سرقت درب که کاربر در پیام مطرح کرد.
  {
    id: 'FLOW-206-ANTI-THEFT',
    flowCode: 'FLOW-MERGE-206-SEC',
    flowName: 'جریان تولید موازی پوسته و لچکی و ادغام جوشکاری (تقویتی قفل ضد سرقت درب)',
    patternType: 'PARALLEL_JOIN_WELD',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    inputRawMaterialCode: 'SAPCO-COIL-ST14-1.5',
    inputRawMaterialName: 'ورق ST14 ضخامت 1.5mm (پوسته) + ورق DC04 ضخامت 1.0mm (لچکی)',
    nodes: [
      {
        id: 'SEC-N1',
        nodeType: 'RAW_INPUT',
        stepCode: 'RAW_MATS',
        stepName: 'ورود دو کلاف مجزا به دو سالن پرس',
        branch: 'MAIN',
        description: 'ورق ST14 ضخامت ۱/۵ و ورق DC04 ضخامت ۱/۰ میلی‌متر تخصیص می‌یابند.',
      },
      {
        id: 'SEC-N2A',
        nodeType: 'BRANCH_L',
        stepCode: 'MO_A_OP10',
        stepName: 'خط پوسته اصلی: بلنک و کشش هیدرولیک ۸۰۰ تن',
        branch: 'LEFT',
        machineCode: 'PRS-800-01',
        machineName: 'پرس هیدرولیک ۸۰۰ تن',
        dieMoldCode: 'DIE-206-SEC-MAIN',
        description: 'دستور کار فرعی A: تولید ۵۰۰ عدد پوسته اصلی فرم‌خورده',
      },
      {
        id: 'SEC-N2B',
        nodeType: 'BRANCH_R',
        stepCode: 'MO_B_OP10',
        stepName: 'خط لچکی زبانه: پانچ و خم ۹۰ درجه پرس ۴۰۰ تن',
        branch: 'RIGHT',
        machineCode: 'PRS-400-02',
        machineName: 'پرس مکانیکی ۴۰۰ تن',
        dieMoldCode: 'DIE-206-SEC-LCH',
        description: 'دستور کار فرعی B: تولید ۵۰۰ عدد لچکی تقویتی',
      },
      {
        id: 'SEC-N3',
        nodeType: 'MERGE_POINT',
        stepCode: 'OP30_SPOT_WELD',
        stepName: 'ایستگاه ادغام: پرس‌جوش مقاومتی ۲ نقطه + ۲ عدد مهره M6',
        branch: 'MERGED',
        machineCode: 'WLD-SPOT-02',
        machineName: 'پرس‌جوش مقاومتی ۷۵ کیلوولت‌آمپر',
        description: 'دو قطعه به هم جفت شده و همزمان ۲ مهره جوشی M6 روی پایه جوش داده می‌شوند.',
      },
      {
        id: 'SEC-N4',
        nodeType: 'COMMON_PROCESS',
        stepCode: 'OP40_ASSY_FST',
        stepName: 'مونتاژ پیچ آلن M6 و بوش ضد لرزش و کنترل گشتاور',
        branch: 'MERGED',
        machineCode: 'ASY-BENCH-01',
        machineName: 'میز مونتاژ با ابزار ترک رنچ دیجیتال',
        description: 'پیچ‌های آلن و بوش لاستیکی متصل شده و کنترل ۱۰۰٪ گیج انجام می‌شود.',
      },
      {
        id: 'SEC-N5',
        nodeType: 'FINISHED_PRODUCT',
        stepCode: 'FIN_ASSY',
        stepName: 'مجموعه نهایی آماده تحویل ساپکو (کد SAPCO-ASSY-206-SEC01)',
        branch: 'MERGED',
        description: 'لیبل رهگیری زرد رنگ ساپکو با بارکد و شناسه بچ الصاق می‌شود.',
      },
    ],
    linkedOutputs: [
      {
        partCode: 'SAPCO-ASSY-206-SEC01',
        partName: 'مجموعه کامل تقویتی قفل ضد سرقت کلاف درب ۲۰۶/۲۰۷',
        role: 'FINAL_ASSEMBLY',
        subMoPrefix: 'MO-206-SEC-MASTER',
      },
    ],
    notes: 'دستور کار اصلی فقط زمانی مختومه می‌شود که هر دو دستور کار فرعی تکمیل و در ایستگاه جوش ترکیب شوند.',
  },
];

// =========================================================================
// 3. INITIAL TRACEABILITY TAGS (رهگیری سری ساخت و لیبل قطعات)
// =========================================================================

export const INITIAL_TRACEABILITY_TAGS: TraceabilityTagData[] = [
  {
    id: 'TAG-140308-001',
    tagNumber: 'TAG-1403-0891',
    lotNumber: 'LOT-140308-206SEC-OP20-M1-0842',
    partCode: 'SAPCO-ASSY-206-SEC01',
    partName: 'مجموعه کامل تقویتی قفل ضد سرقت کلاف درب ۲۰۶/۲۰۷',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    manufacturingOrderNumber: 'MO-1403-1082',
    subMoNumber: 'SUB-MO-1082-SHELL',
    stepNumber: 20,
    stepCode: 'OP20_DRAW',
    stepName: 'کشش عمیق پوسته تقویتی',
    machineCode: 'PRS-800-01',
    dieMoldCode: 'DIE-206-SEC-OP20',
    shift: 'MORNING',
    productionDate: '1403/08/15',
    operatorName: 'علی رضایی (کد ۴۱۰۲)',
    supervisorName: 'مهندس حسینی (سرپرست خط)',
    sourceCoilPackNumber: 'CP-1002 / COIL-ST14-1.5',
    heatNumber: 'HEAT-7712-MOB',
    quantity: 250,
    unit: 'عدد',
    qualityStatus: 'APPROVED',
    barcodeValue: '206SEC*MO1082*OP20*LOT0842*Q250',
    qrCodeValue: 'https://kpims.local/track/LOT-140308-206SEC-OP20-M1-0842',
    notes: 'بازرسی ابعادی با شابلون و گیج کنترل CMM تایید شد.',
    issuedAt: new Date().toISOString(),
  },
  {
    id: 'TAG-140308-002',
    tagNumber: 'TAG-1403-0892',
    lotNumber: 'LOT-140308-206LH-OP30-M2-0419',
    partCode: 'IKCO-206-BRK-LH',
    partName: 'براکت دیاق رادیاتور جلو چپ ۲۰۶ (LH)',
    carModel: 'پژو ۲۰۶',
    manufacturingOrderNumber: 'MO-1403-1090',
    subMoNumber: 'MO-1090-LH',
    stepNumber: 30,
    stepCode: 'OP30_SEPARATE',
    stepName: 'جداسازی و انشعاب چپ و راست از قالب دوبل',
    machineCode: 'PRS-400-01',
    dieMoldCode: 'DIE-206-SEPARATE',
    shift: 'EVENING',
    productionDate: '1403/08/15',
    operatorName: 'محمد احمدی (کد ۳۹۰۱)',
    supervisorName: 'مهندس کاظمی',
    sourceCoilPackNumber: 'CP-1004 / COIL-DC04-0.8',
    heatNumber: 'HEAT-44819-SAP',
    quantity: 400,
    unit: 'عدد',
    qualityStatus: 'APPROVED',
    barcodeValue: '206LH*MO1090*OP30*LOT0419*Q400',
    qrCodeValue: 'https://kpims.local/track/LOT-140308-206LH-OP30-M2-0419',
    notes: 'پلیسه‌گیری و انطباق هندسی لبه‌ها تایید گردید.',
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
    carModel: bomData.carModel || 'مشترک',
    version: bomData.version || 'V1.0',
    isActive: bomData.isActive ?? true,
    effectiveDate: bomData.effectiveDate || new Date().toISOString().split('T')[0],
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
    patternType: flowData.patternType || 'CO_PRODUCTION_LR',
    carModel: flowData.carModel || 'مشترک',
    inputRawMaterialCode: flowData.inputRawMaterialCode || 'RAW-COIL',
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
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '').slice(2); // e.g. 241103
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
    carModel: params.carModel || 'مشترک',
    manufacturingOrderNumber: params.manufacturingOrderNumber,
    subMoNumber: params.subMoNumber,
    stepNumber: params.stepNumber,
    stepCode: params.stepCode,
    stepName: params.stepName,
    machineCode: params.machineCode,
    dieMoldCode: params.dieMoldCode,
    shift: params.shift,
    productionDate: new Date().toLocaleDateString('fa-IR'),
    operatorName: params.operatorName,
    supervisorName: params.supervisorName || 'سرپرست شیفت تولید',
    sourceCoilPackNumber: params.sourceCoilPackNumber,
    heatNumber: params.heatNumber || 'N/A',
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

