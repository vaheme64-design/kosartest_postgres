import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  Cpu,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  Calendar,
} from 'lucide-react';
import { toPersianDigits } from '../../utils/formatters';

interface OverlapOrderDetail {
  orderNumber: string;
  itemName: string;
  opCode: string;
  startTime: string;
  endTime: string;
  setupTimeMin: number;
}

interface MachineOverlapItem {
  id: string;
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  hallLocation: string;
  orderA: OverlapOrderDetail;
  orderB: OverlapOrderDetail;
  overlapMinutes: number;
  overlapHours: number;
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  recommendation: string;
}

interface MachineOverlapAlertWidgetProps {
  compact?: boolean;
  onNavigateToCapacity?: () => void;
}

export const MachineOverlapAlertWidget: React.FC<MachineOverlapAlertWidgetProps> = ({
  compact = false,
  onNavigateToCapacity,
}) => {
  const [overlaps, setOverlaps] = useState<MachineOverlapItem[]>([]);
  const [totalWorkOrdersChecked, setTotalWorkOrdersChecked] = useState<number>(0);
  const [totalOperationsScheduled, setTotalOperationsScheduled] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverlaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/erp-services/capacity-overlaps');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'خطا در بررسی تداخل ظرفیت ماشین‌آلات');
      }
      setOverlaps(json.overlaps || []);
      setTotalWorkOrdersChecked(json.totalWorkOrdersChecked || 0);
      setTotalOperationsScheduled(json.totalOperationsScheduled || 0);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'خطای ارتباط با سرور ظرفیت‌سنجی');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverlaps();
  }, [fetchOverlaps]);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xs space-y-3.5 transition ${
        overlaps.length > 0
          ? 'bg-amber-50/40 border-amber-300/90'
          : 'bg-white border-slate-200'
      }`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              overlaps.length > 0
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {overlaps.length > 0 ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                پایش هوشمند تداخل ظرفیت ماشین‌آلات (CapacityPlanningService)
              </h3>
              {overlaps.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {toPersianDigits(overlaps.length)} هشدار تداخل زمان‌بندی
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              بررسی خودکار هم‌پوشانی دستورات کار با احتساب زمان ستاپ قالب (SMED) و زمان چرخه در جدول RoutingOperation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              بررسی‌شده: {toPersianDigits(totalWorkOrdersChecked)} دستور کار ({toPersianDigits(totalOperationsScheduled)} مرحله)
            </span>
          </span>

          {onNavigateToCapacity && (
            <button
              type="button"
              onClick={onNavigateToCapacity}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
            >
              مدیریت تقویم ظرفیت
            </button>
          )}

          <button
            type="button"
            onClick={fetchOverlaps}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
            title="محاسبه مجدد تداخل‌ها"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Overlaps List */}
      {overlaps.length === 0 && !loading ? (
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>هیچ تداخل زمانی بین دستورات کار برنامه‌ریزی‌شده روی ایستگاه‌های کاری مشاهده نشد.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overlaps.slice(0, compact ? 2 : overlaps.length).map(ov => (
            <div
              key={ov.id}
              className="p-3.5 rounded-xl bg-white border border-rose-200/90 shadow-2xs space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-slate-900">{ov.workCenterName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {ov.workCenterCode}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    ov.severity === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  تداخل {toPersianDigits(ov.overlapHours)} ساعت ({toPersianDigits(ov.overlapMinutes)} دقیقه)
                </span>
              </div>

              {/* Alert Message */}
              <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200/70 text-rose-950 font-semibold leading-relaxed text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 inline-block text-rose-600 ml-1" />
                {ov.message}
              </div>

              {/* Order A vs Order B Time Window Comparison */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                    <span>{ov.orderA.orderNumber}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-[10px]">{ov.orderA.opCode}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{ov.orderA.itemName}</div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {toPersianDigits(ov.orderA.startTime)} الی {toPersianDigits(ov.orderA.endTime)}
                    </span>
                    <span className="text-amber-800">ستاپ: {toPersianDigits(ov.orderA.setupTimeMin)}m</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                    <span>{ov.orderB.orderNumber}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-[10px]">{ov.orderB.opCode}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{ov.orderB.itemName}</div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {toPersianDigits(ov.orderB.startTime)} الی {toPersianDigits(ov.orderB.endTime)}
                    </span>
                    <span className="text-amber-800">ستاپ: {toPersianDigits(ov.orderB.setupTimeMin)}m</span>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="text-[10px] text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <Wrench className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{ov.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
