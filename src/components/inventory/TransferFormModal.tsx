import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Building2,
  Plus,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
} from '../../types/inventory';
import { formatNumber } from '../../utils/formatters';
import { QuickEntryModals, QuickCreateEntityType } from '../common/QuickEntryModals';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onItemCreated?: () => void;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  onClose,
  parts: initialParts,
  warehouses: initialWarehouses,
  balances,
  onSubmit,
  onItemCreated,
}) => {
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localWarehouses, setLocalWarehouses] = useState<WarehouseDefinition[]>(initialWarehouses);
  const [activeQuickModal, setActiveQuickModal] = useState<QuickCreateEntityType | null>(null);
  const [quickWarehouseTarget, setQuickWarehouseTarget] = useState<'SOURCE' | 'TARGET'>('TARGET');

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);
  useEffect(() => {
    setLocalWarehouses(initialWarehouses);
  }, [initialWarehouses]);

  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('WH-RAW');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-WIP-STAMP');
  const [sourceLocationCode, setSourceLocationCode] = useState<string>('LOC-RAW-A1');
  const [targetLocationCode, setTargetLocationCode] = useState<string>('LOC-WIP-S1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (localParts.length > 0 && !selectedPartId) {
      setSelectedPartId(localParts[0].id);
    }
  }, [localParts, selectedPartId]);

  const sourceWh = localWarehouses.find(w => w.id === sourceWarehouseId);
  const targetWh = localWarehouses.find(w => w.id === targetWarehouseId);

  const sourceLots = useMemo(() => {
    return balances.filter(
      b => b.partId === selectedPartId && b.warehouseId === sourceWarehouseId && b.availableQty > 0
    );
  }, [balances, selectedPartId, sourceWarehouseId]);

  React.useEffect(() => {
    if (sourceLots.length > 0) {
      setSelectedLotNumber(sourceLots[0].lotNumber || '');
    } else {
      setSelectedLotNumber('');
    }
  }, [sourceLots]);

  const availableInSource = useMemo(() => {
    const list = balances.filter(b => b.partId === selectedPartId && b.warehouseId === sourceWarehouseId);
    return list.reduce((sum, b) => sum + b.availableQty, 0);
  }, [balances, selectedPartId, sourceWarehouseId]);

  const selectedPart = localParts.find(p => p.id === selectedPartId);
  const requestedQty = Number(quantity) || 0;
  const isOverdraft = requestedQty > availableInSource;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (sourceWarehouseId === targetWarehouseId) {
      setErrorMessage('انبار مبدا و انبار مقصد نمی‌توانند یکسان باشند.');
      return;
    }

    if (requestedQty <= 0) {
      setErrorMessage('مقدار انتقال باید عددی مثبت و بزرگتر از صفر باشد.');
      return;
    }

    if (isOverdraft) {
      setErrorMessage(
        `موجودی قابل استفاده در انبار مبدا کافی نیست. موجودی آزاد مبدا: ${formatNumber(availableInSource)}؛ مقدار درخواستی جهت انتقال: ${formatNumber(requestedQty)}.`
      );
      return;
    }

    setLoading(true);

    const payload = {
      documentType: 'TRANSFER',
      warehouseId: sourceWarehouseId,
      warehouseName: sourceWh?.name,
      targetWarehouseId,
      targetWarehouseName: targetWh?.name,
      ownership: 'COMPANY_OWNED',
      referenceType: 'INTERNAL_TRANSFER',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost: true,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: selectedLotNumber || undefined,
          locationCode: sourceLocationCode,
          targetLocationCode,
          quantity: requestedQty,
          unit: selectedPart?.unit || 'PCS',
          qualityStatus: 'AVAILABLE',
          notes: notes.trim() || undefined,
        },
      ],
    };

    const res = await onSubmit(payload);
    setLoading(false);

    if (res.success) {
      setQuantity('');
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت انتقال بین انبارها');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-purple-600 text-white rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                انتقال کالا و رول بین انبارها (Warehouse Transfer)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                جابجایی فیزیکی رول ورق یا قطعات از انبار مبدا به انبار مقصد با حفظ مالکیت و شماره کویل‌پک
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Visual Source -> Destination Flow */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
            <div className="md:col-span-5 bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>۱. انبار مبدا (خروج از)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickWarehouseTarget('SOURCE');
                    setActiveQuickModal('WAREHOUSE');
                  }}
                  className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ انبار جدید</span>
                </button>
              </div>
              <select
                value={sourceWarehouseId}
                onChange={e => {
                  setSourceWarehouseId(e.target.value);
                  const wh = localWarehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setSourceLocationCode(wh.locations[0]);
                }}
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              >
                {localWarehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div>
                <span className="text-[11px] text-slate-600 block mb-1">جایگاه مبدا:</span>
                <select
                  value={sourceLocationCode}
                  onChange={e => setSourceLocationCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                >
                  {(sourceWh?.locations || ['LOC-01']).map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-1 flex justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </div>

            <div className="md:col-span-5 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>۲. انبار مقصد (ورود به)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickWarehouseTarget('TARGET');
                    setActiveQuickModal('WAREHOUSE');
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ انبار جدید</span>
                </button>
              </div>
              <select
                value={targetWarehouseId}
                onChange={e => {
                  setTargetWarehouseId(e.target.value);
                  const wh = localWarehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setTargetLocationCode(wh.locations[0]);
                }}
                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              >
                {localWarehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div>
                <span className="text-[11px] text-slate-600 block mb-1">جایگاه مقصد:</span>
                <select
                  value={targetLocationCode}
                  onChange={e => setTargetLocationCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                >
                  {(targetWh?.locations || ['LOC-01']).map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Item & Lot Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">
                  انتخاب کالا / ورق جهت انتقال <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveQuickModal('PART')}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ تعریف سریع کالا</span>
                </button>
              </div>
              <select
                value={selectedPartId}
                onChange={e => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold"
              >
                {localParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                انتخاب کویل‌پک / بچ موجود در مبدا
              </label>
              <select
                value={selectedLotNumber}
                onChange={e => setSelectedLotNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono"
              >
                <option value="">همه موجودی آزاد مبدا ({formatNumber(availableInSource)} {selectedPart?.unit})</option>
                {sourceLots.map(l => (
                  <option key={l.id} value={l.lotNumber || ''}>
                    {l.lotNumber} — موجودی آزاد: {formatNumber(l.availableQty)} {l.unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity and Ref */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                مقدار انتقال ({selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مقدار جابجایی..."
                className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none ${
                  isOverdraft ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-300 focus:bg-white focus:border-slate-900'
                }`}
              />
              {isOverdraft && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  مقدار درخواستی بیش از موجودی آزاد انبار مبدا ({formatNumber(availableInSource)}) است.
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                شماره مجوز / حواله جابجایی
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="مثلاً TRF-1403-402"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">توضیحات انتقال</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="علت انتقال بین انبارها..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || isOverdraft || requestedQty <= 0}
              className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'در حال ثبت انتقال...' : 'ثبت قطعی انتقال بین انبارها'}</span>
            </button>
          </div>
        </form>
      </div>

      <QuickEntryModals
        activeModal={activeQuickModal}
        onClose={() => setActiveQuickModal(null)}
        onCreated={(type, item) => {
          if (type === 'PART') {
            setLocalParts(prev => [item, ...prev]);
            setSelectedPartId(item.id);
          } else if (type === 'WAREHOUSE') {
            setLocalWarehouses(prev => [...prev, item]);
            if (quickWarehouseTarget === 'SOURCE') {
              setSourceWarehouseId(item.id);
              if (item.locations?.[0]) setSourceLocationCode(item.locations[0]);
            } else {
              setTargetWarehouseId(item.id);
              if (item.locations?.[0]) setTargetLocationCode(item.locations[0]);
            }
          }
          if (onItemCreated) onItemCreated();
        }}
      />
    </div>
  );
};
