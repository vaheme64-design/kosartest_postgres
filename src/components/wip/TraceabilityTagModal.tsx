import React, { useState, useEffect } from 'react';
import {
  Tag,
  QrCode,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Layers,
  Cpu,
  User,
  ShieldCheck,
  Disc,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { Part, Machine, DieMold, Operator } from '../../types/inventory';
import { TraceabilityTagData } from '../../types/bomAndParallelFlow';
import { toPersianDigits } from '../../utils/formatters';

interface TraceabilityTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  machines: Machine[];
  dies?: DieMold[];
  operators?: Operator[];
  initialPartCode?: string;
  initialMoNumber?: string;
}

export const TraceabilityTagModal: React.FC<TraceabilityTagModalProps> = ({
  isOpen,
  onClose,
  parts,
  machines,
  dies = [],
  operators = [],
  initialPartCode,
  initialMoNumber,
}) => {
  const [selectedPartCode, setSelectedPartCode] = useState(initialPartCode || parts[0]?.code || '');
  const [moNumber, setMoNumber] = useState(initialMoNumber || `MO-1403-1082`);
  const [stepNumber, setStepNumber] = useState(20);
  const [stepCode, setStepCode] = useState('OP20_FORM');
  const [stepName, setStepName] = useState('کشش عمیق و فرم‌دهی پوسته');
  const [machineCode, setMachineCode] = useState(machines[0]?.code || 'PRS-800-01');
  const [dieMoldCode, setDieMoldCode] = useState(dies[0]?.code || 'DIE-206-SEC-OP20');
  const [shift, setShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [operatorName, setOperatorName] = useState(operators[0]?.fullName || 'علی رضایی (کد ۴۱۰۲)');
  const [supervisorName, setSupervisorName] = useState('مهندس حسینی (سرپرست خط)');
  const [sourceCoilPack, setSourceCoilPack] = useState('CP-1002 / COIL-ST14-1.5');
  const [heatNumber, setHeatNumber] = useState('HEAT-7712-MOB');
  const [quantity, setQuantity] = useState(250);
  const [qualityStatus, setQualityStatus] = useState<'APPROVED' | 'IN_INSPECTION' | 'QUARANTINE'>('APPROVED');
  const [notes, setNotes] = useState('کنترل چشمی و گیج CMM انجام شد. بدون پلیسه و ترک.');

  const [generatedTag, setGeneratedTag] = useState<TraceabilityTagData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedPart = parts.find(p => p.code === selectedPartCode) || parts[0];

  useEffect(() => {
    if (initialPartCode) setSelectedPartCode(initialPartCode);
    if (initialMoNumber) setMoNumber(initialMoNumber);
  }, [initialPartCode, initialMoNumber]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/production/traceability/generate-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partCode: selectedPart?.code || selectedPartCode,
          partName: selectedPart?.name || 'قطعه پرسی خودرو',
          carModel: selectedPart?.carModel || 'مشترک',
          manufacturingOrderNumber: moNumber,
          stepNumber,
          stepCode,
          stepName,
          machineCode,
          dieMoldCode,
          shift,
          operatorName,
          supervisorName,
          sourceCoilPackNumber: sourceCoilPack,
          heatNumber,
          quantity: Number(quantity),
          unit: selectedPart?.unit || 'عدد',
          qualityStatus,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در صدور کارت رهگیری');
      }

      setGeneratedTag(data.data);
      setSuccessMsg(`کارت شناسایی سری ساخت ${data.data.lotNumber} با موفقیت صادر گردید.`);
    } catch (err: any) {
      alert(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans text-right">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-slate-900 p-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 border border-purple-400/30 rounded-2xl text-purple-700">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>صدور کارت شناسایی و ردیابی فرآیند (Lot & Batch Tag Generator)</span>
                <span className="text-[11px] bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full font-mono">
                  استاندارد ساپکو / ایران‌خودرو
                </span>
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                تفکیک و کدگذاری سری‌های ساخت، ثبت مشخصات دستگاه و قالب، و صدور لیبل بارکددار پالت و سبد خط تولید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Part Selection */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-slate-700">قطعه خودرویی تحت تولید:</label>
              <select
                value={selectedPartCode}
                onChange={e => setSelectedPartCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
              >
                {parts.map(p => (
                  <option key={p.id} value={p.code}>
                    [{p.code}] {p.name} {p.carModel ? `(${p.carModel})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* MO Number */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">شماره دستور ساخت (MO):</label>
              <input
                type="text"
                value={moNumber}
                onChange={e => setMoNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                placeholder="MO-1403-1082"
                required
              />
            </div>

            {/* Operation Step */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">مرحله و عنوان عملیات:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stepCode}
                  onChange={e => setStepCode(e.target.value)}
                  className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  placeholder="OP20_FORM"
                />
                <input
                  type="text"
                  value={stepName}
                  onChange={e => setStepName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none"
                  placeholder="عنوان عملیات"
                />
              </div>
            </div>

            {/* Machine */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">دستگاه / پرس تولیدکننده:</label>
              <select
                value={machineCode}
                onChange={e => setMachineCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.code}>
                    [{m.code}] {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Die / Mold */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">قالب / ابزار تولید:</label>
              <input
                type="text"
                value={dieMoldCode}
                onChange={e => setDieMoldCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
                placeholder="DIE-206-SEC-OP20"
              />
            </div>

            {/* Shift & Quantity */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">شیفت کاری:</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="MORNING">شیفت صبح (۰۷:۰۰ الی ۱۵:۳۰)</option>
                <option value="EVENING">شیفت عصر (۱۵:۳۰ الی ۲۳:۳۰)</option>
                <option value="NIGHT">شیفت شب (۲۳:۳۰ الی ۰۷:۰۰)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">تعداد در سبد / پالت:</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                required
              />
            </div>

            {/* Source Coil / Heat */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">شماره کلاف / پکینگ ورق:</label>
              <input
                type="text"
                value={sourceCoilPack}
                onChange={e => setSourceCoilPack(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                placeholder="CP-1002 / COIL-ST14-1.5"
              />
            </div>

            {/* Operator & Supervisor */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">اپراتور پرس:</label>
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">سرپرست خط / شیفت:</label>
              <input
                type="text"
                value={supervisorName}
                onChange={e => setSupervisorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Quality Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">وضعیت کیفی QC:</label>
              <select
                value={qualityStatus}
                onChange={e => setQualityStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="APPROVED">تایید شده کیفی (QC PASSED)</option>
                <option value="IN_INSPECTION">در انتظار کنترل CMM</option>
                <option value="QUARANTINE">قرنطینه و مشکوک</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>صدور کارت شناسایی سری ساخت</span>
              </button>
            </div>
          </form>

          {/* Printable Label Preview */}
          {generatedTag && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-purple-600" />
                  پیش‌نمایش لیبل فیزیکی سبد / پالت (قابل چاپ مستقیم):
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ کارت ردیابی (Print Tag)</span>
                </button>
              </div>

              {/* Tag Physical Frame */}
              <div
                id="printable-tag"
                className="bg-white border-2 border-slate-900 rounded-xl p-5 shadow-lg space-y-3 font-mono text-slate-900 printable-area"
              >
                {/* Tag Top Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-600 block font-sans">
                      سیستم مدیریت تولید و زنجیره تامین قطعات ساپکو (KPIMS)
                    </span>
                    <h2 className="text-base font-extrabold text-slate-950 font-sans mt-0.5">
                      کارت شناسایی و رهگیری فرآیند قطعات پای خط
                    </h2>
                    <span className="text-xs font-bold text-purple-800">
                      شماره بچ / لات: {generatedTag.lotNumber}
                    </span>
                  </div>
                  <div className="text-left bg-slate-100 border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] block text-slate-500">شماره کارت رهگیری</span>
                    <span className="text-xs font-bold font-mono">{generatedTag.tagNumber}</span>
                  </div>
                </div>

                {/* Main Table Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
                  <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">کد فنی قطعه:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{generatedTag.partCode}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg bg-slate-50 col-span-2">
                    <span className="text-[10px] text-slate-500 block">نام قطعه و خودرو:</span>
                    <span className="font-bold text-slate-900">{generatedTag.partName} ({generatedTag.carModel})</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg bg-emerald-50 border-emerald-300 text-emerald-900">
                    <span className="text-[10px] text-emerald-700 block">تعداد در بسته:</span>
                    <span className="font-extrabold text-base font-mono">{toPersianDigits(generatedTag.quantity)} {generatedTag.unit}</span>
                  </div>

                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">دستور ساخت (MO):</span>
                    <span className="font-bold font-mono">{generatedTag.manufacturingOrderNumber}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">مرحله و ایستگاه:</span>
                    <span className="font-bold font-mono">{generatedTag.stepCode} - {generatedTag.stepName}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">دستگاه پرس / قالب:</span>
                    <span className="font-bold font-mono">{generatedTag.machineCode} / {generatedTag.dieMoldCode}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">شیفت و تاریخ:</span>
                    <span className="font-bold">{generatedTag.shift === 'MORNING' ? 'صبح' : generatedTag.shift === 'EVENING' ? 'عصر' : 'شب'} - {generatedTag.productionDate}</span>
                  </div>

                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">شماره کلاف ورق:</span>
                    <span className="font-bold font-mono">{generatedTag.sourceCoilPackNumber}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">اپراتور تولید:</span>
                    <span className="font-bold">{generatedTag.operatorName}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">سرپرست خط:</span>
                    <span className="font-bold">{generatedTag.supervisorName}</span>
                  </div>
                  <div className="p-2 border border-slate-300 rounded-lg bg-purple-50 text-purple-900 border-purple-200">
                    <span className="text-[10px] text-purple-700 block">وضعیت کیفی QC:</span>
                    <span className="font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                      <span>{generatedTag.qualityStatus === 'APPROVED' ? 'تایید کیفی ۱۰۰٪' : 'مشروط'}</span>
                    </span>
                  </div>
                </div>

                {/* Barcode & Scan Block */}
                <div className="p-3 bg-white border border-slate-400 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                  <div className="space-y-1">
                    <div className="tracking-widest font-mono text-xs font-bold text-slate-900">
                      {generatedTag.barcodeValue}
                    </div>
                    {/* High-Contrast 1D Barcode Pattern (Real Dark Bars) */}
                    <div className="h-9 flex items-center justify-center sm:justify-start gap-1 overflow-hidden bg-white p-1 rounded">
                      {[2,1,3,1,1,2,4,1,2,1,3,2,1,2,1,3,1,2,1,4,1,2,1,3,1,2,1,3,1,2].map((w, i) => (
                        <span
                          key={i}
                          className="h-full bg-slate-950 inline-block"
                          style={{ width: `${w * 2.2}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 shrink-0">
                    <QrCode className="w-8 h-8 text-slate-950" />
                    <span className="text-[10px] text-slate-700 font-sans font-medium text-right">
                      اسکن بارکد رهگیری<br />سامانه ردیابی پای خط ساپکو
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
