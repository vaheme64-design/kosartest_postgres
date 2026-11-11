import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Play,
  RefreshCw,
  Wrench,
  Boxes,
  ListTree,
  Clock,
  TrendingUp,
  RotateCcw,
  Plus,
  FileCheck2,
  Search,
  Printer,
  Download,
  Filter,
  Activity,
  Gauge,
  ShieldAlert,
  PackageCheck,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Edit3,
  Trash2,
  Settings,
  X,
  ExternalLink,
  FileText,
  Users,
  Cpu,
  Pause,
  FastForward,
  Info,
} from 'lucide-react';
import { Part, Routing, DetailedStockBalance, Machine } from '../../types/inventory';
import { formatNumber, toPersianDigits, exportToCsv } from '../../utils/formatters';
import { SearchableSelect } from '../common/SearchableSelect';
import { ComprehensiveProductionReportView } from '../reports/ComprehensiveProductionReportView';
import { ProductionWorkflowDocumentationView } from '../planning/ProductionWorkflowDocumentationView';
import { ManufacturingOrderTimelineModal } from './ManufacturingOrderTimelineModal';
import { MaterialRequirementProjectionView } from './MaterialRequirementProjectionView';
import { EmptyState } from '../common/EmptyState';
import { MetricTooltip } from '../common/MetricTooltip';
import { getDynamicWorkDays, getCurrentJalaliDate, getJalaliMonthDays, getTodayWorkDayIndex } from '../../utils/jalali';
import { useErpRouter } from '../../context/RouterContext';
import { PreMoWipInspectionModal } from '../workflow/PreMoWipInspectionModal';
import { HighwayPartScenario } from '../workflow/FactoryHighwayWorkbench';
import { AuditConfirmationModal } from '../common/AuditConfirmationModal';
import { useAuditAction } from '../../hooks/useAuditAction';
import { DynamicSelect } from '../common/DynamicSelect';
import { D3MaterialFlowDiagram } from './D3MaterialFlowDiagram';
import { MachineOverlapAlertWidget } from '../planning/MachineOverlapAlertWidget';

export interface ScheduledOpStep {
  opId: string;
  opNo: number; // e.g. 10, 20, 30, 40, 50
  opCode: string; // e.g. OP10, OP20
  opTitle: string; // e.g. برش رول، بلنک‌زنی، خم، پانچ، پرس‌جوش، جوش CO2
  stationHall: string; // e.g. سالن برش، سالن پرس سنگین، سالن جوش و مونتاژ
  machineCode: string;
  machineName: string;
  dieCode: string;
  standardRatePerHour: number;
  scheduledDayIndex: number; // 1 = شنبه, 2 = یکشنبه, 3 = دوشنبه, 4 = سه‌شنبه, 5 = چهارشنبه, 6 = پنج‌شنبه, 7 = جمعه
  shiftName: 'شیفت صبح' | 'شیفت عصر' | 'شیفت شب';
  basePlannedQty: number;
  carriedOverQty: number; // Rolled forward from previous day
  effectiveTargetQty: number; // basePlannedQty + carriedOverQty
  completedGoodQty: number;
  scrapQty: number;
  wipBufferBeforeOp: number; // Available input WIP at this OP
  wipBufferAfterOp: number; // Output sitting after this OP waiting for next OP
  isFinalOp: boolean;
  warehouseReceiptDocNumber?: string; // Populated when final OP is received into warehouse
  status: 'PLANNED' | 'IN_PROGRESS' | 'ROLLED_FORWARD' | 'COMPLETED' | 'ON_HOLD';
  holdReasonCode?: string;
  holdReasonText?: string;
  holdTimestamp?: string;
  rollForwardHistory?: Array<{
    fromShift: string;
    toShift: string;
    fromDay: number;
    toDay: number;
    quantity: number;
    reason: string;
    timestamp: string;
  }>;
}

export interface MultiPartScheduleItem {
  id: string;
  orderCode: string;
  partId: string;
  partCode: string;
  partName: string;
  carModel: string;
  partType: 'SUB_ASSEMBLY' | 'FINISHED_PRODUCT' | 'SHARED_MOLD_PAIR';
  parentProductCode?: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  unitWeightKg: number;
  weeklyTargetQty: number;
  rawMaterialIssuedKg: number;
  warehouseReceivedQty: number;
  ops: ScheduledOpStep[];
}

export type ProductionWorkbenchSubTab =
  | 'MULTI_PART_SCHEDULER'
  | 'DAILY_DISPATCH_SHEET'
  | 'LIVE_WIP_OP_TRACKER'
  | 'KPI_OEE_REPORTS'
  | 'MATERIAL_REQUIREMENT_PROJECTION'
  | 'TREE_TIMELINE_REPORT'
  | 'SAP_PP_WORKFLOW';

interface ErpProductionWorkbenchViewProps {
  parts: Part[];
  routings: Routing[];
  machines?: Machine[];
  balances?: DetailedStockBalance[];
  initialModuleTab?: ProductionWorkbenchSubTab;
  onModuleTabChange?: (tab: ProductionWorkbenchSubTab) => void;
  onRefreshData?: () => void;
  initialMoId?: string | null;
  onMoSelect?: (moId: string | null) => void;
}

const STORAGE_KEY_MULTI_OP_APS = 'kpims_aps_ecu_schedule_v4';

export const WORK_DAYS = getDynamicWorkDays();

/**
 * فرمول محاسباتی استاندارد موجودی نیمه‌ساخته بین‌ایستگاهی (Enterprise Inter-OP WIP):
 * موجودی ورودی پای کار هر ایستگاه = (تولید سالم OP قبلی - مصرف‌شده/تولیدشده در OP فعلی)
 * برای OP10: کل تیراژ باقیمانده سفارش جهت تغذیه به خط برش/بلنک‌زنی
 */
export function calculateOpInputWip(item: MultiPartScheduleItem, opIdx: number): number {
  if (opIdx === 0) {
    return Math.max(0, item.weeklyTargetQty - item.ops[0].completedGoodQty);
  }
  const prevOp = item.ops[opIdx - 1];
  const currentOp = item.ops[opIdx];
  return Math.max(0, (prevOp?.completedGoodQty || 0) - (currentOp?.completedGoodQty || 0));
}

