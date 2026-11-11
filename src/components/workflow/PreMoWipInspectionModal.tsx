import React, { useState, useMemo } from 'react';
import {
  X,
  Boxes,
  Layers,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Check,
  PlusCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { HighwayPartScenario } from './FactoryHighwayWorkbench';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { INITIAL_ADVANCED_BOMS, getAllBoms } from '../../server/bomAndParallelEngine';

export interface PreMoWipInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: HighwayPartScenario;
  onConfirmIssueOrder?: (updatedOrder: HighwayPartScenario) => void;
  onIssueSubMo?: (subMoData: {
    parentMoId: string;
    parentOrderCode: string;
    componentPartId: string;
    componentPartCode: string;
    componentPartName: string;
    requiredQty: number;
    subRoutingId?: string;
  }) => void;
}

export interface InterStageWipStep {
  stepCode: string;
  stepName: string;
  processType: string;
  machineName: string;
  hallName: string;
  waitingInputQty: number;
  inProgressQty: number;
  goodBufferQty: number;
  scrapQty: number;
  normScrapPercent: number;
}

export interface SubComponentInspectionRow {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  componentType: 'SUB_ASSEMBLY' | 'RAW_SHEET' | 'FASTENER' | 'OTHER';
  quantityPerAssembly: number;
  unit: string;
  totalRequiredQty: number;
  warehouseStockQty: number;
  interStageWipQty: number;
  totalAvailableQty: number;
  shortageQty: number;
  coveragePercent: number;
  status: 'COVERED' | 'SHORTAGE' | 'CRITICAL';
  subMoRequired: boolean;
  subRoutingId?: string;
  subMoIssued?: boolean;
  issuedSubMoCode?: string;
  stages: InterStageWipStep[];
  rawMaterialInfo?: {
    materialName: string;
    coilNumber?: string;
    heatNumber?: string;
    requiredKg: number;
    availableKg: number;
  };
}

