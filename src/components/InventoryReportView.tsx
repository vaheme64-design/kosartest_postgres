import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Scale,
  Layers,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { StageInventorySummary, FACTORY_STAGES, PartCategory } from '../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../utils/formatters';
import { TableSkeleton, KpiCardsSkeleton } from './common/Skeleton';

interface InventoryReportViewProps {
  balances: StageInventorySummary[];
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const InventoryReportView: React.FC<InventoryReportViewProps> = ({
  balances,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [onlyNonZero, setOnlyNonZero] = useState(true);
  const [sortField, setSortField] = useState<keyof StageInventorySummary>('totalQty');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredBalances = useMemo(() => {
    return balances.filter(item => {
      if (onlyNonZero && item.totalQty === 0 && item.inTransitQty === 0 && item.scrapQty === 0) {
        return false;
      }
      if (selectedStageFilter !== 'ALL' && item.stageId !== selectedStageFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.partName.toLowerCase().includes(q);
        const matchesCode = item.partCode.toLowerCase().includes(q);
        const matchesStage = item.stageName.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesStage) return false;
      }
      return true;
    }).sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [balances, searchTerm, selectedStageFilter, onlyNonZero, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredBalances.length / pageSize) || 1;
  const pagedData = filteredBalances.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Totals of current filtered view
  const totalUsableQty = filteredBalances.reduce((sum, item) => sum + item.usableQty, 0);
  const totalInTransitQty = filteredBalances.reduce((sum, item) => sum + item.inTransitQty, 0);
  const totalScrapQty = filteredBalances.reduce((sum, item) => sum + item.scrapQty, 0);
  const totalWeightKg = filteredBalances.reduce((sum, item) => sum + item.totalKg, 0);

  const handleExportCsv = () => {
    const headers = [
      'ایستگاه / انبار',
      'کد کاتالوگ قطعه',
      'عنوان قطعه / ماده اولیه',
      'موجودی قابل استفاده',
      'موجودی رزرو شده',
      'موجودی در راه (انتقال)',
      'موجودی کل مرحله',
      'واحد',
      'وزن کل (کیلوگرم)',
      'ضایعات ثبت شده',
      'درصد ضایعات',
      'آخرین تراکنش',
    ];

    const rows = filteredBalances.map(item => [
      item.stageName,
      item.partCode,
      item.partName,
      item.usableQty,
      item.reservedQty,
      item.inTransitQty,
      item.totalQty,
      item.unit,
      item.totalKg,
      item.scrapQty,
      `${item.scrapRatePercent}%`,
      formatDateTime(item.lastActivityDate),
    ]);

    exportToCsv(`گزارش_موجودی_انبار_و_WIP_${Date.now()}`, headers, rows);
  };

  const handleSort = (field: keyof StageInventorySummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            گزارش کاردکس و موجودی چندمرحله‌ای (مواد اولیه، WIP و محصول)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            موجودی از گردش دفاتر تراکنش‌های معتبر و با تفکیک قطعی موجودی آزاد، رزرو و در انتظار انتقال محاسبه شده است.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-all"
            title="به‌روزرسانی لحظه‌ای محاسبه دفاتر"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>محاسبه مجدد</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-emerald-900/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Micro-Cards for Current Filter */}
      {loading ? (
        <KpiCardsSkeleton count={4} columns={4} theme="dark" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400">موجودی آزاد و قابل استفاده</span>
            <div className="text-base lg:text-lg font-bold text-emerald-400 mt-1">
              {formatNumber(totalUsableQty)}
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400">موجودی در حال انتقال (بین مراحل)</span>
            <div className="text-base lg:text-lg font-bold text-purple-400 mt-1">
              {formatNumber(totalInTransitQty)}
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400">وزن کل موجودی در این نما</span>
            <div className="text-base lg:text-lg font-bold text-slate-900 mt-1">
              {formatWeightKg(totalWeightKg)}
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400">مجموع ضایعات ثبتی</span>
            <div className="text-base lg:text-lg font-bold text-rose-400 mt-1">
              {formatNumber(totalScrapQty)}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام قطعه، کد کاتالوگ یا ایستگاه..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={selectedStageFilter}
            onChange={e => setSelectedStageFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه ایستگاه‌ها و انبارها</option>
            {FACTORY_STAGES.map(st => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Non-zero checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyNonZero}
              onChange={e => setOnlyNonZero(e.target.checked)}
              className="rounded bg-white border-slate-200 text-amber-500 focus:ring-0"
            />
            <span>فقط ردیف‌های دارای موجودی یا گردش</span>
          </label>
        </div>

        <div className="text-xs text-slate-400">
          تعداد ردیف‌ها: <span className="font-bold text-slate-900">{formatNumber(filteredBalances.length)}</span>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={8} theme="dark" />
      ) : (
      <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 font-semibold select-none">
                <th className="py-3 px-3">ایستگاه / مرحله</th>
                <th className="py-3 px-3">کد قطعه</th>
                <th className="py-3 px-3">عنوان قطعه / شیت</th>
                <th
                  onClick={() => handleSort('usableQty')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>موجودی آزاد</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-purple-400">در راه (انتقال)</th>
                <th
                  onClick={() => handleSort('totalQty')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>موجودی کل</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">واحد</th>
                <th
                  onClick={() => handleSort('totalKg')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>وزن کل</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-rose-400">ضایعات</th>
                <th className="py-3 px-3">نرخ ضایعات</th>
                <th className="py-3 px-3">آخرین تراکنش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    هیچ رکوردی منطبق با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                pagedData.map(item => (
                  <tr key={`${item.stageId}_${item.partId}`} className="hover:bg-slate-100 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.stageName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-400 font-semibold">{item.partCode}</td>
                    <td className="py-3 px-3 text-slate-900 font-medium">
                      <div>{item.partName}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400 font-mono">
                      {formatNumber(item.usableQty)}
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-700">
                      {item.inTransitQty > 0 ? (
                        <span className="flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                          {formatNumber(item.inTransitQty)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-mono">
                      {formatNumber(item.totalQty)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">{item.unit}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{formatWeightKg(item.totalKg)}</td>
                    <td className="py-3 px-3 text-rose-400 font-mono">
                      {item.scrapQty > 0 ? formatNumber(item.scrapQty) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {item.scrapRatePercent > 0 ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.scrapRatePercent > 2.5 ? 'bg-rose-500/20 text-rose-700' : 'bg-slate-700 text-slate-700'
                        }`}>
                          {toPersianDigits(item.scrapRatePercent)}٪
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                      {formatDateTime(item.lastActivityDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div>
              نمایش صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
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
                      ? 'bg-amber-500 text-slate-950 font-bold'
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
      )}
    </div>
  );
};