// برنامه تولید یکپارچه فقط برای خانواده قطعه «براکت ضدسرقت رایانه موتور (ECU)» و زیرفرآیندهای آن
export function buildInitial20PartsSchedule(): MultiPartScheduleItem[] {
  const todayIdx = getTodayWorkDayIndex();
  const nextDayIdx = todayIdx < 7 ? todayIdx + 1 : 1;

  const templates: Array<{
    partId: string;
    code: string;
    name: string;
    car: string;
    type: 'SUB_ASSEMBLY' | 'FINISHED_PRODUCT' | 'SHARED_MOLD_PAIR';
    parent?: string;
    rawCode: string;
    rawName: string;
    weightKg: number;
    target: number;
    opsConfig: Array<{
      opNo: number;
      title: string;
      hall: string;
      machineCode: string;
      machineName: string;
      dieCode: string;
      rate: number;
      day: number;
      shift: 'شیفت صبح' | 'شیفت عصر' | 'شیفت شب';
      done: number;
      scrap: number;
      wipAfter: number;
    }>;
  }> = [
    {
      partId: 'PRT-WIP-ECU-MAIN',
      code: 'WIP-ECU-MAIN-BRK',
      name: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
      car: 'پژو ۲۰۶ / ۲۰۷',
      type: 'SUB_ASSEMBLY',
      parent: 'SAPCO-ASY-ECU-BRK-01',
      rawCode: 'RM-COIL-DC01A-2.0-1140',
      rawName: 'رول ورق روغنی DC01A ضخامت 2.0 عرض 1140 میلیمتر',
      weightKg: 0.95,
      target: 1500,
      opsConfig: [
        { opNo: 10, title: 'برش رول و نواربری ورق DC01A ضخامت ۲', hall: 'سالن بلنکینگ و برش', machineCode: 'SLT-1250-01', machineName: 'خط رول‌بازکن و برش کویل ۱۲۵۰ میلیمتر', dieCode: 'DIE-ECU-BLK-01', rate: 600, day: todayIdx, shift: 'شیفت صبح', done: 1500, scrap: 8, wipAfter: 300 },
        { opNo: 20, title: 'پرس بلنک‌زنی صفحه اصلی براکت ضدسرقت', hall: 'سالن پرس متوسط', machineCode: 'PRS-250-01', machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن', dieCode: 'DIE-ECU-BLK-01', rate: 350, day: todayIdx, shift: 'شیفت صبح', done: 1200, scrap: 12, wipAfter: 350 },
        { opNo: 30, title: 'پرس خم لبه استاندارد صفحه اصلی', hall: 'سالن پرس متوسط', machineCode: 'PRS-250-01', machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن', dieCode: 'DIE-ECU-BND-02', rate: 300, day: todayIdx, shift: 'شیفت عصر', done: 850, scrap: 5, wipAfter: 150 },
        { opNo: 40, title: 'پانچ اول و پانچ دوم سوراخ‌کاری شبکه', hall: 'سالن پرس متوسط', machineCode: 'PRS-250-01', machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن', dieCode: 'DIE-ECU-PNC-03', rate: 300, day: todayIdx, shift: 'شیفت عصر', done: 700, scrap: 3, wipAfter: 100 },
        { opNo: 50, title: 'پرس‌جوش ۱۵ عدد مهره جوشی M6 روی صفحه اصلی', hall: 'سالن جوش و مونتاژ', machineCode: 'WLD-SPOT-01', machineName: 'دستگاه پرس‌جوش نقطه‌ای مقاومتی ۱۰۰KVA', dieCode: 'JIG-ECU-NUT15', rate: 180, day: nextDayIdx, shift: 'شیفت صبح', done: 600, scrap: 2, wipAfter: 600 },
      ],
    },
    {
      partId: 'PRT-WIP-ECU-COMP',
      code: 'WIP-ECU-COMP-BRK',
      name: 'قطعه مکمل براکت ضدسرقت رایانه موتور',
      car: 'پژو ۲۰۶ / ۲۰۷',
      type: 'SUB_ASSEMBLY',
      parent: 'SAPCO-ASY-ECU-BRK-01',
      rawCode: 'RM-COIL-DC01A-2.0-1140',
      rawName: 'رول ورق روغنی DC01A ضخامت 2.0 عرض 1140 میلیمتر',
      weightKg: 0.45,
      target: 1500,
      opsConfig: [
        { opNo: 10, title: 'برش ورق از رول DC01A ضخامت ۲', hall: 'سالن بلنکینگ و برش', machineCode: 'SLT-1250-01', machineName: 'خط رول‌بازکن و برش کویل ۱۲۵۰ میلیمتر', dieCode: 'DIE-CMP-BLK-01', rate: 700, day: todayIdx, shift: 'شیفت صبح', done: 1500, scrap: 5, wipAfter: 400 },
        { opNo: 20, title: 'پرس بلنک‌زنی قطعه مکمل براکت', hall: 'سالن پرس متوسط', machineCode: 'PRS-250-01', machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن', dieCode: 'DIE-CMP-BLK-01', rate: 400, day: todayIdx, shift: 'شیفت صبح', done: 1100, scrap: 6, wipAfter: 200 },
        { opNo: 30, title: 'خم و پانچ یکپارچه قطعه مکمل', hall: 'سالن پرس متوسط', machineCode: 'PRS-250-01', machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن', dieCode: 'DIE-CMP-BP-02', rate: 350, day: todayIdx, shift: 'شیفت عصر', done: 900, scrap: 4, wipAfter: 200 },
        { opNo: 40, title: 'پرس‌جوش ۲ عدد پیچ پایه 6*20 روی مکمل', hall: 'سالن جوش و مونتاژ', machineCode: 'WLD-SPOT-01', machineName: 'دستگاه پرس‌جوش نقطه‌ای مقاومتی ۱۰۰KVA', dieCode: 'JIG-CMP-BLT2', rate: 280, day: nextDayIdx, shift: 'شیفت صبح', done: 700, scrap: 1, wipAfter: 700 },
      ],
    },
    {
      partId: 'PRT-FGD-ECU-BRK',
      code: 'SAPCO-ASY-ECU-BRK-01',
      name: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش رنگ کاتافورز ED',
      car: 'پژو ۲۰۶ / ۲۰۷',
      type: 'FINISHED_PRODUCT',
      rawCode: 'WIP-ECU-MAIN-BRK + WIP-ECU-COMP-BRK',
      rawName: 'صفحه براکت اصلی + قطعه مکمل جوشی',
      weightKg: 1.48,
      target: 1500,
      opsConfig: [
        { opNo: 10, title: 'مونتاژ و جوش CO2 اتصال صفحه اصلی و قطعه مکمل', hall: 'سالن جوش و مونتاژ', machineCode: 'WLD-SPOT-01', machineName: 'کابین جوش CO2 و مونتاژ ۱', dieCode: 'JIG-ECU-CO2-ASY', rate: 160, day: todayIdx, shift: 'شیفت عصر', done: 600, scrap: 3, wipAfter: 100 },
        { opNo: 20, title: 'پوشش رنگ کاتافورز (ED) و بسته‌بندی نهایی پالت ساپکو', hall: 'سالن جوش و مونتاژ', machineCode: 'WLD-SPOT-01', machineName: 'خط رنگ کاتافورز ED و بسته‌بندی', dieCode: 'JIG-ECU-CO2-ASY', rate: 300, day: nextDayIdx, shift: 'شیفت عصر', done: 500, scrap: 0, wipAfter: 500 },
      ],
    },
  ];

  return templates.map((tpl, idx) => {
    const opsCount = tpl.opsConfig.length;
    const ops: ScheduledOpStep[] = tpl.opsConfig.map((oc, oIdx) => {
      const prevOpDone = oIdx === 0 ? tpl.target : tpl.opsConfig[oIdx - 1].done;
      const wipBefore = Math.max(0, prevOpDone - oc.done);
      const isFinal = oIdx === opsCount - 1;
      const status: ScheduledOpStep['status'] =
        oc.done >= tpl.target
          ? 'COMPLETED'
          : oc.done > 0
          ? 'IN_PROGRESS'
          : 'PLANNED';

      return {
        opId: `OP-${idx + 1}-${oc.opNo}`,
        opNo: oc.opNo,
        opCode: `OP${oc.opNo}`,
        opTitle: oc.title,
        stationHall: oc.hall,
        machineCode: oc.machineCode,
        machineName: oc.machineName,
        dieCode: oc.dieCode,
        standardRatePerHour: oc.rate,
        scheduledDayIndex: oc.day,
        shiftName: oc.shift,
        basePlannedQty: tpl.target,
        carriedOverQty: 0,
        effectiveTargetQty: tpl.target,
        completedGoodQty: oc.done,
        scrapQty: oc.scrap,
        wipBufferBeforeOp: wipBefore,
        wipBufferAfterOp: oc.wipAfter,
        isFinalOp: isFinal,
        warehouseReceiptDocNumber:
          isFinal && oc.done > 0 ? `DOC-REC-ECU-${101 + idx}` : undefined,
        status,
      };
    });

    const finalOp = ops[ops.length - 1];

    return {
      id: `MPS-ITEM-${idx + 1}`,
      orderCode: idx === 0 ? 'MO-ECU-MAIN-01' : idx === 1 ? 'MO-ECU-COMP-01' : 'MO-ECU-ASY-01',
      partId: tpl.partId,
      partCode: tpl.code,
      partName: tpl.name,
      carModel: tpl.car,
      partType: tpl.type,
      parentProductCode: tpl.parent,
      rawMaterialCode: tpl.rawCode,
      rawMaterialName: tpl.rawName,
      unitWeightKg: tpl.weightKg,
      weeklyTargetQty: tpl.target,
      rawMaterialIssuedKg: Math.round(tpl.target * tpl.weightKg),
      warehouseReceivedQty: finalOp ? finalOp.completedGoodQty : 0,
      ops,
    };
  });
}

export const ErpProductionWorkbenchView: React.FC<ErpProductionWorkbenchViewProps> = ({
  parts,
  routings = [],
  machines = [],
  balances = [],
  initialModuleTab = 'MULTI_PART_SCHEDULER',
  onModuleTabChange,
  onRefreshData,
  initialMoId = null,
  onMoSelect,
}) => {
  // Major Operational Sub-Modules
  const router = useErpRouter();
  const auditAction = useAuditAction();
  const [activeModuleTab, setActiveModuleTab] = useState<ProductionWorkbenchSubTab>(() => {
    if (router.route.tab === 'production' && router.route.productionModuleTab) {
      return router.route.productionModuleTab;
    }
    return initialModuleTab;
  });

  useEffect(() => {
    if (router.route.tab === 'production' && router.route.productionModuleTab) {
      if (router.route.productionModuleTab !== activeModuleTab) {
        setActiveModuleTab(router.route.productionModuleTab);
      }
    }
  }, [router.route.tab, router.route.productionModuleTab]);

  useEffect(() => {
    if (initialModuleTab && !router.route.productionModuleTab) {
      setActiveModuleTab(initialModuleTab);
    }
  }, [initialModuleTab]);

  const handleSelectModuleTab = (tab: ProductionWorkbenchSubTab) => {
    setActiveModuleTab(tab);
    router.setProductionSubTab(tab);
    if (onModuleTabChange) onModuleTabChange(tab);
  };

  // Master Schedule State (Anti-Theft ECU Bracket family & any dynamically added parts/routings)
  const [scheduleItems, setScheduleItems] = useState<MultiPartScheduleItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_MULTI_OP_APS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return buildInitial20PartsSchedule();
  });

  // Synchronize scheduleItems with live Master Data (parts & routings) whenever parts or routings are updated
  useEffect(() => {
    if (!parts || parts.length === 0) return;
    setScheduleItems(prev => {
      const todayIdx = getTodayWorkDayIndex();
      let changed = false;

      // 1. Update names, weights, and routing OPs of existing scheduled items if edited in Master Data
      const updated = prev.map(item => {
        const matchedPart = parts.find(p => p.id === item.partId || p.code === item.partCode);
        const matchedRouting = routings.find(
          r => r.partId === item.partId || (matchedPart && r.partId === matchedPart.id)
        );
        if (!matchedPart && !matchedRouting) return item;

        const nextItem = { ...item };
        if (matchedPart) {
          if (
            nextItem.partName !== matchedPart.name ||
            nextItem.partCode !== matchedPart.code ||
            (matchedPart.weightPerUnitKg && nextItem.unitWeightKg !== matchedPart.weightPerUnitKg)
          ) {
            nextItem.partName = matchedPart.name;
            nextItem.partCode = matchedPart.code;
            if (matchedPart.weightPerUnitKg) nextItem.unitWeightKg = matchedPart.weightPerUnitKg;
            changed = true;
          }
        }

        if (matchedRouting && matchedRouting.operations && matchedRouting.operations.length > 0) {
          // Sync operation titles, machines, dies, and newly added OPs from Master Data Routing
          const syncedOps: ScheduledOpStep[] = matchedRouting.operations.map((step, sIdx) => {
            const existingOp = nextItem.ops.find(o => o.opNo === step.stepNumber);
            const machineObj = machines.find(m => m.id === step.machineId);
            const isFinal = sIdx === matchedRouting.operations.length - 1;
            const rateFromCycle = step.standardCycleTimeSec > 0 ? Math.round(3600 / step.standardCycleTimeSec) : 300;
            if (existingOp) {
              return {
                ...existingOp,
                opTitle: step.stepName || existingOp.opTitle,
                machineCode: machineObj?.code || existingOp.machineCode,
                machineName: step.machineName || machineObj?.name || existingOp.machineName,
                dieCode: step.dieMoldId || existingOp.dieCode,
                standardRatePerHour: rateFromCycle || existingOp.standardRatePerHour,
                isFinalOp: isFinal,
              };
            }
            changed = true;
            return {
              opId: `OP-SYNC-${matchedRouting.id}-${step.stepNumber}`,
              opNo: step.stepNumber,
              opCode: step.stepCode || `OP${step.stepNumber}`,
              opTitle: step.stepName,
              stationHall: machineObj?.location || 'سالن پرس',
              machineCode: machineObj?.code || step.machineId || 'PRS-250-01',
              machineName: step.machineName || machineObj?.name || 'ایستگاه کاری',
              dieCode: step.dieMoldId || 'DIE-STD',
              standardRatePerHour: rateFromCycle,
              scheduledDayIndex: todayIdx,
              shiftName: 'شیفت صبح',
              basePlannedQty: nextItem.weeklyTargetQty,
              carriedOverQty: 0,
              effectiveTargetQty: nextItem.weeklyTargetQty,
              completedGoodQty: 0,
              scrapQty: 0,
              wipBufferBeforeOp: 0,
              wipBufferAfterOp: 0,
              isFinalOp: isFinal,
              status: 'PLANNED',
            };
          });

          if (syncedOps.length !== nextItem.ops.length) {
            changed = true;
          }
          nextItem.ops = syncedOps;
        }

        return nextItem;
      });

      // 2. If user created a new WIP or FINISHED_GOOD part with a routing in Master Data, add it to schedule automatically
      routings.forEach(rtg => {
        const part = parts.find(p => p.id === rtg.partId);
        if (!part) return;
        const alreadyExists = updated.some(i => i.partId === part.id || i.partCode === part.code);
        if (!alreadyExists && rtg.operations && rtg.operations.length > 0) {
          changed = true;
          const targetQty = 1000;
          const newOps: ScheduledOpStep[] = rtg.operations.map((step, sIdx) => {
            const machineObj = machines.find(m => m.id === step.machineId);
            const rateFromCycle = step.standardCycleTimeSec > 0 ? Math.round(3600 / step.standardCycleTimeSec) : 300;
            return {
              opId: `OP-NEW-${rtg.id}-${step.stepNumber}`,
              opNo: step.stepNumber,
              opCode: step.stepCode || `OP${step.stepNumber}`,
              opTitle: step.stepName,
              stationHall: machineObj?.location || 'سالن پرس',
              machineCode: machineObj?.code || step.machineId || 'PRS-250-01',
              machineName: step.machineName || machineObj?.name || 'ایستگاه کاری',
              dieCode: step.dieMoldId || 'DIE-STD',
              standardRatePerHour: rateFromCycle,
              scheduledDayIndex: todayIdx,
              shiftName: 'شیفت صبح',
              basePlannedQty: targetQty,
              carriedOverQty: 0,
              effectiveTargetQty: targetQty,
              completedGoodQty: 0,
              scrapQty: 0,
              wipBufferBeforeOp: sIdx === 0 ? targetQty : 0,
              wipBufferAfterOp: 0,
              isFinalOp: sIdx === rtg.operations.length - 1,
              status: 'PLANNED',
            };
          });

          updated.push({
            id: `MPS-ITEM-${updated.length + 1}`,
            orderCode: `MO-${part.code}`,
            partId: part.id,
            partCode: part.code,
            partName: part.name,
            carModel: part.carModel || 'پژو ۲۰۶ / ۲۰۷',
            partType: part.category === 'FINISHED_GOOD' ? 'FINISHED_PRODUCT' : 'SUB_ASSEMBLY',
            rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
            rawMaterialName: 'رول ورق DC01A',
            unitWeightKg: part.weightPerUnitKg || 1.0,
            weeklyTargetQty: targetQty,
            rawMaterialIssuedKg: Math.round(targetQty * (part.weightPerUnitKg || 1.0)),
            warehouseReceivedQty: 0,
            ops: newOps,
          });
        }
      });

      return changed ? updated : prev;
    });
  }, [parts, routings, machines]);

  // Filters & Search for Scalability (when data is large)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCarFilter, setSelectedCarFilter] = useState<string>('ALL');
  const [selectedHallFilter, setSelectedHallFilter] = useState<string>('ALL');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(() => getTodayWorkDayIndex()); // Default امروز واقعی
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modal / Drawer State for Logging OP Production, Roll-Forward & Warehouse Auto-Receipt
  const [activeLogContext, setActiveLogContext] = useState<{
    partItem: MultiPartScheduleItem;
    opStep: ScheduledOpStep;
  } | null>(null);
  const [logGoodInput, setLogGoodInput] = useState<string>('');
  const [logShiftGoodInput, setLogShiftGoodInput] = useState<string>('0');
  const [logInputMode, setLogInputMode] = useState<'SHIFT_PRODUCTION' | 'CUMULATIVE_TOTAL'>('SHIFT_PRODUCTION');
  const [logScrapInput, setLogScrapInput] = useState<string>('0');
  const [rollForwardToDay, setRollForwardToDay] = useState<number>(2);
  const [isPostingReceipt, setIsPostingReceipt] = useState<boolean>(false);

  // Slide-Over Drawer State for Interactive Drill-Down Across All Reports & OEE Metrics
  const [drillDownContext, setDrillDownContext] = useState<{
    title: string;
    metricLabel: string;
    metricValue: string | number;
    description: string;
    filterBadge?: string;
    records: Array<{
      orderCode: string;
      partName: string;
      partCode: string;
      carModel: string;
      opCode: string;
      opTitle: string;
      machineName: string;
      machineCode: string;
      stationHall: string;
      dieCode: string;
      shiftName: string;
      dayName: string;
      targetQty: number;
      completedGoodQty: number;
      wipQty: number;
      scrapQty: number;
      status: string;
      receiptDocNumber?: string;
      isFinalOp?: boolean;
    }>;
  } | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState<string>('');

  // Manufacturing Order Visual Timeline Modal
  const [activeTimelineOrder, setActiveTimelineOrder] = useState<MultiPartScheduleItem | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialMoId) {
      const match = scheduleItems.find(s => s.orderCode === initialMoId || s.id === initialMoId);
      if (match) {
        setActiveTimelineOrder(match);
        setIsTimelineModalOpen(true);
      }
    }
  }, [initialMoId, scheduleItems]);

  // Modal for Roll-Forward remaining quota to next shift/day
  const [rollForwardModalContext, setRollForwardModalContext] = useState<{
    partItem: MultiPartScheduleItem;
    op: ScheduledOpStep;
    remainingQty: number;
  } | null>(null);
  const [rfTargetDay, setRfTargetDay] = useState<number>(2);
  const [rfTargetShift, setRfTargetShift] = useState<'شیفت صبح' | 'شیفت عصر' | 'شیفت شب'>('شیفت عصر');
  const [rfQuantity, setRfQuantity] = useState<number>(0);
  const [rfReason, setRfReason] = useState<string>('پایان ساعت کار شیفت و تکمیل نشدن تیراژ');
  const [rfNotes, setRfNotes] = useState<string>('');

  const handleOpenRollForwardModal = (partItem: MultiPartScheduleItem, op: ScheduledOpStep) => {
    const remaining = Math.max(0, op.effectiveTargetQty - op.completedGoodQty);
    setRollForwardModalContext({ partItem, op, remainingQty: remaining });
    setRfQuantity(remaining);
    const nextDay = op.scheduledDayIndex < 6 ? op.scheduledDayIndex + 1 : 1;
    setRfTargetDay(nextDay);
    setRfTargetShift(op.shiftName === 'شیفت صبح' ? 'شیفت عصر' : 'شیفت صبح');
    setRfReason('پایان ساعت کار شیفت و تکمیل نشدن تیراژ');
    setRfNotes('');
  };

  const handleExecuteRollForward = () => {
    if (!rollForwardModalContext) return;
    const { partItem, op, remainingQty } = rollForwardModalContext;
    const qtyToRoll = Math.min(remainingQty, Math.max(1, rfQuantity));

    const nextSchedule = scheduleItems.map(item => {
      if (item.id !== partItem.id) return item;
      return {
        ...item,
        ops: item.ops.map(o => {
          if (o.opId !== op.opId) return o;
          const hist = {
            fromShift: o.shiftName,
            toShift: rfTargetShift,
            fromDay: o.scheduledDayIndex,
            toDay: rfTargetDay,
            quantity: qtyToRoll,
            reason: `${rfReason} ${rfNotes ? `(${rfNotes})` : ''}`,
            timestamp: new Date().toISOString(),
          };
          return {
            ...o,
            carriedOverQty: (o.carriedOverQty || 0) + qtyToRoll,
            scheduledDayIndex: rfTargetDay,
            shiftName: rfTargetShift,
            status: 'ROLLED_FORWARD' as const,
            rollForwardHistory: [...(o.rollForwardHistory || []), hist],
          };
        }),
      };
    });

    saveSchedule(nextSchedule);
    setRollForwardModalContext(null);
    setToastNotice({
      type: 'success',
      title: `مانده تیراژ (${formatNumber(qtyToRoll)} عدد) با موفقیت به شیفت بعد منتقل شد`,
      detail: `انتقال به روز ${WORK_DAYS.find(d => d.index === rfTargetDay)?.name} (${rfTargetShift}) در برنامه تولید ثبت گردید.`,
    });
  };

  // Modal for Mandatory Pause / Hold of a Work Order Operation (Dynamic MasterItem)
  const [holdModalContext, setHoldModalContext] = useState<{
    partItem: MultiPartScheduleItem;
    op: ScheduledOpStep;
  } | null>(null);
  const [holdReasonCode, setHoldReasonCode] = useState<string>('DIE_BREAKDOWN');
  const [holdReasonText, setHoldReasonText] = useState<string>('شکستگی یا گیر سنبه و ماتریس قالب (نیاز به قالب‌سازی)');
  const [holdDescription, setHoldDescription] = useState<string>('');
  const [holdEstimatedMinutes, setHoldEstimatedMinutes] = useState<number>(30);

  const handleOpenHoldModal = (partItem: MultiPartScheduleItem, op: ScheduledOpStep) => {
    setHoldModalContext({ partItem, op });
    setHoldReasonCode('DIE_BREAKDOWN');
    setHoldReasonText('شکستگی یا گیر سنبه و ماتریس قالب (نیاز به قالب‌سازی)');
    setHoldDescription('');
    setHoldEstimatedMinutes(30);
  };

  const handleConfirmHold = () => {
    if (!holdModalContext) return;
    const { partItem, op } = holdModalContext;
    const reasonLabel = holdReasonText || holdReasonCode;

    // 1. Update schedule step status to ON_HOLD
    const nextSchedule = scheduleItems.map(item => {
      if (item.id !== partItem.id) return item;
      return {
        ...item,
        ops: item.ops.map(o => {
          if (o.opId !== op.opId) return o;
          return {
            ...o,
            status: 'ON_HOLD' as const,
            holdReasonCode,
            holdReasonText: `${reasonLabel}${holdDescription ? ` - ${holdDescription}` : ''}`,
            holdTimestamp: new Date().toISOString(),
          };
        }),
      };
    });

    saveSchedule(nextSchedule);

    // 2. Automatically log a real downtime event into kpims_dynamic_machine_downtimes_v2
    try {
      const rawDt = localStorage.getItem('kpims_dynamic_machine_downtimes_v2');
      const curDt = rawDt ? JSON.parse(rawDt) : [];
      const now = new Date();
      const newDtEntry = {
        id: `DT-${Date.now()}`,
        machineCode: op.machineCode,
        category: 'UNPLANNED_BREAKDOWN' as any,
        durationMinutes: holdEstimatedMinutes || 30,
        startHour: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
        reason: `${op.opCode} (${partItem.partName}): ${reasonLabel}${holdDescription ? ` | ${holdDescription}` : ''}`,
        correctiveAction: 'دستور کار فریز گردید تا عیب فنی رفع شود.',
        loggedAt: now.toISOString(),
      };
      localStorage.setItem('kpims_dynamic_machine_downtimes_v2', JSON.stringify([newDtEntry, ...curDt]));
    } catch {
      // ignore
    }

    setHoldModalContext(null);
    setToastNotice({
      type: 'warning',
      title: `دستور کار مرحله ${op.opCode} روی «${op.machineName}» متوقف موقت (Hold) شد`,
      detail: `علت ثبت‌شده: «${reasonLabel}». زمان توقف در شاخص OEE و گزارش توقفات ثبت گردید.`,
    });
  };

  const handleResumeOrder = (partItem: MultiPartScheduleItem, op: ScheduledOpStep) => {
    auditAction.requestAuditAction({
      title: 'راه‌اندازی مجدد خط و لغو توقف (Resume)',
      actionSummary: `رفع توقف موقت روی دستگاه «${op.machineName}» برای قطعه «${partItem.partName}» (مرحله ${op.opCode} - دستور ${partItem.orderCode}) و تغییر وضعیت به در جریان (IN_PROGRESS)`,
      entityName: 'ScheduledOpStep',
      entityId: `${partItem.orderCode}-${op.opCode}`,
      actionType: 'RESUME_OPERATION',
      confirmButtonText: 'تایید راه‌اندازی و ثبت ممیزی',
      onConfirm: async (reason: string) => {
        const nextSchedule = scheduleItems.map(item => {
          if (item.id !== partItem.id) return item;
          return {
            ...item,
            ops: item.ops.map(o => {
              if (o.opId !== op.opId) return o;
              return {
                ...o,
                status: 'IN_PROGRESS' as const,
                holdTimestamp: undefined,
              };
            }),
          };
        });
        saveSchedule(nextSchedule);
        setToastNotice({
          type: 'success',
          title: `تولید روی دستگاه «${op.machineName}» مجدداً راه‌اندازی شد`,
          detail: `وضعیت دستور کار مرحله ${op.opCode} به «در جریان» بازگردانده شد. دلیل ممیزی: «${reason}».`,
        });
      },
    });
  };

  const handleChangeOpStatusAudit = (
    partItem: MultiPartScheduleItem,
    op: ScheduledOpStep,
    targetStatus: ScheduledOpStep['status']
  ) => {
    const statusLabels: Record<ScheduledOpStep['status'], string> = {
      PLANNED: 'برنامه‌ریزی‌شده',
      IN_PROGRESS: 'در جریان تولید',
      ON_HOLD: 'توقف موقت',
      COMPLETED: 'تکمیل‌شده',
      ROLLED_FORWARD: 'انتقال به شیفت بعد',
    };

    auditAction.requestAuditAction({
      title: `تغییر وضعیت مرحله ${op.opCode} قطعه ${partItem.partName}`,
      actionSummary: `تغییر وضعیت عملیات مرحله ${op.opCode} روی «${op.machineName}» از «${statusLabels[op.status]}» به «${statusLabels[targetStatus]}» برای دستور ساخت ${partItem.orderCode}`,
      entityName: 'ScheduledOpStep',
      entityId: `${partItem.orderCode}-${op.opCode}`,
      actionType: 'STATUS_CHANGE',
      isDestructive: targetStatus === 'ON_HOLD',
      confirmButtonText: 'تایید تغییر وضعیت و ثبت در ممیزی',
      onConfirm: async (reason: string) => {
        const nextSchedule = scheduleItems.map(item => {
          if (item.id !== partItem.id) return item;
          return {
            ...item,
            ops: item.ops.map(o => {
              if (o.opId !== op.opId) return o;
              return {
                ...o,
                status: targetStatus,
                holdTimestamp: targetStatus === 'ON_HOLD' ? new Date().toISOString() : undefined,
              };
            }),
          };
        });
        saveSchedule(nextSchedule);
        setToastNotice({
          type: 'info',
          title: `وضعیت مرحله ${op.opCode} به ${statusLabels[targetStatus]} تغییر یافت`,
          detail: `تغییر وضعیت در زمان‌بندی اعمال شد. دلیل ثبت‌شده در ممیزی: «${reason}».`,
        });
      },
    });
  };

  // Unified raw operational records across all parts and operations for live drill-down
  const allRawRecords = useMemo(() => {
    const list: Array<{
      orderCode: string;
      partName: string;
      partCode: string;
      carModel: string;
      opCode: string;
      opTitle: string;
      machineName: string;
      machineCode: string;
      stationHall: string;
      dieCode: string;
      shiftName: string;
      dayName: string;
      targetQty: number;
      completedGoodQty: number;
      wipQty: number;
      scrapQty: number;
      status: string;
      receiptDocNumber?: string;
      isFinalOp?: boolean;
    }> = [];

    scheduleItems.forEach(item => {
      item.ops.forEach((op, oIdx) => {
        const dayObj = WORK_DAYS.find(d => d.index === op.scheduledDayIndex);
        const computedWip =
          oIdx === 0
            ? Math.max(0, item.weeklyTargetQty - op.completedGoodQty)
            : Math.max(0, item.ops[oIdx - 1].completedGoodQty - op.completedGoodQty);

        list.push({
          orderCode: item.orderCode,
          partName: item.partName,
          partCode: item.partCode,
          carModel: item.carModel,
          opCode: op.opCode,
          opTitle: op.opTitle,
          machineName: op.machineName,
          machineCode: op.machineCode,
          stationHall: op.stationHall,
          dieCode: op.dieCode,
          shiftName: op.shiftName,
          dayName: dayObj ? dayObj.shortName : `روز ${op.scheduledDayIndex}`,
          targetQty: op.effectiveTargetQty,
          completedGoodQty: op.completedGoodQty,
          wipQty: computedWip,
          scrapQty: op.scrapQty,
          status: op.status,
          receiptDocNumber: op.warehouseReceiptDocNumber,
          isFinalOp: op.isFinalOp,
        });
      });
    });

    return list;
  }, [scheduleItems]);

  // Modal for Adding a New Part with Custom Multi-OP Staggered Schedule
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState<boolean>(false);
  const [newPartCode, setNewPartCode] = useState<string>('');
  const [newPartTargetQty, setNewPartTargetQty] = useState<number>(1000);
  const [newPartOp1Day, setNewPartOp1Day] = useState<number>(1);
  const [newPartOp2Day, setNewPartOp2Day] = useState<number>(1);
  const [newPartOp3Day, setNewPartOp3Day] = useState<number>(2);
  const [newPartOp4Day, setNewPartOp4Day] = useState<number>(2);
  const [customStepDays, setCustomStepDays] = useState<Record<number, number>>({});

  // Pre-flight WIP inspection modal state for Multi-OP schedule (Tree View)
  const [inspectingPreflightOrder, setInspectingPreflightOrder] = useState<HighwayPartScenario | null>(null);
  const [pendingNewItem, setPendingNewItem] = useState<MultiPartScheduleItem | null>(null);

  // Sync create-mo and wip-check modal state with URL router
  useEffect(() => {
    if (router.route.modal === 'create-mo') {
      setIsAddPartModalOpen(true);
      if (router.route.modalPartId) {
        setNewPartCode(router.route.modalPartId);
      }
    } else if (router.route.modal === 'wip-check') {
      if (!inspectingPreflightOrder) {
        const targetMo =
          scheduleItems.find(
            s =>
              s.orderCode === router.route.modalOrderId ||
              s.partCode === router.route.modalPartId ||
              s.partId === router.route.modalPartId
          ) || scheduleItems[0];
        if (targetMo) {
          const scenario: HighwayPartScenario = {
            id: targetMo.id,
            orderCode: targetMo.orderCode,
            productionBatchCode: `BCH-${targetMo.orderCode.replace('MO-', '')}`,
            partId: targetMo.partId,
            partCode: targetMo.partCode,
            partName: targetMo.partName,
            carModel: targetMo.carModel,
            customerName: 'ساپکو',
            orderQty: targetMo.weeklyTargetQty,
            unitWeightKg: targetMo.unitWeightKg,
            scrapAllowancePct: 2,
            rawMaterialCode: targetMo.rawMaterialCode,
            rawMaterialName: targetMo.rawMaterialName,
            warehouseAvailableKg: 1200,
            bomSubComponents: [
              { name: 'صفحه براکت اصلی ضدسرقت', qtyPerParent: 1, unit: 'عدد', stage: 'پرس‌کاری و فرم‌دهی' },
              { name: 'مکمل تقویتی براکت (گوشواره)', qtyPerParent: 1, unit: 'عدد', stage: 'پانچ و خم' },
            ],
            operations: targetMo.ops.map(o => ({
              stepCode: o.opCode,
              stepName: o.opTitle,
              hall: o.stationHall,
              machineName: o.machineName,
              dieName: o.dieCode,
              cycleTimeSec: o.standardRatePerHour > 0 ? Math.round(3600 / o.standardRatePerHour) : 25,
              completedGood: o.completedGoodQty,
              scrapQty: o.scrapQty,
              isFinal: o.isFinalOp,
            })),
            notes: 'ارزیابی موازنه WIP و قطعات پیش‌ساخته قبل از صدور نهایی دستور کار',
          };
          setInspectingPreflightOrder(scenario);
        }
      }
    } else {
      if (isAddPartModalOpen && router.route.modal === null) {
        setIsAddPartModalOpen(false);
      }
      if (inspectingPreflightOrder && router.route.modal === null) {
        setInspectingPreflightOrder(null);
      }
    }
  }, [router.route.modal, router.route.modalOrderId, router.route.modalPartId, scheduleItems]);

  // Dynamic lookup of user's defined routing for the currently selected part
  const selectedPartRouting = useMemo(() => {
    if (!newPartCode) return null;
    const foundPart = parts.find(p => p.code === newPartCode || p.id === newPartCode);
    return routings.find(
      r =>
        (foundPart && (r.partId === foundPart.id || r.partCode === foundPart.code)) ||
        r.partCode === newPartCode ||
        (foundPart && r.partName === foundPart.name)
    );
  }, [newPartCode, parts, routings]);

  // Modal for Editing an Existing Scheduled Part (ویرایش برنامه تولید قطعه بر اساس استاندارد ERPNext / Odoo)
  const [editingPlanItem, setEditingPlanItem] = useState<MultiPartScheduleItem | null>(null);
  const [editPartTargetQty, setEditPartTargetQty] = useState<number>(1000);
  const [editPartOrderCode, setEditPartOrderCode] = useState<string>('');

  // Delete Scheduled Item Handler (حذف برنامه تولید قطعه با ممیزی کامل)
  const handleDeleteScheduleItem = (itemId: string, partName: string) => {
    const targetItem = scheduleItems.find(item => item.id === itemId);
    const orderCode = targetItem?.orderCode || itemId;

    auditAction.requestAuditAction({
      title: 'حذف برنامه تولید و ابطال دستور کار (Delete MO)',
      actionSummary: `حذف دائم برنامه تولید قطعه «${partName}» با شماره دستور ${orderCode} و ابطال زمان‌بندی تمام مراحل OP مربوطه در خط`,
      entityName: 'ManufacturingOrder',
      entityId: orderCode,
      actionType: 'DELETE_ORDER',
      isDestructive: true,
      confirmButtonText: 'حذف نهایی و ثبت در لاگ ممیزی',
      onConfirm: async (reason: string) => {
        const next = scheduleItems.filter(item => item.id !== itemId);
        saveSchedule(next);
        setToastNotice({
          type: 'info',
          title: `برنامه تولید قطعه «${partName}» با موفقیت حذف شد`,
          detail: `مراحل و دستور کار مربوطه از ماتریس زمان‌بندی خارج گردید. دلیل ممیزی: «${reason}».`,
        });
      },
    });
  };

  // Open Edit Scheduled Item Modal
  const handleOpenEditScheduleItem = (item: MultiPartScheduleItem) => {
    setEditingPlanItem(item);
    setEditPartTargetQty(item.weeklyTargetQty);
    setEditPartOrderCode(item.orderCode);
  };

  // Save Edit Scheduled Item Handler
  const handleSaveEditScheduleItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanItem) return;

    const next = scheduleItems.map(item => {
      if (item.id !== editingPlanItem.id) return item;

      // Scale operations target if changed
      const updatedOps = item.ops.map(op => ({
        ...op,
        basePlannedQty: editPartTargetQty,
        effectiveTargetQty: editPartTargetQty + op.carriedOverQty,
      }));

      return {
        ...item,
        orderCode: editPartOrderCode.trim() || item.orderCode,
        weeklyTargetQty: editPartTargetQty,
        rawMaterialIssuedKg: Math.round(editPartTargetQty * item.unitWeightKg),
        ops: updatedOps,
      };
    });

    saveSchedule(next);
    setEditingPlanItem(null);
    setToastNotice({
      type: 'success',
      title: `برنامه تولید «${editingPlanItem.partName}» بروزرسانی شد`,
      detail: `تیراژ هدف به ${formatNumber(editPartTargetQty)} عدد و شماره دستور کار به ${editPartOrderCode} تغییر یافت.`,
    });
  };

  // Reporting Time Horizon State (Daily / Weekly / Monthly / Custom Range)
  const [reportHorizon, setReportHorizon] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('DAILY');
  const [customFromDate, setCustomFromDate] = useState<string>(() => {
    const j = getCurrentJalaliDate();
    return `${toPersianDigits(j.year)}/${toPersianDigits(String(j.month).padStart(2, '0'))}/۰۱`;
  });
  const [customToDate, setCustomToDate] = useState<string>(() => {
    const j = getCurrentJalaliDate();
    const lastDay = getJalaliMonthDays(j.year, j.month);
    return `${toPersianDigits(j.year)}/${toPersianDigits(String(j.month).padStart(2, '0'))}/${toPersianDigits(lastDay)}`;
  });

  // Toast Feedback Banner
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    detail: string;
  } | null>(null);

  const saveSchedule = (next: MultiPartScheduleItem[]) => {
    setScheduleItems(next);
    try {
      window.localStorage.setItem(STORAGE_KEY_MULTI_OP_APS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Filtered Parts List for Tab 1 & Tab 3
  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scheduleItems.filter(item => {
      if (selectedCarFilter !== 'ALL' && item.carModel !== selectedCarFilter) return false;
      if (
        selectedHallFilter !== 'ALL' &&
        !item.ops.some(op => op.stationHall === selectedHallFilter)
      ) {
        return false;
      }
      if (q) {
        const matchPart =
          item.partName.toLowerCase().includes(q) ||
          item.partCode.toLowerCase().includes(q) ||
          item.orderCode.toLowerCase().includes(q) ||
          item.rawMaterialCode.toLowerCase().includes(q);
        const matchOp = item.ops.some(
          op =>
            op.opTitle.toLowerCase().includes(q) ||
            op.machineCode.toLowerCase().includes(q)
        );
        if (!matchPart && !matchOp) return false;
      }
      return true;
    });
  }, [scheduleItems, searchQuery, selectedCarFilter, selectedHallFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / pageSize));
  const paginatedParts = filteredParts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Flattened Daily Dispatch Operations for Tab 2 (Every OP scheduled on `selectedDayFilter`)
  const dailyScheduledOperations = useMemo(() => {
    const list: Array<{
      partItem: MultiPartScheduleItem;
      op: ScheduledOpStep;
      prevOpCode: string;
    }> = [];

    scheduleItems.forEach(item => {
      if (selectedCarFilter !== 'ALL' && item.carModel !== selectedCarFilter) return;
      item.ops.forEach((op, idx) => {
        if (op.scheduledDayIndex !== selectedDayFilter) return;
        if (selectedHallFilter !== 'ALL' && op.stationHall !== selectedHallFilter) return;
        if (selectedShiftFilter !== 'ALL' && op.shiftName !== selectedShiftFilter) return;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          if (
            !item.partName.toLowerCase().includes(q) &&
            !item.partCode.toLowerCase().includes(q) &&
            !op.opTitle.toLowerCase().includes(q) &&
            !op.machineCode.toLowerCase().includes(q)
          ) {
            return;
          }
        }
        list.push({
          partItem: item,
          op,
          prevOpCode: idx === 0 ? `انبار ورق (${item.rawMaterialCode})` : item.ops[idx - 1].opCode,
        });
      });
    });

    return list;
  }, [
    scheduleItems,
    selectedDayFilter,
    selectedCarFilter,
    selectedHallFilter,
    selectedShiftFilter,
    searchQuery,
  ]);

  // Change which Day an OP is scheduled on directly from the matrix
  const handleChangeOpScheduledDay = (partItemId: string, opId: string, newDayIdx: number) => {
    const updated = scheduleItems.map(item => {
      if (item.id !== partItemId) return item;
      return {
        ...item,
        ops: item.ops.map(op =>
          op.opId === opId ? { ...op, scheduledDayIndex: newDayIdx } : op
        ),
      };
    });
    saveSchedule(updated);
  };

  // Issue Raw Material from Warehouse to Line OP10 (`POST /api/inventory/documents`)
  const handleIssueRawMaterialToLine = async (item: MultiPartScheduleItem) => {
    const requiredKg = Math.round(item.weeklyTargetQty * item.unitWeightKg);
    try {
      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'ISSUE_RAW_MATERIAL',
          warehouseId: 'WH-RAW',
          warehouseName: 'انبار مرکزی رول و ورق ساپکو',
          targetWarehouseId: 'WH-WIP-STAMP',
          targetWarehouseName: 'انبار پای کار سالن پرس (WIP)',
          referenceType: 'MANUFACTURING_ORDER',
          referenceNumber: item.orderCode,
          autoPost: true,
          auditNote: `حواله تغذیه ورق جهت دستور ساخت ${item.orderCode} (${item.partName})`,
          lines: [
            {
              partId: item.partId,
              partCode: item.rawMaterialCode,
              partName: item.rawMaterialName,
              quantity: requiredKg,
              unit: 'KG',
              quantityKg: requiredKg,
              lotNumber: 'COIL-DC01A-101',
              locationCode: 'LOC-RAW-A1',
            },
          ],
        }),
      });
      const data = await res.json();
      setToastNotice({
        type: 'success',
        title: `حواله ورق از انبار به ایستگاه OP10 برای «${item.partName}» صادر شد`,
        detail: data.data?.documentNumber
          ? `شماره سند حواله انبار: ${data.data.documentNumber} به مقدار ${formatNumber(requiredKg)} کیلوگرم`
          : `مقدار ${formatNumber(requiredKg)} کیلوگرم ورق ${item.rawMaterialCode} در پای خط شارژ گردید.`,
      });
      if (onRefreshData) onRefreshData();
    } catch {
      setToastNotice({
        type: 'info',
        title: `تغذیه ورق پای خط برای «${item.partName}» ثبت شد`,
        detail: `مقدار ${formatNumber(requiredKg)} کیلوگرم ورق به ایستگاه OP10 اختصاص یافت.`,
      });
    }
  };

  // Open Modal to Record OP Production, Calculate WIP & Auto-Receive into Warehouse if Final OP
  const handleOpenOpExecutionModal = (item: MultiPartScheduleItem, op: ScheduledOpStep) => {
    const opIdx = item.ops.findIndex(o => o.opId === op.opId);
    const prevOp = opIdx > 0 ? item.ops[opIdx - 1] : null;

    // CRITICAL PRECEDENCE CHECK: Operation cannot start if predecessor has produced 0 output
    if (prevOp && prevOp.completedGoodQty === 0) {
      setToastNotice({
        type: 'warning',
        title: `قفل تقدم و تأخر فرآیند (Precedence Lock): مرحله ${op.opCode} قفل است!`,
        detail: `شما نمی‌توانید عملیات «${op.opTitle}» (${op.opCode}) را شروع کنید، زیرا مرحله قبلی آن («${prevOp.opTitle}» - ${prevOp.opCode}) هنوز هیچ خروجی سالمی ثبت نکرده است. تولید یک فرآیند متوالی وابسته است؛ ابتدا باید قطعات در مرحله قبل تولید شوند.`,
      });
      return;
    }

    setActiveLogContext({ partItem: item, opStep: op });
    const currentRem = Math.max(0, op.effectiveTargetQty - op.completedGoodQty);
    // Explicit sync with table:
    // - «تولید سالم در جدول»: op.completedGoodQty
    // - «مانده در جدول»: currentRem
    setLogGoodInput(String(op.completedGoodQty || 0));
    setLogShiftGoodInput(String(currentRem)); // Default shift production to complete remaining target
    setLogInputMode('SHIFT_PRODUCTION');
    setLogScrapInput(String(op.scrapQty || 0));
    setRollForwardToDay(Math.min(6, op.scheduledDayIndex + 1));
  };

  // Submit OP Production, Recalculate Inter-OP WIP Buffers, Roll Forward Remaining Qty, and Auto-Post Warehouse Receipt on Final OP!
  const handleConfirmOpExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLogContext) return;
    setIsPostingReceipt(true);

    const { partItem, opStep } = activeLogContext;
    const shiftQty = Math.max(0, Number(logShiftGoodInput) || 0);
    const goodQty = logInputMode === 'SHIFT_PRODUCTION'
      ? Math.max(0, opStep.completedGoodQty + shiftQty)
      : Math.max(0, Number(logGoodInput) || 0);
    const scrapQty = Math.max(0, Number(logScrapInput) || 0);
    const remainingQty = Math.max(0, opStep.effectiveTargetQty - goodQty);

    // Enforce Precedence Upper Bound
    const opIdx = partItem.ops.findIndex(o => o.opId === opStep.opId);
    const prevOp = opIdx > 0 ? partItem.ops[opIdx - 1] : null;
    if (prevOp && goodQty > prevOp.completedGoodQty) {
      setToastNotice({
        type: 'warning',
        title: `خطای تقدم و تأخر (سقف مجاز ورودی):`,
        detail: `تعداد تولید ثبت‌شده (${formatNumber(goodQty)} عدد) نمی‌تواند از مجموع قطعات تولیدشده در مرحله قبلی (${formatNumber(prevOp.completedGoodQty)} عدد در ${prevOp.opCode}) بیشتر باشد!`,
      });
      setIsPostingReceipt(false);
      return;
    }

    let generatedReceiptDocNo = opStep.warehouseReceiptDocNumber;

    // CRITICAL REQUIREMENT: When Final OP is executed, automatically post a Finished Goods Receipt into the Warehouse!
    if (opStep.isFinalOp && goodQty > 0) {
      try {
        const res = await fetch('/api/inventory/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: 'RECEIPT_FINISHED_GOODS',
            warehouseId: 'WH-FINISHED',
            warehouseName: 'انبار محصولات نهایی',
            referenceType: 'MANUFACTURING_ORDER',
            referenceNumber: partItem.orderCode,
            autoPost: true,
            auditNote: `رسید خودکار محصول از تکمیل مرحله آخر (${opStep.opCode} - ${opStep.opTitle}) دستور کار ${partItem.orderCode}`,
            lines: [
              {
                partId: partItem.partId,
                partCode: partItem.partCode,
                partName: partItem.partName,
                quantity: goodQty,
                unit: 'PCS',
                quantityKg: Math.round(goodQty * partItem.unitWeightKg),
                lotNumber: `BATCH-${partItem.orderCode}-${opStep.opCode}`,
                locationCode: 'LOC-FG-A01',
              },
            ],
          }),
        });
        const data = await res.json();
        generatedReceiptDocNo =
          data.data?.documentNumber || `RCV-FG-${Math.floor(1000 + Math.random() * 9000)}`;
        if (onRefreshData) onRefreshData();
      } catch {
        generatedReceiptDocNo = `RCV-FG-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    // Update the part's OP chain and recalculate WIP buffers between every OP
    const nextSchedule = scheduleItems.map(item => {
      if (item.id !== partItem.id) return item;

      const updatedOps = item.ops.map(op => {
        if (op.opId !== opStep.opId) return op;
        return {
          ...op,
          completedGoodQty: goodQty,
          scrapQty,
          carriedOverQty: remainingQty,
          scheduledDayIndex: remainingQty > 0 ? rollForwardToDay : op.scheduledDayIndex,
          warehouseReceiptDocNumber: generatedReceiptDocNo,
          status:
            remainingQty === 0
              ? ('COMPLETED' as const)
              : ('ROLLED_FORWARD' as const),
        };
      });

      // Recompute WIP buffers between sequential operations:
      // WIP after OP(k) = max(0, completedGoodQty(OP_k) - completedGoodQty(OP_k+1))
      const recalculatedOps = updatedOps.map((op, idx) => {
        const prevCompleted = idx === 0 ? item.weeklyTargetQty : updatedOps[idx - 1].completedGoodQty;
        const nextCompleted =
          idx < updatedOps.length - 1 ? updatedOps[idx + 1].completedGoodQty : op.completedGoodQty;
        return {
          ...op,
          wipBufferBeforeOp: Math.max(0, prevCompleted - op.completedGoodQty),
          wipBufferAfterOp: op.isFinalOp
            ? op.completedGoodQty // Delivered to warehouse
            : Math.max(0, op.completedGoodQty - nextCompleted),
        };
      });

      const finalOpObj = recalculatedOps[recalculatedOps.length - 1];

      return {
        ...item,
        warehouseReceivedQty: finalOpObj ? finalOpObj.completedGoodQty : item.warehouseReceivedQty,
        ops: recalculatedOps,
      };
    });

    saveSchedule(nextSchedule);
    setIsPostingReceipt(false);
    setActiveLogContext(null);

    if (opStep.isFinalOp && goodQty > 0) {
      setToastNotice({
        type: 'success',
        title: `مرحله آخر (${opStep.opCode}) ثبت شد و رسید خودکار انبار محصول صادر گردید!`,
        detail: `تعداد ${formatNumber(goodQty)} عدد «${partItem.partName}» با شماره سند رسمی انبار «${generatedReceiptDocNo}» به انبار محصول نهایی منتقل شد.${
          remainingQty > 0
            ? ` همچنین مانده کار (${formatNumber(remainingQty)} عدد) به روز ${
                WORK_DAYS.find(d => d.index === rollForwardToDay)?.shortName || 'بعد'
              } منتقل گردید.`
            : ''
        }`,
      });
    } else {
      setToastNotice({
        type: 'success',
        title: `کارکرد مرحله ${opStep.opCode} (${opStep.opTitle}) برای «${partItem.partName}» ثبت شد`,
        detail: `تولید سالم: ${formatNumber(goodQty)} عدد | موجودی پای خط آماده برای مرحله بعد بروزرسانی شد.${
          remainingQty > 0
            ? ` مانده کار (${formatNumber(remainingQty)} عدد) به برنامه روز ${
                WORK_DAYS.find(d => d.index === rollForwardToDay)?.shortName || 'بعد'
              } منتقل شد.`
            : ''
        }`,
      });
    }
  };

  // Add a New Part with Staggered Multi-OP Schedule (بر اساس استاندارد SAP PP / Odoo mrp.routing / ERPNext)
  const handleAddNewScheduledPart = (e: React.FormEvent) => {
    e.preventDefault();
    const foundPart = parts.find(p => p.code === newPartCode || p.id === newPartCode);
    const code = foundPart ? foundPart.code : newPartCode || `SAPCO-PRT-${Date.now().toString().slice(-3)}`;
    const name = foundPart ? foundPart.name : 'قطعه جدید برنامه‌ریزی‌شده';

    const matchingRouting =
      selectedPartRouting ||
      routings.find(
        r =>
          (foundPart && (r.partId === foundPart.id || r.partCode === foundPart.code)) ||
          r.partCode === code ||
          (foundPart && r.partName === foundPart.name)
      );

    let ops: ScheduledOpStep[] = [];

    if (matchingRouting && matchingRouting.operations && matchingRouting.operations.length > 0) {
      // DYNAMIC EXPLOSION DIRECTLY FROM USER'S DEFINED ROUTING (Odoo mrp.routing / ERPNext Work Order Operation sequence)
      ops = matchingRouting.operations.map((op, idx) => {
        const isFinal = idx === matchingRouting.operations.length - 1;
        const assignedDay = customStepDays[idx] || (idx < 2 ? 1 : idx < 4 ? 2 : 3);
        const ratePerHour =
          op.standardCycleTimeSec > 0 ? Math.round(3600 / op.standardCycleTimeSec) : 350;
        const hallName =
          op.processType === 'SHEARING'
            ? 'سالن برش'
            : op.processType === 'SPOT_WELD' || op.processType === 'CO2_WELD' || op.processType === 'ASSEMBLY'
            ? 'سالن جوشکاری'
            : op.processType === 'PAINT'
            ? 'سالن رنگ'
            : 'سالن پرس';

        return {
          opId: `OP-${Date.now()}-${op.stepNumber || (idx + 1) * 10}`,
          opNo: op.stepNumber || (idx + 1) * 10,
          opCode: op.stepCode || `OP${op.stepNumber || (idx + 1) * 10}`,
          opTitle: `${op.stepName}${
            op.isSharedOperation && op.sharedPartName ? ` (قالب مشترک با ${op.sharedPartName})` : ''
          }`,
          stationHall: hallName,
          machineCode: op.machineId || 'PRS-250T-01',
          machineName: op.machineName || 'پرس ۲۵۰ تن',
          dieCode: op.dieMoldName || op.dieMoldId || 'قالب اختصاصی قطعه',
          standardRatePerHour: ratePerHour,
          scheduledDayIndex: assignedDay,
          shiftName: idx % 2 === 0 ? 'شیفت صبح' : 'شیفت عصر',
          basePlannedQty: newPartTargetQty,
          carriedOverQty: 0,
          effectiveTargetQty: newPartTargetQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: idx === 0 ? newPartTargetQty : 0,
          wipBufferAfterOp: 0,
          isFinalOp: isFinal,
          status: 'PLANNED',
        };
      });
    } else {
      // Fallback only if no routing was ever defined for the part
      ops = [
        {
          opId: `OP-${Date.now()}-10`,
          opNo: 10,
          opCode: 'OP10',
          opTitle: 'برش ورق و گیوتین اولیه',
          stationHall: 'سالن برش',
          machineCode: 'SHR-GUI-01',
          machineName: 'قیچی گیوتین ۱',
          dieCode: 'BLD-SHR-01',
          standardRatePerHour: 500,
          scheduledDayIndex: newPartOp1Day,
          shiftName: 'شیفت صبح',
          basePlannedQty: newPartTargetQty,
          carriedOverQty: 0,
          effectiveTargetQty: newPartTargetQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: newPartTargetQty,
          wipBufferAfterOp: 0,
          isFinalOp: false,
          status: 'PLANNED',
        },
        {
          opId: `OP-${Date.now()}-20`,
          opNo: 20,
          opCode: 'OP20',
          opTitle: 'بلنک‌زنی و فرم‌دهی پرس',
          stationHall: 'سالن پرس',
          machineCode: 'PRS-250T-01',
          machineName: 'پرس ۲۵۰ تن ۱',
          dieCode: 'DIE-STD-20',
          standardRatePerHour: 350,
          scheduledDayIndex: newPartOp2Day,
          shiftName: 'شیفت عصر',
          basePlannedQty: newPartTargetQty,
          carriedOverQty: 0,
          effectiveTargetQty: newPartTargetQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: 0,
          wipBufferAfterOp: 0,
          isFinalOp: false,
          status: 'PLANNED',
        },
        {
          opId: `OP-${Date.now()}-30`,
          opNo: 30,
          opCode: 'OP30',
          opTitle: 'پانچ و سوراخ‌کاری',
          stationHall: 'سالن پرس',
          machineCode: 'PRS-160T-01',
          machineName: 'پرس ۱۶۰ تن ۱',
          dieCode: 'DIE-STD-30',
          standardRatePerHour: 350,
          scheduledDayIndex: newPartOp3Day,
          shiftName: 'شیفت صبح',
          basePlannedQty: newPartTargetQty,
          carriedOverQty: 0,
          effectiveTargetQty: newPartTargetQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: 0,
          wipBufferAfterOp: 0,
          isFinalOp: false,
          status: 'PLANNED',
        },
        {
          opId: `OP-${Date.now()}-40`,
          opNo: 40,
          opCode: 'OP40',
          opTitle: 'پرس‌جوش / مونتاژ نهایی و تحویل به انبار',
          stationHall: 'سالن جوشکاری',
          machineCode: 'WLD-SPOT-01',
          machineName: 'پرس‌جوش مقاومتی ۱',
          dieCode: 'JIG-STD-40',
          standardRatePerHour: 240,
          scheduledDayIndex: newPartOp4Day,
          shiftName: 'شیفت عصر',
          basePlannedQty: newPartTargetQty,
          carriedOverQty: 0,
          effectiveTargetQty: newPartTargetQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: 0,
          wipBufferAfterOp: 0,
          isFinalOp: true,
          status: 'PLANNED',
        },
      ];
    }

    const newItem: MultiPartScheduleItem = {
      id: `MPS-ITEM-${Date.now()}`,
      orderCode: `MO-1404-${Math.floor(3000 + Math.random() * 6000)}`,
      partId: foundPart?.id || `PRT-${Date.now()}`,
      partCode: code,
      partName: name,
      carModel: foundPart?.carModel || 'پژو ۲۰۶',
      partType: 'FINISHED_PRODUCT',
      rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
      rawMaterialName: 'رول ورق DC01A ضخامت 2 عرض 1140',
      unitWeightKg: foundPart?.weightPerUnitKg || 1.2,
      weeklyTargetQty: newPartTargetQty,
      rawMaterialIssuedKg: Math.round(newPartTargetQty * (foundPart?.weightPerUnitKg || 1.2)),
      warehouseReceivedQty: 0,
      ops,
    };

    const isMultiLevelAssembly =
      code.includes('ECU') ||
      code.includes('ASY') ||
      name.includes('مجموعه') ||
      name.includes('براکت') ||
      Boolean(
        matchingRouting?.operations?.some(
          o => o.processType === 'ASSEMBLY' || o.processType === 'SPOT_WELD' || o.processType === 'CO2_WELD'
        )
      );

    if (isMultiLevelAssembly) {
      // Intercept before final issue: open PreMoWipInspectionModal for hierarchical BOM & inter-stage WIP pre-flight check!
      const preflightScenario: HighwayPartScenario = {
        id: newItem.id,
        orderCode: newItem.orderCode,
        productionBatchCode: `BCH-${newItem.orderCode.replace('MO-', '')}`,
        partId: newItem.partId,
        partCode: newItem.partCode,
        partName: newItem.partName,
        carModel: newItem.carModel,
        customerName: 'ساپکو',
        orderQty: newPartTargetQty,
        unitWeightKg: newItem.unitWeightKg,
        scrapAllowancePct: 2,
        rawMaterialCode: newItem.rawMaterialCode,
        rawMaterialName: newItem.rawMaterialName,
        warehouseAvailableKg: 1200,
        bomSubComponents: [
          { name: 'صفحه براکت اصلی ضدسرقت', qtyPerParent: 1, unit: 'عدد', stage: 'پرس‌کاری و فرم‌دهی' },
          { name: 'مکمل تقویتی براکت (گوشواره)', qtyPerParent: 1, unit: 'عدد', stage: 'پانچ و خم' },
        ],
        operations: ops.map(o => ({
          stepCode: o.opCode,
          stepName: o.opTitle,
          hall: o.stationHall,
          machineName: o.machineName,
          dieName: o.dieCode,
          cycleTimeSec: o.standardRatePerHour > 0 ? Math.round(3600 / o.standardRatePerHour) : 25,
          completedGood: o.completedGoodQty,
          scrapQty: o.scrapQty,
          isFinal: o.isFinalOp,
        })),
        notes: 'ارزیابی موازنه WIP و قطعات پیش‌ساخته قبل از صدور نهایی دستور کار',
      };

      setPendingNewItem(newItem);
      setInspectingPreflightOrder(preflightScenario);
      setIsAddPartModalOpen(false);
      router.openWipCheckModal(newItem.orderCode, newItem.partId);
      return;
    }

    saveSchedule([newItem, ...scheduleItems]);
    setIsAddPartModalOpen(false);
    router.closeModal();
    setToastNotice({
      type: 'success',
      title: `قطعه «${name}» با ${ops.length} مرحله عملیاتی ${
        matchingRouting ? '(برگرفته از مسیر تولید قطعه)' : '(توالی پیش‌فرض)'
      } زمان‌بندی شد`,
      detail: `کد دستور کار: ${newItem.orderCode} | تیراژ هدف: ${formatNumber(newPartTargetQty)} عدد`,
    });
  };

  // Fast action: Issue Sub-MO directly from Tree View when shortage is detected
  const handleIssueSubMo = (subMoData: {
    parentMoId: string;
    parentOrderCode: string;
    componentPartId: string;
    componentPartCode: string;
    componentPartName: string;
    requiredQty: number;
    subRoutingId?: string;
  }) => {
    const subMoCode = `SUB-MO-1404-${Math.floor(4000 + Math.random() * 5000)}`;
    const subItem: MultiPartScheduleItem = {
      id: `MPS-SUB-${Date.now()}`,
      orderCode: subMoCode,
      partId: subMoData.componentPartId || `PRT-SUB-${Date.now()}`,
      partCode: subMoData.componentPartCode,
      partName: subMoData.componentPartName,
      carModel: inspectingPreflightOrder?.carModel || 'پژو ۲۰۶',
      partType: 'SUB_ASSEMBLY',
      rawMaterialCode: 'RM-COIL-DC01A-1.5-320',
      rawMaterialName: 'نوار ورق DC01A ضخامت 1.5 عرض 320',
      unitWeightKg: 0.65,
      weeklyTargetQty: subMoData.requiredQty,
      rawMaterialIssuedKg: Math.round(subMoData.requiredQty * 0.7),
      warehouseReceivedQty: 0,
      ops: [
        {
          opId: `OP-SUB-${Date.now()}-10`,
          opNo: 10,
          opCode: 'OP10',
          opTitle: `برش و تغذیه نوار ورق (${subMoData.componentPartName})`,
          stationHall: 'سالن برش',
          machineCode: 'SHR-SLT-01',
          machineName: 'خط نواربری ورق',
          dieCode: 'SLT-BLD-01',
          standardRatePerHour: 600,
          scheduledDayIndex: 1,
          shiftName: 'شیفت صبح',
          basePlannedQty: subMoData.requiredQty,
          carriedOverQty: 0,
          effectiveTargetQty: subMoData.requiredQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: subMoData.requiredQty,
          wipBufferAfterOp: 0,
          isFinalOp: false,
          status: 'PLANNED',
        },
        {
          opId: `OP-SUB-${Date.now()}-20`,
          opNo: 20,
          opCode: 'OP20',
          opTitle: `بلنک‌زنی و فرم‌دهی قطعه فرعی (${subMoData.componentPartName})`,
          stationHall: 'سالن پرس',
          machineCode: 'PRS-160T-02',
          machineName: 'پرس ۱۶۰ تن ضربه‌ای',
          dieCode: 'DIE-SUB-01',
          standardRatePerHour: 400,
          scheduledDayIndex: 1,
          shiftName: 'شیفت عصر',
          basePlannedQty: subMoData.requiredQty,
          carriedOverQty: 0,
          effectiveTargetQty: subMoData.requiredQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: 0,
          wipBufferAfterOp: 0,
          isFinalOp: false,
          status: 'PLANNED',
        },
        {
          opId: `OP-SUB-${Date.now()}-30`,
          opNo: 30,
          opCode: 'OP30',
          opTitle: 'پانچ نهایی و آماده‌سازی برای مونتاژ',
          stationHall: 'سالن پرس',
          machineCode: 'PRS-100T-01',
          machineName: 'پرس ۱۰۰ تن ضربه‌ای',
          dieCode: 'DIE-SUB-02',
          standardRatePerHour: 450,
          scheduledDayIndex: 2,
          shiftName: 'شیفت صبح',
          basePlannedQty: subMoData.requiredQty,
          carriedOverQty: 0,
          effectiveTargetQty: subMoData.requiredQty,
          completedGoodQty: 0,
          scrapQty: 0,
          wipBufferBeforeOp: 0,
          wipBufferAfterOp: 0,
          isFinalOp: true,
          status: 'PLANNED',
        },
      ],
    };

    saveSchedule([subItem, ...scheduleItems]);
    setToastNotice({
      type: 'success',
      title: `دستور کار فرعی ${subMoCode} صادر شد`,
      detail: `تولید قطعه پیش‌ساخته «${subMoData.componentPartName}» به تیراژ ${formatNumber(subMoData.requiredQty)} عدد در سالن پرس زمان‌بندی گردید.`,
    });
  };

  // Final confirmation to commit main scheduled MO after pre-flight checks
  const handleConfirmIssueOrder = () => {
    if (pendingNewItem) {
      saveSchedule([pendingNewItem, ...scheduleItems]);
      setToastNotice({
        type: 'success',
        title: `دستور کار اصلی ${pendingNewItem.orderCode} با موفقیت صادر شد`,
        detail: `قطعه «${pendingNewItem.partName}» با تیراژ ${formatNumber(pendingNewItem.weeklyTargetQty)} عدد در ماتریس تولید ثبت شد.`,
      });
      setPendingNewItem(null);
    }
    setInspectingPreflightOrder(null);
    router.closeModal();
  };

  // Helper to print isolated HTML content cleanly inside an iframe without window.open
  const printIsolatedHtml = (htmlContent: string) => {
    const existingFrame = document.getElementById('kpims-isolated-print-frame') as HTMLIFrameElement | null;
    if (existingFrame) {
      existingFrame.remove();
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'kpims-isolated-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  // Isolated Official Print Function for Daily Shop-Floor Dispatch Sheet (Tab 2)
  const handlePrintDailyDispatchSheet = () => {
    const dayObj = WORK_DAYS.find(d => d.index === selectedDayFilter) || WORK_DAYS[0];

    const rowsHtml = dailyScheduledOperations
      .map(
        (entry, idx) => `
        <tr>
          <td>${toPersianDigits(idx + 1)}</td>
          <td style="font-family: monospace; font-weight: bold;">${entry.partItem.orderCode}</td>
          <td><strong>${entry.partItem.partName}</strong><br/><span style="font-size:10px; color:#555;">${entry.partItem.partCode} (${entry.partItem.carModel})</span></td>
          <td><strong>${entry.op.opCode}</strong> — ${entry.op.opTitle}${entry.op.isFinalOp ? ' <strong>[مرحله آخر -> رسید انبار]</strong>' : ''}</td>
          <td>${entry.op.stationHall}<br/><strong>${entry.op.machineName}</strong> (${entry.op.machineCode})</td>
          <td style="font-family: monospace;">${entry.op.dieCode}</td>
          <td>${entry.op.shiftName}</td>
          <td>${entry.prevOpCode}</td>
          <td style="font-weight: bold;">${formatNumber(entry.op.effectiveTargetQty)}</td>
          <td>${entry.op.completedGoodQty > 0 ? formatNumber(entry.op.completedGoodQty) : '..........'}</td>
          <td>${entry.op.scrapQty > 0 ? formatNumber(entry.op.scrapQty) : '.....'}</td>
          <td></td>
        </tr>
      `
      )
      .join('');

    printIsolatedHtml(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>برگه برنامه روزانه خط تولید — ${dayObj.name}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 16px; color: #111; direction: rtl; }
          .header { border: 2px solid #111; padding: 12px; border-radius: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          h1 { margin: 0 0 6px 0; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #333; padding: 6px; text-align: right; }
          th { background: #f1f5f9; font-weight: bold; }
          .sigs { margin-top: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center; font-size: 11px; }
          .sig-box { border: 1px solid #555; padding: 12px 8px 32px 8px; border-radius: 6px; }
          @media print { @page { size: A4 landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>فرم رسمی برنامه روزانه ایستگاه‌ها و خطوط تولید (Daily Shop-Floor Dispatch Sheet)</h1>
            <div>شرکت قطعات محوری کوثر — واحد برنامه‌ریزی و کنترل تولید (PPC & MES)</div>
          </div>
          <div style="text-align: left; font-size: 12px;">
            <div><strong>روز برنامه:</strong> ${dayObj.name} (${dayObj.date})</div>
            <div><strong>سالن:</strong> ${selectedHallFilter === 'ALL' ? 'کلیه سالن‌های تولیدی' : selectedHallFilter}</div>
            <div><strong>تعداد مراحل کاری امروز:</strong> ${toPersianDigits(dailyScheduledOperations.length)} عملیات (OP)</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شماره دستور کار</th>
              <th>نام و کد قطعه</th>
              <th>مرحله عملیات (OP)</th>
              <th>سالن و کد دستگاه / پرس</th>
              <th>کد قالب / فیکسچر</th>
              <th>شیفت</th>
              <th>تغذیه از مرحله</th>
              <th>تیراژ هدف روز</th>
              <th>تولید واقعی</th>
              <th>ضایعات</th>
              <th>امضاء اپراتور / QC</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="sigs">
          <div class="sig-box"><strong>کارشناس برنامه‌ریزی تولید (PPC)</strong></div>
          <div class="sig-box"><strong>سرپرست سالن تولید / پرسکاری</strong></div>
          <div class="sig-box"><strong>مسئول کنترل کیفیت خط (QC)</strong></div>
          <div class="sig-box"><strong>رئیس انبار (تحویل ورق / رسید محصول)</strong></div>
        </div>
      </body>
      </html>
    `);
  };

  // Global Aggregated KPIs (Scaled by Horizon for Tab 4)
  const kpiSummary = useMemo(() => {
    const multiplier =
      reportHorizon === 'DAILY' ? 0.22 : reportHorizon === 'WEEKLY' ? 1 : reportHorizon === 'MONTHLY' ? 4.2 : 2.5;

    let totalOpsCount = 0;
    let completedOpsCount = 0;
    let rolledForwardOpsCount = 0;
    let totalPlannedOpPcs = 0;
    let totalGoodOpPcs = 0;
    let totalScrapOpPcs = 0;
    let totalWipInLinePcs = 0;
    let totalFinishedWarehousePcs = 0;

    scheduleItems.forEach(item => {
      totalFinishedWarehousePcs += item.warehouseReceivedQty;
      item.ops.forEach(op => {
        totalOpsCount++;
        if (op.status === 'COMPLETED') completedOpsCount++;
        if (op.status === 'ROLLED_FORWARD' || op.carriedOverQty > 0) rolledForwardOpsCount++;
        totalPlannedOpPcs += op.effectiveTargetQty;
        totalGoodOpPcs += op.completedGoodQty;
        totalScrapOpPcs += op.scrapQty;
        if (!op.isFinalOp) {
          totalWipInLinePcs += op.wipBufferAfterOp;
        }
      });
    });

    const attainmentPct = Math.min(
      100,
      Math.round(((totalGoodOpPcs || 1) / Math.max(1, totalPlannedOpPcs)) * 100) + 28
    );
    const availabilityPct = 91.4;
    const performancePct = 88.6;
    const qualityPct = Number(
      (((totalGoodOpPcs || 1000) / Math.max(1, totalGoodOpPcs + totalScrapOpPcs)) * 100).toFixed(1)
    );
    const oeePct = Number(
      ((availabilityPct / 100) * (performancePct / 100) * (qualityPct / 100) * 100).toFixed(1)
    );

    return {
      totalPartsScheduled: scheduleItems.length,
      totalOpsCount,
      completedOpsCount,
      rolledForwardOpsCount,
      scaledPlannedPcs: Math.round(totalPlannedOpPcs * multiplier),
      scaledGoodPcs: Math.round(totalGoodOpPcs * multiplier),
      scaledScrapPcs: Math.round(totalScrapOpPcs * multiplier),
      totalWipInLinePcs,
      scaledWarehouseReceiptsPcs: Math.round(totalFinishedWarehousePcs * multiplier),
      attainmentPct,
      availabilityPct,
      performancePct,
      qualityPct,
      oeePct,
      laborEfficiencyPct: 89.5,
      machineUtilizationPct: 86.2,
      pmCompliancePct: 94.0,
      mtbfHours: 142,
      mttrMinutes: 28,
      unplannedDowntimeHours: Number((3.4 * multiplier).toFixed(1)),
    };
  }, [scheduleItems, reportHorizon]);

  const uniqueCars = useMemo(
    () => Array.from(new Set(scheduleItems.map(i => i.carModel))),
    [scheduleItems]
  );

  const uniqueHalls = ['سالن برش', 'سالن پرس', 'سالن پرس سنگین', 'سالن جوشکاری', 'سالن رنگ', 'سالن کیفیت'];

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl">
      {/* ==================================================================== */}
      {/* CLEAN ENTERPRISE CONTROL BAR (Odoo 17 / ERPNext Style)               */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              برنامه‌ریزی و اجرای مراحل تولید (OP)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              زمان‌بندی ایستگاه‌ها، کنترل تقدم و تأخر مراحل، بافر پای خط (WIP) و رسید خودکار انبار محصول
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const fresh = buildInitial20PartsSchedule();
                saveSchedule(fresh);
                setToastNotice({
                  type: 'info',
                  title: 'برنامه تولید بازنشانی شد',
                  detail: 'فهرست استاندارد قطعات بارگذاری گردید.',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی</span>
            </button>
            <button
              type="button"
              onClick={() => router.openCreateMoModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن دستور کار جدید</span>
            </button>
          </div>
        </div>

        {/* Clean Horizontal Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'MULTI_PART_SCHEDULER' as const, title: '۱. ماتریس مراحل تولید (OP)', icon: Calendar },
            { id: 'DAILY_DISPATCH_SHEET' as const, title: '۲. برنامه روزانه و چاپ شیفت', icon: Printer },
            { id: 'LIVE_WIP_OP_TRACKER' as const, title: '۳. موجودی بین ایستگاهی (WIP)', icon: ArrowRightLeft },
            { id: 'KPI_OEE_REPORTS' as const, title: '۴. شاخص‌های OEE و راندمان', icon: Gauge },
            { id: 'MATERIAL_REQUIREMENT_PROJECTION' as const, title: '۵. پیش‌بینی کسری ورق و مواد (MRP)', icon: Boxes },
            { id: 'TREE_TIMELINE_REPORT' as const, title: '۶. نمودار درختی و توقفات', icon: Activity },
            { id: 'SAP_PP_WORKFLOW' as const, title: '۷. راهنمای گردش کار', icon: GitBranch },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeModuleTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectModuleTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Toast Notification */}
      {toastNotice && (
        <div
          className={`rounded-2xl p-4 text-xs flex items-center justify-between gap-3 shadow-xs border ${
            toastNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {toastNotice.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm">{toastNotice.title}</div>
              <div
                className={`mt-0.5 ${
                  toastNotice.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {toastNotice.detail}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer shrink-0 ${
              toastNotice.type === 'warning'
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
            }`}
          >
            بستن
          </button>
        </div>
      )}

      {/* Global Search & Filter Bar (Handles High-Volume Data Cleanly) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="جستجوی نام قطعه، کد کالا، شماره دستور ساخت، مرحله OP یا کد دستگاه..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
          />
        </div>

        <select
          value={selectedCarFilter}
          onChange={e => {
            setSelectedCarFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none"
        >
          <option value="ALL">همه خانواده‌های خودرو ({toPersianDigits(uniqueCars.length)})</option>
          {uniqueCars.map(car => (
            <option key={car} value={car}>
              پروژه / خودرو: {car}
            </option>
          ))}
        </select>

        <select
          value={selectedHallFilter}
          onChange={e => {
            setSelectedHallFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none"
        >
          <option value="ALL">همه سالن‌ها و خطوط تولید</option>
          {uniqueHalls.map(h => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-950 font-semibold">روز فعال خط:</span>
          <select
            value={selectedDayFilter}
            onChange={e => setSelectedDayFilter(Number(e.target.value))}
            className="bg-transparent font-bold text-amber-950 focus:outline-none cursor-pointer"
          >
            {WORK_DAYS.map(d => (
              <option key={d.index} value={d.index}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MULTI-PART & STAGGERED MULTI-OP SCHEDULER MATRIX              */}
      {/* ==================================================================== */}
      {activeModuleTab === 'MULTI_PART_SCHEDULER' && (
        <div className="space-y-4">
          <MachineOverlapAlertWidget compact />
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  جدول زمان‌بندی پله‌ای مراحل تولید قطعات (Staggered Multi-OP Scheduling Matrix)
                </h3>
              <p className="text-slate-500 mt-0.5">
                برای هر قطعه می‌توانید مشخص کنید کدام مراحل (مثلاً OP10 تا OP30) امروز انجام شوند و کدام مراحل (مثلاً OP40 و OP50) در روزهای بعد؛ روی هر مرحله کلیک کنید تا تولید آن ثبت شود.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-mono">
                نمایش {toPersianDigits(paginatedParts.length)} از {toPersianDigits(filteredParts.length)} قطعه
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-3 w-56">
                    <span className="inline-flex items-center">
                      <span>مشخصات قطعه و دستور کار</span>
                      <MetricTooltip metric="MO" />
                    </span>
                  </th>
                  <th className="py-3 px-3 w-28">
                    <span className="inline-flex items-center">
                      <span>تیراژ و ورق</span>
                      <MetricTooltip metric="ATP" />
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center">
                      <span>توالی مراحل عملیات (OP10 تا مرحله آخر) — انتخاب روز هر مرحله و وضعیت بافر WIP</span>
                      <MetricTooltip metric="WIP" />
                    </span>
                  </th>
                  <th className="py-3 px-3 w-36 text-center">عملیات انبار و خط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedParts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center">
                      <EmptyState
                        variant={searchQuery || selectedCarFilter !== 'ALL' || selectedHallFilter !== 'ALL' ? 'FILTER_NO_MATCH' : 'NO_DATA'}
                        title={searchQuery ? `قطعه‌ای با عبارت «${searchQuery}» یافت نشد` : 'هیچ برنامه‌ای در ماتریس زمان‌بندی وجود ندارد'}
                        actionLabel={searchQuery || selectedCarFilter !== 'ALL' || selectedHallFilter !== 'ALL' ? 'پاک‌کردن فیلترها' : 'افزودن قطعه جدید به ماتریس'}
                        onAction={() => {
                          if (searchQuery || selectedCarFilter !== 'ALL' || selectedHallFilter !== 'ALL') {
                            setSearchQuery('');
                            setSelectedCarFilter('ALL');
                            setSelectedHallFilter('ALL');
                          } else {
                            setIsAddPartModalOpen(true);
                          }
                        }}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedParts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 align-top">
                    {/* Part Info */}
                    <td className="py-3.5 px-3 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTimelineOrder(item);
                            setIsTimelineModalOpen(true);
                          }}
                          className="font-mono font-bold text-[11px] bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1 border border-slate-700 shadow-2xs"
                          title="مشاهده شناسنامه و تایم‌لاین دستور ساخت (MO Timeline)"
                        >
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{item.orderCode}</span>
                        </button>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {item.carModel}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{item.partName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{item.partCode}</div>
                      {item.parentProductCode && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded inline-block border border-amber-200">
                          زیرمجموعه: {item.parentProductCode}
                        </div>
                      )}
                    </td>

                    {/* Target Qty & Raw Material */}
                    <td className="py-3.5 px-3 space-y-1 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 font-sans block">تیراژ برنامه:</span>
                        <strong className="text-slate-900 text-xs">
                          {formatNumber(item.weeklyTargetQty)} عدد
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-sans block">نیاز ورق:</span>
                        <span className="text-slate-700 text-[11px]">
                          {formatNumber(item.rawMaterialIssuedKg)} kg
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 font-sans block">رسید انبار محصول:</span>
                        <strong className="text-emerald-700 text-xs">
                          {formatNumber(item.warehouseReceivedQty)} عدد
                        </strong>
                      </div>
                    </td>

                    {/* Horizontal Staggered Operations Pipeline */}
                    <td className="py-3.5 px-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                        {item.ops.map((op, oIdx) => {
                          const isScheduledForSelectedDay =
                            op.scheduledDayIndex === selectedDayFilter;
                          const prevOp = oIdx > 0 ? item.ops[oIdx - 1] : null;
                          const isLocked = prevOp !== null && prevOp.completedGoodQty === 0;

                          return (
                            <div
                              key={op.opId}
                              className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                                isLocked
                                  ? 'bg-slate-50/70 border-slate-300 border-dashed opacity-85'
                                  : op.status === 'COMPLETED'
                                  ? 'bg-emerald-50/70 border-emerald-300'
                                  : isScheduledForSelectedDay
                                  ? 'bg-amber-50/90 border-amber-400 shadow-2xs'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                    {op.opCode}
                                  </span>
                                  {isLocked ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                      🔒 قفل تقدم ({prevOp?.opCode})
                                    </span>
                                  ) : op.isFinalOp ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                                      مرحله آخر (رسید انبار)
                                    </span>
                                  ) : null}
                                </div>
                                <div className="font-bold text-slate-900 text-[11px] leading-snug">
                                  {op.opTitle}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {op.machineName} ({op.machineCode})
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1.5 border-t border-slate-200/70 text-[10px]">
                                {/* Status Selector backed by Audit Trail */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 font-bold">وضعیت مرحله:</span>
                                  <select
                                    value={op.status}
                                    onChange={e =>
                                      handleChangeOpStatusAudit(
                                        item,
                                        op,
                                        e.target.value as ScheduledOpStep['status']
                                      )
                                    }
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border cursor-pointer focus:outline-none ${
                                      op.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : op.status === 'IN_PROGRESS'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : op.status === 'ON_HOLD'
                                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                    title="تغییر وضعیت مرحله با ثبت الزامی دلیل ممیزی"
                                  >
                                    <option value="PLANNED">برنامه‌ریزی‌شده</option>
                                    <option value="IN_PROGRESS">در جریان</option>
                                    <option value="ON_HOLD">توقف موقت</option>
                                    <option value="COMPLETED">تکمیل‌شده</option>
                                  </select>
                                </div>

                                {/* Day Selector for this specific OP */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">روز اجرا:</span>
                                  <select
                                    value={op.scheduledDayIndex}
                                    onChange={e =>
                                      handleChangeOpScheduledDay(
                                        item.id,
                                        op.opId,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold text-slate-900 focus:outline-none cursor-pointer"
                                  >
                                    {WORK_DAYS.map(d => (
                                      <option key={d.index} value={d.index}>
                                        {d.shortName}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center justify-between font-mono">
                                  <span className="font-sans text-slate-500">تولید / هدف:</span>
                                  <strong
                                    className={
                                      op.completedGoodQty >= op.effectiveTargetQty
                                        ? 'text-emerald-700'
                                        : 'text-slate-900'
                                    }
                                  >
                                    {formatNumber(op.completedGoodQty)} /{' '}
                                    {formatNumber(op.effectiveTargetQty)}
                                  </strong>
                                </div>

                                {/* Computed WIP Buffer before this OP (فرمول محاسباتی: تولید سالم OP قبلی - مصرف‌شده در OP فعلی) */}
                                {(() => {
                                  const inputWip = calculateOpInputWip(item, oIdx);
                                  const isWipSufficient = inputWip >= op.effectiveTargetQty;
                                  const isWipEmpty = inputWip === 0;

                                  return (
                                    <div
                                      className={`px-2 py-1.5 rounded-lg border text-[10px] space-y-1 ${
                                        isWipEmpty
                                          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                          : isWipSufficient
                                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                          : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1 font-sans font-bold">
                                          <Layers
                                            className={`w-3 h-3 ${
                                              isWipEmpty
                                                ? 'text-rose-600'
                                                : isWipSufficient
                                                ? 'text-emerald-600'
                                                : 'text-indigo-600'
                                            }`}
                                          />
                                          <span>بافر ورودی / قبل از تولید:</span>
                                        </span>
                                        <strong className="font-mono font-bold">
                                          {formatNumber(inputWip)} عدد
                                        </strong>
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] pt-0.5 border-t border-slate-200/50">
                                        <span className="text-slate-500">
                                          {oIdx === 0
                                            ? 'مانده کل سفارش'
                                            : `خروجی ${prevOp?.opCode}: ${formatNumber(prevOp?.completedGoodQty || 0)}`}
                                        </span>
                                        <span
                                          className={`px-1 rounded font-bold ${
                                            isWipEmpty
                                              ? 'bg-rose-200 text-rose-800'
                                              : isWipSufficient
                                              ? 'bg-emerald-200 text-emerald-800'
                                              : 'bg-amber-200 text-amber-900'
                                          }`}
                                        >
                                          {isWipEmpty ? 'فاقد بافر' : isWipSufficient ? 'کافی' : 'تغذیه جزئی'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="flex items-center justify-between font-mono">
                                  <span className="font-sans text-slate-500">
                                    {op.isFinalOp ? 'تحویل به انبار:' : 'موجودی بعد از OP:'}
                                  </span>
                                  <strong className="text-indigo-700">
                                    {formatNumber(op.wipBufferAfterOp)} عدد
                                  </strong>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleOpenOpExecutionModal(item, op)}
                                  className={`w-full mt-1 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center justify-center gap-1 ${
                                    isLocked
                                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                                  }`}
                                >
                                  {isLocked
                                    ? `🔒 قفل (نیاز به ${prevOp?.opCode})`
                                    : op.isFinalOp
                                    ? 'ثبت تولید + رسید انبار'
                                    : 'ثبت تولید / انتقال مانده'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Warehouse Feed & Cardex Actions & Plan Management */}
                    <td className="py-3.5 px-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleIssueRawMaterialToLine(item)}
                        className="w-full py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        حواله ورق از انبار به OP10
                      </button>
                      {item.ops[item.ops.length - 1]?.warehouseReceiptDocNumber && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 text-center font-mono">
                          سند رسید انبار:
                          <strong className="block text-emerald-800">
                            {item.ops[item.ops.length - 1].warehouseReceiptDocNumber}
                          </strong>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTimelineOrder(item);
                            setIsTimelineModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-2xs"
                          title="مشاهده تایم‌لاین کامل و گردش کار دستور ساخت"
                        >
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>تایم‌لاین و شناسنامه MO</span>
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditScheduleItem(item)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="ویرایش برنامه، تیراژ و شماره دستور ساخت (استاندارد ERPNext / Odoo)"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScheduleItem(item.id, item.partName)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="حذف برنامه تولید این قطعه"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)} (کل قطعات:{' '}
                {toPersianDigits(filteredParts.length)})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>قبلی</span>
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <span>بعدی</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: DAILY SHOP-FLOOR DISPATCH SHEET (PRINTABLE FOR LINE)          */}
      {/* ==================================================================== */}
      {activeModuleTab === 'DAILY_DISPATCH_SHEET' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>
                  برنامه روزانه ایستگاه‌ها و خطوط تولید جهت تحویل به سرپرستان سالن —{' '}
                  {WORK_DAYS.find(d => d.index === selectedDayFilter)?.name}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                فهرست تمامی مراحلی (OP) از قطعات مختلف که قرار است در روز انتخاب‌شده روی دستگاه‌ها و پرس‌ها اجرا شوند
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedShiftFilter}
                onChange={e => setSelectedShiftFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              >
                <option value="ALL">همه شیفت‌ها (صبح و عصر)</option>
                <option value="شیفت صبح">فقط شیفت صبح</option>
                <option value="شیفت عصر">فقط شیفت عصر</option>
              </select>

              <button
                type="button"
                onClick={handlePrintDailyDispatchSheet}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>چاپ رسمی برگه برنامه روزانه خط (A4 ایزوله)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const headers = [
                    'شماره دستور کار',
                    'کد قطعه',
                    'نام قطعه',
                    'کد مرحله (OP)',
                    'شرح عملیات',
                    'سالن',
                    'کد دستگاه',
                    'کد قالب',
                    'شیفت',
                    'تیراژ هدف روز',
                    'تولید ثبت‌شده',
                    'ضایعات',
                  ];
                  const rows = dailyScheduledOperations.map(r => [
                    r.partItem.orderCode,
                    r.partItem.partCode,
                    r.partItem.partName,
                    r.op.opCode,
                    r.op.opTitle,
                    r.op.stationHall,
                    r.op.machineCode,
                    r.op.dieCode,
                    r.op.shiftName,
                    r.op.effectiveTargetQty,
                    r.op.completedGoodQty,
                    r.op.scrapQty,
                  ]);
                  exportToCsv(`برنامه_روزانه_خط_تولید_روز_${selectedDayFilter}`, headers, rows);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>خروجی اکسل برنامه خط</span>
              </button>
            </div>
          </div>

          {/* Day Selector Quick Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {WORK_DAYS.map(d => (
              <button
                key={d.index}
                type="button"
                onClick={() => setSelectedDayFilter(d.index)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  selectedDayFilter === d.index
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {d.name} ({d.date})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center">
                      <span>دستور کار</span>
                      <MetricTooltip metric="MO" />
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center">
                      <span>قطعه و پروژه</span>
                      <MetricTooltip metric="BOM" />
                    </span>
                  </th>
                  <th className="py-3 px-3">مرحله (OP)</th>
                  <th className="py-3 px-3">سالن و دستگاه / پرس</th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center">
                      <span>کد قالب</span>
                      <MetricTooltip metric="SMED" />
                    </span>
                  </th>
                  <th className="py-3 px-3">شیفت</th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center">
                      <span>تغذیه ورودی</span>
                      <MetricTooltip metric="WIP" />
                    </span>
                  </th>
                  <th className="py-3 px-3 font-bold text-slate-900">هدف امروز (با انتقالی)</th>
                  <th className="py-3 px-3 text-emerald-700">تولید سالم</th>
                  <th className="py-3 px-3 text-amber-800">مانده مرحله</th>
                  <th className="py-3 px-3 text-center">وضعیت خط</th>
                  <th className="py-3 px-3 text-left">عملیات و اکشن‌ها</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyScheduledOperations.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 px-4 text-center">
                      <EmptyState
                        variant="NO_SCHEDULE"
                        title={`هیچ برنامه فعالی برای ${WORK_DAYS.find(d => d.index === selectedDayFilter)?.name} (${selectedShiftFilter === 'ALL' ? 'همه شیفت‌ها' : selectedShiftFilter}) یافت نشد`}
                        actionLabel="بازگشت به ماتریس برنامه‌ریزی"
                        onAction={() => handleSelectModuleTab('MULTI_PART_SCHEDULER')}
                        secondaryActionLabel="نمایش همه شیفت‌ها و روزها"
                        onSecondaryAction={() => {
                          setSelectedShiftFilter('ALL');
                          setSelectedDayFilter(1);
                          setSearchQuery('');
                        }}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  dailyScheduledOperations.map((entry, idx) => {
                    const rem = Math.max(0, entry.op.effectiveTargetQty - entry.op.completedGoodQty);
                    const isHold = entry.op.status === 'ON_HOLD';
                    const isRolled = entry.op.status === 'ROLLED_FORWARD';

                    return (
                      <tr key={entry.op.opId} className={`hover:bg-slate-50 ${isHold ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {toPersianDigits(idx + 1)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTimelineOrder(entry.partItem);
                              setIsTimelineModalOpen(true);
                              if (onMoSelect) onMoSelect(entry.partItem.orderCode);
                            }}
                            className="hover:underline hover:text-amber-600 cursor-pointer flex items-center gap-1 text-slate-900 transition"
                            title="مشاهده شناسنامه و تایم‌لاین دستور ساخت"
                          >
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{entry.partItem.orderCode}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{entry.partItem.partName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {entry.partItem.partCode} • {entry.partItem.carModel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] ml-1.5">
                            {entry.op.opCode}
                          </span>
                          <span className="font-bold text-slate-800">{entry.op.opTitle}</span>
                          {entry.op.isFinalOp && (
                            <span className="mr-1.5 text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                              مرحله آخر (رسید انبار)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{entry.op.machineName}</div>
                          <div className="text-[10px] text-slate-500">
                            {entry.op.stationHall} • <span className="font-mono">{entry.op.machineCode}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{entry.op.dieCode}</td>
                        <td className="py-2.5 px-3">{entry.op.shiftName}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {entry.prevOpCode}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-950 text-sm">
                          {formatNumber(entry.op.effectiveTargetQty)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {formatNumber(entry.op.completedGoodQty)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                          {formatNumber(rem)}
                        </td>
                        {/* Status Column */}
                        <td className="py-2.5 px-3 text-center">
                          {isHold ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 animate-pulse" title={entry.op.holdReasonText}>
                              <Pause className="w-2.5 h-2.5 text-amber-700" />
                              <span>متوقف موقت</span>
                            </span>
                          ) : isRolled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200">
                              <FastForward className="w-2.5 h-2.5 text-blue-700" />
                              <span>انتقال به بعد</span>
                            </span>
                          ) : rem === 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                              تکمیل شیفت
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                              در جریان
                            </span>
                          )}
                        </td>
                        {/* Actions Column */}
                        <td className="py-2.5 px-3">
                          {isHold ? (
                            <button
                              type="button"
                              onClick={() => handleResumeOrder(entry.partItem, entry.op)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                              title="رفع علت توقف و ادامه کار دستگاه"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>ادامه کار</span>
                            </button>
                          ) : (
                            (() => {
                              const opIdx = entry.partItem.ops.findIndex(o => o.opId === entry.op.opId);
                              const prevOp = opIdx > 0 ? entry.partItem.ops[opIdx - 1] : null;
                              const isLocked = prevOp !== null && prevOp.completedGoodQty === 0;

                              return (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* 1. ثبت کارکرد */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOpExecutionModal(entry.partItem, entry.op)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                      isLocked
                                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                                    }`}
                                  >
                                    {isLocked ? `🔒 قفل (${prevOp?.opCode})` : 'ثبت کارکرد'}
                                  </button>

                                  {/* 2. توقف موقت (Pause / Hold) */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHoldModal(entry.partItem, entry.op)}
                                    className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer transition"
                                    title="توقف موقت کار (Pause/Hold) با ثبت الزامی علت خرابی یا ستاپ"
                                  >
                                    <Pause className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 3. انتقال مانده به شیفت بعد (Roll-Forward) */}
                                  {rem > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRollForwardModal(entry.partItem, entry.op)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold cursor-pointer transition"
                                      title="انتقال مانده تیراژ به شیفت بعد (Roll-Forward)"
                                    >
                                      <FastForward className="w-3 h-3 text-blue-600" />
                                      <span>انتقال مانده</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: LIVE WIP PER OP TRACKER & AUTO WAREHOUSE RECEIPT              */}
      {/* ==================================================================== */}
      {activeModuleTab === 'LIVE_WIP_OP_TRACKER' && (
        <div className="space-y-4">
          <D3MaterialFlowDiagram />
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                  <span>
                    رهگیر لحظه‌ای موجودی بین‌مرحله‌ای قطعات در خط (WIP per OP) و رسید خودکار انبار در مرحله آخر
                  </span>
                </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مشاهده دقیق اینکه از هر قطعه در کدام مرحله (OP10، OP20، OP30...) چند عدد نیمه‌ساخته در خط وجود دارد و چند عدد از مرحله آخر وارد انبار محصول نهایی شده است.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {filteredParts.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTimelineOrder(item);
                        setIsTimelineModalOpen(true);
                      }}
                      className="font-mono font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1 border border-slate-700"
                      title="مشاهده تایم‌لاین این دستور کار"
                    >
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{item.orderCode}</span>
                    </button>
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded text-[11px]">
                      {item.partCode}
                    </span>
                    <strong className="text-slate-900 text-sm">{item.partName}</strong>
                    <span className="text-slate-500">({item.carModel})</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-slate-600">
                      تیراژ هدف: <strong className="text-slate-900">{formatNumber(item.weeklyTargetQty)} عدد</strong>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      رسید شده به انبار محصول: {formatNumber(item.warehouseReceivedQty)} عدد
                    </span>
                  </div>
                </div>

                {/* Chain from Raw Warehouse -> OPs -> Finished Warehouse */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-stretch text-xs">
                  {item.ops.map(op => (
                    <div
                      key={op.opId}
                      className={`p-3 rounded-xl border flex flex-col justify-between ${
                        op.isFinalOp
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900">{op.opCode}</span>
                          <span className="text-[10px] text-slate-500">
                            {WORK_DAYS.find(d => d.index === op.scheduledDayIndex)?.shortName}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 text-[11px] mt-1">{op.opTitle}</div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">تولید مرحله:</span>
                          <strong className="text-emerald-700">
                            {formatNumber(op.completedGoodQty)} عدد
                          </strong>
                        </div>
                        <div className="flex justify-between bg-indigo-50/80 px-1.5 py-0.5 rounded text-indigo-900">
                          <span className="font-sans font-bold">
                            {op.isFinalOp ? 'رسید به انبار:' : 'موجودی پای خط:'}
                          </span>
                          <strong className="font-bold">
                            {formatNumber(op.wipBufferAfterOp)} عدد
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenOpExecutionModal(item, op)}
                          className="w-full mt-1 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-sans font-bold cursor-pointer"
                        >
                          {op.isFinalOp ? 'ثبت تولید + رسید انبار' : 'ثبت کارکرد این OP'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Final Warehouse Destination Card */}
                  <div className="p-3 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 block">
                        مقصد نهایی پس از آخرین OP
                      </span>
                      <strong className="text-xs text-slate-900 block mt-0.5">
                        انبار محصولات نهایی (WH-FINISHED)
                      </strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-200/70">
                      <div className="text-[11px] text-emerald-900">
                        تحویل‌شده به انبار:{' '}
                        <strong className="font-mono text-sm">
                          {formatNumber(item.warehouseReceivedQty)} عدد
                        </strong>
                      </div>
                      {item.ops[item.ops.length - 1]?.warehouseReceiptDocNumber && (
                        <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                          سند: {item.ops[item.ops.length - 1].warehouseReceiptDocNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: MULTI-HORIZON ANALYTICS (DAILY/WEEKLY/MONTHLY, OEE, PM, KPI)  */}
      {/* ==================================================================== */}
      {activeModuleTab === 'KPI_OEE_REPORTS' && (
        <div className="space-y-5">
          {/* Horizon Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">بازه زمانی گزارش تحلیلی:</span>
              {[
                { id: 'DAILY' as const, label: 'گزارش روزانه (Daily)' },
                { id: 'WEEKLY' as const, label: 'گزارش هفتگی (Weekly)' },
                { id: 'MONTHLY' as const, label: 'گزارش ماهانه (Monthly)' },
                { id: 'CUSTOM' as const, label: 'بازه زمانی دلخواه (Custom Range)' },
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setReportHorizon(h.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    reportHorizon === h.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {reportHorizon === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <span>از تاریخ:</span>
                <input
                  type="text"
                  value={customFromDate}
                  onChange={e => setCustomFromDate(e.target.value)}
                  className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-slate-900"
                />
                <span>تا تاریخ:</span>
                <input
                  type="text"
                  value={customToDate}
                  onChange={e => setCustomToDate(e.target.value)}
                  className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-slate-900"
                />
              </div>
            )}
          </div>

          {/* 4 Industrial KPI Groups: Planning, Production, OEE/Efficiency, PM/Maintenance (All Clickable for Drill-Down) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Group 1: Planning KPIs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">۱. شاخص‌های برنامه‌ریزی تولید</span>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای خام تحقق برنامه و رسید انبار',
                      metricLabel: 'درصد تحقق برنامه',
                      metricValue: `${toPersianDigits(kpiSummary.attainmentPct)}٪`,
                      description: 'مراحل آخر (Final OPs) و میزان تحقق تحویل قطعات به انبار محصول نهایی در برابر تیراژ مصوب',
                      filterBadge: 'تحقق برنامه',
                      records: allRawRecords.filter(r => r.isFinalOp),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>درصد تحقق برنامه (Attainment):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-emerald-700 text-sm group-hover:underline">
                    {toPersianDigits(kpiSummary.attainmentPct)}٪
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای کلیه قطعات فعال در برنامه زمان‌بندی',
                      metricLabel: 'تعداد قطعات فعال',
                      metricValue: `${toPersianDigits(kpiSummary.totalPartsScheduled)} قطعه`,
                      description: 'فهرست ۲۰ قطعه فعال در برنامه به تفکیک مدل خودرو، تیراژ و توالی مراحل تولید',
                      filterBadge: 'قطعات برنامه',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>تعداد قطعات فعال در برنامه:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-slate-900 group-hover:underline">
                    {toPersianDigits(kpiSummary.totalPartsScheduled)} قطعه
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای کل مراحل کاری برنامه‌ریزی‌شده (OPs)',
                      metricLabel: 'کل مراحل کاری',
                      metricValue: `${toPersianDigits(kpiSummary.totalOpsCount)} مرحله`,
                      description: 'لیست کامل مراحل برش، پرس، خم، پانچ، جوشکاری و مونتاژ قطعات در افق زمانی فعال',
                      filterBadge: 'مراحل OP',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>کل مراحل کاری (OPs):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-slate-900 group-hover:underline">
                    {toPersianDigits(kpiSummary.totalOpsCount)} مرحله
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'مراحل دارای انتقال مانده به روز بعد (Roll-Forward)',
                      metricLabel: 'مراحل انتقالی',
                      metricValue: `${toPersianDigits(kpiSummary.rolledForwardOpsCount)} مرحله`,
                      description: 'مراحلی که تیراژ آن‌ها به طور کامل محقق نشده و مانده کار آن‌ها به روز بعد شیفت داده شده است',
                      filterBadge: 'مانده انتقالی',
                      records: allRawRecords.filter(r => r.status === 'ROLLED_FORWARD' || r.completedGoodQty < r.targetQty),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-amber-50/50 transition cursor-pointer group text-amber-900"
                >
                  <span className="group-hover:text-amber-800 flex items-center gap-1">
                    <span>مراحل دارای انتقال به روز بعد:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono group-hover:underline">
                    {toPersianDigits(kpiSummary.rolledForwardOpsCount)} مرحله
                  </strong>
                </button>
              </div>
            </div>

            {/* Group 2: Production & Warehouse Flow KPIs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">۲. شاخص‌های تولید، WIP و انبار</span>
                <PackageCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای کل عملیات تولید سالم انجام‌شده (OPs)',
                      metricLabel: 'تولید سالم',
                      metricValue: `${formatNumber(kpiSummary.scaledGoodPcs)} ضرب`,
                      description: 'مجموع ضرب و قطعات سالم ثبت‌شده در تمام ایستگاه‌های سالن‌های پرس، برش و جوش',
                      filterBadge: 'تولید سالم',
                      records: allRawRecords.filter(r => r.completedGoodQty > 0),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>کل عملیات تولید سالم (OPs):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-slate-900 text-sm group-hover:underline">
                    {formatNumber(kpiSummary.scaledGoodPcs)} ضرب
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز اسناد و رکوردهای رسید محصول نهایی به انبار',
                      metricLabel: 'رسید انبار محصول نهایی',
                      metricValue: `${formatNumber(kpiSummary.scaledWarehouseReceiptsPcs)} عدد`,
                      description: 'محصولات تکمیل‌شده در مرحله آخر مسیر تولید که سند رسمی رسید انبار برای آن‌ها صادر شده است',
                      filterBadge: 'رسید انبار',
                      records: allRawRecords.filter(r => r.isFinalOp && r.completedGoodQty > 0),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-emerald-50/50 transition cursor-pointer group text-emerald-800"
                >
                  <span className="group-hover:text-emerald-700 flex items-center gap-1">
                    <span>محصول نهایی رسیدشده به انبار:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono group-hover:underline">
                    {formatNumber(kpiSummary.scaledWarehouseReceiptsPcs)} عدد
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای موجودی نیمه‌ساخته بین‌ایستگاهی (WIP) در خطوط',
                      metricLabel: 'موجودی پای خط (WIP)',
                      metricValue: `${formatNumber(kpiSummary.totalWipInLinePcs)} عدد`,
                      description: 'قطعاتی که یک یا چند مرحله را طی کرده و به عنوان بافر ورودی در انتظار مرحله بعدی قرار دارند',
                      filterBadge: 'موجودی WIP',
                      records: allRawRecords.filter(r => r.wipQty > 0),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-indigo-50/50 transition cursor-pointer group text-indigo-800"
                >
                  <span className="group-hover:text-indigo-700 flex items-center gap-1">
                    <span>موجودی نیمه‌ساخته در خط (WIP):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono group-hover:underline">
                    {formatNumber(kpiSummary.totalWipInLinePcs)} عدد
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای ضایعات تولیدی به تفکیک قطعه، قالب و دستگاه',
                      metricLabel: 'ضایعات ثبت‌شده',
                      metricValue: `${formatNumber(kpiSummary.scaledScrapPcs)} عدد`,
                      description: 'قطعات نامنطبق حین راه‌اندازی و فرآیند پرسکاری، پانچ و جوشکاری در تمام شیفت‌ها',
                      filterBadge: 'ضایعات',
                      records: allRawRecords.filter(r => r.scrapQty > 0),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-rose-50/50 transition cursor-pointer group text-rose-800"
                >
                  <span className="group-hover:text-rose-700 flex items-center gap-1">
                    <span>ضایعات ثبت‌شده دوره:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono group-hover:underline">
                    {formatNumber(kpiSummary.scaledScrapPcs)} عدد
                  </strong>
                </button>
              </div>
            </div>

            {/* Group 3: OEE, Efficiency & Productivity */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  ۳. شاخص OEE، بهره‌وری و کارایی
                </span>
                <Gauge className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای شاخص اثربخشی کلی تجهیزات (OEE کل کارخانه)',
                      metricLabel: 'OEE کل کارخانه',
                      metricValue: `${toPersianDigits(kpiSummary.oeePct)}٪`,
                      description: 'محاسبه تجمیعی دسترس‌پذیری، راندمان عملکرد ضرب و نرخ کیفیت در کلیه ایستگاه‌های کاری',
                      filterBadge: 'OEE کارخانه',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-amber-50/50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-amber-800 flex items-center gap-1">
                    <span>شاخص کل اثربخشی (OEE):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-amber-700 text-sm group-hover:underline">
                    {toPersianDigits(kpiSummary.oeePct)}٪
                  </strong>
                </button>

                <div className="flex justify-between px-1.5 py-1 text-slate-500">
                  <span>دسترس‌پذیری × عملکرد × کیفیت:</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {toPersianDigits(kpiSummary.availabilityPct)}٪ ×{' '}
                    {toPersianDigits(kpiSummary.performancePct)}٪ ×{' '}
                    {toPersianDigits(kpiSummary.qualityPct)}٪
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای کارایی و راندمان نیروی انسانی (Labor Efficiency)',
                      metricLabel: 'کارایی نیروی انسانی',
                      metricValue: `${toPersianDigits(kpiSummary.laborEfficiencyPct)}٪`,
                      description: 'محاسبه ساعات استاندارد تولیدی در مقایسه با ساعات واقعی حضور اپراتورها در شیفت‌ها',
                      filterBadge: 'راندمان انسانی',
                      records: allRawRecords.filter(r => r.completedGoodQty > 0),
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>کارایی نیروی انسانی (Efficiency):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-slate-900 group-hover:underline">
                    {toPersianDigits(kpiSummary.laborEfficiencyPct)}٪
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز بارگذاری و بهره‌وری ظرفیت اسمی ماشین‌آلات و پرس‌ها',
                      metricLabel: 'بهره‌وری ظرفیت ماشین‌ها',
                      metricValue: `${toPersianDigits(kpiSummary.machineUtilizationPct)}٪`,
                      description: 'میزان بهره‌برداری از ظرفیت ۲۴ ساعته تقویمی خطوط پرس و جوشکاری کارخانه',
                      filterBadge: 'ظرفیت ماشین‌ها',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-blue-700 flex items-center gap-1">
                    <span>بهره‌وری ظرفیت ماشین‌آلات:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-slate-900 group-hover:underline">
                    {toPersianDigits(kpiSummary.machineUtilizationPct)}٪
                  </strong>
                </button>
              </div>
            </div>

            {/* Group 4: PM (Preventive Maintenance) & Machine Reliability */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  ۴. شاخص‌های نت پیشگیرانه (PM) و ماشین‌آلات
                </span>
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'تحقق چک‌لیست‌ها و برنامه‌های نت پیشگیرانه (PM Compliance)',
                      metricLabel: 'تحقق برنامه PM',
                      metricValue: `${toPersianDigits(kpiSummary.pmCompliancePct)}٪`,
                      description: 'اجرای بازرسی‌های دوره‌ای روغن‌کاری، کالیبراسیون و تیزکاری قالب‌ها طبق تقویم نت',
                      filterBadge: 'نت پیشگیرانه',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
                >
                  <span className="text-slate-600 group-hover:text-emerald-700 flex items-center gap-1">
                    <span>تحقق برنامه نت پیشگیرانه (PM):</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono text-emerald-700 text-sm group-hover:underline">
                    {toPersianDigits(kpiSummary.pmCompliancePct)}٪
                  </strong>
                </button>

                <div className="flex justify-between px-1.5 py-1 text-slate-600">
                  <span>میانگین زمان بین خرابی (MTBF):</span>
                  <strong className="font-mono text-slate-900">
                    {toPersianDigits(kpiSummary.mtbfHours)} ساعت
                  </strong>
                </div>

                <div className="flex justify-between px-1.5 py-1 text-slate-600">
                  <span>میانگین زمان تعمیر (MTTR):</span>
                  <strong className="font-mono text-slate-900">
                    {toPersianDigits(kpiSummary.mttrMinutes)} دقیقه
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDrillDownContext({
                      title: 'ریز رکوردهای توقفات اضطراری و خرابی‌های خطوط در دوره',
                      metricLabel: 'توقفات اضطراری',
                      metricValue: `${toPersianDigits(kpiSummary.unplannedDowntimeHours)} ساعت`,
                      description: 'لاگ حوادث مکانیکی، گیرکردن قطعه در قالب و نشت هیدرولیک نیازمند مداخله نت',
                      filterBadge: 'توقفات اضطراری',
                      records: allRawRecords,
                    })
                  }
                  className="w-full flex justify-between items-center text-right p-1.5 rounded-lg hover:bg-rose-50/50 transition cursor-pointer group text-rose-800"
                >
                  <span className="group-hover:text-rose-700 flex items-center gap-1">
                    <span>توقفات اضطراری دوره:</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                  <strong className="font-mono group-hover:underline">
                    {toPersianDigits(kpiSummary.unplannedDowntimeHours)} ساعت
                  </strong>
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* ENTERPRISE OEE BREAKDOWN BY MACHINE & SEPARATED LABOR EFFICIENCY     */}
          {/* ==================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. OEE Per Machine in Active Shift */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-xs text-slate-900">
                    شاخص OEE به تفکیک ماشین‌آلات (در شیفت فعال امروز: شیفت صبح)
                  </h4>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                  Shift: MORNING • Horizon: TODAY
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">ماشین و کد</th>
                      <th className="py-2 px-2.5">سالن / ایستگاه</th>
                      <th className="py-2 px-2.5">شیفت فعال</th>
                      <th className="py-2 px-2.5">دسترس‌پذیری (A)</th>
                      <th className="py-2 px-2.5">عملکرد (P)</th>
                      <th className="py-2 px-2.5">کیفیت (Q)</th>
                      <th className="py-2 px-2.5">OEE ماشین</th>
                      <th className="py-2 px-2.5 text-center">Drill-Down</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {[
                      { code: 'PRS-250T-01', name: 'پرس ۲۵۰ تن ۱ (کشش/بلنک)', hall: 'سالن پرس', shift: 'شیفت صبح (جاری)', a: 91.2, p: 84.5, q: 98.4, oee: 75.8 },
                      { code: 'PRS-160T-01', name: 'پرس ۱۶۰ تن ۱ (خم/پانچ)', hall: 'سالن پرس', shift: 'شیفت صبح (جاری)', a: 89.5, p: 82.0, q: 99.1, oee: 72.7 },
                      { code: 'SHR-GUI-01', name: 'قیچی گیوتین ۶ متری ۱', hall: 'سالن برش', shift: 'شیفت صبح (جاری)', a: 93.0, p: 88.0, q: 99.5, oee: 81.4 },
                      { code: 'PRS-800T-G1', name: 'پرس هیدرولیک ۸۰۰ تن', hall: 'سالن پرس سنگین', shift: 'شیفت صبح (جاری)', a: 86.4, p: 79.2, q: 97.8, oee: 66.9 },
                      { code: 'WLD-SPOT-01', name: 'پرس‌جوش مقاومتی ۱۰۰KVA', hall: 'سالن جوشکاری', shift: 'شیفت صبح (جاری)', a: 87.5, p: 83.0, q: 98.9, oee: 71.8 },
                      { code: 'WLD-ROB-01', name: 'ربات جوش CO2 شماره ۱', hall: 'سالن جوشکاری', shift: 'شیفت صبح (جاری)', a: 92.1, p: 85.0, q: 99.2, oee: 77.7 },
                    ].map(m => (
                      <tr key={m.code} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-2.5">
                          <strong className="text-slate-900 block">{m.name}</strong>
                          <span className="font-mono text-[10px] text-slate-500">{m.code}</span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">{m.hall}</td>
                        <td className="py-2 px-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 font-bold">
                            {m.shift}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-blue-700">{toPersianDigits(m.a)}٪</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-indigo-700">{toPersianDigits(m.p)}٪</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-emerald-700">{toPersianDigits(m.q)}٪</td>
                        <td className="py-2 px-2.5 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            m.oee >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {toPersianDigits(m.oee)}٪
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `ریز رکوردهای تولید و عملیات ماشین «${m.name}» (${m.code})`,
                                metricLabel: `OEE ماشین ${m.code}`,
                                metricValue: `${toPersianDigits(m.oee)}٪`,
                                description: `دسترس‌پذیری: ${toPersianDigits(m.a)}٪ • راندمان عملکرد: ${toPersianDigits(m.p)}٪ • کیفیت: ${toPersianDigits(m.q)}٪ در سالن ${m.hall}`,
                                filterBadge: m.code,
                                records: allRawRecords.filter(r => r.machineCode === m.code),
                              })
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
                          >
                            مشاهده سوابق
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Differentiated Human Labor Efficiency */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-slate-900">
                      راندمان نیروی انسانی (Labor Efficiency)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    تفکیک‌شده از OEE ماشین
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 text-xs">
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    در استانداردهای ERP سازمانی (SAP / D365)، شاخص راندمان نیروی انسانی بر مبنای نسبت «ساعت کار استاندارد حاصل از تولید سالم (Earned Hours)» به «کل ساعت حضور اپراتورها (Clocked Hours)» اندازه‌گیری می‌شود و از توقفات مکانیکی دستگاه مجزاست:
                  </p>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">ساعت استاندارد کسب‌شده (Earned):</span>
                      <strong className="text-slate-900">۹۲.۴ ساعت</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">ساعت واقعی حضور اپراتورها (Clocked):</span>
                      <strong className="text-slate-900">۱۰۳.۲ ساعت</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-emerald-800 font-bold">
                      <span className="font-sans">راندمان نیروی انسانی (Efficiency):</span>
                      <span className="text-sm">{toPersianDigits(kpiSummary.laborEfficiencyPct)}٪</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[10px] text-blue-900 space-y-1">
                    <strong className="block font-bold">اصل تفکیک نقص مکانیکی از عملکرد انسانی:</strong>
                    <span>
                      توقفات ناشی از شکستگی سنبه، نشت روغن یا عیب مدار هیدرولیک فقط در دسترس‌پذیری ماشین (Machine OEE) محاسبه شده و از سوابق کارایی اپراتورها کسر نمی‌گردد.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDrillDownContext({
                    title: 'ریز رکوردهای کارایی و ثبت کارکرد اپراتورها در شیفت فعال',
                    metricLabel: 'کارایی نیروی انسانی',
                    metricValue: `${toPersianDigits(kpiSummary.laborEfficiencyPct)}٪`,
                    description: 'مقایسه نفر-ساعت استاندارد تولید سالم با ساعات کاری ثبت‌شده در شیفت‌های کارخانه',
                    filterBadge: 'راندمان انسانی',
                    records: allRawRecords.filter(r => r.completedGoodQty > 0),
                  })
                }
                className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>بررسی ریز رکوردهای کارایی نیروی انسانی</span>
              </button>
            </div>
          </div>

          {/* Detailed Multi-Horizon Breakdown Table + Print & Excel Export */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  جدول جامع عملکرد برنامه‌ریزی، تولید، موجودی مراحل (WIP)، رسید انبار، OEE و نت (PM) به تفکیک قطعه و خط
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مقیاس گزارش فعال:{' '}
                  <strong className="text-slate-800">
                    {reportHorizon === 'DAILY'
                      ? 'روزانه (Daily)'
                      : reportHorizon === 'WEEKLY'
                      ? 'هفتگی (Weekly)'
                      : reportHorizon === 'MONTHLY'
                      ? 'ماهانه (Monthly)'
                      : `بازه دلخواه (${customFromDate} تا ${customToDate})`}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const horizonTitle =
                      reportHorizon === 'DAILY'
                        ? 'گزارش روزانه'
                        : reportHorizon === 'WEEKLY'
                        ? 'گزارش هفتگی'
                        : reportHorizon === 'MONTHLY'
                        ? 'گزارش ماهانه'
                        : `گزارش بازه ${customFromDate} تا ${customToDate}`;

                    const rowsHtml = filteredParts
                      .map((item, idx) => {
                        const wipPcs = item.ops.reduce(
                          (acc, o) => acc + (o.isFinalOp ? 0 : o.wipBufferAfterOp),
                          0
                        );
                        const scrapPcs = item.ops.reduce((acc, o) => acc + o.scrapQty, 0);
                        const attainment = Math.min(
                          100,
                          Math.round(
                            (item.warehouseReceivedQty / Math.max(1, item.weeklyTargetQty)) * 100
                          )
                        );
                        return `
                          <tr>
                            <td>${toPersianDigits(idx + 1)}</td>
                            <td style="font-family: monospace; font-weight: bold;">${item.orderCode}</td>
                            <td><strong>${item.partName}</strong><br/><span style="font-size:10px;color:#555;">${item.partCode} (${item.carModel})</span></td>
                            <td>${toPersianDigits(item.ops.length)} مرحله</td>
                            <td>${formatNumber(item.weeklyTargetQty)}</td>
                            <td>${formatNumber(wipPcs)}</td>
                            <td style="font-weight: bold; color: #047857;">${formatNumber(item.warehouseReceivedQty)}</td>
                            <td>${formatNumber(scrapPcs)}</td>
                            <td style="font-weight: bold;">${toPersianDigits(attainment)}٪</td>
                            <td>${toPersianDigits(kpiSummary.oeePct)}٪</td>
                            <td>تایید PM (${toPersianDigits(kpiSummary.pmCompliancePct)}٪)</td>
                          </tr>
                        `;
                      })
                      .join('');

                    printIsolatedHtml(`
                      <!DOCTYPE html>
                      <html lang="fa" dir="rtl">
                      <head>
                        <meta charset="UTF-8" />
                        <title>${horizonTitle} — برنامه‌ریزی، تولید، OEE و PM</title>
                        <style>
                          body { font-family: Tahoma, Arial, sans-serif; padding: 16px; color: #111; direction: rtl; }
                          .header { border: 2px solid #111; padding: 12px; border-radius: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
                          .kpi-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; font-size: 11px; }
                          .kpi-card { border: 1px solid #444; padding: 8px; border-radius: 6px; background: #f8fafc; }
                          table { width: 100%; border-collapse: collapse; font-size: 11px; }
                          th, td { border: 1px solid #333; padding: 6px; text-align: right; }
                          th { background: #f1f5f9; font-weight: bold; }
                          @media print { @page { size: A4 landscape; margin: 10mm; } }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <h1 style="margin:0 0 6px 0;font-size:16px;">گزارش رسمی شاخص‌های برنامه‌ریزی تولید، بهره‌وری، OEE و نت پیشگیرانه (PM)</h1>
                            <div>شرکت قطعات محوری کوثر — افق گزارش: <strong>${horizonTitle}</strong></div>
                          </div>
                          <div style="text-align:left;font-size:12px;">
                            <div><strong>OEE کل کارخانه:</strong> ${toPersianDigits(kpiSummary.oeePct)}٪</div>
                            <div><strong>تحقق برنامه تولید:</strong> ${toPersianDigits(kpiSummary.attainmentPct)}٪</div>
                            <div><strong>انطباق نت (PM):</strong> ${toPersianDigits(kpiSummary.pmCompliancePct)}٪</div>
                          </div>
                        </div>
                        <div class="kpi-bar">
                          <div class="kpi-card"><strong>کل ضرب عملیات سالم:</strong> ${formatNumber(kpiSummary.scaledGoodPcs)}</div>
                          <div class="kpi-card"><strong>رسید قطعی انبار محصول:</strong> ${formatNumber(kpiSummary.scaledWarehouseReceiptsPcs)} عدد</div>
                          <div class="kpi-card"><strong>موجودی نیمه‌ساخته خط (WIP):</strong> ${formatNumber(kpiSummary.totalWipInLinePcs)} عدد</div>
                          <div class="kpi-card"><strong>MTBF / MTTR ماشین‌آلات:</strong> ${toPersianDigits(kpiSummary.mtbfHours)} ساعت / ${toPersianDigits(kpiSummary.mttrMinutes)} دقیقه</div>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>ردیف</th>
                              <th>دستور کار</th>
                              <th>قطعه و خودرو</th>
                              <th>تعداد OP</th>
                              <th>تیراژ برنامه</th>
                              <th>موجودی در خط (WIP)</th>
                              <th>رسید انبار محصول</th>
                              <th>ضایعات</th>
                              <th>تحقق برنامه</th>
                              <th>شاخص OEE</th>
                              <th>وضعیت PM خط</th>
                            </tr>
                          </thead>
                          <tbody>${rowsHtml}</tbody>
                        </table>
                      </body>
                      </html>
                    `);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>چاپ رسمی گزارش مدیریتی دوره (A4 ایزوله)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const headers = [
                      'شماره دستور کار',
                      'کد قطعه',
                      'نام قطعه',
                      'خودرو',
                      'تعداد مراحل (OP)',
                      'تیراژ برنامه',
                      'موجودی بین مراحل (WIP)',
                      'رسید انبار محصول نهایی',
                      'ضایعات کل',
                      'درصد تحقق برنامه',
                      'شاخص OEE (%)',
                      'کارایی پرسنل (%)',
                      'تحقق PM (%)',
                    ];
                    const rows = filteredParts.map(item => {
                      const wipPcs = item.ops.reduce(
                        (acc, o) => acc + (o.isFinalOp ? 0 : o.wipBufferAfterOp),
                        0
                      );
                      const scrapPcs = item.ops.reduce((acc, o) => acc + o.scrapQty, 0);
                      const attainment = Math.min(
                        100,
                        Math.round(
                          (item.warehouseReceivedQty / Math.max(1, item.weeklyTargetQty)) * 100
                        )
                      );
                      return [
                        item.orderCode,
                        item.partCode,
                        item.partName,
                        item.carModel,
                        item.ops.length,
                        item.weeklyTargetQty,
                        wipPcs,
                        item.warehouseReceivedQty,
                        scrapPcs,
                        attainment,
                        kpiSummary.oeePct,
                        kpiSummary.laborEfficiencyPct,
                        kpiSummary.pmCompliancePct,
                      ];
                    });
                    exportToCsv(`گزارش_جامع_تولید_OEE_PM_${reportHorizon}`, headers, rows);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>خروجی اکسل شاخص‌ها (CSV)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">دستور کار</th>
                    <th className="py-2.5 px-3">نام و کد قطعه</th>
                    <th className="py-2.5 px-3">تعداد مراحل (OP)</th>
                    <th className="py-2.5 px-3">تیراژ برنامه</th>
                    <th className="py-2.5 px-3 text-indigo-700">موجودی پای خط (WIP)</th>
                    <th className="py-2.5 px-3 text-emerald-700">رسید انبار محصول</th>
                    <th className="py-2.5 px-3 text-rose-700">ضایعات</th>
                    <th className="py-2.5 px-3">درصد تحقق</th>
                    <th className="py-2.5 px-3">OEE خط</th>
                    <th className="py-2.5 px-3">وضعیت PM و بهره‌وری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParts.map(item => {
                    const wipPcs = item.ops.reduce(
                      (acc, o) => acc + (o.isFinalOp ? 0 : o.wipBufferAfterOp),
                      0
                    );
                    const scrapPcs = item.ops.reduce((acc, o) => acc + o.scrapQty, 0);
                    const attainment = Math.min(
                      100,
                      Math.round(
                        (item.warehouseReceivedQty / Math.max(1, item.weeklyTargetQty)) * 100
                      )
                    );
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `ریز رکوردهای مراحل دستور ساخت ${item.orderCode} (${item.partName})`,
                                metricLabel: `دستور ${item.orderCode}`,
                                metricValue: `${formatNumber(item.weeklyTargetQty)} عدد`,
                                description: `بررسی مراحل و وضعیت تولید قطعه ${item.partName} برای خودرو ${item.carModel}`,
                                filterBadge: item.orderCode,
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode),
                              })
                            }
                            className="hover:text-blue-700 hover:underline cursor-pointer font-bold"
                          >
                            {item.orderCode}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.partName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.partCode} • {item.carModel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {toPersianDigits(item.ops.length)} مرحله (OP10 تا{' '}
                          {item.ops[item.ops.length - 1]?.opCode})
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {formatNumber(item.weeklyTargetQty)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `موجودی نیمه‌ساخته (WIP) در خط برای ${item.partName}`,
                                metricLabel: `WIP ${item.partCode}`,
                                metricValue: `${formatNumber(wipPcs)} عدد`,
                                description: `مراحل دارای موجودی بین‌ایستگاهی برای قطعه ${item.partName}`,
                                filterBadge: 'WIP قطعه',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode && r.wipQty > 0),
                              })
                            }
                            className="hover:underline cursor-pointer"
                          >
                            {formatNumber(wipPcs)} عدد
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `رسیدهای انبار محصول نهایی برای ${item.partName}`,
                                metricLabel: `رسید انبار ${item.orderCode}`,
                                metricValue: `${formatNumber(item.warehouseReceivedQty)} عدد`,
                                description: `اسناد رسید قطعی انبار صادرشده از تکمیل مرحله آخر این قطعه`,
                                filterBadge: 'رسید انبار',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode && r.isFinalOp),
                              })
                            }
                            className="hover:underline cursor-pointer"
                          >
                            {formatNumber(item.warehouseReceivedQty)} عدد
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-rose-700">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `ضایعات ثبت‌شده برای قطعه ${item.partName}`,
                                metricLabel: `ضایعات ${item.partCode}`,
                                metricValue: `${formatNumber(scrapPcs)} عدد`,
                                description: `مراحل و ایستگاه‌های ثبت‌کننده ضایعات برای دستور ساخت ${item.orderCode}`,
                                filterBadge: 'ضایعات قطعه',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode && r.scrapQty > 0),
                              })
                            }
                            className="hover:underline cursor-pointer font-bold"
                          >
                            {formatNumber(scrapPcs)}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `تحقق برنامه دستور ساخت ${item.orderCode} (${item.partName})`,
                                metricLabel: `تحقق ${item.orderCode}`,
                                metricValue: `${toPersianDigits(attainment)}٪`,
                                description: `مقایسه تیراژ تحویل به انبار (${formatNumber(item.warehouseReceivedQty)}) با تیراژ هدف (${formatNumber(item.weeklyTargetQty)}) در مرحله نهایی`,
                                filterBadge: 'تحقق برنامه',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode && r.isFinalOp),
                              })
                            }
                            className="hover:underline cursor-pointer"
                            title="مشاهده ریز رکوردهای تحقق برنامه"
                          >
                            <span
                              className={`px-2 py-0.5 rounded ${
                                attainment >= 80
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {toPersianDigits(attainment)}٪
                            </span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `ریز رکوردهای OEE و عملیات ماشین‌آلات قطعه ${item.partName} (${item.orderCode})`,
                                metricLabel: `OEE خط ${item.orderCode}`,
                                metricValue: `${toPersianDigits(kpiSummary.oeePct)}٪`,
                                description: `مراحل فرآیند، ماشین‌های فعال (${item.ops.map(o => o.machineCode).join('، ')}) و نرخ‌های تولید این دستور کار`,
                                filterBadge: 'OEE خط',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode),
                              })
                            }
                            className="hover:text-amber-700 hover:underline cursor-pointer"
                            title="مشاهده ریز رکوردهای OEE ماشین‌آلات"
                          >
                            {toPersianDigits(kpiSummary.oeePct)}٪
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() =>
                              setDrillDownContext({
                                title: `سوابق PM، نت پیشگیرانه و کارایی اپراتورها برای مراحل ${item.orderCode}`,
                                metricLabel: `کارایی و PM ${item.partCode}`,
                                metricValue: `PM: ${toPersianDigits(kpiSummary.pmCompliancePct)}٪`,
                                description: `چک‌لیست‌های نگهداری پیشگیرانه قالب‌ها و راندمان نفر-ساعت کارکرد خط تولید`,
                                filterBadge: 'PM و کارایی',
                                records: allRawRecords.filter(r => r.orderCode === item.orderCode),
                              })
                            }
                            className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold transition cursor-pointer"
                            title="مشاهده سوابق نت پیشگیرانه و کارایی پرسنل"
                          >
                            PM: {toPersianDigits(kpiSummary.pmCompliancePct)}٪ | کارایی:{' '}
                            {toPersianDigits(kpiSummary.laborEfficiencyPct)}٪
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: MATERIAL REQUIREMENT PROJECTION & COIL SHORTAGE FORECAST      */}
      {/* ==================================================================== */}
      {activeModuleTab === 'MATERIAL_REQUIREMENT_PROJECTION' && (
        <MaterialRequirementProjectionView
          scheduleItems={scheduleItems}
          onOpenOrderTimeline={order => {
            setActiveTimelineOrder(order);
            setIsTimelineModalOpen(true);
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* TAB 6: TREE-STRUCTURED OEE & MACHINE DOWNTIME TIMELINE & ADHERENCE   */}
      {/* ==================================================================== */}
      {activeModuleTab === 'TREE_TIMELINE_REPORT' && (
        <ComprehensiveProductionReportView />
      )}

      {/* ==================================================================== */}
      {/* TAB 7: SAP PP-ALIGNED TECHNICAL WORKFLOW SPECIFICATION & DIAGRAM     */}
      {/* ==================================================================== */}
      {activeModuleTab === 'SAP_PP_WORKFLOW' && (
        <ProductionWorkflowDocumentationView />
      )}

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: INTERACTIVE RAW DRILL-DOWN ACROSS ALL REPORTS/OEE */}
      {/* ==================================================================== */}
      {drillDownContext && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col text-right text-xs">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                    Drill-Down رکوردهای خام ERP
                  </span>
                  {drillDownContext.filterBadge && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                      {drillDownContext.filterBadge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {drillDownContext.title}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {drillDownContext.description} • شاخص انتخابی:{' '}
                  <strong className="text-slate-900">{drillDownContext.metricLabel} = {drillDownContext.metricValue}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownContext(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Export Toolbar */}
            <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در دستور ساخت، نام قطعه، ماشین، مرحله..."
                  value={drillDownSearch}
                  onChange={e => setDrillDownSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <span>تعداد رکوردهای استخراج‌شده:</span>
                <strong className="font-mono text-slate-900 text-sm">
                  {toPersianDigits(
                    drillDownContext.records.filter(r => {
                      if (!drillDownSearch.trim()) return true;
                      const q = drillDownSearch.toLowerCase();
                      return (
                        r.orderCode.toLowerCase().includes(q) ||
                        r.partName.toLowerCase().includes(q) ||
                        r.machineName.toLowerCase().includes(q) ||
                        r.opCode.toLowerCase().includes(q) ||
                        r.opTitle.toLowerCase().includes(q)
                      );
                    }).length
                  )}{' '}
                  ردیف
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = drillDownContext.records.filter(r => {
                      if (!drillDownSearch.trim()) return true;
                      const q = drillDownSearch.toLowerCase();
                      return (
                        r.orderCode.toLowerCase().includes(q) ||
                        r.partName.toLowerCase().includes(q) ||
                        r.machineName.toLowerCase().includes(q) ||
                        r.opCode.toLowerCase().includes(q) ||
                        r.opTitle.toLowerCase().includes(q)
                      );
                    });
                    const headers = [
                      'دستور ساخت (MO)',
                      'نام قطعه',
                      'کد قطعه',
                      'مدل خودرو',
                      'کد مرحله',
                      'عنوان مرحله',
                      'دستگاه',
                      'سالن',
                      'قالب',
                      'شیفت',
                      'روز',
                      'تیراژ هدف',
                      'تولید سالم',
                      'WIP ورودی',
                      'ضایعات',
                      'وضعیت',
                    ];
                    const rows = filtered.map(r => [
                      r.orderCode,
                      r.partName,
                      r.partCode,
                      r.carModel,
                      r.opCode,
                      r.opTitle,
                      r.machineName,
                      r.stationHall,
                      r.dieCode,
                      r.shiftName,
                      r.dayName,
                      r.targetQty,
                      r.completedGoodQty,
                      r.wipQty,
                      r.scrapQty,
                      r.status,
                    ]);
                    exportToCsv(`DrillDown_${drillDownContext.metricLabel}`, headers, rows);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>اکسل (CSV)</span>
                </button>
              </div>
            </div>

            {/* Scrollable Raw Records Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">دستور ساخت</th>
                      <th className="py-2 px-2.5">قطعه و خودرو</th>
                      <th className="py-2 px-2.5">مرحله (OP)</th>
                      <th className="py-2 px-2.5">ماشین و سالن</th>
                      <th className="py-2 px-2.5">قالب</th>
                      <th className="py-2 px-2.5">شیفت / روز</th>
                      <th className="py-2 px-2.5">هدف</th>
                      <th className="py-2 px-2.5 text-emerald-700">تولید سالم</th>
                      <th className="py-2 px-2.5 text-indigo-700">WIP ورودی</th>
                      <th className="py-2 px-2.5 text-rose-700">ضایعات</th>
                      <th className="py-2 px-2.5">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {drillDownContext.records
                      .filter(r => {
                        if (!drillDownSearch.trim()) return true;
                        const q = drillDownSearch.toLowerCase();
                        return (
                          r.orderCode.toLowerCase().includes(q) ||
                          r.partName.toLowerCase().includes(q) ||
                          r.machineName.toLowerCase().includes(q) ||
                          r.opCode.toLowerCase().includes(q) ||
                          r.opTitle.toLowerCase().includes(q)
                        );
                      })
                      .map((r, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-2.5 font-bold text-slate-900">{r.orderCode}</td>
                          <td className="py-2 px-2.5 font-sans">
                            <span className="font-bold text-slate-800 block truncate max-w-[130px]">{r.partName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{r.partCode} ({r.carModel})</span>
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="font-bold text-blue-700">{r.opCode}</span>
                            <span className="font-sans text-[10px] text-slate-600 block">{r.opTitle}</span>
                          </td>
                          <td className="py-2 px-2.5 font-sans">
                            <span className="font-bold text-slate-800 block">{r.machineName}</span>
                            <span className="text-[10px] text-slate-500">{r.stationHall}</span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-600">{r.dieCode}</td>
                          <td className="py-2 px-2.5 font-sans">
                            <span>{r.shiftName}</span>
                            <span className="block text-[10px] text-slate-500">{r.dayName}</span>
                          </td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">{formatNumber(r.targetQty)}</td>
                          <td className="py-2 px-2.5 font-bold text-emerald-700">{formatNumber(r.completedGoodQty)}</td>
                          <td className="py-2 px-2.5 font-bold text-indigo-700">{formatNumber(r.wipQty)}</td>
                          <td className="py-2 px-2.5 font-bold text-rose-700">{formatNumber(r.scrapQty)}</td>
                          <td className="py-2 px-2.5 font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'ROLLED_FORWARD'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {r.status === 'COMPLETED' ? 'تکمیل‌شده' : r.status === 'ROLLED_FORWARD' ? 'انتقال‌یافته' : r.status === 'IN_PROGRESS' ? 'در جریان' : 'برنامه‌ریزی'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 text-[11px]">
                پایان رهگیری رکوردهای ERP • داده‌های زنده منطبق با خطوط تولید و کارگاه
              </span>
              <button
                type="button"
                onClick={() => setDrillDownContext(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
              >
                بستن کشو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: LOG OP PRODUCTION, ROLL FORWARD & AUTO WAREHOUSE RECEIPT    */}
      {/* ==================================================================== */}
      {activeLogContext && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-right text-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {activeLogContext.partItem.orderCode} • {activeLogContext.opStep.opCode}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">
                  ثبت کارکرد مرحله «{activeLogContext.opStep.opTitle}» —{' '}
                  {activeLogContext.partItem.partName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogContext(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeLogContext.opStep.isFinalOp && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">
                    این عملیات «مرحله آخر (Final OP)» مسیر تولید قطعه است!
                  </strong>
                  <span>
                    به محض ثبت تولید سالم در این مرحله، سیستم به صورت خودکار سند رسمی «رسید محصول نهایی در انبار (`RECEIPT_FINISHED_GOODS`)» را صادر و موجودی انبار را افزایش می‌دهد.
                  </span>
                </div>
              </div>
            )}

            {(() => {
              const partItem = activeLogContext.partItem;
              const opStep = activeLogContext.opStep;
              const opIdx = partItem.ops.findIndex(o => o.opId === opStep.opId);
              const prevOp = opIdx > 0 ? partItem.ops[opIdx - 1] : null;
              const availableWip = calculateOpInputWip(partItem, opIdx);
              const currentRemInTable = Math.max(0, opStep.effectiveTargetQty - opStep.completedGoodQty);

              const shiftQtyNum = Number(logShiftGoodInput) || 0;
              const computedTotalGood = logInputMode === 'SHIFT_PRODUCTION'
                ? opStep.completedGoodQty + shiftQtyNum
                : Number(logGoodInput) || 0;
              const newRemaining = Math.max(0, opStep.effectiveTargetQty - computedTotalGood);

              return (
                <div className="space-y-3.5">
                  {/* Table Synchronized Status Banner - دقیقاً سینک با ۳ ستون اصلی سطر جدول برنامه روزانه */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
                    <div>
                      <span className="text-slate-500 block text-[10px]">۱. هدف کل مرحله (جدول)</span>
                      <strong className="font-mono text-slate-900 font-bold text-xs">
                        {formatNumber(opStep.effectiveTargetQty)} عدد
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px] font-bold">۲. تولید سالم در جدول</span>
                      <strong className="font-mono text-emerald-800 font-bold text-xs">
                        {formatNumber(opStep.completedGoodQty)} عدد
                      </strong>
                    </div>
                    <div>
                      <span className="text-amber-800 block text-[10px] font-bold">۳. مانده مرحله در جدول</span>
                      <strong className="font-mono text-amber-900 font-bold text-xs">
                        {formatNumber(currentRemInTable)} عدد
                      </strong>
                    </div>
                  </div>

                  {/* Computed Input WIP Buffer */}
                  <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 inline" />
                      <span>بافر ورودی آماده (تولید سالم مرحله قبل - مصرف این OP):</span>
                    </span>
                    <strong className="font-mono font-bold text-indigo-800">
                      {formatNumber(availableWip)} عدد
                      {prevOp && (
                        <span className="text-[10px] text-slate-500 font-normal mr-1">
                          (از خروجی {prevOp.opCode})
                        </span>
                      )}
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">دستگاه و قالب:</span>
                      <strong className="text-slate-900 text-xs">
                        {opStep.machineName} ({opStep.dieCode})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">سالن و شیفت:</span>
                      <strong className="text-slate-900 text-xs">
                        {opStep.stationHall} • {opStep.shiftName}
                      </strong>
                    </div>
                  </div>

                  {/* Input Mode Selector Toggle */}
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLogInputMode('SHIFT_PRODUCTION')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        logInputMode === 'SHIFT_PRODUCTION'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ثبت تولید این شیفت (تولید سالم امروز)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogInputMode('CUMULATIVE_TOTAL')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        logInputMode === 'CUMULATIVE_TOTAL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ویرایش مستقیم مجموع کل تولید سالم
                    </button>
                  </div>

                  <form onSubmit={handleConfirmOpExecution} className="space-y-3.5">
                    {logInputMode === 'SHIFT_PRODUCTION' ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block font-bold text-slate-700">
                            تعداد تولید سالم جدید در این شیفت کاری *
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setLogShiftGoodInput(String(currentRemInTable))}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-sans font-bold"
                              title="تکمیل کل مانده سهمیه"
                            >
                              تکمیل کل مانده ({formatNumber(currentRemInTable)})
                            </button>
                            {availableWip > 0 && (
                              <button
                                type="button"
                                onClick={() => setLogShiftGoodInput(String(Math.min(currentRemInTable, availableWip)))}
                                className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 cursor-pointer font-sans font-bold"
                                title="تولید به اندازه کل بافر ورودی موجود"
                              >
                                مصرف بافر ({formatNumber(Math.min(currentRemInTable, availableWip))})
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          required
                          value={logShiftGoodInput}
                          onChange={e => setLogShiftGoodInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-sm text-emerald-800 focus:outline-none focus:bg-white"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                          <span>
                            تولید سالم قبلی: <strong>{formatNumber(opStep.completedGoodQty)}</strong>
                          </span>
                          <span className="text-emerald-700 font-bold">
                            مجموع پس از ثبت: {formatNumber(computedTotalGood)} عدد
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block font-bold text-slate-700">
                            مجموع نهایی تولید سالم این مرحله (سینک با ستون تولید سالم جدول) *
                          </label>
                          <button
                            type="button"
                            onClick={() => setLogGoodInput(String(opStep.effectiveTargetQty))}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-sans font-bold"
                          >
                            رسیدن به هدف ۱۰۰٪ ({formatNumber(opStep.effectiveTargetQty)})
                          </button>
                        </div>
                        <input
                          type="number"
                          min={0}
                          required
                          value={logGoodInput}
                          onChange={e => setLogGoodInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-sm text-emerald-800 focus:outline-none focus:bg-white"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تعداد ضایعات این شیفت</label>
                        <input
                          type="number"
                          min={0}
                          value={logScrapInput}
                          onChange={e => setLogScrapInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-sm text-rose-700 focus:outline-none focus:bg-white"
                        />
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
                        <span className="text-slate-500 block text-[10px]">مانده مرحله در جدول پس از ثبت:</span>
                        <strong className="font-mono text-sm font-bold text-amber-900">
                          {formatNumber(newRemaining)} عدد
                        </strong>
                      </div>
                    </div>

                    {/* Roll-Forward Day Selector */}
                    {newRemaining > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                        <span className="text-amber-900 font-bold">
                          انتقال مانده ({formatNumber(newRemaining)} عدد) به روز:
                        </span>
                        <select
                          value={rollForwardToDay}
                          onChange={e => setRollForwardToDay(Number(e.target.value))}
                          className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 font-bold text-slate-900 cursor-pointer"
                        >
                          {WORK_DAYS.map(d => (
                            <option key={d.index} value={d.index}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveLogContext(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        disabled={isPostingReceipt}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                      >
                        {isPostingReceipt
                          ? 'در حال ثبت...'
                          : opStep.isFinalOp
                          ? 'ثبت تولید مرحله آخر + صدور رسید خودکار انبار'
                          : 'ثبت کارکرد مرحله و به‌روزرسانی موجودی خط (WIP)'}
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ADD NEW PART WITH STAGGERED MULTI-OP SCHEDULE               */}
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* MODAL 2: ADD NEW PART WITH STAGGERED MULTI-OP SCHEDULE               */}
      {/* ==================================================================== */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-right text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-sm text-slate-900">
                افزودن قطعه جدید به برنامه تولید (بر اساس مسیر تولید و توالی عملیات)
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddPartModalOpen(false);
                  router.closeModal();
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewScheduledPart} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">انتخاب قطعه از کاتالوگ *</label>
                <SearchableSelect
                  value={newPartCode}
                  onChange={val => {
                    setNewPartCode(val);
                    setCustomStepDays({});
                  }}
                  placeholder="جستجو و انتخاب قطعه..."
                  searchPlaceholder="نام یا کد قطعه..."
                  options={parts.map(p => ({
                    value: p.code,
                    label: `${p.name} (${p.code})`,
                    sublabel: p.carModel || 'خودرو',
                    badge: p.unit,
                  }))}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تیراژ هدف دستور کار *</label>
                <input
                  type="number"
                  min={50}
                  value={newPartTargetQty}
                  onChange={e => setNewPartTargetQty(Number(e.target.value) || 1000)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              {/* Dynamic Operations from Part's Defined Routing or Default Sequential Steps */}
              {selectedPartRouting && selectedPartRouting.operations && selectedPartRouting.operations.length > 0 ? (
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>مراحل عملیاتی استخراج‌شده از مسیر تولید ({selectedPartRouting.operations.length} مرحله):</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                      Routing v{selectedPartRouting.version || '1.0'}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-800">
                    توالی عملیات، پرس و قالب مستقیماً از مسیر تولید تعریف‌شده خوانده شد. روز اجرای هر مرحله را در زیر تعیین کنید:
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedPartRouting.operations.map((op, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-150 text-[11px] shadow-2xs">
                        <div className="flex-1 ml-2">
                          <div className="font-bold text-slate-900">
                            {op.stepCode || `OP${op.stepNumber || (idx + 1) * 10}`}: {op.stepName}
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span>پرس: {op.machineName || 'پرس ۲۵۰ تن'}</span>
                            <span>•</span>
                            <span>قالب: {op.dieMoldName || 'قالب اختصاصی'}</span>
                            {op.isSharedOperation && (
                              <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                خروجی مشترک با {op.sharedPartName || 'قطعه جفت'}
                              </span>
                            )}
                          </div>
                        </div>
                        <select
                          value={customStepDays[idx] || (idx < 2 ? 1 : idx < 4 ? 2 : 3)}
                          onChange={e => setCustomStepDays(prev => ({ ...prev, [idx]: Number(e.target.value) }))}
                          className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1 font-bold text-slate-900 text-xs"
                        >
                          {WORK_DAYS.map(d => (
                            <option key={d.index} value={d.index}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>تعیین روز اجرای هر عملیات:</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      فاقد مسیر اختصاصی (توالی پیش‌فرض ۴ مرحله‌ای)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    برای این قطعه هنوز مسیر تولید اختصاصی ثبت نشده؛ می‌توانید از توالی استاندارد زیر استفاده کنید یا در منوی «اطلاعات پایه › مسیر تولید» برای آن فرآیند دقیق تعریف نمایید.
                  </p>
                  {[
                    { label: 'OP10: برش ورق اولیه', val: newPartOp1Day, set: setNewPartOp1Day },
                    { label: 'OP20: بلنک‌زنی و فرم', val: newPartOp2Day, set: setNewPartOp2Day },
                    { label: 'OP30: پانچ و سوراخ‌کاری', val: newPartOp3Day, set: setNewPartOp3Day },
                    { label: 'OP40: پرس‌جوش / مرحله آخر (رسید انبار)', val: newPartOp4Day, set: setNewPartOp4Day },
                  ].map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-slate-700">{st.label}</span>
                      <select
                        value={st.val}
                        onChange={e => st.set(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-900 text-xs"
                      >
                        {WORK_DAYS.map(d => (
                          <option key={d.index} value={d.index}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPartModalOpen(false);
                    router.closeModal();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span>افزودن و ارزیابی پیش‌نیازها</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PRE-FLIGHT INTER-STAGE WIP & SUB-ASSEMBLY BOM INSPECTION     */}
      {/* ==================================================================== */}
      {inspectingPreflightOrder && (
        <PreMoWipInspectionModal
          isOpen={true}
          onClose={() => {
            setInspectingPreflightOrder(null);
            router.closeModal();
          }}
          order={inspectingPreflightOrder}
          onConfirmIssueOrder={handleConfirmIssueOrder}
          onIssueSubMo={handleIssueSubMo}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDIT SCHEDULED PLAN ITEM (استاندارد ERPNext / Odoo mrp.production) */}
      {/* ==================================================================== */}
      {editingPlanItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4 text-right text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">
                  ویرایش برنامه تولید قطعه
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlanItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditScheduleItem} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[11px]">نام و کد قطعه:</span>
                <strong className="text-slate-900 text-sm block mt-0.5">
                  {editingPlanItem.partName}
                </strong>
                <span className="font-mono text-slate-600 text-[11px]">
                  {editingPlanItem.partCode} ({editingPlanItem.carModel})
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  شماره دستور ساخت / دستور کار (MO) *
                </label>
                <input
                  type="text"
                  required
                  value={editPartOrderCode}
                  onChange={e => setEditPartOrderCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تیراژ هفتگی هدف (عدد) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editPartTargetQty}
                  onChange={e => setEditPartTargetQty(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  با تغییر تیراژ، برنامه تمامی {editingPlanItem.ops.length} مرحله عملیاتی متناسب با هدف جدید بازتراز خواهد شد.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlanItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  ذخیره تغییرات برنامه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: MANDATORY HOLD / PAUSE WORK ORDER OPERATION                   */}
      {/* ==================================================================== */}
      {holdModalContext && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-right text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Pause className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    توقف موقت کارگاه و فریز دستور کار (Hold)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {holdModalContext.op.opCode} • {holdModalContext.partItem.partName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHoldModalContext(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>دستگاه متوقف‌شونده:</span>
                <span className="font-mono text-amber-900">{holdModalContext.op.machineName}</span>
              </div>
              <div className="text-[11px] text-amber-800">
                ثبت توقف موقت بلافاصله وضعیت این مرحله را فریز کرده و زمان توقف را به صورت لحظه‌ای در موتور محاسبه OEE تجهیز ثبت می‌نماید.
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleConfirmHold();
              }}
              className="space-y-3.5"
            >
              <DynamicSelect
                categoryCode="DOWNTIME_REASON"
                label="کد و علت توقف خط (استخراج شده از دیتابیس MasterItem)"
                value={holdReasonCode}
                onChange={(val, item) => {
                  setHoldReasonCode(val);
                  if (item) setHoldReasonText(item.value);
                }}
                required
                allowAddOption={true}
                showCodeBadge={true}
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تخمین مدت توقف (دقیقه) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  required
                  value={holdEstimatedMinutes}
                  onChange={e => setHoldEstimatedMinutes(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-xs text-rose-700 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  توضیحات تکمیلی و شرح ریشه عیب (اختیاری)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: شکستگی پین سنبه در سوراخ سوم، نیاز به تعویض قطعه یدکی قالب..."
                  value={holdDescription}
                  onChange={e => setHoldDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHoldModalContext(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>تایید و فریز خط (Hold)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ROLL-FORWARD REMAINING QUOTA TO NEXT SHIFT / DAY              */}
      {/* ==================================================================== */}
      {rollForwardModalContext && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-right text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <FastForward className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    انتقال مانده تیراژ به شیفت / روز آینده (Roll-Forward)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {rollForwardModalContext.op.opCode} • {rollForwardModalContext.partItem.orderCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRollForwardModalContext(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-900">{rollForwardModalContext.partItem.partName}</div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div className="bg-white/80 p-1.5 rounded-lg border border-blue-100">
                  <span className="text-[9px] text-slate-500 block">هدف شیفت جاری</span>
                  <strong className="text-slate-900 text-xs">
                    {formatNumber(rollForwardModalContext.op.effectiveTargetQty)}
                  </strong>
                </div>
                <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                  <span className="text-[9px] text-slate-500 block">تولید سالم</span>
                  <strong className="text-emerald-700 text-xs">
                    {formatNumber(rollForwardModalContext.op.completedGoodQty)}
                  </strong>
                </div>
                <div className="bg-white/80 p-1.5 rounded-lg border border-amber-100">
                  <span className="text-[9px] text-slate-500 block">مانده قابل انتقال</span>
                  <strong className="text-amber-700 text-xs">
                    {formatNumber(rollForwardModalContext.remainingQty)}
                  </strong>
                </div>
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleExecuteRollForward();
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    روز کاری مقصد *
                  </label>
                  <select
                    value={rfTargetDay}
                    onChange={e => setRfTargetDay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-xs text-slate-900 focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {WORK_DAYS.map(d => (
                      <option key={d.index} value={d.index}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    شیفت کاری مقصد *
                  </label>
                  <select
                    value={rfTargetShift}
                    onChange={e => setRfTargetShift(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-xs text-slate-900 focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="شیفت صبح">شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)</option>
                    <option value="شیفت عصر">شیفت عصر (۱۵:۰۰ - ۲۳:۰۰)</option>
                    <option value="شیفت شب">شیفت شب (۲۳:۰۰ - ۰۷:۰۰)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تیراژ انتقالی به برنامه شیفت بعد (عدد) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={rollForwardModalContext.remainingQty}
                  required
                  value={rfQuantity}
                  onChange={e => setRfQuantity(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-xs text-blue-700 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  علت انتقال به شیفت بعد *
                </label>
                <select
                  value={rfReason}
                  onChange={e => setRfReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="پایان ساعت کار شیفت و تکمیل نشدن تیراژ">پایان ساعت کار شیفت و تکمیل نشدن تیراژ</option>
                  <option value="توقف موقت پرس / عیب سنبه یا قالب">توقف موقت پرس / عیب سنبه یا قالب</option>
                  <option value="کسری رول ورق یا نوار برشی پای خط">کسری رول ورق یا نوار برشی پای خط</option>
                  <option value="تغییر اولویت خط به سفارش اضطراری دیگر ساپکو">تغییر اولویت خط به سفارش اضطراری دیگر ساپکو</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  یادداشت شیفت و توضیحات سرپرست
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: هماهنگ با سرپرست شیفت عصر جهت تکمیل سقف پالت..."
                  value={rfNotes}
                  onChange={e => setRfNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRollForwardModalContext(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>ثبت انتقال و تراز برنامه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Timeline Component for Tracking MO Status History & Lifecycle */}
      <ManufacturingOrderTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        order={activeTimelineOrder}
        allOrders={scheduleItems}
        onSelectOrder={setActiveTimelineOrder}
        onOpenLogModal={(partItem, opStep) => {
          setIsTimelineModalOpen(false);
          handleOpenOpExecutionModal(partItem, opStep);
        }}
      />

      {/* Enterprise Audit Confirmation Modal (Mandatory reason >= 10 chars) */}
      <AuditConfirmationModal {...auditAction.modalProps} />
    </div>
  );
};
