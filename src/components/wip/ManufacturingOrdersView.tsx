import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Play,
  CheckCircle2,
  ArrowRightLeft,
  Scale,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Building2,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  ManufacturingOrder,
  ManufacturingOperation,
} from '../../types/productionWip';
import {
  formatNumber,
  toPersianDigits,
  formatDateTime,
} from '../../utils/formatters';
import { TableSkeleton } from '../ui/Skeleton';

interface ManufacturingOrdersViewProps {
  orders: ManufacturingOrder[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenCreateMo: () => void;
  onOpenInput: (operation: ManufacturingOperation) => void;
  onOpenProduction: (operation: ManufacturingOperation) => void;
  onOpenTransfer: (mo: ManufacturingOrder, operation: ManufacturingOperation) => void;
  onOpenReconciliation: (moId: string) => void;
}

export const ManufacturingOrdersView: React.FC<ManufacturingOrdersViewProps> = ({
  orders,
  loading,
  onRefresh,
  onOpenCreateMo,
  onOpenInput,
  onOpenProduction,
  onOpenTransfer,
  onOpenReconciliation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedMoId, setExpandedMoId] = useState<string | null>(orders.length > 0 ? orders[0].id : null);

  if (loading && orders.length === 0) {
    return <TableSkeleton rows={6} columns={6} theme="light" />;
  }

  const filteredOrders = orders.filter(mo => {
    if (statusFilter !== 'ALL' && mo.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesMo = mo.moNumber.toLowerCase().includes(q);
      const matchesPartName = mo.partName.toLowerCase().includes(q);
      const matchesPartCode = mo.partCode.toLowerCase().includes(q);
      const matchesNotes = mo.notes ? mo.notes.toLowerCase().includes(q) : false;
      if (!matchesMo && !matchesPartName && !matchesPartCode && !matchesNotes) {
        return false;
      }
    }
    return true;
  });

  const statusBadges: Record<string, { label: string; color: string }> = {
    PLANNED: { label: 'برنامه‌ریزی‌شده', color: 'bg-slate-700 text-slate-700' },
    RELEASED: { label: 'صادرشده به سالن', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
    IN_PROGRESS: { label: 'در جریان ساخت', color: 'bg-amber-500/20 text-amber-800 border-amber-500/30' },
    COMPLETED: { label: 'تکمیل‌شده', color: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' },
    CANCELLED: { label: 'لغوشده', color: 'bg-rose-500/20 text-rose-700 border-rose-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            دستورهای کار تولید و فرآیندهای ساخت (Manufacturing Orders)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پیگیری چندمرحله‌ای عملیات، ثبت ورودی/خروجی هر ایستگاه، پایش ضایعات و صدور حواله انتقال بین‌مراحل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateMo}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>صدور دستور کار جدید (MO)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی شماره دستور (MO)، کد یا عنوان قطعه..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="IN_PROGRESS">در جریان ساخت (In-Progress)</option>
            <option value="RELEASED">صادرشده (Released)</option>
            <option value="COMPLETED">تکمیل‌شده (Completed)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          تعداد دستورها: <strong className="text-slate-900 font-mono">{toPersianDigits(filteredOrders.length)}</strong>
        </div>
      </div>

      {/* Orders List & Interactive Operations */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 text-xs">
            هیچ دستور کاری با فیلترهای انتخابی یافت نشد.
          </div>
        ) : (
          filteredOrders.map(mo => {
            const isExpanded = expandedMoId === mo.id;
            const completedOpsCount = mo.operations.filter(o => o.status === 'COMPLETED').length;
            const statusInfo = statusBadges[mo.status] || { label: mo.status, color: 'bg-slate-700 text-slate-700' };

            return (
              <div
                key={mo.id}
                className={`bg-slate-100 rounded-2xl border transition-all ${
                  isExpanded ? 'border-indigo-500/60 shadow-xl shadow-black/20' : 'border-slate-200 hover:border-slate-600'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-400 text-sm">{mo.moNumber}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 text-slate-700">
                          نسخه مسیر {mo.routingVersion}
                        </span>
                        <span className="text-xs font-bold text-slate-900 mr-1">{mo.partName}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-4 flex-wrap">
                        <span>کد قطعه: <strong className="font-mono text-slate-700">{mo.partCode}</strong></span>
                        <span>هدف ساخت: <strong className="font-mono text-emerald-400">{formatNumber(mo.targetQuantity)} PCS</strong></span>
                        <span>ورودی شیت: <strong className="font-mono text-cyan-400">{formatNumber(mo.initialInputQuantity)} PCS</strong></span>
                        <span>تکمیل نهایی: <strong className="font-mono text-slate-900">{formatNumber(mo.completedQuantity)} PCS</strong></span>
                        <span>کل ضایعات: <strong className="font-mono text-rose-400">{formatNumber(mo.totalScrapQuantity)} PCS</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Action & Toggle */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => onOpenReconciliation(mo.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="مشاهده گواهی موازنه پایستگی قطعات"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>موازنه و بازرسی تراز</span>
                    </button>

                    <button
                      onClick={() => setExpandedMoId(isExpanded ? null : mo.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      <span>{isExpanded ? 'بستن مراحل' : 'مشاهده مراحل'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Operations Timeline & Cards */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-white rounded-b-2xl space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>
                        مراحل فرآیند ساخت ({toPersianDigits(completedOpsCount)} از {toPersianDigits(mo.operations.length)} تکمیل‌شده)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        مبتنی بر قانون پایستگی: قطعات سالم تا پیش از ثبت حواله، در انبار مرحله بعد منظور نمی‌شوند.
                      </div>
                    </div>

                    {/* Operations Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {mo.operations.map((op, idx) => {
                        const isFirstOp = idx === 0;
                        const isLastOp = idx === mo.operations.length - 1;
                        const hasWaiting = op.waitingInputQty > 0;
                        const hasInProgress = op.inProgressQty > 0;
                        const hasReadyToTransfer = op.readyForTransferQty > 0;

                        return (
                          <div
                            key={op.id}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                              hasInProgress
                                ? 'bg-blue-950/20 border-blue-500/40 shadow-md shadow-blue-900/10'
                                : hasReadyToTransfer
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : hasWaiting
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : 'bg-slate-100 border-slate-200 opacity-80'
                            }`}
                          >
                            {/* Card Top */}
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <div>
                                  <span className="font-mono text-xs font-bold text-amber-400">
                                    {op.stepCode}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1" title={op.stepName}>
                                    {op.stepName}
                                  </h4>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 font-mono">
                                  گام {toPersianDigits(idx + 1)}
                                </span>
                              </div>

                              <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                                <span className="font-mono text-cyan-700">{op.warehouseLocation}</span>
                                {op.machineName && <span className="truncate max-w-[120px]">{op.machineName}</span>}
                              </div>

                              {/* Quantitative Breakdown */}
                              <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">در صف ورودی:</span>
                                  <span className={`font-mono font-bold ${op.waitingInputQty > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {formatNumber(op.waitingInputQty)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">پای دستگاه:</span>
                                  <span className={`font-mono font-bold ${op.inProgressQty > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {formatNumber(op.inProgressQty)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">آماده انتقال:</span>
                                  <span className={`font-mono font-bold ${op.readyForTransferQty > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {formatNumber(op.readyForTransferQty)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">ضایعات ثبتی:</span>
                                  <span className={`font-mono font-bold ${op.scrapQty > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {formatNumber(op.scrapQty)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 flex-wrap">
                              {hasWaiting && (
                                <button
                                  onClick={() => onOpenInput(op)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="شروع پردازش و انتقال به پای دستگاه"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>شروع کار</span>
                                </button>
                              )}

                              {hasInProgress && (
                                <button
                                  onClick={() => onOpenProduction(op)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="ثبت قطعات سالم و ضایعات"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>ثبت خروجی</span>
                                </button>
                              )}

                              {hasReadyToTransfer && (
                                <button
                                  onClick={() => onOpenTransfer(mo, op)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="ارسال قطعات به مرحله بعد یا انبار"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>انتقال ({formatNumber(op.readyForTransferQty)})</span>
                                </button>
                              )}

                              {!hasWaiting && !hasInProgress && !hasReadyToTransfer && op.transferredQty > 0 && (
                                <span className="w-full text-center text-[10px] text-slate-500 py-1">
                                  ✓ کلیه قطعات به مرحله بعد ارسال شده‌اند
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
