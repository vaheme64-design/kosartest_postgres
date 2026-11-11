import React from 'react';
import {
  Boxes,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  TrendingUp,
  FilePlus,
  Play,
  Scale,
  RefreshCw,
  Cpu,
  ShieldCheck,
  ChevronRight,
  ArrowDownRight,
  ArrowUpLeft,
} from 'lucide-react';
import {
  WipDashboardMetrics,
  ManufacturingOrder,
} from '../../types/productionWip';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
} from '../../utils/formatters';
import { KpiCardsSkeleton, ChartSkeleton } from '../ui/Skeleton';

interface WipDashboardViewProps {
  metrics: WipDashboardMetrics | null;
  orders: ManufacturingOrder[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenCreateMo: () => void;
  onOpenTransfer: () => void;
  onSelectMo: (mo: ManufacturingOrder) => void;
  onNavigateToOrders: () => void;
  onNavigateToTransfers: () => void;
}

export const WipDashboardView: React.FC<WipDashboardViewProps> = ({
  metrics,
  orders,
  loading,
  onRefresh,
  onOpenCreateMo,
  onOpenTransfer,
  onSelectMo,
  onNavigateToOrders,
  onNavigateToTransfers,
}) => {
  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <KpiCardsSkeleton count={6} columns={6} theme="light" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton rows={4} theme="light" />
          <ChartSkeleton rows={4} theme="light" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-slate-700" />
              داشبورد کار در جریان ساخت و کنترل گلوگاه‌های خطوط (WIP Execution)
            </h2>
            {metrics?.overallConservationIntegrity && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>پایستگی قطعات تایید شده</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            رهگیری لحظه‌ای صف‌های ورودی، اقلام پای دستگاه، تولید آماده انتقال و تحلیل زمان توقف و قدمت (Aging)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-400' : 'text-slate-500'}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer border border-slate-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>انتقال بین‌مراحل</span>
          </button>
          <button
            onClick={onOpenCreateMo}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>دستور کار جدید (MO)</span>
          </button>
        </div>
      </div>

      {/* 5 Main WIP Stage Breakdown Micro-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Waiting at operations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>در انتظار صف ورودی</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatNumber(metrics?.totalWaitingQty || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">آماده شروع در ماشین</span>
        </div>

        {/* 2. In-Progress at machines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>در حال ساخت پای دستگاه</span>
            <Play className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatNumber(metrics?.totalInProgressQty || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">در حال پرس/خم/جوش</span>
        </div>

        {/* 3. Ready for transfer */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>آماده انتقال به مرحله بعد</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatNumber(metrics?.totalReadyForTransferQty || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">نیازمند صدور حواله</span>
        </div>

        {/* 4. In-Transit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>در حال انتقال (In-Transit)</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatNumber(metrics?.totalInTransitQty || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {toPersianDigits(metrics?.pendingTransfersCount || 0)} حواله در انتظار تأیید
          </span>
        </div>

        {/* 5. Completed Final Products */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>تکمیل‌شده نهایی</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatNumber(metrics?.totalCompletedQty || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">تحویل انبار نهایی</span>
        </div>

        {/* 6. Scrap & Non-Conformity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>ضایعات و دوباره‌کاری</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono mt-1">
            {formatNumber((metrics?.totalScrapQty || 0) + (metrics?.totalReworkQty || 0))}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {toPersianDigits(metrics?.totalScrapQty || 0)} ضایعات | {toPersianDigits(metrics?.totalReworkQty || 0)} دوباره‌کاری
          </span>
        </div>
      </div>

      {/* Two Column Layout: Bottlenecks & Active MOs Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bottlenecks and Queue Depth */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-600" />
              <span>تحلیل تراکم و صف ایستگاه‌ها (Bottleneck & Aging Analysis)</span>
            </h3>
            <span className="text-[11px] text-slate-400">مرتب‌سازی بر اساس عمق صف</span>
          </div>

          <div className="space-y-3">
            {(!metrics?.bottleneckOperations || metrics.bottleneckOperations.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-400">اطلاعاتی در دسترس نیست.</div>
            ) : (
              metrics.bottleneckOperations.slice(0, 5).map((op, idx) => {
                const totalInQueue = op.waitingQty + op.inProgressQty;
                const isHighAging = op.agingHoursAvg > 12;

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{op.stepCode}</span>
                        <span className="text-xs font-semibold text-slate-800">{op.operationName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                        <span>صف انتظار: <strong className="text-slate-800 font-mono">{formatNumber(op.waitingQty)}</strong></span>
                        <span>پای‌کار: <strong className="text-slate-800 font-mono">{formatNumber(op.inProgressQty)}</strong></span>
                        <span>آماده انتقال: <strong className="text-slate-800 font-mono">{formatNumber(op.readyQty)}</strong></span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className={`text-xs font-mono font-bold ${isHighAging ? 'text-rose-600' : 'text-slate-800'}`}>
                        {toPersianDigits(op.agingHoursAvg)} ساعت توقف
                      </div>
                      <span className="text-[10px] text-slate-400 block">میانگین قدمت WIP</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Manufacturing Orders Quick Overview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>دستورهای کار جاری و پیشرفت فرآیندها (Active MOs)</span>
            </h3>
            <button
              onClick={onNavigateToOrders}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه دستورها</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map(mo => {
              const completedOps = mo.operations.filter(o => o.status === 'COMPLETED').length;
              const progressPercent = Math.round((completedOps / mo.operations.length) * 100);

              return (
                <div
                  key={mo.id}
                  onClick={() => onSelectMo(mo)}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 rounded-lg border border-slate-200/80 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{mo.moNumber}</span>
                        <span className="text-xs font-semibold text-slate-800">{mo.partName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        کد: <span className="font-mono text-slate-700">{mo.partCode}</span> | هدف: <strong className="text-slate-900 font-mono">{formatNumber(mo.targetQuantity)} PCS</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-800">
                      نسخه {mo.routingVersion}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>پیشرفت مراحل فرآیند ({toPersianDigits(completedOps)} از {toPersianDigits(mo.operations.length)} مرحله):</span>
                      <span className="font-mono font-bold text-slate-900">{toPersianDigits(progressPercent)}٪</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
