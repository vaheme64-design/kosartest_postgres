import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeftRight, CheckCircle2, Loader2, X } from 'lucide-react';

interface MaterialIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const MaterialIssueModal: React.FC<MaterialIssueModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [options, setOptions] = useState<any>({ stockBalances: [], operations: [], warehouses: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sourceStockBalanceId, setSourceStockBalanceId] = useState('');
  const [productionOperationId, setProductionOperationId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [createdByUserId, setCreatedByUserId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weightKg, setWeightKg] = useState('0');
  const [notes, setNotes] = useState('');
  const requestKeyRef = useRef('');

  const selectedStock = options.stockBalances.find((item: any) => item.id === sourceStockBalanceId);
  const targetWarehouse = options.warehouses.find((item: any) => item.id === targetWarehouseId);
  const locations = targetWarehouse?.locations || [];

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingOptions(true);
    setError('');
    setSuccess('');
    fetch('/api/inventory/material-issue-options')
      .then(response => response.json())
      .then(payload => {
        if (cancelled) return;
        if (!payload.success) throw new Error(payload.error || 'دریافت اطلاعات حواله ناموفق بود.');
        setOptions(payload.data);
        setSourceStockBalanceId(payload.data.stockBalances[0]?.id || '');
        setProductionOperationId(payload.data.operations[0]?.id || '');
        setTargetWarehouseId(payload.data.warehouses[0]?.id || '');
        setTargetLocationId(payload.data.warehouses[0]?.locations[0]?.id || '');
        setCreatedByUserId(payload.data.users[0]?.id || '');
        setQuantity('');
        setWeightKg('0');
        setNotes('');
        requestKeyRef.current = '';
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'خطا در دریافت اطلاعات'); })
      .finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (targetWarehouse && !locations.some((item: any) => item.id === targetLocationId)) {
      setTargetLocationId(locations[0]?.id || '');
    }
  }, [targetWarehouseId, targetLocationId, targetWarehouse, locations]);

  const selectedOperation = useMemo(
    () => options.operations.find((item: any) => item.id === productionOperationId),
    [options.operations, productionOperationId],
  );

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const qty = Number(quantity);
    const kg = Number(weightKg);
    if (!selectedStock || !selectedOperation || !targetWarehouseId || !targetLocationId || !createdByUserId || !Number.isFinite(qty) || qty <= 0) {
      setError('قلم موجودی، عملیات، محل مقصد و مقدار حواله را کامل انتخاب کنید.');
      return;
    }
    if (qty > Number(selectedStock.quantityAvailable) || !Number.isFinite(kg) || kg < 0 || kg > Number(selectedStock.weightKgAvailable)) {
      setError('مقدار یا وزن حواله از موجودی آزاد بیشتر است.');
      return;
    }
    if (!requestKeyRef.current) requestKeyRef.current = `MAT-ISSUE-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSubmitting(true);
    try {
      const response = await fetch('/api/inventory/material-issues', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': requestKeyRef.current },
        body: JSON.stringify({
          sourceStockBalanceId,
          productionOperationId,
          targetWarehouseId,
          targetLocationId,
          quantity: qty,
          weightKg: selectedStock.part.unit.code === 'KG' ? qty : kg,
          unitId: selectedStock.part.unitId,
          notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'ثبت حواله انجام نشد.');
      setSuccess(`حواله ${payload.data.documentNumber} با موفقیت ثبت شد.`);
      requestKeyRef.current = '';
      await onSuccess();
      window.setTimeout(onClose, 650);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'خطا در ثبت حواله');
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const inputClass = selectClass;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" dir="rtl">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">حواله مواد غیرکلافی به عملیات تولید</h2>
            <p className="mt-1 text-xs text-slate-500">انتقال پیچ‌ومهره، لاستیک و سایر اقلام از انبار به محل پای‌کار</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="بستن">
            <X size={20} />
          </button>
        </div>

        {loadingOptions ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-500"><Loader2 className="animate-spin" size={18} /> در حال دریافت موجودی و عملیات...</div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-6">
            {options.stockBalances.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">موجودی آزاد مواد غیرکلافی برای حواله پیدا نشد.</div>
            )}
            {options.operations.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">دستور ساخت صادرشده‌ای که پیوند معتبر WIP داشته باشد پیدا نشد.</div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">قلم و موجودی مبدا</span>
                <select className={selectClass} value={sourceStockBalanceId} onChange={e => setSourceStockBalanceId(e.target.value)} required>
                  {options.stockBalances.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.part.partNumber} — {item.part.name} | آزاد: {Number(item.quantityAvailable).toLocaleString('fa-IR')} {item.part.unit.symbol} | {item.warehouse.code}{item.location ? ` / ${item.location.code}` : ''}
                    </option>
                  ))}
                </select>
                {selectedStock && <span className="block text-xs text-slate-500">قرارداد: {selectedStock.contractNumber || '—'} | بچ: {selectedStock.materialLot?.lotNumber || 'بدون بچ'} | مالکیت: {selectedStock.ownership}</span>}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">دستور ساخت و عملیات مقصد</span>
                <select className={selectClass} value={productionOperationId} onChange={e => setProductionOperationId(e.target.value)} required>
                  {options.operations.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.manufacturingOrder.moNumber} — {item.manufacturingOrder.part.partNumber} | مرحله {item.stepNumber}: {item.operation.name}
                    </option>
                  ))}
                </select>
                {selectedOperation && <span className="block text-xs text-slate-500">قطعه تولیدی: {selectedOperation.manufacturingOrder.part.name} | مرحله {selectedOperation.stepNumber}</span>}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">انبار پای‌کار مقصد</span>
                <select className={selectClass} value={targetWarehouseId} onChange={e => setTargetWarehouseId(e.target.value)} required>
                  {options.warehouses.map((item: any) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">تحویل‌گیرنده / ثبت‌کننده حواله</span>
                <select className={selectClass} value={createdByUserId} onChange={e => { setCreatedByUserId(e.target.value); requestKeyRef.current = ''; }} required>
                  {options.users.map((user: any) => <option key={user.id} value={user.id}>{user.fullName}{user.personnelCode ? ` — ${user.personnelCode}` : ''}</option>)}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">موقعیت مقصد</span>
                <select className={selectClass} value={targetLocationId} onChange={e => setTargetLocationId(e.target.value)} required>
                  {locations.map((item: any) => <option key={item.id} value={item.id}>{item.code}</option>)}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">مقدار حواله {selectedStock ? `(${selectedStock.part.unit.symbol})` : ''}</span>
                <input className={inputClass} type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                {selectedStock && <span className="block text-xs text-slate-500">موجودی آزاد: {Number(selectedStock.quantityAvailable).toLocaleString('fa-IR')} {selectedStock.part.unit.symbol}</span>}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">وزن حواله (کیلوگرم)</span>
                <input className={inputClass} type="number" min="0" step="0.001" value={selectedStock?.part.unit.code === 'KG' ? quantity : weightKg} onChange={e => setWeightKg(e.target.value)} disabled={selectedStock?.part.unit.code === 'KG'} />
                <span className="block text-xs text-slate-500">برای اقلام عددی، در صورت نداشتن وزن ثبت‌شده صفر باقی بماند.</span>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">توضیحات</span>
              <textarea className={inputClass} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختیاری" />
            </label>

            {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
            {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{success}</div>}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="max-w-sm text-xs leading-5 text-slate-500">ثبت حواله فقط موجودی خود ماده را به محل عملیات منتقل می‌کند و تعداد WIP قطعه تولیدی را تغییر نمی‌دهد.</p>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">انصراف</button>
                <button type="submit" disabled={submitting || loadingOptions || !options.stockBalances.length || !options.operations.length || !locations.length || !options.users.length} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <ArrowLeftRight size={16} />}
                  ثبت حواله
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
