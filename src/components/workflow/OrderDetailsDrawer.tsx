import React, { useState } from 'react';
import {
  X,
  Tag,
  GitBranch,
  Sliders,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Compass,
  Boxes,
  AlertTriangle,
  Edit3,
  Trash2,
  Plus,
  Lock,
  CheckCircle2,
  Pin,
  Truck,
  Layers,
  FileCheck2,
  ArrowUpRight,
  Hammer,
  Flame,
  Cpu,
  History,
} from 'lucide-react';
import {
  HighwayPartScenario,
  HighwayOperationStep,
} from './FactoryHighwayWorkbench';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { AuditTrailTabContent, useEnterpriseUx } from '../../context/EnterpriseUxContext';

export type DrawerTabKey = 'TRACEABILITY' | 'ROUTING' | 'ACTIONS' | 'AUDIT_TRAIL' | 'WIP_INSPECTION';

interface OrderDetailsDrawerProps {
  order: HighwayPartScenario | null;
  isOpen: boolean;
  initialTab?: DrawerTabKey;
  onClose: () => void;
  onCompleteProduction: (order: HighwayPartScenario) => void;
  onDispatchFinishedGoods: (order: HighwayPartScenario) => void;
  onToggleLineStop: (order: HighwayPartScenario) => void;
  onIssueSheet: (order: HighwayPartScenario) => void;
  onOpenStepLogger: (order: HighwayPartScenario, opIndex: number) => void;
  onOpenAddOp: (order: HighwayPartScenario) => void;
  onOpenEditOp: (order: HighwayPartScenario, opIndex: number, op: HighwayOperationStep) => void;
  onDeleteOp: (orderId: string, opIndex: number) => void;
  onOpenTrackModal: (orderId: string) => void;
  onOpenEditOrder: (order: HighwayPartScenario) => void;
  onDeleteOrder: (order: HighwayPartScenario) => void;
  onTogglePin: (orderId: string) => void;
  onNavigateToSapco?: () => void;
  onOpenWipInspection?: (order: HighwayPartScenario) => void;
}

