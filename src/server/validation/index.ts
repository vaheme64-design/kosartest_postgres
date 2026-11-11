import { z } from 'zod';

/**
 * KPIMS Zod Validation Schemas
 * Enforces strict runtime data contract and server-side validation
 */

export const PartCategoryEnum = z.enum(['RAW_MATERIAL', 'WIP_PART', 'FINISHED_GOOD']);
export const UnitOfMeasureEnum = z.enum(['KG', 'PCS']);
export const ProcessTypeEnum = z.enum([
  'SHEARING',
  'BLANKING',
  'DRAWING',
  'PUNCH_FORM',
  'BENDING',
  'TRIMMING',
  'SPOT_WELD',
  'CO2_WELD',
  'PAINT',
  'ASSEMBLY',
]);
export const MachineStatusEnum = z.enum(['ACTIVE', 'MAINTENANCE', 'IDLE']);
export const VoucherTypeEnum = z.enum([
  'OPENING_BALANCE',
  'RECEIPT',
  'ISSUE',
  'PRODUCTION_OUTPUT',
  'SCRAP',
  'WIP_TRANSFER_DISPATCH',
  'WIP_TRANSFER_RECEIPT',
  'ADJUSTMENT',
]);
export const UserRoleEnum = z.enum([
  'ADMIN',
  'PRODUCTION_MANAGER',
  'WAREHOUSE_KEEPER',
  'QC_INSPECTOR',
  'LINE_SUPERVISOR',
]);

// Part Master Data Schema
export const CreatePartSchema = z.object({
  code: z.string().min(2, 'کد قطعه باید حداقل ۲ کاراکتر باشد').max(50),
  name: z.string().min(3, 'عنوان قطعه باید حداقل ۳ کاراکتر باشد'),
  category: PartCategoryEnum,
  unit: UnitOfMeasureEnum,
  weightPerUnitKg: z.number().positive('وزن واحد قطعه باید مثبت باشد'),
  sapcoCode: z.string().optional(),
  carModel: z.string().optional(),
  thicknessMm: z.number().positive().optional(),
  materialGrade: z.string().optional(),
  minStock: z.number().nonnegative().default(0),
  maxStock: z.number().positive().optional(),
});

// Inventory Transaction & Voucher Schema
export const PostTransactionSchema = z.object({
  voucherType: VoucherTypeEnum,
  partId: z.string().min(1, 'انتخاب قطعه یا ماده اولیه الزامی است'),
  stageId: z.string().min(1, 'انتخاب ایستگاه یا انبار مبدا الزامی است'),
  targetStageId: z.string().optional(),
  quantity: z.number().positive('مقدار تراکنش باید عددی مثبت و بزرگتر از صفر باشد'),
  referenceDoc: z.string().optional(),
  operatorName: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.enum(['MORNING', 'EVENING', 'NIGHT']).default('MORNING'),
  scrapReason: z.string().optional(),
  notes: z.string().optional(),
  isDemo: z.boolean().optional(),
}).refine(data => {
  if (data.voucherType === 'WIP_TRANSFER_DISPATCH') {
    return Boolean(data.targetStageId && data.targetStageId !== data.stageId);
  }
  return true;
}, {
  message: 'در اسناد انتقال کار در جریان (WIP)، مشخص کردن مرحله مقصد متفاوت از مبدا الزامی است.',
  path: ['targetStageId'],
});

// Machine Definition Schema
export const CreateMachineSchema = z.object({
  code: z.string().min(2, 'کد ماشین الزامی است'),
  name: z.string().min(3, 'نام و عنوان ماشین الزامی است'),
  capabilities: z.array(ProcessTypeEnum).min(1, 'حداقل یک فرآیند مجاز باید انتخاب شود'),
  processType: ProcessTypeEnum,
  tonnage: z.number().nonnegative().optional(),
  bolsterSize: z.string().optional(),
  strokeLengthMm: z.number().nonnegative().optional(),
  strokesPerMinute: z.number().nonnegative().optional(),
  hallId: z.string().optional(),
  location: z.string().default('سالن پرس'),
  status: MachineStatusEnum.default('ACTIVE'),
  operatorName: z.string().optional(),
});

// Production Planning Schema
export const CreateProductionPlanSchema = z.object({
  title: z.string().min(3, 'عنوان برنامه تولید الزامی است'),
  partId: z.string().min(1, 'انتخاب قطعه الزامی است'),
  plannedQty: z.number().int().positive('تعداد برنامه‌ریزی شده باید عدد صحیح مثبت باشد'),
  startDate: z.string().min(10, 'تاریخ شروع الزامی است'),
  endDate: z.string().min(10, 'تاریخ پایان الزامی است'),
  priority: z.number().int().min(1).max(3).default(1),
  notes: z.string().optional(),
});

// SAPCO Quota Schema
export const CreateSapcoReceiptSchema = z.object({
  receiptNumber: z.string().min(3, 'شماره رسید حواله ساپکو الزامی است'),
  coilNumber: z.string().min(3, 'شماره سریال کویل الزامی است'),
  partId: z.string().min(1, 'انتخاب ماده اولیه مرتبط الزامی است'),
  materialGrade: z.string().min(2, 'گرید فولاد الزامی است'),
  thicknessMm: z.number().positive('ضخامت ورق باید مثبت باشد'),
  widthMm: z.number().positive('عرض کویل باید مثبت باشد'),
  receivedWeightKg: z.number().positive('وزن دریافتی کویل باید مثبت باشد'),
  heatNumber: z.string().optional(),
});

// Express validation middleware helper
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(' | ');
      return res.status(400).json({
        success: false,
        error: 'خطای اعتبارسنجی داده‌ها (Zod Validation Failed)',
        details: errorMessages,
        issues: result.error.issues,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
