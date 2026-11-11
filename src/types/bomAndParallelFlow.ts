/**
 * Types & Data Models for Multi-Level BOM, Parallel Production & Traceability Lot Tagging
 * مدل‌های ساختار درخت محصول پیشرفته (BOM)، منطق تولید قطعات موازی و انشعاب، و کارت رهگیری سری ساخت
 */

export type BomComponentType =
  | 'RAW_SHEET'           // ورق یا کلاف اولیه (ST14, DC04, DX51D) با ضخامت و گرید مشخص
  | 'WIP_SUB_PART'        // قطعه نیمه‌ساخته پرسی که دارای مراحل و دستور ساخت فرعی است
  | 'FASTENER_HARDWARE'   // پیچ، مهره جوشی، واشر، پرچ، بوش (تأمین ساپکو یا استاندارد)
  | 'RUBBER_SEAL'         // دمپر، گردگیر یا بوش لاستیکی
  | 'CHEMICAL_CONSUMABLE'; // چسب موم، سیلر یا سیم جوش

export type JoiningProcessType =
  | 'SPOT_WELD'           // پرس‌جوش مقاومتی نقطه‌ای
  | 'CO2_WELD'            // جوش تحت گاز محافظ
  | 'FASTENING'           // پیچ‌کاری و بستن مهره
  | 'HEMMING'             // همبربندی و لبه‌برگردان هیدرولیک
  | 'RIVET'               // پرچ‌کاری فشاری
  | 'PRESS_FIT';          // پرس‌کاری فشاری بوش

export interface BomComponentItem {
  id: string;
  bomId: string;
  parentId?: string;                 // شناسه جزء والد در ساختار درختی چندسطحی (اگر خالی باشد، مستقیماً متصل به محصول نهایی است)
  parentCode?: string;               // کد قطعه والد (مثلاً WIP-ECU-MAIN-BRK)
  parentName?: string;               // نام قطعه والد (مثلاً صفحه براکت اصلی)
  level?: number;                    // سطح درختی (۱ = سطح اول زیر محصول نهایی، ۲ = سطح دوم زیرمجموعه، و...)
  isSubAssembly?: boolean;           // آیا این قطعه خودش یک زیرمجموعه با قطعات متشکله داخلی است؟
  componentPartId: string;
  componentPartCode: string;
  componentPartName: string;
  componentType: BomComponentType;
  quantityPerAssembly: number;       // ضریب مصرف عددی یا وزنی در سطح والد
  unit: 'PCS' | 'KG' | 'SET' | string;
  grossWeightKg: number;             // وزن ناخالص مصرفی (شامل پرت برش و پانچ)
  netWeightKg: number;               // وزن خالص درون مجموعه مونتاژی نهایی
  scrapAllowancePercent: number;     // درصد پرت استاندارد فرآیند
  joiningProcess?: JoiningProcessType; // نحوه اتصال به بدنه اصلی یا زیرمجموعه
  subMoRequired: boolean;            // آیا نیازمند صدور دستور ساخت فرعی مجزا (Sub-MO) است؟
  subRoutingId?: string;             // مسیر ساخت قطعه فرعی
  stageJoinedStepNumber?: number;    // در کدام مرحله از مسیر ساخت الحاق می‌شود؟ (مثلاً OP30_WELD)
  supplierSource?: 'SAPCO_CONSIGNMENT' | 'INTERNAL_FABRICATED' | 'PURCHASED_MARKET';
  notes?: string;
  children?: BomComponentItem[];     // زیرمجموعه‌ها و فرزندان این قطعه در درخت محصول
}

export interface AdvancedBomDefinition {
  id: string;
  assemblyPartId: string;
  assemblyPartCode: string;
  assemblyPartName: string;
  carModel: string;
  version: string;
  isActive: boolean;
  effectiveDate: string;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  yieldEfficiencyPercent: number;
  components: BomComponentItem[];
  notes?: string;
  approvedBy?: string;
  subMoLinkedCount?: number;
}

// ---------------------------------------------------------------------------
// PARALLEL PRODUCTION & CO-PRODUCTION MODELS
// ---------------------------------------------------------------------------

export type FlowPatternType =
  | 'CO_PRODUCTION_LR'     // تولید همزمان چپ و راست در یک قالب ۲ حفره‌ای تا مرحله برش جداساز
  | 'SPLIT_AND_MERGE'      // انشعاب ۱ ورق به دو قطعه نیمه‌ساخته و ادغام مجدد در جوشکاری
  | 'PARALLEL_JOIN_WELD';   // خطوط موازی مجزا که در ایستگاه جوشکاری نهایی به هم می‌پیوندند

export type FlowNodeType =
  | 'RAW_INPUT'            // ورود ورق یا کلاف اولیه
  | 'COMMON_PROCESS'       // فرآیند مشترک (بلنک دوبل، کشش دوبل)
  | 'SPLIT_POINT'          // نقطه انشعاب و جداسازی
  | 'BRANCH_L'             // شاخه چپ
  | 'BRANCH_R'             // شاخه راست
  | 'MERGE_POINT'          // نقطه ادغام و جوشکاری
  | 'FINISHED_PRODUCT';    // محصول نهایی

export interface ParallelFlowNode {
  id: string;
  nodeType: FlowNodeType;
  stepCode: string;
  stepName: string;
  branch: 'MAIN' | 'LEFT' | 'RIGHT' | 'MERGED';
  machineCode?: string;
  machineName?: string;
  dieMoldCode?: string;
  dieMoldName?: string;
  isDualCavityDie?: boolean;         // قالب ۲ کویتی چپ/راست
  yieldPerStroke?: { left: number; right: number }; // خروجی هر ضرب
  description: string;
}

export interface ParallelProductionFlow {
  id: string;
  flowCode: string;
  flowName: string;
  patternType: FlowPatternType;
  carModel: string;
  inputRawMaterialCode: string;
  inputRawMaterialName: string;
  nodes: ParallelFlowNode[];
  linkedOutputs: {
    partCode: string;
    partName: string;
    role: 'LEFT_HAND' | 'RIGHT_HAND' | 'MAIN_BODY' | 'SUB_COMPONENT' | 'FINAL_ASSEMBLY';
    subMoPrefix?: string;
  }[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// TRACEABILITY LOT & BATCH TAG MODELS
// ---------------------------------------------------------------------------

export interface TraceabilityTagData {
  id: string;
  tagNumber: string;               // TAG-140308-001
  lotNumber: string;               // LOT-140308-206SEC-OP20-M1-0842
  partCode: string;
  partName: string;
  carModel: string;
  manufacturingOrderNumber: string;// MO-1403-1082
  subMoNumber?: string;            // SUB-MO-1082-A
  stepNumber: number;              // 20
  stepCode: string;                // OP20_FORM
  stepName: string;                // کشش پوسته اصلی
  machineCode: string;             // PRS-800-01
  dieMoldCode?: string;            // DIE-206-SEC-OP20
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  productionDate: string;          // 1403/08/15
  operatorName: string;
  supervisorName: string;
  sourceCoilPackNumber: string;    // CP-1002 / COIL-DC04-0.8
  heatNumber?: string;             // HEAT-44819
  quantity: number;                // 250
  unit: string;
  qualityStatus: 'APPROVED' | 'IN_INSPECTION' | 'QUARANTINE';
  barcodeValue: string;
  qrCodeValue: string;
  notes?: string;
  issuedAt: string;
}