export const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({
  order,
  isOpen,
  initialTab = 'TRACEABILITY',
  onClose,
  onCompleteProduction,
  onDispatchFinishedGoods,
  onToggleLineStop,
  onIssueSheet,
  onOpenStepLogger,
  onOpenAddOp,
  onOpenEditOp,
  onDeleteOp,
  onOpenTrackModal,
  onOpenEditOrder,
  onDeleteOrder,
  onTogglePin,
  onNavigateToSapco,
  onOpenWipInspection,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTabKey>(initialTab);
  const { openQuickEditDrawer } = useEnterpriseUx();

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, order?.id]);

  if (!isOpen || !order) return null;

  const isCompleted = order.status === 'COMPLETED';
  const isHalted = order.status === 'HALTED';
  const lastOp = order.operations[order.operations.length - 1];
  const finishedQty = lastOp ? lastOp.completedGood : 0;
  const progressPct = Math.min(
    100,
    Math.round((finishedQty / Math.max(1, order.orderQty)) * 100)
  );
  const totalScrapQty = order.operations.reduce((sum, op) => sum + (op.scrapQty || 0), 0);

  const netWeightKg = Math.round(order.orderQty * order.unitWeightKg);
  const grossRequiredKg = Math.round(
    netWeightKg * (1 + order.scrapAllowancePct / 100)
  );

  const activeOpIndex = order.operations.findIndex(
    op => op.completedGood < order.orderQty
  );
  const currentOpIdx = activeOpIndex >= 0 ? activeOpIndex : order.operations.length - 1;
  const currentOp = order.operations[currentOpIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[2px] animate-in fade-in"
      dir="rtl"
      onClick={onClose}
    >
      {/* Slide-Over Panel (Opens from Left in RTL layout so Master Table stays visible on Right) */}
      <div
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col justify-between overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ================================================================ */}
        {/* 1. STICKY DRAWER HEADER (SAP Fiori Object Header Style)          */}
        {/* ================================================================ */}
        <div className="sticky top-0 z-20 p-5 border-b border-slate-200 bg-white/95 backdrop-blur-xs shadow-2xs space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900 tracking-tight">
                  {order.orderCode}
                </span>

                {isCompleted ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تکمیل و رسید انبار</span>
                  </span>
                ) : isHalted ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>توقف خط (HALTED)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                    در جریان ({currentOp?.stepCode || 'OP10'})
                  </span>
                )}

                {order.contractCode && (
                  <span className="text-[11px] font-mono text-slate-500">
                    · قرارداد: {order.contractCode}
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {order.partName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono">{order.partCode}</span>
                <span>·</span>
                <span>{order.carModel}</span>
                <span>·</span>
                <span>مشتری: {order.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onTogglePin(order.id)}
                title={order.isPinned ? 'حذف نشانه‌گذاری VIP' : 'نشانه‌گذاری به عنوان قطعه کلیدی (VIP)'}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  order.isPinned
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                <Pin className={`w-4 h-4 ${order.isPinned ? 'fill-amber-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="بستن کشوی جزئیات"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact Progress Summary Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                پیشرفت تحویل محصول نهایی به انبار:
              </span>
              <div className="font-mono font-bold text-slate-900 tabular-nums">
                {formatNumber(finishedQty)} از {formatNumber(order.orderQty)} عدد (
                {toPersianDigits(progressPct)}٪)
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isCompleted
                    ? 'bg-emerald-600'
                    : isHalted
                    ? 'bg-rose-500'
                    : 'bg-slate-900'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Segmented 5-Tab Navigation (Includes WIP & Sub-Components and Enterprise Audit Trail) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-200/75 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('TRACEABILITY')}
              className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'TRACEABILITY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">رهگیری</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ROUTING')}
              className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ROUTING'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">مسیر ({toPersianDigits(order.operations.length)} OP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WIP_INSPECTION')}
              className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'WIP_INSPECTION'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">موجودی بین‌مراحل (WIP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIONS')}
              className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ACTIONS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">عملیات خط</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT_TRAIL')}
              className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'AUDIT_TRAIL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">ممیزی (Audit)</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 2. DRAWER BODY CONTENT                                           */}
        {/* ================================================================ */}
        <div className="flex-1 p-5 space-y-5 text-xs">
          {/* -------------------------------------------------------------- */}
          {/* TAB 1: TRACEABILITY (شماره ذوب، بچ تولید، اطلاعات کلاف و BOM)   */}
          {/* -------------------------------------------------------------- */}
          {activeTab === 'TRACEABILITY' && (
            <div className="space-y-4">
              {/* Primary Traceability Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="text-[11px] font-semibold">شماره ذوب (Heat No)</span>
                    <Flame className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    {order.heatNumber || 'HT-99412-MOB'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToSapco?.();
                    }}
                    className="text-[11px] text-amber-800 hover:underline font-semibold flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>استعلام شجره‌نامه ذوب</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-semibold">شماره بچ تولید</span>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="font-mono text-sm font-bold text-indigo-900">
                    {order.productionBatchCode}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pt-1">
                    بچ ساپکو: {order.sapcoBatchNumber || 'BCH-SAP-1404'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-semibold">شماره کلاف (Coil No)</span>
                    <Cpu className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    {order.coilNumber || 'MOB-2025-DC01'}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 truncate">
                    {order.rawMaterialCode}
                  </div>
                </div>
              </div>

              {/* Coil & Sheet Specification Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      مشخصات ورق مصرفی و وضعیت تخصیص انبار
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {order.rawMaterialName}
                    </p>
                  </div>
                  {order.materialIssuedVoucherNo ? (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold">
                      حواله: {order.materialIssuedVoucherNo}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onIssueSheet(order)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      صدور حواله ورق به خط
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <div className="text-[11px] text-slate-500">وزن واحد قطعه</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {toPersianDigits(order.unitWeightKg)} ک.گ
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <div className="text-[11px] text-slate-500">نیاز ناخالص ورق (با پرت)</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {formatNumber(grossRequiredKg)} ک.گ
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <div className="text-[11px] text-slate-500">موجودی کلاف در انبار</div>
                    <div className="font-mono font-bold text-emerald-700 mt-0.5">
                      {formatNumber(order.warehouseAvailableKg)} ک.گ
                    </div>
                  </div>
                </div>
              </div>

              {/* BOM Tree Components */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900">
                  درخت محصول و اقلام مصرفی (BOM) برای تیراژ {formatNumber(order.orderQty)} عدد
                </div>
                <div className="divide-y divide-slate-100">
                  {order.bomSubComponents.map((sub, i) => (
                    <div
                      key={i}
                      className="py-2.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{sub.name}</div>
                        <div className="text-[11px] text-slate-400">
                          ایستگاه مصرف: {sub.stage} · ضریب: {toPersianDigits(sub.qtyPerParent)} {sub.unit}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatNumber(sub.qtyPerParent * order.orderQty)} {sub.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 2: ROUTING (نمای تایم‌لاین عمودی مراحل OP و وضعیت ایستگاه‌ها) */}
          {/* -------------------------------------------------------------- */}
          {activeTab === 'ROUTING' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    تایم‌لاین مسیر تولید (Vertical Routing Timeline)
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      <span>تکمیل‌شده</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-100 inline-block" />
                      <span>ایستگاه فعلی</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                      <span>ایستگاه بعدی</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAddOp(order)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن OP</span>
                </button>
              </div>

              {/* Vertical Timeline Container */}
              <div className="relative pr-1">
                {order.operations.map((op, idx) => {
                  const prevOp = idx > 0 ? order.operations[idx - 1] : null;
                  const isLocked = prevOp !== null && prevOp.completedGood === 0;
                  const isStepDone = op.completedGood >= order.orderQty;
                  const isCurrentActive = idx === currentOpIdx && !isCompleted && !isStepDone;
                  const isLastStep = idx === order.operations.length - 1;
                  const opPct = Math.min(
                    100,
                    Math.round((op.completedGood / Math.max(1, order.orderQty)) * 100)
                  );
                  const availableInBuffer = prevOp
                    ? Math.max(0, prevOp.completedGood - op.completedGood)
                    : Math.max(0, order.orderQty - op.completedGood);

                  return (
                    <div
                      key={op.stepCode + idx}
                      className="relative flex items-stretch gap-4"
                    >
                      {/* Right Timeline Column: Colored Circle Node + Vertical Connector Line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-all z-10 ${
                            isStepDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isCurrentActive
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs'
                              : 'bg-slate-100 text-slate-500 border-2 border-slate-300'
                          }`}
                          title={
                            isStepDone
                              ? 'مرحله تکمیل‌شده'
                              : isCurrentActive
                              ? 'ایستگاه فعال فعلی'
                              : 'ایستگاه بعدی'
                          }
                        >
                          {isStepDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span>{toPersianDigits(idx + 1)}</span>
                          )}
                        </div>

                        {!isLastStep && (
                          <div
                            className={`w-0.5 flex-1 my-1 rounded-full ${
                              isStepDone
                                ? 'bg-emerald-500'
                                : isCurrentActive
                                ? 'bg-gradient-to-b from-indigo-500 to-slate-200'
                                : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      {/* Left Timeline Card */}
                      <div className={`flex-1 ${isLastStep ? 'pb-1' : 'pb-4'}`}>
                        <div
                          className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                            isCurrentActive
                              ? 'bg-indigo-50/35 border-indigo-300 shadow-2xs'
                              : isStepDone
                              ? 'bg-emerald-50/20 border-emerald-200'
                              : isLocked
                              ? 'bg-slate-50/70 border-slate-200 opacity-80'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                    isStepDone
                                      ? 'bg-emerald-600 text-white'
                                      : isCurrentActive
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {op.stepCode}
                                </span>
                                <span className="font-bold text-slate-900">{op.stepName}</span>
                                {isStepDone && (
                                  <span className="text-[10px] font-bold text-emerald-700">
                                    · تکمیل‌شده
                                  </span>
                                )}
                                {isCurrentActive && (
                                  <span className="text-[10px] font-bold text-indigo-700">
                                    · ایستگاه فعلی در حال کار
                                  </span>
                                )}
                                {!isStepDone && !isCurrentActive && (
                                  <span className="text-[10px] font-medium text-slate-400">
                                    · ایستگاه بعدی
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                {op.hall} · دستگاه:{' '}
                                <strong className="text-slate-700">{op.machineName}</strong> · قالب:{' '}
                                <span className="font-mono text-slate-700">{op.dieName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isLocked ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenStepLogger(order, idx)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-medium flex items-center gap-1 cursor-not-allowed"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>قفل ({prevOp?.stepCode})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenStepLogger(order, idx)}
                                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                                    isCurrentActive
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                                  }`}
                                >
                                  ثبت کارکرد
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onOpenEditOp(order, idx, op)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                title="ویرایش ایستگاه"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {order.operations.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteOp(order.id, idx)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="حذف مرحله"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Step Progress Bar & Metrics */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-slate-600">
                                  آماده در بافر:{' '}
                                  <strong className="text-slate-900">
                                    {formatNumber(availableInBuffer)}
                                  </strong>
                                </span>
                                <span className="text-emerald-700 font-bold">
                                  تولید سالم: {formatNumber(op.completedGood)} /{' '}
                                  {formatNumber(order.orderQty)}
                                </span>
                                {op.scrapQty > 0 && (
                                  <span className="text-rose-600 font-bold">
                                    ضایعات: {formatNumber(op.scrapQty)}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-semibold text-slate-600">
                                {toPersianDigits(opPct)}٪
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isStepDone
                                    ? 'bg-emerald-600'
                                    : isCurrentActive
                                    ? 'bg-indigo-600'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${opPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 3: ACTIONS (عملیات: صدور رسید، توقف خط، پیگیری، ضایعات)     */}
          {/* -------------------------------------------------------------- */}
          {activeTab === 'ACTIONS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Complete Production & Issue Receipt */}
                {!isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onCompleteProduction(order)}
                    className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-right flex items-start justify-between gap-3 transition-colors cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-sm">اتمام تولید و صدور رسید انبار</div>
                      <div className="text-[11px] text-emerald-100 mt-1">
                        ثبت تحویل محصول نهایی در انبار و انتقال به دستورات تکمیل‌شده
                      </div>
                    </div>
                    <PackageCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDispatchFinishedGoods(order)}
                    className="p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-right flex items-start justify-between gap-3 transition-colors cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-sm">صدور حواله خروج به ساپکو</div>
                      <div className="text-[11px] text-indigo-100 mt-1">
                        بارگیری و کسر موجودی از انبار محصول نهایی برای مشتری
                      </div>
                    </div>
                    <Truck className="w-5 h-5 shrink-0 mt-0.5" />
                  </button>
                )}

                {/* 2. Line Stop / Resume Action */}
                <button
                  type="button"
                  onClick={() => onToggleLineStop(order)}
                  className={`p-4 rounded-xl border text-right flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                    isHalted
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-950'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">
                      {isHalted ? 'رفع توقف و راه‌اندازی مجدد خط' : 'اعلام توقف خط (Line Stop)'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-1">
                      {isHalted
                        ? 'بازگرداندن وضعیت دستور تولید به حالت فعال در ایستگاه جاری'
                        : 'تعلیق موقت دستور به علت تعمیرات قالب، کسری ورق یا کنترل کیفیت'}
                    </div>
                  </div>
                  {isHalted ? (
                    <PlayCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <PauseCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                </button>

                {/* 3. Log Station Output / Scrap */}
                <button
                  type="button"
                  onClick={() => onOpenStepLogger(order, currentOpIdx)}
                  className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-right flex items-start justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      ثبت تولید و ضایعات ایستگاه ({currentOp?.stepCode || 'OP10'})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      مجموع ضایعات ثبت‌شده تا این لحظه: {formatNumber(totalScrapQty)} عدد
                    </div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                </button>

                {/* 4. Issue Raw Material Sheet Voucher */}
                <button
                  type="button"
                  onClick={() => onIssueSheet(order)}
                  className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-right flex items-start justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {order.materialIssuedVoucherNo ? 'صدور مجدد حواله ورق' : 'صدور حواله ورق از انبار'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      کلاف {order.coilNumber} · ذوب {order.heatNumber} ({formatNumber(grossRequiredKg)} ک.گ)
                    </div>
                  </div>
                  <Boxes className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                </button>

                {/* 5. Full End-to-End Tracker */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTrackModal(order.id);
                  }}
                  className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-right flex items-start justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      پنجره جامع پیگیری زنجیره دستور
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      مشاهده دیاگرام ۳ مرحله‌ای از حواله کلاف تا رسید محصول
                    </div>
                  </div>
                  <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                </button>

                {/* 6. Edit / Delete Order */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditOrder(order);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش دستور (MO)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteOrder(order);
                    }}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="حذف دستور تولید"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>

              {/* Command & Voucher History Log */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-500" />
                  <span>کارنامه اسناد و دستورات صادرشده ({toPersianDigits((order.commandLogs || []).length)})</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {(order.commandLogs || []).length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      هنوز سندی برای این دستور ثبت نشده است.
                    </div>
                  ) : (
                    (order.commandLogs || []).map(log => (
                      <div
                        key={log.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 ml-1.5">
                            [{log.docNumber}]
                          </span>
                          <span className="font-semibold text-slate-800">{log.title}</span>
                          <span className="text-slate-400 mr-1.5">({log.targetStation})</span>
                        </div>
                        <div className="font-mono text-slate-500 shrink-0">
                          {log.qtyOrWeight} · {log.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 4: AUDIT TRAIL (تاریخچه تغییرات و لاگ‌های ممیزی دستور کار)   */}
          {/* -------------------------------------------------------------- */}
          {activeTab === 'AUDIT_TRAIL' && (
            <div className="space-y-4">
              <AuditTrailTabContent
                entityId={order.id}
                entityCode={order.orderCode}
              />

              {/* Also display detailed voucher/command logs for this order */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-500" />
                  <span>اسناد سیستمی و حواله‌های صادرشده این دستور ({toPersianDigits((order.commandLogs || []).length)})</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {(order.commandLogs || []).map(log => (
                    <div
                      key={log.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 ml-1.5">
                          [{log.docNumber}]
                        </span>
                        <span className="font-semibold text-slate-800">{log.title}</span>
                        <span className="text-slate-400 mr-1.5">({log.targetStation})</span>
                      </div>
                      <div className="font-mono text-slate-500 shrink-0">
                        {log.qtyOrWeight} · {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 5: WIP & SUB-COMPONENTS INSPECTION                         */}
          {/* -------------------------------------------------------------- */}
          {activeTab === 'WIP_INSPECTION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-purple-300" />
                    <span>موجودی بین‌مراحل (WIP) و موازنه قطعات پیش‌ساخته / نیمه‌ساخته</span>
                  </h4>
                  <p className="text-xs text-purple-200 mt-0.5">
                    بررسی تفکیکی موجودی انبار نیمه‌ساخته، بافر بین‌ایستگاهی پای پرس و اتصالات
                  </p>
                </div>
                {onOpenWipInspection && (
                  <button
                    type="button"
                    onClick={() => onOpenWipInspection(order)}
                    className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <span>فرم جامع ارزیابی بین‌مراحل 🔍</span>
                  </button>
                )}
              </div>

              {/* Sub-Components Matrix Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>قطعات پیش‌ساخته تشکیل‌دهنده طبق ساختار محصول (BOM):</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    تیراژ دستور کار: {formatNumber(order.orderQty)} عدد
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        ۱. صفحه براکت اصلی (WIP-ECU-MAIN-BRK)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ورق DC01A ضخامت 2mm · ۱۵ مهره جوشی M6
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">نیاز بچ</span>
                        <span className="font-bold text-slate-900">{formatNumber(order.orderQty)}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">موجودی کل</span>
                        <span className="font-bold text-indigo-700">{formatNumber(1200 + 1500)}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">وضعیت</span>
                        <span className="font-bold text-emerald-700">تکمیل 🟢</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        ۲. مکمل براکت ضدسرقت (WIP-ECU-COMP-BRK)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ورق DC01A ضخامت 2mm · ۲ پیچ جوشی M6x20
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">نیاز بچ</span>
                        <span className="font-bold text-slate-900">{formatNumber(order.orderQty)}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">موجودی کل</span>
                        <span className="font-bold text-indigo-700">{formatNumber(900 + 800)}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">وضعیت</span>
                        <span className="font-bold text-emerald-700">تکمیل 🟢</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 3. DRAWER FOOTER                                                 */}
        {/* ================================================================ */}
        <div className="sticky bottom-0 z-20 p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenStepLogger(order, currentOpIdx)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Hammer className="w-3.5 h-3.5 text-emerald-400" />
              <span>ثبت سریع کارکرد ({currentOp?.stepCode || 'OP10'})</span>
            </button>
            {!isCompleted && (
              <button
                type="button"
                onClick={() => onCompleteProduction(order)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>اتمام و رسید انبار</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
