import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Search,
  FileText,
  ScrollText,
  Layers,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Scale,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  BellRing,
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  FileSignature,
  CalendarDays,
  MoreHorizontal,
  Truck,
} from 'lucide-react';
import {
  Part,
  PartCategory,
  WarehouseDefinition,
  DetailedStockBalance,
  InventoryDocument,
  SapcoContract,
  SapcoContractLedgerEntry,
  InventoryDashboardMetrics,
  StageInventorySummary,
  PhysicalCoil,
  CustomerDefinition,
  WAREHOUSES_LIST,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';
import { InventoryDashboard } from './InventoryDashboard';
import { StockInquiryView } from './StockInquiryView';
import { MovementHistoryView } from './MovementHistoryView';
import { SapcoAccountReportView } from './SapcoAccountReportView';
import { InventoryReportView } from '../InventoryReportView';
import { PhysicalCoilsView } from './PhysicalCoilsView';
import { CustomReportsView } from './CustomReportsView';
import { DataImportExportView } from './DataImportExportView';
import { ContractsManagementView } from './ContractsManagementView';
import { ReceiptFormModal } from './ReceiptFormModal';
import { IssueFormModal } from './IssueFormModal';
import { TransferFormModal } from './TransferFormModal';
import { AdjustmentFormModal } from './AdjustmentFormModal';
import { ReturnFromProductionModal } from './ReturnFromProductionModal';
import { InventoryModuleSkeleton } from '../ui/Skeleton';

export type InventorySubTab =
  | 'DASHBOARD'
  | 'INQUIRY'
  | 'COILS'
  | 'CONTRACTS'
  | 'ALERTS'
  | 'MOVEMENT'
  | 'CUSTOM_REPORTS'
  | 'IMPORT_EXPORT'
  | 'SAPCO'
  | 'STAGES';

interface InventoryModuleViewProps {
  parts: Part[];
  stageBalances: StageInventorySummary[];
  currentUser: {
    uid: string;
    displayName: string;
    role: string;
  };
  initialSubTab?: InventorySubTab;
  initialActionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER' | null;
  initialReceiptDraft?: any;
  initialIssueDraft?: any;
  onClearInitialAction?: () => void;
  onGlobalRefresh?: () => Promise<void>;
  onNavigateToPlanning?: () => void;
  onSubTabChange?: (tab: InventorySubTab) => void;
}

export interface ReorderAlertItem {
  part: Part;
  currentStock: number;
  reorderPoint: number;
  shortageAmount: number;
  coveragePercent: number;
  severity: 'CRITICAL' | 'WARNING';
  locationsSummary: string[];
}

export const InventoryModuleView: React.FC<InventoryModuleViewProps> = ({
  parts,
  stageBalances,
  currentUser,
  initialSubTab,
  initialActionModal,
  initialReceiptDraft,
  initialIssueDraft,
  onClearInitialAction,
  onGlobalRefresh,
  onNavigateToPlanning,
  onSubTabChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>(initialSubTab || 'DASHBOARD');

  const handleSelectSubTab = (tab: InventorySubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSecondaryTabs, setShowSecondaryTabs] = useState(false);

  // Dedicated Reorder Alerts Page Filters
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<'ALL' | PartCategory>('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [alertSearchQuery, setAlertSearchQuery] = useState('');

  // Sync when parent deep-links to a specific inventory sub-tab
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Core Inventory Data
  const [metrics, setMetrics] = useState<InventoryDashboardMetrics | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseDefinition[]>(WAREHOUSES_LIST);
  const [balances, setBalances] = useState<DetailedStockBalance[]>([]);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [contracts, setContracts] = useState<SapcoContract[]>([]);
  const [customers, setCustomers] = useState<CustomerDefinition[]>([]);
  const [coils, setCoils] = useState<PhysicalCoil[]>([]);
  const [sapcoLedger, setSapcoLedger] = useState<SapcoContractLedgerEntry[]>([]);

  // Modal States
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueModalPreset, setIssueModalPreset] = useState<any>(null);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  useEffect(() => {
    if (initialActionModal === 'RECEIPT') setIsReceiptOpen(true);
    else if (initialActionModal === 'ISSUE') {
      setIssueModalPreset(initialIssueDraft || null);
      setIsIssueOpen(true);
    }
    else if (initialActionModal === 'RETURN') setIsReturnOpen(true);
    else if (initialActionModal === 'TRANSFER') setIsTransferOpen(true);
    if (initialActionModal && onClearInitialAction) {
      onClearInitialAction();
    }
  }, [initialActionModal, initialIssueDraft, onClearInitialAction]);

  // Auto-clear notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Inventory Data
  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, whRes, inquiryRes, docsRes, sapcoRes, coilsRes, contractsRes, custRes] = await Promise.all([
        fetch('/api/inventory/dashboard-metrics').then(r => r.json()),
        fetch('/api/inventory/warehouses').then(r => r.json()),
        fetch('/api/inventory/stock-inquiry').then(r => r.json()),
        fetch('/api/inventory/documents').then(r => r.json()),
        fetch('/api/inventory/sapco-account').then(r => r.json()),
        fetch('/api/inventory/coils').then(r => r.json()),
        fetch('/api/inventory/contracts').then(r => r.json()),
        fetch('/api/customers').then(r => r.json()),
      ]);

      if (metricsRes?.success && metricsRes.data) setMetrics(metricsRes.data);
      if (whRes?.success && Array.isArray(whRes.data) && whRes.data.length > 0) setWarehouses(whRes.data);
      if (inquiryRes?.success && Array.isArray(inquiryRes.data)) setBalances(inquiryRes.data);
      if (docsRes?.success && Array.isArray(docsRes.data)) setDocuments(docsRes.data);
      if (coilsRes?.success && Array.isArray(coilsRes.data)) setCoils(coilsRes.data);
      if (custRes?.success && Array.isArray(custRes.data)) setCustomers(custRes.data);
      
      if (contractsRes?.success && Array.isArray(contractsRes.data) && contractsRes.data.length > 0) {
        setContracts(contractsRes.data);
      } else if (sapcoRes?.success) {
        const contractsList = sapcoRes.data?.contracts || sapcoRes.contracts || [];
        setContracts(contractsList);
      }
      
      if (sapcoRes?.success) {
        const ledgerList = sapcoRes.data?.ledger || sapcoRes.ledger || [];
        setSapcoLedger(ledgerList);
      }
    } catch (err) {
      console.error('Error fetching inventory module data:', err);
      setNotification({ type: 'error', message: 'خطا در بارگذاری اطلاعات انبارداری' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Programmatically identify materials where current stock is below the defined reorder point (minStock)
  const reorderAlerts = useMemo<ReorderAlertItem[]>(() => {
    if (!parts || parts.length === 0) return [];

    return parts
      .filter(part => typeof part.minStock === 'number' && part.minStock > 0)
      .map(part => {
        const reorderPoint = part.minStock!;

        // 1. Check stageBalances passed to the module (excluding scrap yard)
        const matchingStageBalances = (stageBalances || []).filter(
          sb => (sb.partId === part.id || sb.partCode === part.code) && sb.stageId !== 'STAGE_SCRAP_YARD'
        );
        const stageStock = matchingStageBalances.reduce(
          (sum, sb) => sum + (part.unit === 'KG' ? sb.totalKg || sb.usableQty : sb.usableQty),
          0
        );

        // 2. Check detailed warehouse balances if loaded (excluding scrap warehouse)
        const matchingDetailedBalances = (balances || []).filter(
          b => (b.partId === part.id || b.partCode === part.code) && b.warehouseId !== 'WH-SCRAP'
        );
        const warehouseStock = matchingDetailedBalances.reduce(
          (sum, b) => sum + (part.unit === 'KG' ? b.availableKg : b.availableQty),
          0
        );

        // Use detailed warehouse stock if tracked there, otherwise stage stock
        const currentStock = matchingDetailedBalances.length > 0 ? warehouseStock : stageStock;

        const locationsSet = new Set<string>();
        matchingDetailedBalances.forEach(b => {
          if (b.availableQty > 0 || b.availableKg > 0) locationsSet.add(b.warehouseName);
        });
        matchingStageBalances.forEach(sb => {
          if (sb.usableQty > 0) locationsSet.add(sb.stageName);
        });

        const shortageAmount = Math.max(0, reorderPoint - currentStock);
        const coveragePercent = reorderPoint > 0 ? Math.min(100, Math.round((currentStock / reorderPoint) * 100)) : 100;
        const severity: 'CRITICAL' | 'WARNING' =
          currentStock <= 0 || coveragePercent <= 25 ? 'CRITICAL' : 'WARNING';

        return {
          part,
          currentStock,
          reorderPoint,
          shortageAmount,
          coveragePercent,
          severity,
          locationsSummary: Array.from(locationsSet),
        };
      })
      .filter(item => item.currentStock < item.reorderPoint)
      .sort((a, b) => a.coveragePercent - b.coveragePercent || b.shortageAmount - a.shortageAmount);
  }, [parts, stageBalances, balances]);

  const filteredReorderAlerts = useMemo(() => {
    return reorderAlerts.filter(item => {
      if (alertCategoryFilter !== 'ALL' && item.part.category !== alertCategoryFilter) return false;
      if (alertSeverityFilter !== 'ALL' && item.severity !== alertSeverityFilter) return false;
      if (alertSearchQuery.trim()) {
        const q = alertSearchQuery.trim().toLowerCase();
        const matchName = item.part.name.toLowerCase().includes(q);
        const matchCode = item.part.code.toLowerCase().includes(q);
        const matchGrade = item.part.materialGrade?.toLowerCase().includes(q);
        const matchSapco = item.part.sapcoCode?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchGrade && !matchSapco) return false;
      }
      return true;
    });
  }, [reorderAlerts, alertCategoryFilter, alertSeverityFilter, alertSearchQuery]);

  const criticalAlertsCount = useMemo(
    () => reorderAlerts.filter(a => a.severity === 'CRITICAL').length,
    [reorderAlerts]
  );

  const rawMaterialAlertsCount = useMemo(
    () => reorderAlerts.filter(a => a.part.category === 'RAW_MATERIAL').length,
    [reorderAlerts]
  );

  // Handle Document Creation from Modals
  const handleCreateDocument = async (payload: any) => {
    try {
      const enrichedPayload = {
        ...payload,
        createdByUid: currentUser.uid,
        createdByName: currentUser.displayName,
      };

      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت سند انبار' };
      }

      setNotification({
        type: 'success',
        message: data.message || `سند شماره ${data.data.documentNumber} با موفقیت ثبت و موجودی انبار به‌روزرسانی شد.`,
      });

      await loadInventoryData();
      if (onGlobalRefresh) await onGlobalRefresh();

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Reversal of Document
  const handleReverseDocument = async (documentId: string, reason: string) => {
    try {
      const res = await fetch(`/api/inventory/documents/${documentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          reversedByUid: currentUser.uid,
          reversedByName: currentUser.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'خطا در ابطال سند' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'سند معکوس صادر شد و وضعیت سند اصلی به ابطال‌شده تغییر یافت.',
      });

      await loadInventoryData();
      if (onGlobalRefresh) await onGlobalRefresh();

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Primary daily sub-tabs vs secondary specialized tabs (so the user never feels drowned in tabs)
  const primaryTabs: { id: InventorySubTab; label: string; icon: any; badge?: number; badgeColor?: string }[] = [
    { id: 'DASHBOARD', label: 'پیشخوان انبار', icon: Boxes },
    { id: 'INQUIRY', label: 'موجودی و استعلام', icon: Search },
    { id: 'COILS', label: 'رول‌های ورق و کویل‌پک', icon: Layers, badge: coils.length },
    { id: 'CONTRACTS', label: 'قراردادها و سهمیه مواد', icon: FileSignature, badge: contracts.length },
    {
      id: 'ALERTS',
      label: 'نقطه سفارش و کسری‌ها',
      icon: BellRing,
      badge: reorderAlerts.length,
      badgeColor: criticalAlertsCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950',
    },
    { id: 'MOVEMENT', label: 'اسناد و کاردکس', icon: FileText },
  ];

  const secondaryTabs: { id: InventorySubTab; label: string; icon: any }[] = [
    { id: 'IMPORT_EXPORT', label: 'ورود و خروج اکسل (CSV)', icon: Upload },
    { id: 'CUSTOM_REPORTS', label: 'گزارش‌ساز سفارشی', icon: FileSpreadsheet },
    { id: 'SAPCO', label: 'صورتحساب امانی ساپکو', icon: ScrollText },
  ];

  const isSecondaryActive = secondaryTabs.some(t => t.id === activeSubTab);

  const categoryLabels: Record<PartCategory, string> = {
    RAW_MATERIAL: 'ماده اولیه / ورق',
    WIP_PART: 'نیمه‌ساخته (WIP)',
    FINISHED_GOOD: 'محصول نهایی',
  };

  if (loading && !metrics && balances.length === 0 && coils.length === 0) {
    return <InventoryModuleSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Top Compact Alert Banner */}
      {reorderAlerts.length > 0 && activeSubTab !== 'ALERTS' && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
              <BellRing className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">
                هشدار کسری و نقطه سفارش:
              </span>
              <span className="text-slate-700">
                هم‌اکنون{' '}
                <strong className="font-bold text-amber-900 underline underline-offset-4">
                  {toPersianDigits(reorderAlerts.length)} قلم کالا و ورق
                </strong>{' '}
                پایین‌تر از حداقل موجودی اطمینان قرار دارند
              </span>
              {criticalAlertsCount > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {toPersianDigits(criticalAlertsCount)} مورد بحرانی
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('ALERTS')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>مشاهده و مدیریت کسری‌ها</span>
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* Grafana-Inspired Clean Header & Unified Flat Section Toolbar (No Nested Sub-Tab Rows) */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900">
                مرکز فرماندهی انبار، رول‌های ورق و قراردادها
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                عملیات روزانه انبار را با دکمه‌های سریع انجام دهید یا بخش مورد نظر خود را از فیلتر یکپارچه زیر انتخاب کنید
              </p>
            </div>
          </div>

          {/* Primary Task-Oriented Operations */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsReceiptOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>ثبت رسید کالا / رول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIssueModalPreset({ subType: 'PRODUCTION_LINE', warehouseId: 'WH-RAW' });
                setIsIssueOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
              <span>حواله خروج به خط</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIssueModalPreset({ subType: 'CUSTOMER_DELIVERY', warehouseId: 'WH-FINISHED' });
                setIsIssueOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>تحویل به مشتری</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReturnOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>برگشت از خط</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>انتقال</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdjustmentOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              <span>انبارگردانی</span>
            </button>
          </div>
        </div>

        {/* Single Flat Filter / View Selector Bar (Replaces multi-row sub-tabs) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-slate-500 font-medium">نمای بخش انبار:</span>
              <select
                value={activeSubTab}
                onChange={e => handleSelectSubTab(e.target.value as InventorySubTab)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {[...primaryTabs, ...secondaryTabs].map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Tag Filter Chips (Compact Grafana Tag Style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {primaryTabs.slice(0, 5).map(tab => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectSubTab(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                      isActive
                        ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            کل رول‌های فعال: {toPersianDigits(coils.length)} • قراردادها: {toPersianDigits(contracts.length)}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
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
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* DEDICATED PAGE: Reorder Point Alerts & Material Shortages (ALERTS Sub-Tab) */}
      {activeSubTab === 'ALERTS' && (
        <div className="space-y-4">
          {/* Summary KPI Row for Shortages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 font-medium">کل اقلام زیر نقطه سفارش</div>
              <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {toPersianDigits(reorderAlerts.length)}{' '}
                <span className="text-xs font-normal text-slate-500">قلم کالا</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                مقایسه موجودی آزاد با حداقل اطمینان (Min Stock)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
              <div className="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>وضعیت بحرانی (موجودی صفر یا زیر ۲۵٪)</span>
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-1.5 tabular-nums">
                {toPersianDigits(criticalAlertsCount)}{' '}
                <span className="text-xs font-normal text-rose-500">مورد فوری</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                نیازمند تأمین فوری جهت جلوگیری از توقف خط
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <div className="text-xs text-amber-800 font-semibold">کسری ورق و مواد اولیه</div>
              <div className="text-2xl font-bold text-amber-700 mt-1.5 tabular-nums">
                {toPersianDigits(rawMaterialAlertsCount)}{' '}
                <span className="text-xs font-normal text-amber-700">ردیف ماده اولیه</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                شامل کلاف‌های ورق، پیچ و مهره و قطعات لاستیکی
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-700 font-bold">ارتباط با برنامه‌ریزی تولید (MRP)</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  بررسی تأثیر کسری مواد بر سفارشات باز مشتریان و برنامه شیفت‌های پرسکاری
                </p>
              </div>
              {onNavigateToPlanning && (
                <button
                  type="button"
                  onClick={onNavigateToPlanning}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                  <span>رفتن به ماژول برنامه‌ریزی تولید</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Alerts Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={alertSearchQuery}
                    onChange={e => setAlertSearchQuery(e.target.value)}
                    placeholder="جستجوی نام، کد کالا، گرید ورق یا ساپکو..."
                    className="w-full bg-white border border-slate-200 focus:border-slate-900 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <select
                  value={alertSeverityFilter}
                  onChange={e => setAlertSeverityFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">همه سطوح هشدار</option>
                  <option value="CRITICAL">فقط وضعیت بحرانی</option>
                  <option value="WARNING">نیاز به شارژ عادی</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                {(
                  [
                    { id: 'ALL', label: 'همه اقلام' },
                    { id: 'RAW_MATERIAL', label: 'ورق و مواد اولیه' },
                    { id: 'WIP_PART', label: 'نیمه‌ساخته (WIP)' },
                    { id: 'FINISHED_GOOD', label: 'محصول نهایی' },
                  ] as const
                ).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAlertCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      alertCategoryFilter === cat.id
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredReorderAlerts.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                <span className="font-semibold text-slate-700">
                  هیچ کالایی با فیلترهای انتخابی پایین‌تر از نقطه سفارش قرار ندارد.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">اولیت و وضعیت</th>
                      <th className="py-3 px-4 font-semibold">کد و نام کالا / ورق</th>
                      <th className="py-3 px-4 font-semibold">گروه و مشخصات فنی</th>
                      <th className="py-3 px-4 font-semibold">موجودی آزاد فعلی</th>
                      <th className="py-3 px-4 font-semibold">نقطه سفارش (حداقل)</th>
                      <th className="py-3 px-4 font-semibold">مقدار کسری</th>
                      <th className="py-3 px-4 font-semibold w-44">درصد پوشش اطمینان</th>
                      <th className="py-3 px-4 font-semibold text-left">عملیات تأمین</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredReorderAlerts.map(item => {
                      const isKg = item.part.unit === 'KG';
                      const formatVal = (val: number) =>
                        isKg ? formatWeightKg(val) : `${formatNumber(val)} عدد`;

                      return (
                        <tr key={item.part.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            {item.severity === 'CRITICAL' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>بحرانی</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>نیاز به شارژ</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.part.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              کد: <span className="font-semibold text-slate-700">{item.part.code}</span>
                              {item.part.sapcoCode ? ` • کد ساپکو: ${item.part.sapcoCode}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {categoryLabels[item.part.category]}
                            </span>
                            {(item.part.materialGrade || item.part.thicknessMm) && (
                              <div className="text-[11px] text-slate-500 mt-1">
                                {item.part.materialGrade ? `گرید ${item.part.materialGrade}` : ''}
                                {item.part.thicknessMm ? ` • ضخامت ${toPersianDigits(item.part.thicknessMm)}mm` : ''}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-bold tabular-nums text-slate-900">
                            {formatVal(item.currentStock)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap tabular-nums text-slate-600">
                            {formatVal(item.reorderPoint)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-bold tabular-nums text-rose-600">
                            {formatVal(item.shortageAmount)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1 tabular-nums">
                              <span className="font-bold">{toPersianDigits(item.coveragePercent)}٪</span>
                              <span className="text-[10px] text-slate-400">از نقطه سفارش</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(4, item.coveragePercent)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-left">
                            <button
                              type="button"
                              onClick={() => setIsReceiptOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>ثبت رسید جبرانی</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 1: Dashboard */}
      {activeSubTab === 'DASHBOARD' && (
        <InventoryDashboard
          metrics={metrics}
          contracts={contracts}
          warehouses={warehouses}
          balances={balances}
          loading={loading}
          onRefresh={loadInventoryData}
          onOpenReceipt={() => setIsReceiptOpen(true)}
          onOpenIssue={() => {
            setIssueModalPreset({ subType: 'PRODUCTION_LINE', warehouseId: 'WH-RAW' });
            setIsIssueOpen(true);
          }}
          onOpenCustomerDelivery={() => {
            setIssueModalPreset({ subType: 'CUSTOMER_DELIVERY', warehouseId: 'WH-FINISHED' });
            setIsIssueOpen(true);
          }}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenAdjustment={() => setIsAdjustmentOpen(true)}
          onNavigateToInquiry={() => setActiveSubTab('INQUIRY')}
          onNavigateToSapco={() => setActiveSubTab('CONTRACTS')}
          onNavigateToLedger={() => setActiveSubTab('MOVEMENT')}
        />
      )}

      {/* Sub-Tab: Contracts Management & Product/Material Commitments */}
      {activeSubTab === 'CONTRACTS' && (
        <ContractsManagementView
          contracts={contracts}
          parts={parts}
          coils={coils}
          loading={loading}
          onRefresh={loadInventoryData}
          onViewContractLedger={() => {
            setActiveSubTab('SAPCO');
          }}
          currentUser={currentUser}
        />
      )}

      {/* Sub-Tab 2: Stock Inquiry */}
      {activeSubTab === 'INQUIRY' && (
        <StockInquiryView
          balances={balances}
          parts={parts}
          warehouses={warehouses}
          loading={loading}
          onRefresh={loadInventoryData}
        />
      )}

      {/* Sub-Tab: Physical Coils & Multi-Contract Tracking */}
      {activeSubTab === 'COILS' && (
        <PhysicalCoilsView
          currentUser={currentUser}
          onRefresh={loadInventoryData}
        />
      )}

      {/* Sub-Tab: Customizable Reports */}
      {activeSubTab === 'CUSTOM_REPORTS' && (
        <CustomReportsView />
      )}

      {/* Sub-Tab: Data Import & Export */}
      {activeSubTab === 'IMPORT_EXPORT' && (
        <DataImportExportView
          currentUser={currentUser}
          onSuccess={async () => {
            await loadInventoryData();
            if (onGlobalRefresh) {
              await onGlobalRefresh();
            }
          }}
        />
      )}

      {/* Sub-Tab 3: Movement Ledger */}
      {activeSubTab === 'MOVEMENT' && (
        <MovementHistoryView
          documents={documents}
          warehouses={warehouses}
          loading={loading}
          onRefresh={loadInventoryData}
          onReverseDocument={handleReverseDocument}
        />
      )}

      {/* Sub-Tab 4: SAPCO Quota Account */}
      {activeSubTab === 'SAPCO' && (
        <SapcoAccountReportView
          contracts={contracts}
          ledger={sapcoLedger}
          loading={loading}
          onRefresh={loadInventoryData}
        />
      )}

      {/* Sub-Tab 5: Multi-Stage WIP Balances */}
      {activeSubTab === 'STAGES' && (
        <InventoryReportView
          balances={stageBalances}
          onRefresh={onGlobalRefresh || loadInventoryData}
          loading={loading}
        />
      )}

      {/* Modals */}
      <ReceiptFormModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        parts={parts}
        warehouses={warehouses}
        contracts={contracts}
        initialDraft={initialReceiptDraft}
        onSubmit={handleCreateDocument}
        onItemCreated={loadInventoryData}
      />

      <IssueFormModal
        isOpen={isIssueOpen}
        onClose={() => {
          setIsIssueOpen(false);
          setIssueModalPreset(null);
        }}
        parts={parts}
        warehouses={warehouses}
        customers={customers}
        contracts={contracts}
        balances={balances}
        initialDraft={issueModalPreset || initialIssueDraft}
        onSubmit={handleCreateDocument}
        onItemCreated={loadInventoryData}
      />

      <ReturnFromProductionModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        coils={coils}
        warehouses={warehouses}
        currentUser={currentUser}
        onSuccess={async () => {
          setNotification({
            type: 'success',
            message: 'برگشت ورق / ته‌کلاف از خط تولید با موفقیت ثبت شد و به موجودی انبار اضافه گردید.',
          });
          await loadInventoryData();
          if (onGlobalRefresh) await onGlobalRefresh();
        }}
      />

      <TransferFormModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        parts={parts}
        warehouses={warehouses}
        balances={balances}
        onSubmit={handleCreateDocument}
        onItemCreated={loadInventoryData}
      />

      <AdjustmentFormModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        parts={parts}
        warehouses={warehouses}
        balances={balances}
        onSubmit={handleCreateDocument}
        onItemCreated={loadInventoryData}
      />
    </div>
  );
};
