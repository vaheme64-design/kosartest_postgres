import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Folder,
  ChevronDown,
  ChevronLeft,
  Clock,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  Part,
  Machine,
  Operator,
  Routing,
  StageInventorySummary,
} from '../../types/inventory';
import {
  ManufacturingOrder,
  ManufacturingOperation,
  WipTransfer,
  WipDashboardMetrics,
} from '../../types/productionWip';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { WipDashboardView } from './WipDashboardView';
import { ManufacturingOrdersView } from './ManufacturingOrdersView';
import { InterOperationTransfersView } from './InterOperationTransfersView';
import { WipReconciliationModal } from './WipReconciliationModal';
import { CreateMoModal } from './CreateMoModal';
import { OperationInputModal } from './OperationInputModal';
import { OperationProductionModal } from './OperationProductionModal';
import { OperationTransferModal } from './OperationTransferModal';
import { InventoryReportView } from '../InventoryReportView';
import { WipModuleSkeleton, Skeleton } from '../ui/Skeleton';
import { TraceabilityInquiryView } from './TraceabilityInquiryView';

interface ProductionWipModuleViewProps {
  parts: Part[];
  machines: Machine[];
  operators: Operator[];
  stageBalances: StageInventorySummary[];
  onGlobalRefresh?: () => Promise<void>;
}

type WipViewMode =
  | 'UNIFIED_DIRECTORY'
  | 'TRACEABILITY'
  | 'DASHBOARD'
  | 'ORDERS'
  | 'TRANSFERS'
  | 'STAGES';

