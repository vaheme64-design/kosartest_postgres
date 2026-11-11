import React from 'react';
import {
  Boxes,
  Scale,
  ShieldCheck,
  Clock,
  FilePlus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  FileEdit,
  AlertTriangle,
  ScrollText,
  Warehouse,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Truck,
} from 'lucide-react';
import {
  InventoryDashboardMetrics,
  DetailedStockBalance,
  SapcoContract,
  WarehouseDefinition,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits, formatDateTime } from '../../utils/formatters';
import { KpiCardsSkeleton, TableSkeleton } from '../ui/Skeleton';

interface InventoryDashboardProps {
  metrics: InventoryDashboardMetrics | null;
  contracts: SapcoContract[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenReceipt: () => void;
  onOpenIssue: () => void;
  onOpenCustomerDelivery?: () => void;
  onOpenTransfer: () => void;
  onOpenAdjustment: () => void;
  onNavigateToInquiry: () => void;
  onNavigateToSapco: () => void;
  onNavigateToLedger: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  metrics,
  contracts,
  warehouses,
  balances,
  loading,
  onRefresh,
  onOpenReceipt,
  onOpenIssue,
  onOpenCustomerDelivery,
  onOpenTransfer,
  onOpenAdjustment,
  onNavigateToInquiry,
  onNavigateToSapco,
  onNavigateToLedger,
}) => {
  if (loading && !metrics && balances.length === 0) {
    return (
      <div className="space-y-6">
        <KpiCardsSkeleton count={4} columns={4} theme="light" />
        <TableSkeleton rows={6} columns={6} theme="light" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-slate-900 text-white rounded-lg">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight">
                سامانه مدیریت و کاردکس انبار قطعات و ورق (KPIMS Inventory)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                محاسبه بر مبنای اسناد قطعی‌شده، کنترل عدم منفی‌شدن موجودی، تفکیک مالکیت امانی ساپکو و رهگیری کلاف‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            onClick={onOpenReceipt}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>رسید کالا / ورق</span>
          </button>
          <button
            onClick={onOpenIssue}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
            <span>حواله مصرف به خط</span>
          </button>
          {onOpenCustomerDelivery && (
            <button
              onClick={onOpenCustomerDelivery}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>تحویل محصول به مشتری</span>
            </button>
          )}
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            <span>انتقال بین انبارها</span>
          </button>
          <button
            onClick={onOpenAdjustment}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer"
          >
            <FileEdit className="w-4 h-4 text-slate-600" />
            <span>تعدیل انبارگردانی</span>
          </button>
        </div>
      </div>

      {/* Main KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Stock Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium text-slate-600">موجودی فیزیکی کل کارخانه</span>
            <span className="p-1 bg-slate-100 text-slate-700 rounded">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {formatWeightKg(metrics?.totalPhysicalKg || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>قطعات و مجموعه‌ها:</span>
            <span className="font-mono text-slate-800 font-semibold tabular-nums">
              {formatNumber(metrics?.totalPhysicalPcs || 0)} عدد
            </span>
          </div>
        </div>

        {/* Available Stock Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium text-slate-600">موجودی آزاد و قابل تخصیص</span>
            <span className="p-1 bg-emerald-50 text-emerald-700 rounded">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 font-mono tracking-tight">
            {formatWeightKg(metrics?.totalAvailableKg || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>آزاد جهت تولید:</span>
            <span className="font-mono text-emerald-700 font-semibold tabular-nums">
              {formatNumber(metrics?.totalAvailablePcs || 0)} عدد
            </span>
          </div>
        </div>

        {/* SAPCO Consignment Stock Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium text-slate-600">ورق امانی ساپکو (تامین‌کننده)</span>
            <span className="p-1 bg-amber-50 text-amber-700 rounded">
              <ScrollText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-800 font-mono tracking-tight">
            {formatWeightKg(metrics?.totalSapcoConsignmentKg || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>مالکیت شرکتی کارخانه:</span>
            <span className="font-mono text-slate-700 font-medium tabular-nums">
              {formatWeightKg(metrics?.totalCompanyOwnedKg || 0)}
            </span>
          </div>
        </div>

        {/* Reserved & Blocked Stock Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium text-slate-600">رزرو شده / قرنطینه کیفی</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-800 font-mono tracking-tight">
            {formatWeightKg(metrics?.totalReservedKg || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>بلوکه کیفی / قرنطینه:</span>
            <span className="font-mono text-rose-600 font-medium tabular-nums">
              {formatWeightKg(metrics?.totalQualityBlockedKg || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Warehouse Status Grid & Contracts Glance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouses Summary (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-slate-600" />
              وضعیت انبارهای کارخانه و توزیع فیزیکی موجودی
            </h2>
            <button
              onClick={onNavigateToInquiry}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده کاردکس تفصیلی</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {warehouses.map(wh => {
              const whBalances = balances.filter(b => b.warehouseId === wh.id);
              const totalKg = whBalances.reduce((sum, b) => sum + b.physicalKg, 0);
              const totalPcs = whBalances.reduce((sum, b) => (b.unit === 'PCS' ? sum + b.physicalQty : sum), 0);
              const lotsCount = new Set(whBalances.map(b => b.lotNumber).filter(Boolean)).size;

              return (
                <div
                  key={wh.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{wh.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                        {wh.code}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {formatWeightKg(totalKg)}
                      </span>
                      {totalPcs > 0 && (
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          ({formatNumber(totalPcs)} عدد)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>سرپرست: {wh.managerName || '—'}</span>
                    <span>{lotsCount > 0 ? `${lotsCount} رول/بچ فعال` : `${wh.locations.length} موقعیت`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SAPCO Active Contracts Glance (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-slate-600" />
                سهمیه‌های فعال ورق ساپکو
              </h2>
              <button
                onClick={onNavigateToSapco}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                دفتر سهمیه‌ها
              </button>
            </div>

            <div className="space-y-3">
              {contracts.slice(0, 3).map(c => {
                const consumedPercent = c.allocatedWeightKg > 0
                  ? Math.round((c.totalConsumedKg / c.allocatedWeightKg) * 100)
                  : 0;

                return (
                  <div key={c.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{c.contractNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono">
                        {c.materialGrade}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">{c.title}</div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>مانده: {formatWeightKg(c.closingBalanceKg)}</span>
                        <span>{toPersianDigits(consumedPercent)}٪ مصرف</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            consumedPercent > 80 ? 'bg-rose-500' : 'bg-slate-700'
                          }`}
                          style={{ width: `${Math.min(100, consumedPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={onNavigateToSapco}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>مشاهده صورتحساب کامل ساپکو</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Business Rules Reminder Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>اصول کنترل کیفیت و انبارداری KPIMS:</strong> عدم ثبت موجودی منفی، ثبت اتمیک تراکنش‌ها در سرور، تفکیک رول‌های امانی ساپکو و ثبت اصلاحات با صدور سند معکوس جبرانی.
          </span>
        </div>
        <button
          onClick={onNavigateToLedger}
          className="text-slate-800 hover:text-slate-900 font-semibold underline underline-offset-4 cursor-pointer"
        >
          دفتر روزنامه تراکنش‌ها
        </button>
      </div>
    </div>
  );
};
