import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Building2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { WipTransfer } from '../../types/productionWip';
import {
  formatNumber,
  toPersianDigits,
  formatDateTime,
} from '../../utils/formatters';
import { TableSkeleton } from '../ui/Skeleton';

interface InterOperationTransfersViewProps {
  transfers: WipTransfer[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onApproveTransfer: (transferId: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  onRejectTransfer: (transferId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export const InterOperationTransfersView: React.FC<InterOperationTransfersViewProps> = ({
  transfers,
  loading,
  onRefresh,
  onApproveTransfer,
  onRejectTransfer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rejectingTransferId, setRejectingTransferId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading && transfers.length === 0) {
    return <TableSkeleton rows={5} columns={6} theme="light" />;
  }

  const filteredTransfers = transfers.filter(trf => {
    if (statusFilter !== 'ALL' && trf.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesNum = trf.transferNumber.toLowerCase().includes(q);
      const matchesMo = trf.moNumber.toLowerCase().includes(q);
      const matchesPart = trf.partName.toLowerCase().includes(q) || trf.partCode.toLowerCase().includes(q);
      const matchesFrom = trf.fromStepName.toLowerCase().includes(q);
      const matchesTo = trf.toStepName.toLowerCase().includes(q);
      if (!matchesNum && !matchesMo && !matchesPart && !matchesFrom && !matchesTo) {
        return false;
      }
    }
    return true;
  });

  const handleApprove = async (transferId: string) => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await onApproveTransfer(transferId);
      if (!res.success) setErrorMsg(res.error || 'خطا در تأیید حواله');
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingTransferId) return;
    if (!rejectReason.trim()) {
      setErrorMsg('لطفاً دلیل رد محموله را مشخص کنید.');
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await onRejectTransfer(rejectingTransferId, rejectReason.trim());
      if (res.success) {
        setRejectingTransferId(null);
        setRejectReason('');
      } else {
        setErrorMsg(res.error || 'خطا در رد حواله');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadges: Record<string, { label: string; color: string }> = {
    PENDING_APPROVAL: { label: 'در حال انتقال (در انتظار تأیید)', color: 'bg-amber-500/20 text-amber-800 border-amber-500/30' },
    APPROVED: { label: 'تحویل‌گرفته‌شده (قطعی)', color: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' },
    REJECTED: { label: 'ردشده و عودت به مبدأ', color: 'bg-rose-500/20 text-rose-700 border-rose-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            حواله‌های انتقال و ردیابی بین‌مراحل (WIP In-Transit & Receipts)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ردیابی دقیق محموله‌های در حال جابجایی بین سالن‌ها و ایستگاه‌های پرس، جوشکاری، رنگ و مونتاژ
          </p>
        </div>

        <div className="text-xs text-slate-400">
          کل حواله‌ها: <strong className="text-slate-900 font-mono">{toPersianDigits(transfers.length)}</strong> |{' '}
          در انتظار تأیید:{' '}
          <strong className="text-amber-400 font-mono">
            {toPersianDigits(transfers.filter(t => t.status === 'PENDING_APPROVAL').length)}
          </strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی شماره حواله، دستور کار، نام قطعه یا مرحله..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PENDING_APPROVAL">در انتظار تحویل در مقصد (Pending)</option>
            <option value="APPROVED">تحویل قطعی شده (Approved)</option>
            <option value="REJECTED">ردشده (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 font-semibold select-none">
                <th className="py-3 px-3">شماره حواله</th>
                <th className="py-3 px-3">دستور ساخت (MO)</th>
                <th className="py-3 px-3">قطعه</th>
                <th className="py-3 px-3">ایستگاه مبدأ</th>
                <th className="py-3 px-3">ایستگاه یا انبار مقصد</th>
                <th className="py-3 px-3 text-left">تعداد (PCS)</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3">زمان ارسال</th>
                <th className="py-3 px-3 text-center">عملیات تحویل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ حواله‌ای یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(trf => {
                  const statusInfo = statusBadges[trf.status] || { label: trf.status, color: 'bg-slate-700 text-slate-700' };
                  const isPending = trf.status === 'PENDING_APPROVAL';

                  return (
                    <tr key={trf.id} className="hover:bg-slate-100 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{trf.transferNumber}</td>
                      <td className="py-3 px-3 font-mono text-cyan-700">{trf.moNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{trf.partName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{trf.partCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-900">{trf.fromStepName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{trf.fromLocation}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-900">{trf.toStepName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{trf.toLocation}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-left text-slate-900 text-sm">
                        {formatNumber(trf.quantity)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {formatDateTime(trf.dispatchedAt)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApprove(trf.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                              title="تأیید رسید و افزودن به صف ورودی مقصد"
                            >
                              تأیید تحویل
                            </button>
                            <button
                              onClick={() => {
                                setRejectingTransferId(trf.id);
                                setRejectReason('');
                              }}
                              disabled={actionLoading}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/30 rounded-lg text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                              title="رد محموله و بازگشت به مبدأ"
                            >
                              رد
                            </button>
                          </div>
                        ) : trf.status === 'APPROVED' ? (
                          <div className="text-[11px] text-emerald-400 font-medium">
                            تحویل توسط {trf.receivedBy || 'سرپرست ایستگاه'}
                          </div>
                        ) : (
                          <div className="text-[11px] text-rose-400 font-medium" title={trf.rejectionReason}>
                            علت رد: {trf.rejectionReason || 'عدم انطباق'}
                          </div>
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

      {/* Reject Confirmation Dialog */}
      {rejectingTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
          <div className="bg-white border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">رد محموله و عودت به مرحله مبدأ</h3>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              با رد این حواله، قطعات مجدداً در وضعیت «آماده انتقال» مرحله مبدأ قرار گرفته و به موجودی ایستگاه قبل بازگردانده می‌شوند.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                علت رد محموله <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: مغایرت در تعداد شمارش، پلیسه روی لبه، عدم تطابق پالت..."
                rows={3}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRejectingTransferId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                تأیید رد و عودت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
