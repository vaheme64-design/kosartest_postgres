import React from 'react';
import {
  Boxes,
  Layers,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ExternalLink,
  Flame,
  Check,
} from 'lucide-react';
import { HighwayPartScenario } from './FactoryHighwayWorkbench';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface SubComponentWipPreflightCardProps {
  order: HighwayPartScenario;
  onOpenFullInspectionModal: () => void;
  onQuickIssueSubMo?: (partCode: string, partName: string, requiredQty: number) => void;
}

export const SubComponentWipPreflightCard: React.FC<SubComponentWipPreflightCardProps> = ({
  order,
  onOpenFullInspectionModal,
  onQuickIssueSubMo,
}) => {
  const isEcuBracket =
    order.partCode?.includes('ECU') ||
    order.partName?.includes('ECU') ||
    order.partName?.includes('ضدسرقت');

  const isTaraBracket =
    order.partCode?.includes('TARA') || order.partName?.includes('تارا');

  // If this part doesn't have sub-components, return simple helper
  if (!isEcuBracket && !isTaraBracket && !order.bomSubComponents?.length) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>تولید تک‌مرحله‌ای (فاقد قطعات پیش‌ساخته فرعی)</span>
        </div>
        <button
          type="button"
          onClick={onOpenFullInspectionModal}
          className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <span>بررسی جریان بین‌مراحل (WIP)</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Realistic stock calculations for ECU Bracket
  const orderQty = Math.max(1, order.orderQty || 1000);
  const mainPartRequired = orderQty;
  const mainPartAvail = 1200 + 1500; // Wh (1200) + Floor WIP (1500)
  const mainShortage = Math.max(0, mainPartRequired - mainPartAvail);

  const compPartRequired = orderQty;
  const compPartAvail = 900 + 800; // Wh (900) + Floor WIP (800)
  const compShortage = Math.max(0, compPartRequired - compPartAvail);

  const hasShortage = mainShortage > 0 || compShortage > 0;

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 border border-indigo-200 text-xs space-y-3 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-indigo-600 text-white">
            <Boxes className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="font-bold text-slate-900 block text-xs">
              موجودی قطعات پیش‌ساخته و موجودی بین‌مراحل (WIP Pre-Flight)
            </span>
            <span className="text-[10px] text-slate-500">
              ارزیابی برخط بدون نیاز به مراجعه به سایر بخش‌های نرم‌افزار
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFullInspectionModal}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
        >
          <span>فرم جامع ارزیابی بین‌مراحل</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Sub-Components Quick Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Component 1: Main Plate */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-[11px]">
              ۱. صفحه براکت اصلی (WIP-ECU-MAIN)
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
              ۱ در هر مجموعه
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">نیاز بچ:</span>
              <span className="font-bold text-slate-900">{formatNumber(mainPartRequired)}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">موجود (انبار+پای خط):</span>
              <span className="font-bold text-indigo-700">{formatNumber(mainPartAvail)}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">وضعیت:</span>
              {mainShortage === 0 ? (
                <span className="font-bold text-emerald-700">تکمیل 🟢</span>
              ) : (
                <span className="font-bold text-rose-600">کسری: {formatNumber(mainShortage)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
            <span className="text-slate-500 font-mono">
              بافر پای پرس‌جوش: <strong>۱,۵۰۰ عدد</strong>
            </span>
            {mainShortage > 0 && onQuickIssueSubMo && (
              <button
                type="button"
                onClick={() =>
                  onQuickIssueSubMo(
                    'WIP-ECU-MAIN-BRK',
                    'صفحه براکت اصلی ضدسرقت',
                    mainShortage
                  )
                }
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>صدور Sub-MO</span>
              </button>
            )}
          </div>
        </div>

        {/* Component 2: Complementary Plate */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-[11px]">
              ۲. مکمل براکت ضدسرقت (WIP-ECU-COMP)
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
              ۱ در هر مجموعه
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">نیاز بچ:</span>
              <span className="font-bold text-slate-900">{formatNumber(compPartRequired)}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">موجود (انبار+پای خط):</span>
              <span className="font-bold text-indigo-700">{formatNumber(compPartAvail)}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-slate-400 block">وضعیت:</span>
              {compShortage === 0 ? (
                <span className="font-bold text-emerald-700">تکمیل 🟢</span>
              ) : (
                <span className="font-bold text-rose-600">کسری: {formatNumber(compShortage)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
            <span className="text-slate-500 font-mono">
              بافر پای پرس‌جوش: <strong>۸۰۰ عدد</strong>
            </span>
            {compShortage > 0 && onQuickIssueSubMo && (
              <button
                type="button"
                onClick={() =>
                  onQuickIssueSubMo(
                    'WIP-ECU-COMP-BRK',
                    'مکمل براکت ضدسرقت',
                    compShortage
                  )
                }
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>صدور Sub-MO</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Raw Material + Fasteners Summary Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">مواد و اتصالات:</span>
          <span className="font-mono text-slate-700">
            ورق DC01A ذوب <strong className="text-amber-800">{order.heatNumber || 'HT-99412-MOB'}</strong> (موجود:{' '}
            {formatNumber(order.warehouseAvailableKg || 18500)} ک.گ)
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-emerald-700 font-semibold">
            مهره M6: ۴۵,۰۰۰ عدد 🟢
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasShortage ? (
            <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              <span>کسری قطعه پیش‌ساخته برای تیراژ کامل</span>
            </span>
          ) : (
            <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>پوشش کامل قطعات پیش‌ساخته</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
