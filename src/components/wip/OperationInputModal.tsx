import React, { useState } from 'react';
import {
  Play,
  X,
  Cpu,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { ManufacturingOperation } from '../../types/productionWip';
import { Machine, Operator } from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface OperationInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: ManufacturingOperation | null;
  machines: Machine[];
  operators: Operator[];
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const OperationInputModal: React.FC<OperationInputModalProps> = ({
  isOpen,
  onClose,
  operation,
  machines,
  operators,
  onSubmit,
}) => {
  const [quantity, setQuantity] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !operation) return null;

  // Set default values on open
  const availableWaiting = operation.waitingInputQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('تعداد ورودی باید یک عدد مثبت باشد.');
      return;
    }

    if (qty > availableWaiting) {
      setErrorMsg(`تعداد نمی‌تواند از موجودی در انتظار صف (${formatNumber(availableWaiting)} عدد) بیشتر باشد.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onSubmit({
        moId: operation.moId,
        operationId: operation.id,
        quantity: qty,
        machineId: selectedMachineId || operation.machineId,
        operatorName: operatorName.trim() || 'اپراتور شیفت جاری',
        notes: notes.trim(),
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'خطا در بارگذاری ورودی مرحله');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                شروع فرآیند و ثبت ورودی به دستگاه ({operation.stepCode})
              </h3>
              <p className="text-xs text-slate-400">{operation.stepName} - دستور {operation.moNumber}</p>
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

        {/* Current Station Status Overview */}
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">موجودی در انتظار پای کار:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {formatNumber(availableWaiting)} <span className="text-xs font-normal text-slate-400">PCS</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">موقعیت انبار پای خط:</span>
            <span className="font-mono text-cyan-700">{operation.warehouseLocation}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                تعداد قابل بارگذاری به دستگاه (PCS) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(availableWaiting))}
                className="text-[11px] text-blue-400 hover:underline cursor-pointer"
              >
                کل موجودی صف ({formatNumber(availableWaiting)})
              </button>
            </div>
            <input
              type="number"
              min="1"
              max={availableWaiting}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={`حداکثر ${availableWaiting}`}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">دستگاه / خط پرس</label>
              <select
                value={selectedMachineId}
                onChange={e => setSelectedMachineId(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">{operation.machineName || '-- انتخاب ماشین --'}</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">اپراتور مسئول</label>
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                placeholder="نام اپراتور شیفت"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900">یادداشت فرآیند</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="توضیحات ستاپ قالب، شماره پالت، فشار پرس..."
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableWaiting <= 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/40 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>انتقال به در حال ساخت و شروع کار</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