export const ProductionWipModuleView: React.FC<ProductionWipModuleViewProps> = ({
  parts,
  machines,
  operators,
  stageBalances,
  onGlobalRefresh,
}) => {
  const [activeView, setActiveView] = useState<WipViewMode>('UNIFIED_DIRECTORY');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Core WIP Data
  const [metrics, setMetrics] = useState<WipDashboardMetrics | null>(null);
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [transfers, setTransfers] = useState<WipTransfer[]>([]);
  const [routings, setRoutings] = useState<Routing[]>([]);

  // Unified Grafana-style Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyActiveQueue, setOnlyActiveQueue] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    orders_group: true,
    transfers_group: true,
  });
  const [expandedMoIds, setExpandedMoIds] = useState<Record<string, boolean>>({});

  // Action Modals State
  const [isCreateMoOpen, setIsCreateMoOpen] = useState(false);
  const [inputModalOp, setInputModalOp] = useState<ManufacturingOperation | null>(null);
  const [prodModalOp, setProdModalOp] = useState<ManufacturingOperation | null>(null);
  const [transferModalContext, setTransferModalContext] = useState<{
    mo: ManufacturingOrder | null;
    op: ManufacturingOperation | null;
  }>({ mo: null, op: null });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [reconciliationMoId, setReconciliationMoId] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadWipData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, mosRes, transfersRes, routingsRes] = await Promise.all([
        fetch('/api/wip/dashboard').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/wip/orders').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/wip/transfers').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/routings').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (mosRes.success && Array.isArray(mosRes.data)) {
        setOrders(mosRes.data);
        if (mosRes.data.length > 0) {
          setExpandedMoIds(prev =>
            Object.keys(prev).length === 0 ? { [mosRes.data[0].id]: true } : prev
          );
        }
      }
      if (transfersRes.success && Array.isArray(transfersRes.data)) {
        setTransfers(transfersRes.data);
      }
      if (routingsRes.success && Array.isArray(routingsRes.data)) {
        setRoutings(routingsRes.data);
      }
    } catch (err) {
      console.error('Error loading WIP module data:', err);
      setNotification({
        type: 'error',
        message: 'خطا در بارگذاری اطلاعات کار در جریان ساخت (WIP)',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWipData();
  }, [loadWipData]);

  // Show shared Skeleton component during initial data loading phase
  if (loading && orders.length === 0 && !metrics) {
    return <WipModuleSkeleton />;
  }

  // API Handlers
  const handleCreateMo = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت دستور کار' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'دستور کار ساخت (MO) با موفقیت صادر شد.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleRecordInput = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/operations/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت ورودی ایستگاه' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'ورودی ایستگاه با موفقیت ثبت شد.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleRecordProduction = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/operations/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت گزارش تولید' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'گزارش تولید و ضایعات ایستگاه با موفقیت ثبت شد.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleCreateTransfer = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت حواله انتقال' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'حواله انتقال بین مراحل صادر شد.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleApproveTransfer = async (transferId: string, notes?: string) => {
    try {
      const res = await fetch(`/api/wip/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedBy: 'اپراتور ایستگاه مقصد',
          notes: notes || 'تأیید دریافت در ایستگاه مقصد',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در تأیید دریافت حواله' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'دریافت قطعات در ایستگاه مقصد تأیید شد.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleRejectTransfer = async (transferId: string, reason: string) => {
    try {
      const res = await fetch(`/api/wip/transfers/${transferId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در رد حواله انتقال' };
      }
      setNotification({
        type: 'success',
        message: data.message || 'حواله انتقال رد شد و موجودی به ایستگاه مبدأ بازگشت.',
      });
      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const filteredOrders = orders.filter(mo => {
    if (statusFilter !== 'ALL' && mo.status !== statusFilter) return false;
    if (onlyActiveQueue) {
      const hasActive = mo.operations.some(
        o =>
          o.waitingInputQty > 0 ||
          o.inProgressQty > 0 ||
          o.readyForTransferQty > 0
      );
      if (!hasActive) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        mo.moNumber.toLowerCase().includes(q) ||
        mo.partName.toLowerCase().includes(q) ||
        mo.partCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMoRow = (moId: string) => {
    setExpandedMoIds(prev => ({ ...prev, [moId]: !prev[moId] }));
  };

  return (
    <div className="space-y-5">
      {/* Grafana-Inspired Clean Header + Single Unified Filter Bar (No Nested Sub-Tabs) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  قطعات در جریان ساخت و ایستگاه‌ها (WIP)
                </h1>
                {metrics?.overallConservationIntegrity && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>تراز پایستگی تایید شده</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیریت یکپارچه دستورهای کار ساخت (MO)، صف ایستگاه‌های پرس و جوش، و حواله‌های انتقال بین مراحل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <button
              type="button"
              onClick={loadWipData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateMoOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              <span>دستور کار جدید (MO)</span>
            </button>
          </div>
        </div>

        {/* Single Flat Search & View Filter Bar (Grafana Reference Style) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجوی شماره دستور کار (MO)، کد قطعه، نام قطعه یا ایستگاه کاری..."
              className="w-full bg-slate-50/70 focus:bg-white border border-slate-200/90 focus:border-slate-400 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* View / Section Filter Dropdown (Replaces Nested Sub-Tabs) */}
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                <Boxes className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-slate-400">نمای بخش:</span>
                <select
                  value={activeView}
                  onChange={e => setActiveView(e.target.value as WipViewMode)}
                  className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="UNIFIED_DIRECTORY">
                    نمای درختی یکپارچه (همه دستورات کار و ایستگاه‌ها)
                  </option>
                  <option value="TRACEABILITY">
                    فرم شناسایی و ردیابی قطعه (استعلام شماره رهگیری و پرینت لیبل)
                  </option>
                  <option value="DASHBOARD">داشبورد گرافیکی گلوگاه‌ها</option>
                  <option value="ORDERS">
                    جدول تفصیلی دستورهای کار ({toPersianDigits(orders.length)})
                  </option>
                  <option value="TRANSFERS">
                    حواله‌های انتقال بین مراحل ({toPersianDigits(transfers.length)})
                  </option>
                  <option value="STAGES">موجودی کل ایستگاه‌های کارخانه</option>
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">وضعیت MO: همه</option>
                  <option value="IN_PROGRESS">در جریان ساخت</option>
                  <option value="RELEASED">صادرشده به سالن</option>
                  <option value="COMPLETED">تکمیل‌شده</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white text-slate-600 cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyActiveQueue}
                  onChange={e => setOnlyActiveQueue(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>فقط دارای موجودی در صف</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              {activeView !== 'UNIFIED_DIRECTORY' && (
                <button
                  type="button"
                  onClick={() => setActiveView('UNIFIED_DIRECTORY')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                >
                  بازگشت به نمای درختی یکپارچه
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Compact 6-Stage Summary Strip (Uses shared Skeleton with block, circle, text during refresh) */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-20 h-3" />
                <Skeleton variant="circle" className="w-4 h-4" />
              </div>
              <Skeleton variant="block" className="w-16 h-6" />
              <Skeleton variant="text" className="w-24 h-2.5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>صف ورودی ایستگاه</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-1">
              {formatNumber(metrics?.totalWaitingQty || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>در حال ساخت پای دستگاه</span>
              <Play className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-1">
              {formatNumber(metrics?.totalInProgressQty || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>آماده انتقال به مرحله بعد</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
              {formatNumber(metrics?.totalReadyForTransferQty || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>در حال انتقال (حواله باز)</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="text-lg font-bold text-orange-700 font-mono mt-1">
              {formatNumber(metrics?.totalInTransitQty || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>محصول تکمیل‌شده</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-1">
              {formatNumber(metrics?.totalCompletedQty || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>ضایعات و دوباره‌کاری</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold text-rose-600 font-mono mt-1">
              {formatNumber(
                (metrics?.totalScrapQty || 0) + (metrics?.totalReworkQty || 0)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Traceability & Part Identification Flow */}
      {activeView === 'TRACEABILITY' && (
        <TraceabilityInquiryView
          parts={parts}
          machines={machines}
          operators={operators}
        />
      )}

      {/* UNIFIED GRAFANA-STYLE DIRECTORY VIEW (Default — Zero Nested Tabs) */}
      {activeView === 'UNIFIED_DIRECTORY' && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>نام دستور کار (MO) / مرحله عملیات و ایستگاه</span>
            <span>تگ‌های وضعیت و عملیات سریع</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Folder 1: Active Manufacturing Orders (Expandable inline) */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('orders_group')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-right"
              >
                <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                  {expandedGroups.orders_group ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  )}
                  <Folder className="w-4 h-4 text-slate-500" />
                  <span>دستورهای کار تولید و مراحل ساخت (Manufacturing Orders)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {toPersianDigits(filteredOrders.length)} دستور کار
                </span>
              </button>

              {expandedGroups.orders_group && (
                <div className="divide-y divide-slate-100">
                  {filteredOrders.map(mo => {
                    const isExpanded = !!expandedMoIds[mo.id];
                    const completedOps = mo.operations.filter(
                      o => o.status === 'COMPLETED'
                    ).length;
                    return (
                      <div key={mo.id} className="bg-white">
                        {/* MO Row */}
                        <div className="pr-8 pl-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/90 transition-colors">
                          <div
                            onClick={() => toggleMoRow(mo.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-900">
                                  {mo.moNumber}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {mo.partName}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ({mo.partCode})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                                <span>
                                  هدف ساخت:{' '}
                                  <strong className="font-mono text-slate-800">
                                    {formatNumber(mo.targetQuantity)}
                                  </strong>
                                </span>
                                <span>
                                  تکمیل نهایی:{' '}
                                  <strong className="font-mono text-emerald-700">
                                    {formatNumber(mo.completedQuantity)}
                                  </strong>
                                </span>
                                <span>
                                  ضایعات:{' '}
                                  <strong className="font-mono text-rose-600">
                                    {formatNumber(mo.totalScrapQuantity)}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end md:self-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {toPersianDigits(completedOps)} از{' '}
                              {toPersianDigits(mo.operations.length)} مرحله
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              {mo.status === 'IN_PROGRESS'
                                ? 'در جریان ساخت'
                                : mo.status === 'COMPLETED'
                                ? 'تکمیل‌شده'
                                : 'صادرشده'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setReconciliationMoId(mo.id)}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                            >
                              تراز پایستگی
                            </button>
                          </div>
                        </div>

                        {/* Inline Operations Rows (Flat under the MO) */}
                        {isExpanded && (
                          <div className="bg-slate-50/60 border-t border-slate-100 divide-y divide-slate-100">
                            {mo.operations.map(op => (
                              <div
                                key={op.id}
                                className="pr-14 pl-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
                                    {op.stepCode}
                                  </span>
                                  <div>
                                    <span className="font-semibold text-slate-800">
                                      {op.stepName}
                                    </span>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
                                      <span>صف: {formatNumber(op.waitingInputQty)}</span>
                                      <span>پای دستگاه: {formatNumber(op.inProgressQty)}</span>
                                      <span className="text-emerald-700 font-bold">
                                        آماده انتقال: {formatNumber(op.readyForTransferQty)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => setInputModalOp(op)}
                                    className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                                  >
                                    ثبت ورودی
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProdModalOp(op)}
                                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                                  >
                                    ثبت تولید / ضایعات
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTransferModalContext({ mo, op });
                                      setIsTransferModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                                  >
                                    انتقال به مرحله بعد
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Folder 2: Pending & Recent Transfers */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('transfers_group')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-right"
              >
                <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                  {expandedGroups.transfers_group ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  )}
                  <Folder className="w-4 h-4 text-slate-500" />
                  <span>حواله‌های انتقال بین مراحل (Inter-Operation Transfers)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {toPersianDigits(transfers.length)} حواله
                </span>
              </button>

              {expandedGroups.transfers_group && (
                <div className="divide-y divide-slate-100">
                  {transfers.slice(0, 6).map(tr => (
                    <div
                      key={tr.id}
                      className="pr-10 pl-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/90"
                    >
                      <div className="flex items-center gap-2.5">
                        <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {tr.transferNumber} — {tr.partName} ({tr.moNumber})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            از {tr.fromStepName} به {tr.toStepName} • تعداد:{' '}
                            <strong className="font-mono text-slate-800">
                              {formatNumber(tr.quantity)} عدد
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            tr.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tr.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {tr.status === 'APPROVED'
                            ? 'تحویل‌گرفته در ایستگاه مقصد'
                            : tr.status === 'REJECTED'
                            ? 'رد شده'
                            : 'در انتظار تایید دریافت'}
                        </span>
                        {tr.status === 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTransfer(tr.id)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            تایید دریافت
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Specific Filtered Views when chosen from the View Dropdown */}
      {activeView === 'DASHBOARD' && (
        <WipDashboardView
          metrics={metrics}
          orders={orders}
          loading={loading}
          onRefresh={loadWipData}
          onOpenCreateMo={() => setIsCreateMoOpen(true)}
          onOpenTransfer={() => {
            if (orders.length > 0 && orders[0].operations.length > 0) {
              setTransferModalContext({ mo: orders[0], op: orders[0].operations[0] });
              setIsTransferModalOpen(true);
            }
          }}
          onSelectMo={() => setActiveView('ORDERS')}
          onNavigateToOrders={() => setActiveView('ORDERS')}
          onNavigateToTransfers={() => setActiveView('TRANSFERS')}
        />
      )}

      {activeView === 'ORDERS' && (
        <ManufacturingOrdersView
          orders={filteredOrders}
          loading={loading}
          onRefresh={loadWipData}
          onOpenCreateMo={() => setIsCreateMoOpen(true)}
          onOpenInput={op => setInputModalOp(op)}
          onOpenProduction={op => setProdModalOp(op)}
          onOpenTransfer={(mo, op) => {
            setTransferModalContext({ mo, op });
            setIsTransferModalOpen(true);
          }}
          onOpenReconciliation={moId => setReconciliationMoId(moId)}
        />
      )}

      {activeView === 'TRANSFERS' && (
        <InterOperationTransfersView
          transfers={transfers}
          loading={loading}
          onRefresh={loadWipData}
          onApproveTransfer={handleApproveTransfer}
          onRejectTransfer={handleRejectTransfer}
        />
      )}

      {activeView === 'STAGES' && (
        <InventoryReportView
          balances={stageBalances}
          onRefresh={onGlobalRefresh || loadWipData}
          loading={loading}
        />
      )}

      {/* Action Modals */}
      <CreateMoModal
        isOpen={isCreateMoOpen}
        onClose={() => setIsCreateMoOpen(false)}
        parts={parts}
        routings={routings}
        onSubmit={handleCreateMo}
      />

      <OperationInputModal
        isOpen={!!inputModalOp}
        onClose={() => setInputModalOp(null)}
        operation={inputModalOp}
        machines={machines}
        operators={operators}
        onSubmit={handleRecordInput}
      />

      <OperationProductionModal
        isOpen={!!prodModalOp}
        onClose={() => setProdModalOp(null)}
        operation={prodModalOp}
        onSubmit={handleRecordProduction}
      />

      <OperationTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        mo={transferModalContext.mo}
        fromOperation={transferModalContext.op}
        onSubmit={handleCreateTransfer}
      />

      <WipReconciliationModal
        isOpen={!!reconciliationMoId}
        onClose={() => setReconciliationMoId(null)}
        moId={reconciliationMoId}
      />
    </div>
  );
};