export const PreMoWipInspectionModal: React.FC<PreMoWipInspectionModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmIssueOrder,
  onIssueSubMo,
}) => {
  const [issuedSubMos, setIssuedSubMos] = useState<Record<string, { code: string; qty: number }>>({});
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    'CMP-ECU-MAIN': true,
    'CMP-ECU-COMP': true,
  });
  const [viewMode, setViewMode] = useState<'TREE_VIEW' | 'STATIONS_DETAIL'>('TREE_VIEW');

  // Match BOM for current part
  const matchedBom = useMemo(() => {
    const allBoms = getAllBoms();
    const found = allBoms.find(
      b =>
        b.assemblyPartId === order.partId ||
        b.assemblyPartCode === order.partCode ||
        order.partName.includes('ECU') ||
        order.partName.includes('ضدسرقت') ||
        order.partId?.includes('ECU')
    );
    if (found) return found;

    if (order.partName.includes('تارا') || order.partCode?.includes('TARA')) {
      return allBoms.find(b => b.assemblyPartCode.includes('TARA')) || allBoms[1];
    }
    if (order.partName.includes('۲۰۶') || order.partName.includes('قفل')) {
      return allBoms[0];
    }
    return INITIAL_ADVANCED_BOMS[2] || allBoms[0];
  }, [order.partId, order.partCode, order.partName]);

  // Build realistic, industrial inspection rows for sub-components
  const subComponents = useMemo<SubComponentInspectionRow[]>(() => {
    const orderQty = Math.max(1, order.orderQty);
    const isEcuBracket =
      order.partCode?.includes('ECU') ||
      order.partName?.includes('ECU') ||
      order.partName?.includes('ضدسرقت');

    if (isEcuBracket) {
      // 1. صفحه براکت اصلی ضدسرقت
      const mainStages: InterStageWipStep[] = [
        {
          stepCode: 'OP10_SLIT',
          stepName: 'نواربری و برش کویل ورق DC01A (عرض ۱۱۴۰)',
          processType: 'SHEARING',
          machineName: 'خط نواربر رول ۲',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 0,
          inProgressQty: 250,
          goodBufferQty: 450,
          scrapQty: 8,
          normScrapPercent: 0.8,
        },
        {
          stepCode: 'OP15_SHEAR',
          stepName: 'برش با گیوتین هیدرولیک و ابعاددهی شیت اولیه',
          processType: 'SHEARING',
          machineName: 'قیچی گیوتین هیدرولیک',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 100,
          inProgressQty: 180,
          goodBufferQty: 320,
          scrapQty: 4,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP20_BLNK',
          stepName: 'بلنکینگ و خالی‌بری کانتور اصلی براکت',
          processType: 'BLANKING',
          machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
          hallName: 'سالن پرس‌های سنگین',
          waitingInputQty: 300,
          inProgressQty: 400,
          goodBufferQty: 1100,
          scrapQty: 22,
          normScrapPercent: 1.2,
        },
        {
          stepCode: 'OP30_BEND',
          stepName: 'خم لبه‌ها و فلنجینگ حاشیه‌ای براکت اصلی',
          processType: 'BENDING',
          machineName: 'پرس برک CNC خط ۱',
          hallName: 'سالن پرس‌های متوسط و برک CNC',
          waitingInputQty: 200,
          inProgressQty: 250,
          goodBufferQty: 680,
          scrapQty: 12,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP40_PNCH',
          stepName: 'پانچ دوبل سوراخ‌های موقعیت‌دهی و نشیمنگاه مهره‌ها',
          processType: 'PUNCH_FORM',
          machineName: 'پرس شولر ۴۰۰ تن',
          hallName: 'سالن پرس‌های سنگین',
          waitingInputQty: 150,
          inProgressQty: 300,
          goodBufferQty: 850,
          scrapQty: 15,
          normScrapPercent: 0.6,
        },
        {
          stepCode: 'OP50_WELD_NUT15',
          stepName: 'پرس‌جوش مقاومتی ۱۵ عدد مهره M6 پایه‌دار',
          processType: 'SPOT_WELD',
          machineName: 'دستگاه پرس‌جوش ۷۵kVA',
          hallName: 'سالن جوشکاری و پرس‌جوش مقاومتی',
          waitingInputQty: 200,
          inProgressQty: 350,
          goodBufferQty: 1500,
          scrapQty: 10,
          normScrapPercent: 0.6,
        },
      ];

      // 2. مکمل براکت ضدسرقت
      const compStages: InterStageWipStep[] = [
        {
          stepCode: 'OP10_SLIT',
          stepName: 'برش شیت از رول ۲×۱۱۴۰ با گیوتین',
          processType: 'SHEARING',
          machineName: 'خط نواربر رول ۲',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 50,
          inProgressQty: 150,
          goodBufferQty: 600,
          scrapQty: 5,
          normScrapPercent: 0.8,
        },
        {
          stepCode: 'OP20_BLNK',
          stepName: 'پرسکاری بلنکینگ فرم هندسی مکمل',
          processType: 'BLANKING',
          machineName: 'پرس ضربه‌ای ۱۶۰ تن',
          hallName: 'سالن پرس‌های متوسط',
          waitingInputQty: 200,
          inProgressQty: 300,
          goodBufferQty: 1400,
          scrapQty: 18,
          normScrapPercent: 1.0,
        },
        {
          stepCode: 'OP30_BEND',
          stepName: 'خم‌کاری زوایای مکمل براکت',
          processType: 'BENDING',
          machineName: 'پرس برک CNC خط ۲',
          hallName: 'سالن پرس‌های متوسط و برک CNC',
          waitingInputQty: 150,
          inProgressQty: 250,
          goodBufferQty: 900,
          scrapQty: 10,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP40_PNCH',
          stepName: 'پانچ سوراخ‌ها و محل پیچ‌های جوشی',
          processType: 'PUNCH_FORM',
          machineName: 'پرس مکانیکی ۱۰۰ تن',
          hallName: 'سالن پرس‌های متوسط',
          waitingInputQty: 100,
          inProgressQty: 200,
          goodBufferQty: 1150,
          scrapQty: 8,
          normScrapPercent: 0.4,
        },
        {
          stepCode: 'OP50_WELD_BOLT2',
          stepName: 'پرس‌جوش مقاومتی ۲ عدد پیچ پایه جوشی M6x20',
          processType: 'SPOT_WELD',
          machineName: 'دستگاه پرس‌جوش ۷۵kVA خط ۲',
          hallName: 'سالن جوشکاری و پرس‌جوش مقاومتی',
          waitingInputQty: 120,
          inProgressQty: 180,
          goodBufferQty: 800,
          scrapQty: 6,
          normScrapPercent: 0.5,
        },
      ];

      const mainRequired = orderQty * 1;
      const mainWhStock = 1200;
      const mainWipFloorStock = 1500;
      const mainSubMo = issuedSubMos['CMP-ECU-MAIN'];
      const mainTotalAvail = mainWhStock + mainWipFloorStock + (mainSubMo ? mainSubMo.qty : 0);
      const mainShortage = mainSubMo ? 0 : Math.max(0, mainRequired - (mainWhStock + mainWipFloorStock));

      const compRequired = orderQty * 1;
      const compWhStock = 900;
      const compWipFloorStock = 800;
      const compSubMo = issuedSubMos['CMP-ECU-COMP'];
      const compTotalAvail = compWhStock + compWipFloorStock + (compSubMo ? compSubMo.qty : 0);
      const compShortage = compSubMo ? 0 : Math.max(0, compRequired - (compWhStock + compWipFloorStock));

      return [
        {
          id: 'CMP-ECU-MAIN',
          partId: 'PRT-WIP-ECU-MAIN',
          partCode: 'WIP-ECU-MAIN-BRK',
          partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
          componentType: 'SUB_ASSEMBLY',
          quantityPerAssembly: 1,
          unit: 'عدد',
          totalRequiredQty: mainRequired,
          warehouseStockQty: mainWhStock,
          interStageWipQty: mainWipFloorStock,
          totalAvailableQty: mainTotalAvail,
          shortageQty: mainShortage,
          coveragePercent: Math.min(100, Math.round((mainTotalAvail / mainRequired) * 100)),
          status: mainShortage === 0 ? 'COVERED' : mainShortage > 1000 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: true,
          subRoutingId: 'RTG-ECU-MAIN',
          subMoIssued: Boolean(mainSubMo),
          issuedSubMoCode: mainSubMo?.code,
          stages: mainStages,
          rawMaterialInfo: {
            materialName: 'کویل ورق سرد روغنی DC01A ضخامت 2mm ابعاد 2x1140',
            coilNumber: order.coilNumber || 'MOB-2025-DC01-409',
            heatNumber: order.heatNumber || 'HT-99412-MOB',
            requiredKg: Math.round(orderQty * 0.95),
            availableKg: order.warehouseAvailableKg || 18500,
          },
        },
        {
          id: 'CMP-ECU-COMP',
          partId: 'PRT-WIP-ECU-COMP',
          partCode: 'WIP-ECU-COMP-BRK',
          partName: 'مکمل براکت ضدسرقت رایانه موتور',
          componentType: 'SUB_ASSEMBLY',
          quantityPerAssembly: 1,
          unit: 'عدد',
          totalRequiredQty: compRequired,
          warehouseStockQty: compWhStock,
          interStageWipQty: compWipFloorStock,
          totalAvailableQty: compTotalAvail,
          shortageQty: compShortage,
          coveragePercent: Math.min(100, Math.round((compTotalAvail / compRequired) * 100)),
          status: compShortage === 0 ? 'COVERED' : compShortage > 1000 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: true,
          subRoutingId: 'RTG-ECU-COMP',
          subMoIssued: Boolean(compSubMo),
          issuedSubMoCode: compSubMo?.code,
          stages: compStages,
          rawMaterialInfo: {
            materialName: 'کویل ورق سرد روغنی DC01A ضخامت 2mm ابعاد 2x1140 (یا 2x1000)',
            coilNumber: order.coilNumber || 'MOB-2025-DC01-409',
            heatNumber: order.heatNumber || 'HT-99412-MOB',
            requiredKg: Math.round(orderQty * 0.45),
            availableKg: order.warehouseAvailableKg || 18500,
          },
        },
        {
          id: 'CMP-ECU-NUT15',
          partId: 'PRT-FST-NUT-M6',
          partCode: 'FST-NUT-WELD-M6',
          partName: 'مهره جوشی چهارگوش پایه‌دار M6 (استاندارد خودرویی DIN 928)',
          componentType: 'FASTENER',
          quantityPerAssembly: 15,
          unit: 'عدد',
          totalRequiredQty: orderQty * 15,
          warehouseStockQty: 45000,
          interStageWipQty: 3000,
          totalAvailableQty: 48000,
          shortageQty: Math.max(0, orderQty * 15 - 48000),
          coveragePercent: Math.min(100, Math.round((48000 / (orderQty * 15)) * 100)),
          status: orderQty * 15 <= 48000 ? 'COVERED' : 'SHORTAGE',
          subMoRequired: false,
          stages: [],
        },
        {
          id: 'CMP-ECU-BLT2',
          partId: 'PRT-FST-BLT-M6-20',
          partCode: 'FST-BOLT-WELD-M6-20',
          partName: 'پیچ پایه جوشی مقاومتی M6x20 استاندارد خودرویی',
          componentType: 'FASTENER',
          quantityPerAssembly: 2,
          unit: 'عدد',
          totalRequiredQty: orderQty * 2,
          warehouseStockQty: 12000,
          interStageWipQty: 1000,
          totalAvailableQty: 13000,
          shortageQty: Math.max(0, orderQty * 2 - 13000),
          coveragePercent: Math.min(100, Math.round((13000 / (orderQty * 2)) * 100)),
          status: orderQty * 2 <= 13000 ? 'COVERED' : 'SHORTAGE',
          subMoRequired: false,
          stages: [],
        },
      ];
    }

    // Generic fallback for other BOMs
    if (matchedBom && matchedBom.components.length > 0) {
      return matchedBom.components.map((c, idx) => {
        const required = orderQty * c.quantityPerAssembly;
        const whStock = Math.round(required * (0.6 + (idx % 3) * 0.3));
        const wipStock = Math.round(required * 0.35);
        const subMo = issuedSubMos[c.id];
        const totalAvail = whStock + wipStock + (subMo ? subMo.qty : 0);
        const shortage = subMo ? 0 : Math.max(0, required - (whStock + wipStock));

        return {
          id: c.id,
          partId: c.componentPartId,
          partCode: c.componentPartCode,
          partName: c.componentPartName,
          componentType:
            c.componentType === 'FASTENER_HARDWARE'
              ? 'FASTENER'
              : c.componentType === 'RAW_SHEET'
              ? 'RAW_SHEET'
              : 'SUB_ASSEMBLY',
          quantityPerAssembly: c.quantityPerAssembly,
          unit: c.unit === 'PCS' ? 'عدد' : c.unit,
          totalRequiredQty: required,
          warehouseStockQty: whStock,
          interStageWipQty: wipStock,
          totalAvailableQty: totalAvail,
          shortageQty: shortage,
          coveragePercent: Math.min(100, Math.round((totalAvail / required) * 100)),
          status: shortage === 0 ? 'COVERED' : shortage > required * 0.5 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: c.subMoRequired,
          subRoutingId: c.subRoutingId,
          subMoIssued: Boolean(subMo),
          issuedSubMoCode: subMo?.code,
          stages: [
            {
              stepCode: 'OP10_PREP',
              stepName: 'آماده‌سازی و برش اولیه شیت',
              processType: 'SHEARING',
              machineName: 'خط برش و نواربر',
              hallName: 'سالن برشکاری',
              waitingInputQty: 50,
              inProgressQty: 100,
              goodBufferQty: Math.round(wipStock * 0.4),
              scrapQty: 5,
              normScrapPercent: 0.5,
            },
            {
              stepCode: 'OP20_FORM',
              stepName: 'فرم‌دهی و پرسکاری قطعه نیمه‌ساخته',
              processType: 'BLANKING',
              machineName: 'پرس ضربه‌ای ۲۵۰ تن',
              hallName: 'سالن پرس‌ها',
              waitingInputQty: 100,
              inProgressQty: 150,
              goodBufferQty: Math.round(wipStock * 0.6),
              scrapQty: 10,
              normScrapPercent: 0.8,
            },
          ],
        };
      });
    }

    return [];
  }, [order, matchedBom, issuedSubMos]);

  const overallShortages = useMemo(() => {
    return subComponents.filter(c => c.shortageQty > 0 && !c.subMoIssued);
  }, [subComponents]);

  const canProceed = overallShortages.length === 0;

  const handleIssueSingleSubMo = (row: SubComponentInspectionRow) => {
    const shortageAmount = row.shortageQty > 0 ? row.shortageQty : row.totalRequiredQty;
    const cleanCode = row.partCode.replace(/[^A-Za-z0-9]/g, '').slice(-6);
    const subMoCode = `SUB-MO-1404-${cleanCode}-${Math.floor(100 + Math.random() * 900)}`;

    setIssuedSubMos(prev => ({
      ...prev,
      [row.id]: { code: subMoCode, qty: shortageAmount },
    }));

    if (onIssueSubMo) {
      onIssueSubMo({
        parentMoId: order.id,
        parentOrderCode: order.orderCode,
        componentPartId: row.partId,
        componentPartCode: row.partCode,
        componentPartName: row.partName,
        requiredQty: shortageAmount,
        subRoutingId: row.subRoutingId,
      });
    }
  };

  const handleIssueAllMissingSubMos = () => {
    overallShortages.forEach(row => {
      if (row.subMoRequired) {
        handleIssueSingleSubMo(row);
      }
    });
  };

  const toggleExpand = (rowId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wip-preflight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                کنترل ارزیابی پیش‌نیازها و موجودی بین‌مراحل (Material Availability Check)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/10 text-slate-200 border border-white/20">
                دستور کار: {order.orderCode}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                بچ: {order.productionBatchCode}
              </span>
            </div>

            <h2 id="wip-preflight-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>ارزیابی درختی BOM و موجودی قطعات نیمه‌ساخته (WIP) پیش از صدور دستور کار</span>
            </h2>

            <p className="text-xs text-slate-300">
              بررسی همزمان نیاز درختی محصول، موجودی انبار نیمه‌ساخته، موجودی بافر پای خط و امکان صدور مستقیم دستور کار فرعی (Sub-MO)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="بستن فرم"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* EXECUTIVE KPI BAR                                                 */}
        {/* ================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">تیراژ درخواستی دستور کار:</div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatNumber(order.orderQty)} <span className="text-xs text-slate-500 font-normal">عدد</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                canProceed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">قطعات نیمه‌ساخته درختی:</div>
              <div className="text-xs font-bold text-slate-900">
                {subComponents.filter(c => c.componentType === 'SUB_ASSEMBLY').length} قطعه پیش‌ساخته فرعی
              </div>
              <div className="text-[11px] text-slate-500">
                {subComponents.filter(c => c.shortageQty === 0).length} قطعه پوشش کامل ۱۰۰٪
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">کلاف و شماره ذوب رسمی:</div>
              <div className="text-xs font-bold text-amber-800 font-mono">
                {order.heatNumber || 'HT-99412-MOB'}
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                موجود: {formatNumber(order.warehouseAvailableKg || 18500)} کیلوگرم
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border shadow-2xs flex items-center gap-3 ${
              canProceed
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                canProceed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {canProceed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[11px] font-bold">وضعیت تایید پیش‌نیازها:</div>
              <div className="text-xs font-bold">
                {canProceed ? 'آماده صدور و ابلاغ به خط 🟢' : `${toPersianDigits(overallShortages.length)} مورد کسری پیش‌ساخته ❌`}
              </div>
              <div className="text-[10px]">
                {canProceed ? 'تمام قطعات پیش‌ساخته آماده هستند' : 'از دکمه روبروی هر سطر برای صدور Sub-MO استفاده کنید'}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TREE-VIEW & MATERIAL AVAILABILITY CHECK                           */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  نمای درختی ساختار محصول (Hierarchical BOM Tree) و موازنه موجودی بین‌مراحل:
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900">
                  برای تولید مجموعه نهایی، قطعات نیمه‌ساخته باید به میزان ضریب مصرف در تیراژ هدف موجود باشند.
                  در جدول درختی زیر، موجودی انبار نیمه‌ساخته و موجودی در جریان پای کار سالن‌ها (WIP) به صورت تفکیک‌شده نمایش داده شده است.
                  در صورت کسری، دقیقاً روبروی قطعه دکمه <strong>«صدور دستور تولید فرعی (Sub-MO)»</strong> قرار دارد تا بدون ترک این صفحه کسری را برطرف نمایید.
                </p>
              </div>
            </div>

            {overallShortages.length > 0 && (
              <button
                type="button"
                onClick={handleIssueAllMissingSubMos}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>صدور خودکار کلیه Sub-MO های دارای کسری</span>
              </button>
            )}
          </div>

          {/* HIERARCHICAL TREE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
            {/* 1. ROOT NODE: PARENT ASSEMBLY */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]">
                      محصول نهایی (Parent Assembly)
                    </span>
                    <span className="font-mono text-slate-300 text-xs">
                      {order.partCode}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {order.partName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left font-mono">
                <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-center">
                  <div className="text-[10px] text-slate-400">تیراژ هدف دستور کار</div>
                  <div className="text-base font-bold text-emerald-400">
                    {formatNumber(order.orderQty)} عدد
                  </div>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-center">
                  <div className="text-[10px] text-slate-400">شماره دستور تولید (MO)</div>
                  <div className="text-xs font-bold text-slate-200">
                    {order.orderCode}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TREE BRANCHES (CHILDREN NODES) */}
            <div className="mr-4 sm:mr-6 pr-4 sm:pr-6 border-r-2 border-indigo-200 space-y-4">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <span>اجزای متشکله پیش‌ساخته، قطعات نیمه‌ساخته و اتصالات درختی (Child Components):</span>
              </div>

              {subComponents.map((component, idx) => {
                const isSubMoIssued = component.subMoIssued || Boolean(issuedSubMos[component.id]);
                const currentSubMoCode = component.issuedSubMoCode || issuedSubMos[component.id]?.code;
                const isExpanded = Boolean(expandedStages[component.id]);

                return (
                  <div
                    key={component.id}
                    className={`rounded-xl border p-4 transition-all ${
                      component.shortageQty === 0
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : isSubMoIssued
                        ? 'bg-indigo-50/40 border-indigo-200'
                        : 'bg-amber-50/40 border-amber-300 shadow-2xs'
                    }`}
                  >
                    {/* Node Header Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            component.componentType === 'SUB_ASSEMBLY'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : component.componentType === 'FASTENER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {component.componentType === 'SUB_ASSEMBLY' ? '⚙️' : component.componentType === 'FASTENER' ? '🔩' : '🛢️'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">
                              {component.partName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({component.partCode})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                              ضریب BOM: {toPersianDigits(component.quantityPerAssembly)} {component.unit}
                            </span>
                            {component.subRoutingId && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200">
                                مسیر: {component.subRoutingId}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1">
                            {component.componentType === 'SUB_ASSEMBLY'
                              ? 'قطعه نیمه‌ساخته پرسی نیازمند عملیات نواربری، بلنک، خم‌کاری و پرس‌جوش'
                              : component.componentType === 'FASTENER'
                              ? 'اقلام استاندارد خودرویی نیازمند تأمین انبار قطعات استاندارد'
                              : 'مواد اولیه پایه'}
                          </div>
                        </div>
                      </div>

                      {/* FAST ACTION BUTTON (DIRECT SUB-MO ISSUANCE) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {component.subMoRequired ? (
                          isSubMoIssued ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>دستور ساخت فرعی صادر شد: {currentSubMoCode}</span>
                            </span>
                          ) : component.shortageQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleIssueSingleSubMo(component)}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              <span>صدور دستور تولید فرعی (Sub-MO) به تیراژ {formatNumber(component.shortageQty)} عدد</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              <span>موجودی تکمیل و پوشش ۱۰۰٪</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            تأمین از انبار اتصالات
                          </span>
                        )}
                      </div>
                    </div>

                    {/* QUANTITATIVE BALANCE GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 mt-3 border-t border-slate-200/80 text-xs font-mono">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">نیاز کل برای این بچ</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatNumber(component.totalRequiredQty)} {component.unit}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">موجودی انبار نیمه‌ساخته</span>
                        <span className="text-sm font-bold text-slate-700">
                          {formatNumber(component.warehouseStockQty)} {component.unit}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">WIP پای خط (بین‌ایستگاهی)</span>
                        <span className="text-sm font-bold text-indigo-700">
                          {formatNumber(component.interStageWipQty)} {component.unit}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-sans block">کل موجودی قابل‌اتکا</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatNumber(component.totalAvailableQty)} {component.unit}
                        </span>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border text-center ${
                          component.shortageQty === 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <span className="text-[10px] font-sans block">وضعیت کسری / مازاد</span>
                        <span className="text-sm font-bold">
                          {component.shortageQty === 0 ? (
                            `تکمیل 🟢`
                          ) : (
                            `کسری: -${formatNumber(component.shortageQty)} عدد`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* COLLAPSIBLE STAGES BREAKDOWN */}
                    {component.stages && component.stages.length > 0 && (
                      <div className="mt-3 pt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(component.id)}
                          className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer select-none"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>
                            {isExpanded
                              ? `بستن جزئیات ایستگاه‌های مسیر تولید (${toPersianDigits(component.stages.length)} ایستگاه)`
                              : `مشاهده تفکیک موجودی بین‌مراحل (WIP) در خطوط (${toPersianDigits(component.stages.length)} ایستگاه)`}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-2 pt-2 border-t border-slate-100">
                            {component.stages.map(stage => (
                              <div
                                key={stage.stepCode}
                                className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-1 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold text-[9px]">
                                    {stage.stepCode}
                                  </span>
                                  <span className="text-emerald-700 font-mono font-bold text-[10px]">
                                    بافر: {formatNumber(stage.goodBufferQty)}
                                  </span>
                                </div>
                                <div className="font-bold text-slate-800 truncate" title={stage.stepName}>
                                  {stage.stepName}
                                </div>
                                <div className="text-slate-400 truncate" title={stage.machineName}>
                                  {stage.machineName}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 3. RAW MATERIAL COIL NODE */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      🛢️
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        کویل ورق سرد روغنی پایه (DC01A ضخامت 2.0 میلیمتر عرض 1140)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        کلاف: <strong>{order.coilNumber || 'MOB-2025-DC01-409'}</strong> · شماره ذوب:{' '}
                        <strong className="text-amber-800">{order.heatNumber || 'HT-99412-MOB'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-mono text-xs">
                    <div className="font-bold text-slate-900">
                      مصرف ناخالص کل: {formatNumber(Math.round(order.orderQty * (order.unitWeightKg || 1.25) * 1.035))} کیلوگرم
                    </div>
                    <div className="text-emerald-700 font-semibold text-[11px]">
                      موجودی آزاد انبار رول: {formatNumber(order.warehouseAvailableKg || 18500)} کیلوگرم 🟢
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS                                                    */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                canProceed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {canProceed
                ? 'کلیه پیش‌نیازها و موجودی قطعات پیش‌ساخته تایید شدند. آماده صدور نهایی دستور کار.'
                : 'برای ردیف‌های دارای کسری، روی دکمه «صدور دستور تولید فرعی» کلیک کنید یا با پذیرش ریسک ادامه دهید.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              انصراف / ویرایش مشخصات
            </button>

            {onConfirmIssueOrder && (
              <button
                type="button"
                onClick={() => {
                  onConfirmIssueOrder(order);
                  onClose();
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  canProceed
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {canProceed
                    ? 'تایید نهایی و صدور دستور تولید اصلی (Confirm MO)'
                    : 'تایید و صدور دستور تولید همراه با Sub-MOهای صادره'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
