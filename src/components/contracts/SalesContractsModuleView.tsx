import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSignature,
  ShoppingBag,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Building2,
  PackageCheck,
  Edit3,
  History,
  X,
  Save,
  PauseCircle,
  Ban,
} from 'lucide-react';
import {
  Part,
  SapcoContract,
  PhysicalCoil,
  UserRoleProfile,
  ContractRevisionEntry,
} from '../../types/inventory';
import { CustomerOrder } from '../../types/productionPlanning';
import { ContractsManagementView } from '../inventory/ContractsManagementView';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';

export type ContractsSubTab = 'CONTRACTS_QUOTAS' | 'CUSTOMER_ORDERS';

interface SalesContractsModuleViewProps {
  parts: Part[];
  currentUser?: UserRoleProfile;
  initialSubTab?: ContractsSubTab;
  onNavigateToPlanning?: () => void;
  onNavigateToInventoryLedger?: (contractId: string) => void;
  onNavigateToTab?: (...args: any[]) => void;
  onNavigateSubModule?: (...args: any[]) => void;
  onGlobalRefresh?: () => void | Promise<void>;
}

const ORDER_REVISIONS_STORAGE_KEY = 'kpims_order_revisions_v1';

export const SalesContractsModuleView: React.FC<SalesContractsModuleViewProps> = ({
  parts,
  currentUser,
  initialSubTab = 'CONTRACTS_QUOTAS',
  onNavigateToPlanning,
  onNavigateToInventoryLedger,
}) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [activeTab, setActiveTab] = useState<ContractsSubTab>(initialSubTab);
  const [contracts, setContracts] = useState<SapcoContract[]>([]);
  const [coils, setCoils] = useState<PhysicalCoil[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Order Revisions Map persisted in localStorage
  const [orderRevisionsMap, setOrderRevisionsMap] = useState<Record<string, ContractRevisionEntry[]>>(() => {
    try {
      const raw = window.localStorage.getItem(ORDER_REVISIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDER_REVISIONS_STORAGE_KEY, JSON.stringify(orderRevisionsMap));
    } catch {
      // ignore
    }
  }, [orderRevisionsMap]);

  // New Customer Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('ساپکو (ایران‌خودرو)');
  const [contractNumber, setContractNumber] = useState('CNT-SAPCO-1403-Q3');
  const [dueDate, setDueDate] = useState('2026-04-20');
  const [priority, setPriority] = useState<1 | 2 | 3>(1);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(2500);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Edit Customer Order & Revisions Slide-Over Drawer State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderDrawerTab, setOrderDrawerTab] = useState<'EDIT' | 'REVISIONS'>('EDIT');
  const [editOrderCustomer, setEditOrderCustomer] = useState('');
  const [editOrderContractNo, setEditOrderContractNo] = useState('');
  const [editOrderDueDate, setEditOrderDueDate] = useState('');
  const [editOrderPriority, setEditOrderPriority] = useState<1 | 2 | 3>(1);
  const [editOrderStatus, setEditOrderStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'TERMINATED'>('ACTIVE');
  const [editOrderLines, setEditOrderLines] = useState<CustomerOrder['lines']>([]);
  const [editOrderNotes, setEditOrderNotes] = useState('');
  const [editOrderRevReason, setEditOrderRevReason] = useState('');

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  const finishedParts = parts.filter(p => p.category === 'FINISHED_GOOD');

  useEffect(() => {
    if (finishedParts.length > 0 && !selectedPartId) {
      setSelectedPartId(finishedParts[0].id);
    }
  }, [finishedParts, selectedPartId]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [cntRes, coilRes, ordRes] = await Promise.all([
        fetch('/api/inventory/contracts'),
        fetch('/api/inventory/coils'),
        fetch('/api/planning/customer-orders'),
      ]);
      const [cntJson, coilJson, ordJson] = await Promise.all([
        cntRes.json(),
        coilRes.json(),
        ordRes.json(),
      ]);

      if (cntJson.success) setContracts(cntJson.data || []);
      if (coilJson.success) setCoils(coilJson.data || []);
      if (ordJson.success) setCustomerOrders(ordJson.data || []);
    } catch (err) {
      console.error('Error loading contracts & orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const activeDrawerOrder = useMemo(
    () => customerOrders.find(o => o.id === editingOrderId) || null,
    [customerOrders, editingOrderId]
  );

  const openOrderEditDrawer = (order: CustomerOrder, tab: 'EDIT' | 'REVISIONS' = 'EDIT') => {
    setEditingOrderId(order.id);
    setOrderDrawerTab(tab);
    setEditOrderCustomer(order.customerName);
    setEditOrderContractNo(order.contractNumber);
    setEditOrderDueDate(order.dueDate);
    setEditOrderPriority(order.priority);
    const normStatus =
      order.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : order.status === 'TERMINATED' || order.status === 'FULFILLED' || order.status === 'CANCELLED'
        ? 'TERMINATED'
        : 'ACTIVE';
    setEditOrderStatus(normStatus);
    setEditOrderLines(JSON.parse(JSON.stringify(order.lines || [])));
    setEditOrderNotes(order.notes || '');
    setEditOrderRevReason('');
  };

  const handleSaveOrderEdit = () => {
    if (!activeDrawerOrder) return;
    const prevOrders = [...customerOrders];
    const oldTotalQty = (activeDrawerOrder.lines || []).reduce((s, l) => s + l.orderedQuantity, 0);
    const newTotalQty = editOrderLines.reduce((s, l) => s + (Number(l.orderedQuantity) || 0), 0);

    const performSave = async () => {
      const existingRevs = [
        ...(orderRevisionsMap[activeDrawerOrder.id] || activeDrawerOrder.revisions || []),
      ];
      const newRev: ContractRevisionEntry = {
        id: `REV-ORD-${Date.now()}`,
        revisionNumber: existingRevs.length + 1,
        timestamp: new Date().toLocaleString('fa-IR'),
        actor: currentUser?.displayName || 'مدیر فروش و برنامه‌ریزی',
        fieldLabelFa:
          newTotalQty !== oldTotalQty ? 'تیراژ سفارش فروش مشتری' : 'وضعیت اجرایی سفارش فروش',
        oldQty: oldTotalQty,
        newQty: newTotalQty,
        unit: 'عدد',
        oldStatus: activeDrawerOrder.status,
        newStatus: editOrderStatus,
        reasonFa: editOrderRevReason.trim() || 'ویرایش تیراژ / وضعیت سفارش در کشوی سفارشات فروش',
      };

      const nextRevs = [newRev, ...existingRevs];
      const updatedLines = editOrderLines.map(l => ({
        ...l,
        orderedQuantity: Number(l.orderedQuantity) || 0,
        deliveredQuantity: Number(l.deliveredQuantity) || 0,
        remainingQuantity: Math.max(0, (Number(l.orderedQuantity) || 0) - (Number(l.deliveredQuantity) || 0)),
      }));

      setOrderRevisionsMap(prev => ({ ...prev, [activeDrawerOrder.id]: nextRevs }));
      setCustomerOrders(prev =>
        prev.map(o =>
          o.id === activeDrawerOrder.id
            ? {
                ...o,
                customerName: editOrderCustomer,
                contractNumber: editOrderContractNo,
                dueDate: editOrderDueDate,
                priority: editOrderPriority,
                status: editOrderStatus,
                lines: updatedLines,
                notes: editOrderNotes,
                revisions: nextRevs,
              }
            : o
        )
      );

      try {
        await fetch(`/api/planning/customer-orders/${activeDrawerOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: editOrderCustomer,
            contractNumber: editOrderContractNo,
            dueDate: editOrderDueDate,
            priority: editOrderPriority,
            status: editOrderStatus,
            lines: updatedLines,
            notes: editOrderNotes,
            revisions: nextRevs,
            actor: currentUser?.displayName,
            revisionReasonFa: editOrderRevReason.trim(),
          }),
        });
      } catch {
        // local state updated
      }

      recordAudit({
        actionType: 'UPDATE',
        module: 'سفارشات فروش (CustomerOrders)',
        entityId: activeDrawerOrder.id,
        entityCode: activeDrawerOrder.orderNumber,
        summaryFa: `ویرایش سفارش فروش «${activeDrawerOrder.orderNumber}» — تیراژ: ${formatNumber(newTotalQty)} عدد`,
        beforeSnapshot: { totalQty: oldTotalQty, status: activeDrawerOrder.status },
        afterSnapshot: { totalQty: newTotalQty, status: editOrderStatus },
      });

      showUndoToast({
        title: `سفارش فروش «${activeDrawerOrder.orderNumber}» ویرایش شد`,
        description: 'تغییرات تیراژ و وضعیت در تاریخچه سفارش (Revisions) ثبت گردید.',
        onUndo: () => setCustomerOrders(prevOrders),
      });

      setEditOrderRevReason('');
      setOrderDrawerTab('REVISIONS');
    };

    if (editOrderStatus !== 'ACTIVE' || newTotalQty !== oldTotalQty) {
      requestConfirm({
        title: `تأیید ویرایش سفارش فروش «${activeDrawerOrder.orderNumber}»`,
        description: `آیا از ثبت تغییرات تیراژ (${formatNumber(oldTotalQty)} ⬅ ${formatNumber(
          newTotalQty
        )} عدد) و وضعیت سفارش اطمینان دارید؟`,
        consequenceText:
          'این تغییر بلافاصله نیازمندی خالص تولید (MRP) را بروزرسانی کرده و در تاریخچه Revisions ثبت می‌شود.',
        severity: editOrderStatus === 'ACTIVE' ? 'info' : 'warning',
        confirmLabel: 'تأیید و ثبت بازنگری سفارش',
        onConfirm: performSave,
      });
    } else {
      performSave();
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    try {
      const res = await fetch('/api/planning/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber || `SO-SAPCO-1405-${Math.floor(100 + Math.random() * 900)}`,
          customerName,
          contractNumber,
          orderDate: new Date().toISOString().slice(0, 10),
          dueDate,
          priority,
          notes: orderNotes,
          lines: [
            {
              id: `OL-${Date.now()}`,
              orderId: '',
              partId: part.id,
              partCode: part.code,
              partName: part.name,
              orderedQuantity: Number(orderQuantity),
              deliveredQuantity: 0,
              remainingQuantity: Number(orderQuantity),
              dueDate,
            },
          ],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowOrderModal(false);
        setOrderNumber('');
        setOrderNotes('');
        setOrderSuccessMsg('سفارش مشتری با موفقیت ثبت شد و به موتور برنامه‌ریزی تولید و MRP منتقل گردید.');
        setTimeout(() => setOrderSuccessMsg(null), 5000);
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Unified Commercial Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
              مدیریت بازرگانی، قراردادها و سفارشات مشتریان
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            مرکز یکپارچه قراردادهای ساپکو، سهمیه ورق و سفارشات فروش
          </h1>
          <p className="text-xs text-slate-500">
            ثبت و ویرایش کامل قراردادها (فعال / معلق / خاتمه‌یافته)، پیگیری تاریخچه تغییرات تیراژ (Revisions) و سفارشات تحویل محصول
          </p>
        </div>

        {/* Sub-module Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('CONTRACTS_QUOTAS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'CONTRACTS_QUOTAS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileSignature className="w-4 h-4 text-amber-400" />
            <span>قراردادها و سهمیه ورق ({toPersianDigits(contracts.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER_ORDERS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'CUSTOMER_ORDERS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>سفارشات فروش و تعهدات تحویل ({toPersianDigits(customerOrders.length)})</span>
          </button>
        </div>
      </div>

      {orderSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{orderSuccessMsg}</span>
          </div>
          {onNavigateToPlanning && (
            <button
              type="button"
              onClick={onNavigateToPlanning}
              className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده در برنامه‌ریزی و MRP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* TAB 1: CONTRACTS & QUOTAS */}
      {activeTab === 'CONTRACTS_QUOTAS' && (
        <ContractsManagementView
          contracts={contracts}
          parts={parts}
          coils={coils}
          loading={loading}
          onRefresh={fetchAllData}
          onViewContractLedger={onNavigateToInventoryLedger}
          currentUser={{
            uid: currentUser?.uid || 'USR-COMM-01',
            displayName: currentUser?.displayName || 'مدیر بازرگانی و قراردادها',
            role: currentUser?.role || 'مدیر بازرگانی',
          }}
        />
      )}

      {/* TAB 2: CUSTOMER ORDERS */}
      {activeTab === 'CUSTOMER_ORDERS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>فهرست سفارشات قطعی مشتریان (Customer Sales Orders) با قابلیت ویرایش و تاریخچه تیراژ</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                هر سفارش ثبت یا ویرایش‌شده در این بخش مستقیماً به عنوان تقاضای ناخالص (Gross Demand) وارد محاسبات MRP و برنامه تولید می‌شود
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOrderModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>ثبت سفارش جدید مشتری</span>
              </button>

              {onNavigateToPlanning && (
                <button
                  type="button"
                  onClick={onNavigateToPlanning}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <span>بررسی پوشش مواد در MRP</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={fetchAllData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {customerOrders.map(order => {
              const revs = orderRevisionsMap[order.id] || order.revisions || [];
              const isSuspended = order.status === 'SUSPENDED';
              const isTerminated =
                order.status === 'TERMINATED' || order.status === 'FULFILLED' || order.status === 'CANCELLED';

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openOrderEditDrawer(order, 'EDIT')}
                        className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 hover:bg-indigo-700 text-white rounded-md cursor-pointer"
                      >
                        {order.orderNumber}
                      </button>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {order.customerName}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        قرارداد: {order.contractNumber}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                          order.priority === 1
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : order.priority === 2
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.priority === 1 ? 'اولویت ۱ (فوری)' : order.priority === 2 ? 'اولویت ۲ (عادی)' : 'اولویت ۳'}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          isSuspended
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : isTerminated
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isSuspended ? 'معلق (Suspended)' : isTerminated ? 'خاتمه‌یافته (Terminated)' : 'فعال (Active)'}
                      </span>
                      {revs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openOrderEditDrawer(order, 'REVISIONS')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>{toPersianDigits(revs.length)} ویرایش تیراژ</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        موعد تحویل: <strong className="font-mono text-slate-800">{order.dueDate}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => openOrderEditDrawer(order, 'EDIT')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>ویرایش سفارش</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openOrderEditDrawer(order, 'REVISIONS')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <History className="w-3 h-3 text-indigo-600" />
                        <span>تاریخچه تیراژ</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">کد قطعه</th>
                          <th className="py-2 px-3">نام قطعه خودرویی</th>
                          <th className="py-2 px-3">تیراژ سفارش</th>
                          <th className="py-2 px-3">تحویل شده</th>
                          <th className="py-2 px-3">مانده تعهد</th>
                          <th className="py-2 px-3">درصد تحقق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(order.lines || []).map(line => {
                          const pct =
                            line.orderedQuantity > 0
                              ? Math.min(100, Math.round((line.deliveredQuantity / line.orderedQuantity) * 100))
                              : 0;
                          return (
                            <tr key={line.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono text-slate-700">{line.partCode}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{line.partName}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {formatNumber(line.orderedQuantity)} عدد
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-700">
                                {formatNumber(line.deliveredQuantity)} عدد
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                                {formatNumber(line.remainingQuantity)} عدد
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                      className="h-full bg-emerald-600 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span>{toPersianDigits(pct)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: CUSTOMER ORDER EDIT & REVISIONS HISTORY           */}
      {/* ==================================================================== */}
      {activeDrawerOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px] animate-in fade-in duration-150"
          dir="rtl"
          onClick={() => setEditingOrderId(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono text-xs font-bold">
                    {activeDrawerOrder.orderNumber}
                  </span>
                  <h3 className="text-sm font-bold">ویرایش سفارش مشتری و تاریخچه تغییرات تیراژ</h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  مشتری: {activeDrawerOrder.customerName} · قرارداد: {activeDrawerOrder.contractNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderDrawerTab('EDIT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  orderDrawerTab === 'EDIT'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                ۱. ویرایش سفارش و وضعیت
              </button>
              <button
                type="button"
                onClick={() => setOrderDrawerTab('REVISIONS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  orderDrawerTab === 'REVISIONS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                ۲. تاریخچه تغییرات تیراژ (Revisions) (
                {toPersianDigits((orderRevisionsMap[activeDrawerOrder.id] || activeDrawerOrder.revisions || []).length)})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {orderDrawerTab === 'EDIT' ? (
                <>
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-900">وضعیت سفارش (Status):</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditOrderStatus('ACTIVE')}
                        className={`p-2.5 rounded-lg border font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          editOrderStatus === 'ACTIVE'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>فعال</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditOrderStatus('SUSPENDED')}
                        className={`p-2.5 rounded-lg border font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          editOrderStatus === 'SUSPENDED'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>معلق</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditOrderStatus('TERMINATED')}
                        className={`p-2.5 rounded-lg border font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          editOrderStatus === 'TERMINATED'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>خاتمه‌یافته</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">نام مشتری:</label>
                      <input
                        type="text"
                        value={editOrderCustomer}
                        onChange={e => setEditOrderCustomer(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">موعد تحویل:</label>
                      <input
                        type="date"
                        value={editOrderDueDate}
                        onChange={e => setEditOrderDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-bold text-slate-900">ویرایش تیراژ اقلام سفارش:</label>
                    {editOrderLines.map((line, idx) => (
                      <div
                        key={line.id || idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{line.partName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{line.partCode}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">تیراژ:</span>
                          <input
                            type="number"
                            min={1}
                            value={line.orderedQuantity}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              setEditOrderLines(prev =>
                                prev.map((l, i) => (i === idx ? { ...l, orderedQuantity: val } : l))
                              );
                            }}
                            className="w-28 px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">علت تغییر تیراژ (ثبت در تاریخچه Revisions):</label>
                    <input
                      type="text"
                      value={editOrderRevReason}
                      onChange={e => setEditOrderRevReason(e.target.value)}
                      placeholder="مثلاً: اصلاح برنامه هفتگی ساپکو..."
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/40"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {(orderRevisionsMap[activeDrawerOrder.id] || activeDrawerOrder.revisions || []).length === 0 ? (
                    <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      هنوز ویرایشی روی تیراژ این سفارش ثبت نشده است.
                    </div>
                  ) : (
                    (orderRevisionsMap[activeDrawerOrder.id] || activeDrawerOrder.revisions || []).map((rev, i) => (
                      <div key={rev.id || i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                            Rev #{toPersianDigits(rev.revisionNumber || i + 1)}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">{rev.timestamp}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs bg-slate-50 p-2.5 rounded-lg">
                          <span>قبلی: {formatNumber(rev.oldQty)} عدد</span>
                          <span>⬅</span>
                          <strong className="text-indigo-700">جدید: {formatNumber(rev.newQty)} عدد</strong>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          علت: {rev.reasonFa} ({rev.actor})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                بستن
              </button>
              {orderDrawerTab === 'EDIT' && (
                <button
                  type="button"
                  onClick={handleSaveOrderEdit}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>ذخیره تغییرات سفارش</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating New Customer Order */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>ثبت سفارش جدید مشتری (متصل به قرارداد)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">شماره سفارش فروش</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                    placeholder="مثلاً SO-SAPCO-1405-25"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">مشتری / خودروساز</label>
                  <select
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="ساپکو (ایران‌خودرو)">ساپکو (ایران‌خودرو)</option>
                    <option value="سازه‌گستر سایپا">سازه‌گستر سایپا</option>
                    <option value="بهمن موتور">بهمن موتور</option>
                    <option value="بازار یدک (Aftermarket)">بازار یدک (Aftermarket)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">قرارداد مرجع</label>
                  <select
                    value={contractNumber}
                    onChange={e => setContractNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  >
                    {contracts.map(c => (
                      <option key={c.id} value={c.contractNumber}>
                        {c.contractNumber} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">موعد تحویل</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">قطعه مورد سفارش</label>
                  <select
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {finishedParts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">تیراژ سفارش (عدد)</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQuantity}
                    onChange={e => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">اولویت سفارش</label>
                <select
                  value={priority}
                  onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value={1}>اولویت ۱ - بحرانی / خط خودروساز</option>
                  <option value={2}>اولویت ۲ - برنامه عادی ماهیانه</option>
                  <option value={3}>اولویت ۳ - ذخیره احتیاطی</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
                >
                  ثبت سفارش و ارسال به برنامه‌ریزی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
