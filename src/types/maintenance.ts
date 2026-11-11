// Plant Maintenance & TPM (Total Productive Maintenance) Data Model
// Standardized on Odoo 'maintenance' and ERPNext 'maintenance' modules

export type MaintenanceRequestType = 'CORRECTIVE' | 'PREVENTIVE';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStage = 'NEW' | 'IN_PROGRESS' | 'WAITING_SPARES' | 'REPAIRED' | 'CLOSED';
export type FailureCategory =
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'HYDRAULIC'
  | 'PNEUMATIC'
  | 'DIE_MOLD'
  | 'OPERATOR_ERROR'
  | 'LUBRICATION';

export interface MaintenanceRequest {
  id: string;
  requestCode: string; // MR-1404-0101
  title: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  dieMoldId?: string;
  dieMoldName?: string;
  type: MaintenanceRequestType;
  priority: MaintenancePriority;
  stage: MaintenanceStage;
  failureCategory: FailureCategory;
  description: string;
  reportedBy: string;
  assignedTechnician?: string;
  team: string; // تیم مکانیک، تیم هیدرولیک، تیم قالب‌سازی، برق و ابزاردقیق
  requestedDate: string;
  startedDate?: string;
  completedDate?: string;
  downtimeMinutes: number; // زمان توقف خط به دقیقه
  sparePartsUsed?: Array<{
    partId: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitCost?: number;
  }>;
  rootCauseNotes?: string;
  preventiveActionNotes?: string;
  costEstimate?: number;
}

export type PmScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'STROKE_BASED';

export interface PreventiveChecklistItem {
  id: string;
  taskDescription: string;
  checkType: 'VISUAL' | 'MEASURE' | 'LUBRICATE' | 'CLEAN' | 'TIGHTEN' | 'REPLACE';
  standardValue?: string; // e.g. "120-140 Bar" or "روغن شل تیپ 68"
  isDone?: boolean;
  notes?: string;
}

export interface PreventiveMaintenancePlan {
  id: string;
  planCode: string; // PM-PRS-800-W
  machineId: string;
  machineCode: string;
  machineName: string;
  title: string;
  frequency: PmScheduleFrequency;
  strokeInterval?: number; // هر چند ضرب
  currentStrokeCounter?: number;
  estimatedDurationMinutes: number;
  assignedTeam: string;
  checklistItems: PreventiveChecklistItem[];
  lastPerformedDate?: string;
  nextDueDate: string;
  status: 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface MaintenanceSparePart {
  id: string;
  code: string;
  name: string;
  category: 'HYDRAULIC' | 'ELECTRICAL' | 'MECHANICAL' | 'SEALS' | 'PNEUMATIC' | 'LUBRICANT';
  currentStock: number;
  minStockAlert: number;
  unit: string;
  compatibleMachines: string[]; // e.g. ["PRS-800-01", "PRS-400-G2"]
  storageLocation: string; // e.g. "قفسه B-03 انبار فنی"
  unitPrice?: number;
}

export interface TpmMetricsSummary {
  mtbfHours: number; // Mean Time Between Failures
  mttrHours: number; // Mean Time To Repair
  availabilityRatePercent: number; // درصد دسترسی
  overallOeePercent: number; // OEE کل کارخانه
  totalDowntimeHours: number; // کل زمان توقف
  breakdownCount: number; // تعداد خرابی‌ها
  preventiveComplianceRate: number; // درصد انجام به موقع نت پیشگیرانه (PM Compliance)
  pmpRatio: number; // Planned Maintenance Percentage (نسبت نت برنامه‌ریزی‌شده به کل)
  topFailureCauses: Array<{
    cause: string;
    downtimeMinutes: number;
    count: number;
    percentage: number;
  }>;
}
