import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Scale,
  ArrowLeft,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { PhysicalCoil, WarehouseDefinition } from '../../types/inventory';
import { formatWeightKg, formatNumber, toPersianDigits } from '../../utils/formatters';
import { ContextualHelp } from '../common/ContextualHelp';

interface ReturnFromProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  coils: PhysicalCoil[];
  warehouses: WarehouseDefinition[];
  currentUser: { uid: string; displayName: string; role: string };
  onSuccess: () => Promise<void>;
}

export const ReturnFromProductionModal: React.FC<ReturnFromProductionModalProps> = ({
  isOpen,
  onClose,
  coils,
  warehouses,
  currentUser,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCoilId, setSelectedCoilId] = useState<string>('');
  const [returnWeightKg, setReturnWeightKg] = useState<string>('');
  const [sourceStation, setSourceStation] = useState<string>('خط پرس و برشکاری سالن ۱');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-RAW');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coils that have been partially or fully issued (originalWeightKg > remainingWeightKg) or all coils
  const returnableCoils = useMemo(() => {
    const issuedOnes = coils.filter(c => c.originalWeightKg > c.remainingWeightKg);
    return issuedOnes.length > 0 ? issuedOnes : coils;
  }, [coils]);

  React.useEffect(() => {
    if (isOpen && returnableCoils.length > 0 && !selectedCoilId) {
      setSelectedCoilId(returnableCoils[0].id);
    }
  }, [isOpen, returnableCoils, selectedCoilId]);

  if (!isOpen) return null;

  const selectedCoil = coils.find(c => c.id === selectedCoilId);
  const originalWeight = selectedCoil?.originalWeightKg || 0;
  const currentRemainingInStore = selectedCoil?.remainingWeightKg || 0;
  const netIssuedToLine = Math.max(0, originalWeight - currentRemainingInStore);
  const enteredReturnKg = Number(returnWeightKg) || 0;
  const maxReturnableKg = netIssuedToLine > 0 ? netIssuedToLine : originalWeight;
  const exceedsIssued = netIssuedToLine > 0 && enteredReturnKg > netIssuedToLine;

  const handleConfirmReturn = async () => {
    if (!selectedCoil) return;
    setErrorMsg(null);

    if (enteredReturnKg <= 0) {
      setErrorMsg('وزن ورق برگشتی به انبار باید بزرگتر از صفر باشد.');
      return;
    }

    if (exceedsIssued) {
      setErrorMsg(
        `مقدار برگشتی (${formatNumber(enteredReturnKg)} کیلوگرم) نمی‌تواند بیشتر از مقدار صادرشده به خط (${formatNumber(netIssuedToLine)} کیلوگرم) باشد.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnedRemnantWeightKg: enteredReturnKg,
          notes:
            notes.trim() ||
            `برگشت ته‌کلاف از ${sourceStation} به ${warehouses.find(w => w.id === targetWarehouseId)?.name || 'انبار مواد اولیه'}`,
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'خطا در ثبت برگشت ورق از خط تولید');
        setLoading(false);
        return;
      }

      await onSuccess();
      setStep(1);
      setReturnWeightKg('');
      setNotes('');
      setLoading(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطای ارتباط با سرور در ثبت برگشت از تولید');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                ثبت برگشت مواد و ته‌کلاف از خط تولید به انبار
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                بازگرداندن باقی‌مانده رول ورق صادرشده به خط پرسکاری با حفظ کامل شماره کویل‌پک و سهمیه قرارداد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-4 text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step === 1 ? 'text-blue-700' : 'text-emerald-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
              ۱
            </span>
            <span>انتخاب رول صادرشده و وزن برگشتی</span>
          </div>
          <span className="text-slate-700">───</span>
          <div className={`flex items-center gap-2 font-semibold ${step === 2 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              ۲
            </span>
            <span>پیش‌نمایش و ثبت قطعی برگشت به انبار</span>
          </div>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {/* Select Coil */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  انتخاب رول فیزیکی / کویل‌پک تحویل‌شده به خط <span className="text-rose-500">*</span>
                  <ContextualHelp
                    title="انتخاب رول و کویل‌پک"
                    description="رولی که قبلاً تمام یا بخشی از آن برای خط تولید صادر شده و اکنون باقی‌مانده آن به انبار بازگردانده می‌شود را انتخاب کنید."
                    whyNeeded="برای اینکه وزن برگشتی دقیقاً به همان کویل‌پک و قرارداد اصلی اضافه شود."
                    example="COIL-2026-01 (PK-SAP-901)"
                    mandatory
                  />
                </label>
                <select
                  value={selectedCoilId}
                  onChange={e => setSelectedCoilId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-blue-600"
                >
                  {returnableCoils.map(c => {
                    const issued = Math.max(0, c.originalWeightKg - c.remainingWeightKg);
                    return (
                      <option key={c.id} value={c.id}>
                        کویل‌پک: {c.coilPackNumber} | کد رول: {c.coilId} | گرید {c.materialGrade} ضخامت {c.thicknessMm}mm | صادرشده به خط: {formatNumber(issued)} kg
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Traceability & Weight Summary Box */}
              {selectedCoil && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div>
                      <span className="text-slate-500">مشخصات فنی رول: </span>
                      <strong className="text-slate-900">
                        {selectedCoil.partName || `ورق ${selectedCoil.materialGrade}`} (ضخامت {selectedCoil.thicknessMm} میلی‌متر · عرض {selectedCoil.widthMm} میلی‌متر)
                      </strong>
                    </div>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      کویل‌پک: {selectedCoil.coilPackNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block">وزن اولیه رول</span>
                      <span className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                        {formatWeightKg(originalWeight)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block">خالص صادرشده به خط</span>
                      <span className="text-sm font-bold text-amber-700 font-mono tabular-nums mt-1 block">
                        {formatWeightKg(netIssuedToLine)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block">موجودی فعلی در انبار</span>
                      <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-1 block">
                        {formatWeightKg(currentRemainingInStore)}
                      </span>
                    </div>
                    <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                      <span className="text-[11px] text-blue-700 font-medium block">حداکثر قابل برگشت</span>
                      <span className="text-sm font-bold text-blue-900 font-mono tabular-nums mt-1 block">
                        {formatWeightKg(maxReturnableKg)}
                      </span>
                    </div>
                  </div>

                  {/* Contract Traceability */}
                  {selectedCoil.allocations && selectedCoil.allocations.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">قراردادهای متصل به این رول:</span>
                      {selectedCoil.allocations.map((alloc, i) => (
                        <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-800">
                          {alloc.contractNumber || alloc.contractId} ({formatWeightKg(alloc.allocatedWeightKg)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Return Weight & Station */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    وزن باسکول ورق برگشتی به انبار (کیلوگرم) <span className="text-rose-500">*</span>
                    <ContextualHelp
                      title="وزن ورق برگشتی"
                      description="وزن واقعی باقی‌مانده رول (ته‌کلاف) که پس از پایان کار خط پرس وزن‌کشی شده و به انبار بازمی‌گردد."
                      example="800"
                      mandatory
                    />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={returnWeightKg}
                    onChange={e => setReturnWeightKg(e.target.value)}
                    placeholder="مثلاً 800"
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none ${
                      exceedsIssued ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-300 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                  {exceedsIssued && (
                    <span className="text-[11px] text-rose-600 mt-1 block">
                      مقدار برگشتی بیشتر از وزن صادرشده به خط ({formatWeightKg(netIssuedToLine)}) است.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    ایستگاه / خط تولید بازگرداننده
                  </label>
                  <select
                    value={sourceStation}
                    onChange={e => setSourceStation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
                  >
                    <option value="خط پرس و برشکاری سالن ۱">خط پرس و برشکاری سالن ۱</option>
                    <option value="پرس ۸۰۰ تن کشش عمیق">پرس ۸۰۰ تن کشش عمیق</option>
                    <option value="خط نواربری و گیوتین">خط نواربری و گیوتین</option>
                    <option value="سالن پرس ضربه‌ای">سالن پرس ضربه‌ای</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  توضیحات (شماره قبض باسکول برگشتی / علت برگشت)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثلاً: اتمام دستور کار و بازگشت ته‌کلاف سالم به انبار مواد اولیه..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Review */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>پیش‌نمایش سند برگشت ورق از خط تولید به انبار</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">رول و کویل‌پک:</span>
                  <strong className="text-slate-900 font-mono mt-0.5 block">
                    {selectedCoil?.coilId} ({selectedCoil?.coilPackNumber})
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">مشخصات ورق:</span>
                  <strong className="text-slate-900 mt-0.5 block">
                    گرید {selectedCoil?.materialGrade} · ضخامت {selectedCoil?.thicknessMm} میلی‌متر
                  </strong>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">وزن برگشتی به انبار:</span>
                  <strong className="text-emerald-900 font-mono text-sm mt-0.5 block">
                    + {formatWeightKg(enteredReturnKg)}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">موجودی جدید رول در انبار پس از ثبت:</span>
                  <strong className="text-slate-900 font-mono text-sm mt-0.5 block">
                    {formatWeightKg(currentRemainingInStore + enteredReturnKg)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={step === 2 ? () => setStep(1) : onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
            >
              {step === 2 ? 'بازگشت و اصلاح' : 'انصراف'}
            </button>

            {step === 1 ? (
              <button
                type="button"
                disabled={enteredReturnKg <= 0 || exceedsIssued || !selectedCoil}
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>پیش‌نمایش سند برگشت</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmReturn}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'در حال ثبت در کاردکس...' : 'ثبت قطعی برگشت در موجودی انبار'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
