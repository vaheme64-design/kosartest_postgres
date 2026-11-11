import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  Edit3,
  X,
  AlertCircle,
  Building2,
  Calendar,
  Plus,
} from 'lucide-react';
import { Part, CustomerDefinition, SapcoContract } from '../../types/inventory';
import { CustomerOrder } from '../../types/productionPlanning';
import { QuickEntryModals, QuickCreateEntityType } from '../common/QuickEntryModals';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

interface NewCustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
  orderToEdit?: CustomerOrder | null;
  onUpdate?: (orderId: string, payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const NewCustomerOrderModal: React.FC<NewCustomerOrderModalProps> = ({
  isOpen,
  onClose,
  parts: initialParts,
  onSubmit,
  orderToEdit,
  onUpdate,
}) => {
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localCustomers, setLocalCustomers] = useState<CustomerDefinition[]>([]);
  const [localContracts, setLocalContracts] = useState<SapcoContract[]>([]);
  const [activeQuickModal, setActiveQuickModal] = useState<QuickCreateEntityType | null>(null);

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/customers').then(r => r.json()).catch(() => null),
        fetch('/api/inventory/contracts').then(r => r.json()).catch(() => null),
      ]).then(([custRes, cntRes]) => {
        if (custRes?.success && Array.isArray(custRes.data)) setLocalCustomers(custRes.data);
        if (cntRes?.success && Array.isArray(cntRes.data)) setLocalContracts(cntRes.data);
      });
    }
  }, [isOpen]);

  const [customerName, setCustomerName] = useState('شرکت ساپکو');
  const [contractNumber, setContractNumber] = useState('CNT-SAPCO-1403-Q4');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when orderToEdit is passed
  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName || 'شرکت ساپکو');
      setContractNumber(orderToEdit.contractNumber || 'CNT-SAPCO-1403-Q4');
      setPriority((orderToEdit.priority as 1 | 2 | 3) || 2);
      setNotes(orderToEdit.notes || '');
      setDueDate(orderToEdit.dueDate ? new Date(orderToEdit.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

      const firstLine = orderToEdit.lines?.[0];
      if (firstLine) {
        setSelectedPartId(firstLine.partId || '');
        setQuantity(String(firstLine.orderedQuantity || 1000));
      }
    } else {
      setCustomerName('شرکت ساپکو');
      setContractNumber('CNT-SAPCO-1403-Q4');
      setSelectedPartId('');
      setQuantity('1000');
      setDueDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
      setPriority(2);
      setNotes('');
    }
  }, [orderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) {
      setErrorMsg('لطفاً قطعه مورد تقاضا را انتخاب کنید.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('تعداد سفارش باید یک عدد مثبت باشد.');
      return;
    }

    const part = localParts.find(p => p.id === selectedPartId);
    if (!part) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      customerName: customerName.trim(),
      contractNumber: contractNumber.trim(),
      dueDate,
      priority,
      notes: notes.trim(),
      lines: [
        {
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          orderedQuantity: qty,
          deliveredQuantity: orderToEdit?.lines?.[0]?.deliveredQuantity || 0,
          remainingQuantity: qty,
          dueDate,
        },
      ],
    };

    try {
      let res;
      if (orderToEdit && onUpdate) {
        res = await onUpdate(orderToEdit.id, payload);
      } else {
        res = await onSubmit(payload);
      }

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'خطا در ثبت سفارش');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl">
              {orderToEdit ? <Edit3 className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {orderToEdit ? `ویرایش سفارش ${orderToEdit.orderNumber}` : 'ثبت سفارش تقاضای مشتری (Customer Order)'}
              </h3>
              <p className="text-xs text-slate-500">
                {orderToEdit
                  ? 'بروزرسانی تیراژ، اولویت‌بندی داینامیک و موعد تحویل در تقویم شمسی'
                  : 'محاسبه بلادرنگ الزام خالص تولید و ارزیابی کمبود مواد اولیه'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">مشتری خودروساز</label>
                <button
                  type="button"
                  onClick={() => setActiveQuickModal('CUSTOMER')}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ مشتری جدید</span>
                </button>
              </div>
              <SearchableSelect
                value={customerName}
                onChange={val => setCustomerName(val)}
                placeholder="انتخاب یا جستجوی مشتری..."
                searchPlaceholder="جستجوی نام یا کد مشتری..."
                options={
                  localCustomers.length > 0
                    ? localCustomers.map(c => ({
                        value: c.name,
                        label: c.name,
                        sublabel: c.code,
                        badge: 'خودروساز',
                      }))
                    : [{ value: customerName, label: customerName }]
                }
                onAddNew={() => setActiveQuickModal('CUSTOMER')}
                addNewText="+ ثبت مشتری جدید"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">شماره قرارداد</label>
                <button
                  type="button"
                  onClick={() => setActiveQuickModal('CONTRACT')}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ قرارداد جدید</span>
                </button>
              </div>
              <SearchableSelect
                value={contractNumber}
                onChange={val => setContractNumber(val)}
                placeholder="انتخاب یا جستجوی قرارداد..."
                searchPlaceholder="جستجوی شماره قرارداد یا نام مشتری..."
                options={
                  localContracts.length > 0
                    ? localContracts.map(cnt => ({
                        value: cnt.contractNumber,
                        label: cnt.contractNumber,
                        sublabel: cnt.customerName || cnt.title,
                        badge: `${cnt.allocatedWeightKg ? Math.round(cnt.allocatedWeightKg / 1000) : 0} تن سهمیه`,
                      }))
                    : [{ value: contractNumber, label: contractNumber }]
                }
                onAddNew={() => setActiveQuickModal('CONTRACT')}
                addNewText="+ ثبت قرارداد جدید"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                قطعه خودرویی مورد سفارش <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setActiveQuickModal('PART')}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ تعریف سریع قطعه جدید</span>
              </button>
            </div>
            <SearchableSelect
              value={selectedPartId}
              onChange={val => setSelectedPartId(val)}
              placeholder="-- جستجو و انتخاب قطعه از فهرست قطعات فعال --"
              searchPlaceholder="جستجو با کد قطعه، نام قطعه، یا مدل خودرو..."
              options={localParts.map(p => ({
                value: p.id,
                label: p.name,
                sublabel: `${p.code} • ${p.carModel || 'بدنه'}`,
                badge: p.category === 'FINISHED_GOOD' ? 'محصول نهایی' : 'نیمه‌ساخته',
              }))}
              onAddNew={() => setActiveQuickModal('PART')}
              addNewText="+ تعریف سریع قطعه جدید"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                تعداد سفارش (PCS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <JalaliDatePicker
                value={dueDate}
                onChange={(_, iso) => setDueDate(iso || dueDate)}
                label="موعد تحویل در تقویم شمسی"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                اولویت تولید در الگوریتم MRP <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={1}>🔴 اولویت ۱: فوری و بحرانی (High Priority)</option>
                <option value={2}>🔵 اولویت ۲: عادی و استاندارد (Normal Priority)</option>
                <option value={3}>⚪ اولویت ۳: مازاد / کم‌اهمیت (Low Priority)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">توضیحات سفارش</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تحویل خط تهران / سالن بدنه..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {orderToEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{orderToEdit ? 'ذخیره تغییرات سفارش' : 'ثبت و محاسبه MRP'}</span>
            </button>
          </div>
        </form>
      </div>

      <QuickEntryModals
        activeModal={activeQuickModal}
        onClose={() => setActiveQuickModal(null)}
        defaultPartCategory="FINISHED_GOOD"
        defaultCustomerName={customerName}
        onCreated={(type, item) => {
          if (type === 'CUSTOMER') {
            setLocalCustomers(prev => [item, ...prev]);
            setCustomerName(item.name);
          } else if (type === 'CONTRACT') {
            setLocalContracts(prev => [item, ...prev]);
            setContractNumber(item.contractNumber);
            if (item.customerName) setCustomerName(item.customerName);
          } else if (type === 'PART') {
            setLocalParts(prev => [item, ...prev]);
            setSelectedPartId(item.id);
          }
        }}
      />
    </div>
  );
};
