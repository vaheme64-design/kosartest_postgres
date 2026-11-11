import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  Filter,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  FileText,
  User,
  Clock,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { InventoryTransaction, VoucherType, VoucherStatus, FACTORY_STAGES } from '../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  getVoucherTypeLabel,
  exportToCsv,
} from '../utils/formatters';

interface AuditLedgerViewProps {
  transactions: InventoryTransaction[];
  onRefresh: () => Promise<void>;
  onReverseVoucher: (voucherId: string, reason: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loading: boolean;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  transactions,
  onRefresh,
  onReverseVoucher,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Reversal Modal
  const [reversalModalTx, setReversalModalTx] = useState<InventoryTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'ALL' && t.voucherType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (stageFilter !== 'ALL' && t.stageId !== stageFilter && t.targetStageId !== stageFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesNum = t.voucherNumber.toLowerCase().includes(q);
        const matchesPartName = t.partName.toLowerCase().includes(q);
        const matchesPartCode = t.partCode.toLowerCase().includes(q);
        const matchesRef = t.referenceDoc?.toLowerCase().includes(q) || false;
        const matchesOp = t.operatorName?.toLowerCase().includes(q) || false;
        const matchesNotes = t.notes?.toLowerCase().includes(q) || false;
        if (!matchesNum && !matchesPartName && !matchesPartCode && !matchesRef && !matchesOp && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, stageFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const pagedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenReverse = (tx: InventoryTransaction) => {
    setReversalModalTx(tx);
    setReversalReason(`ابطال و تعدیل به دلیل خطای اپراتور در ثبت سند ${tx.voucherNumber}`);
    setReversalError(null);
  };

  const handleConfirmReverse = async () => {
    if (!reversalModalTx) return;
    setReversalLoading(true);
    setReversalError(null);

    try {
      const res = await onReverseVoucher(reversalModalTx.id, reversalReason);
      if (res.success) {
        setReversalModalTx(null);
      } else {
        setReversalError(res.error || 'خطا در ابطال سند.');
      }
    } catch (err) {
      setReversalError(err instanceof Error ? err.message : 'خطای ارتباط با سرور.');
    } finally {
      setReversalLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'شماره سند یکتا',
      'نوع سند',
      'وضعیت',
      'کد قطعه',
      'عنوان قطعه / ماده اولیه',
      'ایستگاه مبدا',
      'ایستگاه مقصد',
      'مقدار',
      'واحد',
      'وزن معادل (کیلوگرم)',
      'سند عطف / بارنامه',
      'اپراتور مسئول',
      'شیفت کاری',
      'علت ضایعات',
      'سند مرجع ابطال',
      'توضیحات سند',
      'تاریخ و زمان ثبتی',
    ];

    const rows = filteredTransactions.map(t => [
      t.voucherNumber,
      getVoucherTypeLabel(t.voucherType).label,
      t.status === 'CONFIRMED' ? 'معتبر و قطعی' : 'ابطال شده',
      t.partCode,
      t.partName,
      t.stageName,
      t.targetStageName || '-',
      t.quantity,
      t.unit,
      t.quantityKg,
      t.referenceDoc || '',
      t.operatorName || '',
      t.shift || '',
      t.scrapReason || '',
      t.reversalOfVoucherId || '',
      t.notes || '',
      formatDateTime(t.createdAt),
    ]);

    exportToCsv(`دفتر_گردش_تراکنش‌های_انبار_و_تولید_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            دفتر کل گردش تراکنش‌ها و سوابق اصلاحات اسناد (Audit Trail)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دفتر کل غیرقابل‌حذف (Immutable Ledger)؛ تمامی اصلاحات با صدور سند معکوس و حفظ زنجیره سوابق انجام می‌پذیرد.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی دفتر</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-emerald-900/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل اسناد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی شماره سند، کد قطعه، بارنامه، اپراتور..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه انواع اسناد</option>
            <option value="RECEIPT">رسیدهای ورود ساپکو</option>
            <option value="ISSUE">حواله‌های مصرف مواد</option>
            <option value="PRODUCTION_OUTPUT">ثبت تولید سالم</option>
            <option value="SCRAP">ثبت ضایعات</option>
            <option value="WIP_TRANSFER_DISPATCH">ارسال بین مراحل</option>
            <option value="WIP_TRANSFER_RECEIPT">وصول در مرحله مقصد</option>
            <option value="ADJUSTMENT">اسناد اصلاحی / تعدیل</option>
            <option value="OPENING_BALANCE">موجودی اول دوره</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="CONFIRMED">معتبر و تأییدشده</option>
            <option value="REVERSED">ابطال‌شده در سند اصلاحی</option>
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه انبارها و ایستگاه‌ها</option>
            {FACTORY_STAGES.map(st => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          تعداد اسناد: <span className="font-bold text-slate-900">{formatNumber(filteredTransactions.length)}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 font-semibold select-none">
                <th className="py-3 px-3">شماره سند</th>
                <th className="py-3 px-3">نوع سند</th>
                <th className="py-3 px-3">قطعه / ماده اولیه</th>
                <th className="py-3 px-3">مبدا / ایستگاه</th>
                <th className="py-3 px-3">مقصد</th>
                <th className="py-3 px-3">مقدار</th>
                <th className="py-3 px-3">وزن (kg)</th>
                <th className="py-3 px-3">مرجع / بارنامه</th>
                <th className="py-3 px-3">مسئول ثبت</th>
                <th className="py-3 px-3">تاریخ و ساعت</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3 text-center">عملیات اصلاحی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    هیچ سندی در این بازه یا فیلتر یافت نشد.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map(t => {
                  const badge = getVoucherTypeLabel(t.voucherType);
                  const isReversed = t.status === 'REVERSED';

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-100 transition-colors ${
                        isReversed ? 'opacity-60 bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {t.voucherNumber}
                        {t.reversalOfVoucherId && (
                          <div className="text-[10px] text-orange-400 font-normal">
                            عطف به: {t.reversalOfVoucherId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-medium max-w-[200px]">
                        <div className="truncate">{t.partName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.partCode}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{t.stageName}</td>
                      <td className="py-3 px-3 text-purple-400 whitespace-nowrap">
                        {t.targetStageName || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono whitespace-nowrap">
                        <span className={t.quantity < 0 ? 'text-rose-400' : 'text-slate-900'}>
                          {t.quantity > 0 ? `+${formatNumber(t.quantity)}` : formatNumber(t.quantity)} {t.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono">
                        {formatWeightKg(t.quantityKg)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                        {t.referenceDoc || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700 text-[11px] whitespace-nowrap">
                        {t.operatorName || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {t.status === 'CONFIRMED' ? (
                          <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تأیید شده
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[11px] flex items-center gap-1 font-semibold">
                            <AlertOctagon className="w-3 h-3" />
                            ابطال شده
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {t.status === 'CONFIRMED' && t.voucherType !== 'ADJUSTMENT' ? (
                          <button
                            onClick={() => handleOpenReverse(t)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/30 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 mx-auto"
                            title="ابطال سند با صدور سند اصلاحی جبرانی"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>ابطال / سند اصلاحی</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div>
              صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-100 text-slate-900 rounded-lg disabled:opacity-40 transition-colors"
              >
                قبلی
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg font-mono font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {toPersianDigits(pageNum)}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-100 text-slate-900 rounded-lg disabled:opacity-40 transition-colors"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reversal / Adjustment Modal */}
      {reversalModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-400">
                <RotateCcw className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">صدور سند اصلاحی و ابطال</h3>
              </div>
              <button
                onClick={() => setReversalModalTx(null)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reversalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 text-xs">
                {reversalError}
              </div>
            )}

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">شماره سند هدف:</span>
                  <span className="font-mono font-bold text-amber-400">{reversalModalTx.voucherNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">عنوان قطعه:</span>
                  <span className="font-medium text-slate-900">{reversalModalTx.partName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">مقدار سند:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatNumber(reversalModalTx.quantity)} {reversalModalTx.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ایستگاه مربوطه:</span>
                  <span className="text-slate-900">{reversalModalTx.stageName}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[11px] leading-relaxed">
                طبق اصول حسابداری صنعتی کارخانه، این سند از پایگاه داده فیزیکی حذف نمی‌شود؛ بلکه وضعیت آن به «ابطال شده» تغییر یافته و یک سند معکوس خودکار (ADJUSTMENT) در دفاتر درج خواهد شد تا تراز موجودی اصلاح گردد.
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">علت و دلیل صدور سند اصلاحی *</label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  placeholder="علت ابطال (مثلاً: ثبت اشتباه مقدار توسط اپراتور شیفت...)"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReversalModalTx(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReverse}
                  disabled={reversalLoading || !reversalReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-md shadow-rose-900/30 disabled:opacity-50"
                >
                  {reversalLoading ? 'در حال صدور سند معکوس...' : 'تأیید ابطال و صدور سند معکوس'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
