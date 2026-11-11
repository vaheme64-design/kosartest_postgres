import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Package,
  Send,
  GitBranch,
  Clock,
  Building2,
  FileText,
  Calculator,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  CustomerOrder,
  PartNetRequirement,
  ProductionPlanSuggestion,
  PlanningDashboardMetrics,
} from '../../types/productionPlanning';
import { Part, Machine, DieMold, Routing } from '../../types/inventory';
import { PlanningDashboardView } from './PlanningDashboardView';
import { MachineRecommendationView } from './MachineRecommendationView';
import { NewCustomerOrderModal } from './NewCustomerOrderModal';
import { MrpModuleView } from './MrpModuleView';
import { ConsumablesForecastView } from './ConsumablesForecastView';
import { DailyProductionScheduleView } from './DailyProductionScheduleView';
import { ErpProductionWorkbenchView } from '../production/ErpProductionWorkbenchView';
import { ProductionWorkflowDocumentationView } from './ProductionWorkflowDocumentationView';
import { MachineCapacityTimelineView } from './MachineCapacityTimelineView';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { PlanningModuleSkeleton } from '../ui/Skeleton';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import { useErpRouter } from '../../context/RouterContext';

export type PlanningSubTabKey =
  | 'erp_workbench'
  | 'workflow_doc'
  | 'dashboard'
  | 'daily_schedule'
  | 'capacity_planning'
  | 'mrp'
  | 'consumables'
  | 'recommendations'
  | 'orders'
  | 'approved_plans';

interface ProductionPlanningModuleViewProps {
  parts: Part[];
  routings?: Routing[];
  machines: Machine[];
  dies: DieMold[];
  initialSubTab?: PlanningSubTabKey;
  onSubTabChange?: (tab: PlanningSubTabKey) => void;
  onGlobalRefresh?: () => Promise<void>;
}

