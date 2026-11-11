import React, { useState, useEffect } from 'react';
import {
  Scale,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  Boxes,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { MoReconciliationReport } from '../../types/productionWip';
import { formatNumber, toPersianDigits, formatDateTime } from '../../utils/formatters';

interface WipReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  moId: string | null;
}

export const WipReconciliationModal: React.FC<WipReconciliationModalProps> = ({
  isOpen,
  onClose,
  moId,
}) => {
  const [report, setReport] = useState<MoReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReconciliation = async () => {
    if (!moId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/wip/reconciliation/${moId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        setErrorMsg(data.error || 'خطا در محاسبه تراز پایستگی');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && moId) {
      fetchReconciliation();
    }
  }, [isOpen, moId]);

  if (!isOpen || !moId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>شناسنامه و گواهی موازنه پایستگی قطعات (WIP Reconciliation)</span>
                {report && report.isConserved && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                    تراز کامل (Discrepancy = 0)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                دستور ساخت: <strong className="text-amber-400 font-mono">{report?.moNumber || moId}</strong> - قطعه:{' '}
                <span className="text-slate-700">{report?.partName} ({report?.partCode})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReconciliation}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="محاسبه مجدد"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">در حال محاسبه دفاتر پایستگی و موازنه فیزیکی قطعات...</div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-700 text-xs">
              {errorMsg}
            </div>
          ) : report ? (
            <>
              {/* Conservation Certificate Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  report.isConserved
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-700'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      report.isConserved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {report.isConserved
                        ? 'موازنه فیزیکی قطعات کاملاً منطبق است (قانون پایستگی ۱۰۰٪ محقق است)'
                        : 'مغایرت در شمارش دفاتر کار در جریان ساخت کشف شد!'}
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">
                      ورودی اولیه: <strong>{formatNumber(report.initialInputQuantity)} عدد</strong> | مجموع فیزیکی شناسایی‌شده:{' '}
                      <strong>{formatNumber(report.accountedTotal)} عدد</strong> | مغایرت:{' '}
                      <strong className={report.discrepancy === 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                        {formatNumber(report.discrepancy)} عدد
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:text-left text-[11px] text-slate-400 font-mono">
                  زمان موازنه: {formatDateTime(report.auditTimestamp)}
                </div>
              </div>

              {/* 5 Balance Breakdown Micro-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">ورودی اولیه (Input)</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">
                    {formatNumber(report.initialInputQuantity)}
                  </div>
                  <span className="text-[9px] text-slate-500">پایه محاسبه تراز</span>
                </div>

                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">کار در جریان (WIP جاری)</span>
                  <div className="text-base font-bold text-purple-400 font-mono mt-1">
                    {formatNumber(report.totalCurrentWip)}
                  </div>
                  <span className="text-[9px] text-slate-400">صف + پای‌کار + آماده</span>
                </div>

                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">در حال انتقال (In-Transit)</span>
                  <div className="text-base font-bold text-blue-400 font-mono mt-1">
                    {formatNumber(report.totalInTransit)}
                  </div>
                  <span className="text-[9px] text-slate-400">در راه بین‌مراحل</span>
                </div>

                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">محصول تکمیل‌شده</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {formatNumber(report.totalCompleted)}
                  </div>
                  <span className="text-[9px] text-slate-400">خروجی آخرین مرحله</span>
                </div>

                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">ضایعات و نامنطبق</span>
                  <div className="text-base font-bold text-rose-400 font-mono mt-1">
                    {formatNumber(report.totalScrap + report.totalRework + report.totalRejected)}
                  </div>
                  <span className="text-[9px] text-rose-400/80">
                    {report.totalScrap} ضایعات | {report.totalRework} دوباره‌کاری
                  </span>
                </div>
              </div>

              {/* Detailed Operations Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                  <span>جزئیات پایستگی و توزیع قطعات در مراحل عملیاتی:</span>
                  <span className="text-slate-400 font-normal">
                    {report.operationsBreakdown.length} مرحله عملیاتی
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-white text-slate-400 font-semibold border-b border-slate-200 select-none">
                        <th className="py-2.5 px-3">کد مرحله</th>
                        <th className="py-2.5 px-3">عنوان عملیات</th>
                        <th className="py-2.5 px-3 text-left text-amber-800">در صف ورودی</th>
                        <th className="py-2.5 px-3 text-left text-blue-700">پای دستگاه</th>
                        <th className="py-2.5 px-3 text-left text-emerald-700">آماده انتقال</th>
                        <th className="py-2.5 px-3 text-left text-purple-700">منتقله خروجی</th>
                        <th className="py-2.5 px-3 text-left text-rose-400">ضایعات</th>
                        <th className="py-2.5 px-3 text-left text-amber-400">دوباره‌کاری</th>
                        <th className="py-2.5 px-3 text-left text-purple-400">نامنطبق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.operationsBreakdown.map(op => (
                        <tr key={op.stepNumber} className="hover:bg-slate-100">
                          <td className="py-2 px-3 font-mono font-bold text-amber-400">{op.stepCode}</td>
                          <td className="py-2 px-3 text-slate-900">{op.stepName}</td>
                          <td className="py-2 px-3 font-mono text-left font-bold text-amber-800">
                            {op.waitingInput > 0 ? formatNumber(op.waitingInput) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left font-bold text-blue-700">
                            {op.inProgress > 0 ? formatNumber(op.inProgress) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left font-bold text-emerald-700">
                            {op.readyForTransfer > 0 ? formatNumber(op.readyForTransfer) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left text-purple-700">
                            {op.transferredOut > 0 ? formatNumber(op.transferredOut) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left text-rose-400">
                            {op.scrap > 0 ? formatNumber(op.scrap) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left text-amber-400">
                            {op.rework > 0 ? formatNumber(op.rework) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-left text-purple-400">
                            {op.rejected > 0 ? formatNumber(op.rejected) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