export const ProductionPlanningModuleView: React.FC<ProductionPlanningModuleViewProps> = ({
  parts,
  routings = [],
  machines,
  dies,
  initialSubTab = 'mrp',
  onSubTabChange,
  onGlobalRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PlanningSubTabKey>(
    initialSubTab === 'erp_workbench' ? 'mrp' : initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab === 'erp_workbench' ? 'mrp' : initialSubTab);
    }
  }, [initialSubTab]);

  const router = useErpRouter();
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();

  const handleSelectSubTab = (tab: PlanningSubTabKey) => {
    setActiveSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
    router.navigate({ planningSubTab: tab });
  };

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<PlanningDashboardMetrics | null>(null);
  const [netRequirements, setNetRequirements] = useState<PartNetRequirement[]>([]);
  const [suggestions, setSuggestions] = useState<ProductionPlanSuggestion[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [focusedMachineCode, setFocusedMachineCode] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null);

  // Search & Filter in Orders
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const loadPlanningData = async () => {
    setLoading(true);
    try {
      const [metricsRes, netRes, sugRes, ordersRes] = await Promise.all([
        fetch('/api/planning/dashboard-metrics').then(r => r.json()),
        fetch('/api/planning/net-requirements').then(r => r.json()),
        fetch('/api/planning/suggestions').then(r => r.json()),
        fetch('/api/planning/customer-orders').then(r => r.json()),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (netRes.success) setNetRequirements(netRes.data);
      if (sugRes.success) {
        setSuggestions(sugRes.data);
        if (!selectedSuggestionId && sugRes.data.length > 0) {
          setSelectedSuggestionId(sugRes.data[0].id);
        }
      }
      if (ordersRes.success) {
        try {
          const cached = localStorage.getItem('kpims_customer_orders_v2');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomerOrders(parsed);
              return;
            }
          }
        } catch {
          // ignore
        }
        setCustomerOrders(ordersRes.data);
      }
    } catch (err) {
      console.error('Failed to load planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanningData();
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/planning/suggestions/regenerate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadPlanningData();
        if (onGlobalRefresh) await onGlobalRefresh();
      }
    } catch (err) {
      console.error('Failed to regenerate plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomerOrder = async (payload: any) => {
    try {
      const res = await fetch('/api/planning/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت سفارش' };
      }

      const newOrder: CustomerOrder = data.data || {
        id: `ORD-${Date.now()}`,
        orderNumber: payload.orderNumber || `SO-SAPCO-${Date.now().toString().slice(-4)}`,
        customerName: payload.customerName,
        contractNumber: payload.contractNumber,
        orderDate: new Date().toISOString(),
        dueDate: payload.dueDate,
        status: 'OPEN',
        priority: payload.priority,
        notes: payload.notes,
        lines: payload.lines,
      };
      const updated = [newOrder, ...customerOrders];
      setCustomerOrders(updated);
      try {
        localStorage.setItem('kpims_customer_orders_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }

      recordAudit({
        moduleName: 'برنامه‌ریزی تولید',
        actionType: 'CREATE',
        title: `ثبت سفارش جدید ${newOrder.orderNumber}`,
        details: `سفارش مشتری ${payload.customerName} با اولویت ${payload.priority === 1 ? 'فوری' : 'عادی'} ایجاد گردید.`,
      });

      await loadPlanningData();
      if (onGlobalRefresh) await onGlobalRefresh();
      setPlanToast('سفارش مشتری با موفقیت افزوده شد و الزامات MRP بروزرسانی گردید.');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای شبکه' };
    }
  };

  const handleUpdateCustomerOrder = async (orderId: string, payload: any) => {
    try {
      const updated = customerOrders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          customerName: payload.customerName,
          contractNumber: payload.contractNumber,
          dueDate: payload.dueDate,
          priority: payload.priority,
          notes: payload.notes,
          lines: payload.lines,
        };
      });
      setCustomerOrders(updated);
      try {
        localStorage.setItem('kpims_customer_orders_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }

      await fetch(`/api/planning/customer-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      recordAudit({
        moduleName: 'برنامه‌ریزی تولید',
        actionType: 'UPDATE',
        title: `ویرایش سفارش ${orderId}`,
        details: `بروزرسانی تیراژ، موعد تحویل و اولویت (${payload.priority === 1 ? 'فوری' : 'عادی'})`,
      });

      setPlanToast('تغییرات سفارش با موفقیت ذخیره و در الگوریتم MRP اعمال شد.');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ویرایش سفارش' };
    }
  };

  const handleDeleteCustomerOrder = (order: CustomerOrder) => {
    requestConfirm({
      title: `حذف سفارش تعهد تحویل ${order.orderNumber}`,
      message: `آیا از حذف سفارش ${order.orderNumber} مشتری «${order.customerName}» اطمینان دارید؟ با حذف این سفارش، مقادیر تقاضای خالص MRP مجدداً متوازن خواهند شد.`,
      confirmLabel: 'بله، سفارش حذف شود',
      cancelLabel: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        const prevSnap = [...customerOrders];
        const nextList = customerOrders.filter(o => o.id !== order.id);
        setCustomerOrders(nextList);
        try {
          localStorage.setItem('kpims_customer_orders_v2', JSON.stringify(nextList));
          await fetch(`/api/planning/customer-orders/${order.id}`, { method: 'DELETE' });
        } catch {
          // ignore
        }

        recordAudit({
          moduleName: 'برنامه‌ریزی تولید',
          actionType: 'SOFT_DELETE',
          title: `حذف سفارش ${order.orderNumber}`,
          details: `سفارش مشتری ${order.customerName} با اولویت ${order.priority === 1 ? 'فوری' : 'عادی'} حذف شد.`,
        });

        showUndoToast({
          title: `سفارش ${order.orderNumber} با موفقیت حذف گردید`,
          onUndo: () => {
            setCustomerOrders(prevSnap);
            try {
              localStorage.setItem('kpims_customer_orders_v2', JSON.stringify(prevSnap));
            } catch {
              // ignore
            }
          },
        });
      },
    });
  };

  const handleQuickUpdatePriority = (orderId: string, newPriority: 1 | 2 | 3) => {
    const updated = customerOrders.map(o => (o.id === orderId ? { ...o, priority: newPriority } : o));
    setCustomerOrders(updated);
    try {
      localStorage.setItem('kpims_customer_orders_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
    recordAudit({
      moduleName: 'برنامه‌ریزی تولید',
      actionType: 'UPDATE',
      title: `تغییر اولویت سفارش ${orderId}`,
      details: `اولویت به ${newPriority === 1 ? 'فوری' : newPriority === 2 ? 'عادی' : 'مازاد'} تغییر یافت.`,
    });
    setPlanToast(`اولویت سفارش به ${newPriority === 1 ? 'فوری' : newPriority === 2 ? 'عادی' : 'مازاد'} بروزرسانی شد.`);
  };

  const handleApprovePlan = async (id: string, approvedBy: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در تصویب برنامه' };
      }
      await loadPlanningData();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const handleReleaseMo = async (id: string, releasedBy: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/release-mo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releasedBy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در آزادسازی به MO' };
      }
      await loadPlanningData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true, message: data.message, moId: data.data?.manufacturingOrder?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const handleRevisePlan = async (id: string, changeReason: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ایجاد بازنگری' };
      }
      await loadPlanningData();
      return { success: true, message: data.message, newPlanId: data.data?.newPlan?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const navigateToRecommendationsForPart = (partId?: string) => {
    if (partId) {
      const matchingSuggestion = suggestions.find(s => s.partId === partId);
      if (matchingSuggestion) {
        setSelectedSuggestionId(matchingSuggestion.id);
      }
    }
    handleSelectSubTab('recommendations');
  };

  const filteredOrders = customerOrders.filter(o => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    if (orderSearchTerm) {
      const q = orderSearchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.contractNumber.toLowerCase().includes(q) ||
        o.lines.some(l => l.partName.toLowerCase().includes(q) || l.partCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const approvedPlans = suggestions.filter(
    s => s.approvalStatus === 'APPROVED' || s.approvalStatus === 'CONVERTED_TO_MO'
  );

  const [planToast, setPlanToast] = useState<string | null>(null);

  if (loading && !metrics && suggestions.length === 0 && customerOrders.length === 0) {
    return <PlanningModuleSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Clean Enterprise Header & Section Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              برنامه‌ریزی کلان تولید و نیازسنجی مواد (MRP)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              سفارشات ساپکو، انفجار BOM، محاسبه نیاز خالص ورق و تخصیص پرس‌ها
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={loadPlanningData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت سفارش مشتری</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'mrp', label: '۱. انفجار BOM و نیاز ورق (MRP)' },
            { id: 'capacity_planning', label: '۲. تقویم ظرفیت ماشین‌آلات (Capacity Planning)' },
            { id: 'orders', label: `۳. سفارشات مشتریان (${toPersianDigits(customerOrders.length)})` },
            { id: 'recommendations', label: `۴. پیشنهاد برنامه و پرس (${toPersianDigits(suggestions.length)})` },
            { id: 'daily_schedule', label: '۵. تقویم روزانه سالن‌ها' },
            { id: 'dashboard', label: '۶. موازنه تقاضا و ظرفیت' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSubTab(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {planToast && (
        <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{planToast}</span>
          </div>
          <button type="button" onClick={() => setPlanToast(null)} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tab 0: ERP 5-Stage Workbench (SAP PP / Odoo MRP / Daily Roll-Forward) */}
      {activeSubTab === 'erp_workbench' && (
        <ErpProductionWorkbenchView parts={parts} routings={routings} onRefreshData={loadPlanningData} />
      )}

      {/* Sub-Tab: SAP PP Production Workflow Documentation */}
      {activeSubTab === 'workflow_doc' && <ProductionWorkflowDocumentationView />}

      {/* 1. Dashboard Sub-Tab */}
      {activeSubTab === 'dashboard' && (
        <PlanningDashboardView
          metrics={metrics}
          netRequirements={netRequirements}
          machines={machines}
          suggestions={suggestions}
          onRegenerate={handleRegenerate}
          onOpenNewOrderModal={() => setIsOrderModalOpen(true)}
          onNavigateToRecommendations={navigateToRecommendationsForPart}
          onNavigateToCapacityGantt={(machineCode?: string) => {
            if (machineCode) setFocusedMachineCode(machineCode);
            handleSelectSubTab('capacity_planning');
          }}
          loading={loading}
        />
      )}

      {/* 1.0. Daily Production Schedule Sub-Tab (برنامه روزانه شرکت به تفکیک سالن) */}
      {activeSubTab === 'daily_schedule' && (
        <DailyProductionScheduleView />
      )}

      {/* 1.05. Machine Capacity Timeline Sub-Tab (تقویم ظرفیت ماشین‌آلات - Capacity Planning) */}
      {activeSubTab === 'capacity_planning' && (
        <MachineCapacityTimelineView
          suggestions={suggestions}
          parts={parts}
          machines={machines}
          initialMachineCode={focusedMachineCode}
        />
      )}

      {/* 1.1. MRP & Material Requirements Forecast Sub-Tab */}
      {activeSubTab === 'mrp' && (
        <MrpModuleView onRefreshGlobal={onGlobalRefresh} />
      )}

      {/* 1.2. Consumables & Shop-Floor Supplies Forecast Sub-Tab */}
      {activeSubTab === 'consumables' && (
        <ConsumablesForecastView />
      )}

      {/* 2. Machine Recommendations Sub-Tab */}
      {activeSubTab === 'recommendations' && (
        <MachineRecommendationView
          suggestions={suggestions}
          selectedSuggestionId={selectedSuggestionId}
          onSelectSuggestion={setSelectedSuggestionId}
          onApprovePlan={handleApprovePlan}
          onReleaseMo={handleReleaseMo}
          onRevisePlan={handleRevisePlan}
          onRefresh={loadPlanningData}
          loading={loading}
        />
      )}

      {/* 3. Customer Orders Sub-Tab */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در سفارشات ساپکو، قطعات..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 w-64 focus:outline-none focus:border-slate-900"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="OPEN">سفارشات باز (در حال برنامه‌ریزی)</option>
                <option value="PARTIALLY_FULFILLED">تحویل بخشی</option>
                <option value="FULFILLED">تکمیل شده</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingOrder(null);
                setIsOrderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت تعهد تحویل جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.priority === 1
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : order.priority === 2
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.priority === 1 ? '🔴 اولویت فوری' : order.priority === 2 ? '🔵 اولویت عادی' : '⚪ اولویت مازاد'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customerName}</span>
                      <span className="text-slate-400 font-mono">({order.contractNumber})</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      سفارش فعال
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1 tabular-nums font-mono">
                      تحویل: {formatToJalali(order.dueDate)}
                    </div>
                  </div>
                </div>

                {/* Order Lines */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">اقلام تعهد تحویل:</div>
                  {order.lines.map(line => (
                    <div
                      key={line.id}
                      className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{line.partName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{line.partCode}</div>
                      </div>
                      <div className="text-left tabular-nums">
                        <span className="text-slate-900 font-bold font-mono">
                          {formatNumber(line.orderedQuantity)}
                        </span>{' '}
                        <span className="text-slate-500 text-[10px]">عدد</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    یادداشت: {order.notes}
                  </div>
                )}

                {/* Enterprise Dynamic Action Bar (Edit / Delete / Dynamic Priority) */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">تغییر اولویت:</span>
                    <select
                      value={order.priority}
                      onChange={e => handleQuickUpdatePriority(order.id, Number(e.target.value) as 1 | 2 | 3)}
                      className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 cursor-pointer focus:outline-none"
                    >
                      <option value={1}>🔴 فوری (اولویت ۱)</option>
                      <option value={2}>🔵 عادی (اولویت ۲)</option>
                      <option value={3}>⚪ مازاد (اولویت ۳)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrder(order);
                        setIsOrderModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-indigo-200"
                      title="ویرایش کامل مشخصات و تیراژ سفارش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomerOrder(order)}
                      className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-rose-200"
                      title="حذف سفارش"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Approved Plans Sub-Tab */}
      {activeSubTab === 'approved_plans' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              سوابق برنامه‌های مصوب مدیر تولید و دستور کارهای صادر شده به کارگاه
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              برنامه‌های تأیید شده قابلیت آزادسازی و ایجاد شناسه رسمی دستور کار (MO) در واحد WIP را دارند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedPlans.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                هنوز برنامه‌ای به تصویب نرسیده است. از تب «تخصیص ماشین‌آلات و پیشنهاد برنامه» اقدام به تأیید برنامه‌ها نمایید.
              </div>
            ) : (
              approvedPlans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {plan.planVersion}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium mt-1">
                        قطعه: {plan.partName} <span className="text-slate-400">({plan.partCode})</span>
                      </div>
                    </div>

                    <div className="text-left">
                      {plan.approvalStatus === 'CONVERTED_TO_MO' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          صادر شده به دستور کار
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          مصوب مدیر تولید
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">تیراژ خالص مصوب</div>
                      <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                        {formatNumber(plan.proposedQuantity)}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">ورق مورد نیاز</div>
                      <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                        {formatNumber(plan.materialStatus.requiredWeightKg)} kg
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">موعد تحویل</div>
                      <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                        {formatToJalali(plan.targetDueDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSuggestionId(plan.id);
                        setActiveSubTab('recommendations');
                      }}
                      className="text-xs text-slate-700 hover:text-slate-950 font-semibold cursor-pointer"
                    >
                      مشاهده جزئیات مراحل و ماشین‌ها ←
                    </button>

                    {plan.approvalStatus === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await handleReleaseMo(plan.id, 'سرپرست برنامه‌ریزی');
                          if (res.success) {
                            setPlanToast('دستور کار کارگاهی (MO) با موفقیت صادر و به واحد WIP ارسال شد.');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>صدور رسمی MO</span>
                      </button>
                    )}

                    {plan.approvalStatus === 'CONVERTED_TO_MO' && plan.createdMoId && (
                      <div className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                        MO: {plan.createdMoId}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New / Edit Customer Order Modal */}
      <NewCustomerOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        parts={parts}
        onSubmit={handleCreateCustomerOrder}
        orderToEdit={editingOrder}
        onUpdate={handleUpdateCustomerOrder}
      />
    </div>
  );
};
