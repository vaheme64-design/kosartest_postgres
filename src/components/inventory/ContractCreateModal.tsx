import React, { useState, useEffect } from 'react';
import {
  X,
  FileSignature,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Scale,
  PackageCheck,
  Package,
} from 'lucide-react';
import {
  SapcoContract,
  ContractCommercialLine,
  Part,
  PhysicalCoil,
  StockOwnership,
  CustomerDefinition,
} from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { QuickEntryModals, QuickCreateEntityType } from '../common/QuickEntryModals';

interface ContractCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newContract: SapcoContract) => void;
  parts: Part[];
  coils: PhysicalCoil[];
  currentUser: { uid: string; displayName: string };
}

export const ContractCreateModal: React.FC<ContractCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  parts: initialParts,
  coils,
  currentUser,
}) => {
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localCustomers, setLocalCustomers] = useState<CustomerDefinition[]>([]);
  const [activeQuickModal, setActiveQuickModal] = useState<QuickCreateEntityType | null>(null);
  const [quickPartDefaultCat, setQuickPartDefaultCat] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/customers')
        .then(r => r.json())
        .then(res => {
          if (res?.success && Array.isArray(res.data)) {
            setLocalCustomers(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const [contractNumber, setContractNumber] = useState('');
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('شرکت ساپکو');
  const [contractType, setContractType] = useState<'HYBRID' | 'SAPCO_CONSIGNMENT' | 'CUSTOMER_SUPPLIED' | 'PRODUCT_DELIVERY'>('HYBRID');
  const [ownership, setOwnership] = useState<StockOwnership>('SAPCO_SUPPLIER_OWNED');
  const [materialGrade, setMaterialGrade] = useState('DC04');
  const [allocatedWeightKg, setAllocatedWeightKg] = useState<number>(100000);
  const [openingBalanceKg, setOpeningBalanceKg] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Commercial Lines
  const [commercialLines, setCommercialLines] = useState<
    Array<{
      id: string;
      lineType: 'CUSTOMER_SUPPLIED_MATERIAL' | 'FINISHED_PRODUCT_DELIVERY';
      partId?: string;
      partCode: string;
      partName: string;
      contractQty: number;
      contractWeightKg: number;
      unit: 'KG' | 'PCS';
      notes?: string;
    }>
  >([]);

  // Initial Selected Coils
  const [selectedCoilAllocations, setSelectedCoilAllocations] = useState<
    Array<{
      coilId: string;
      coilPackNumber: string;
      allocatedWeightKg: number;
      remainingWeightKg: number;
      thicknessMm: number;
      widthMm: number;
      materialGrade: string;
    }>
  >([]);

  const [activeTab, setActiveTab] = useState<'BASE' | 'MATERIALS' | 'PRODUCTS' | 'COILS'>('BASE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add a customer material line (sheet metal, fastener, rubber)
  const handleAddMaterialLine = () => {
    const rawParts = localParts.filter(p => p.category === 'RAW_MATERIAL');
    const defaultPart = rawParts[0] || localParts[0];
    setCommercialLines(prev => [
      ...prev,
      {
        id: `CML-${Date.now()}-${prev.length + 1}`,
        lineType: 'CUSTOMER_SUPPLIED_MATERIAL',
        partId: defaultPart?.id,
        partCode: defaultPart?.code || '',
        partName: defaultPart?.name || '',
        contractQty: defaultPart?.unit === 'KG' ? 25000 : 10000,
        contractWeightKg: defaultPart?.unit === 'KG' ? 25000 : 200,
        unit: defaultPart?.unit || 'KG',
        notes: 'سهمیه ماده/قطعه دریافتی مستقیم از کارفرما',
      },
    ]);
  };

  // Add a product delivery commitment line (bracket, bumper support, fan plate)
  const handleAddProductLine = () => {
    const finishedParts = localParts.filter(p => p.category === 'FINISHED_GOOD');
    const defaultPart = finishedParts[0] || localParts[0];
    setCommercialLines(prev => [
      ...prev,
      {
        id: `CML-${Date.now()}-${prev.length + 1}`,
        lineType: 'FINISHED_PRODUCT_DELIVERY',
        partId: defaultPart?.id,
        partCode: defaultPart?.code || '',
        partName: defaultPart?.name || '',
        contractQty: 5000,
        contractWeightKg: (defaultPart?.weightPerUnitKg || 1) * 5000,
        unit: 'PCS',
        notes: 'تعهد تحویل ماهانه محصول نهایی',
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setCommercialLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, updates: Partial<typeof commercialLines[0]>) => {
    setCommercialLines(prev =>
      prev.map(l => {
        if (l.id === id) {
          const updated = { ...l, ...updates };
          // If part changed, update name, code, and default unit
          if (updates.partId && updates.partId !== l.partId) {
            const p = localParts.find(part => part.id === updates.partId);
            if (p) {
              updated.partCode = p.code;
              updated.partName = p.name;
              updated.unit = p.unit;
              updated.contractWeightKg =
                p.unit === 'KG' ? updated.contractQty : Number((updated.contractQty * (p.weightPerUnitKg || 1)).toFixed(2));
            }
          }
          return updated;
        }
        return l;
      })
    );
  };

  // Toggle coil allocation
  const handleToggleCoil = (coil: PhysicalCoil) => {
    setSelectedCoilAllocations(prev => {
      const exists = prev.find(c => c.coilId === coil.coilId);
      if (exists) {
        return prev.filter(c => c.coilId !== coil.coilId);
      } else {
        return [
          ...prev,
          {
            coilId: coil.coilId,
            coilPackNumber: coil.coilPackNumber,
            allocatedWeightKg: coil.remainingWeightKg,
            remainingWeightKg: coil.remainingWeightKg,
            thicknessMm: coil.thicknessMm,
            widthMm: coil.widthMm,
            materialGrade: coil.materialGrade,
          },
        ];
      }
    });
  };

  const handleUpdateCoilWeight = (coilId: string, weight: number) => {
    setSelectedCoilAllocations(prev =>
      prev.map(c => (c.coilId === coilId ? { ...c, allocatedWeightKg: weight } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber.trim()) {
      setError('شماره قرارداد الزامی است.');
      return;
    }
    if (!title.trim()) {
      setError('عنوان قرارداد الزامی است.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        contractNumber: contractNumber.trim(),
        title: title.trim(),
        customerName: customerName.trim(),
        contractType,
        ownership,
        materialGrade,
        allocatedWeightKg: Number(allocatedWeightKg) || 0,
        openingBalanceKg: Number(openingBalanceKg) || 0,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes,
        associatedPartCodes: Array.from(
          new Set(commercialLines.map(l => l.partCode).filter(Boolean))
        ),
        commercialLines: commercialLines.map(l => ({
          id: l.id,
          contractId: contractNumber,
          lineType: l.lineType,
          partId: l.partId,
          partCode: l.partCode,
          partName: l.partName,
          contractQty: Number(l.contractQty),
          contractWeightKg: Number(l.contractWeightKg),
          deliveredOrReceivedQty: 0,
          deliveredOrReceivedKg: 0,
          remainingQty: Number(l.contractQty),
          remainingKg: Number(l.contractWeightKg),
          unit: l.unit,
          notes: l.notes,
        })),
        coils: selectedCoilAllocations.map(c => ({
          coilId: c.coilId,
          coilPackNumber: c.coilPackNumber,
          allocatedWeightKg: Number(c.allocatedWeightKg),
          thicknessMm: c.thicknessMm,
          widthMm: c.widthMm,
          materialGrade: c.materialGrade,
        })),
        createdByUid: currentUser.uid,
        createdByName: currentUser.displayName,
      };

      const res = await fetch('/api/inventory/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت قرارداد جدید');
      }

      onSuccess(data.contract);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای غیرمنتظره در ثبت قرارداد');
    } finally {
      setLoading(false);
    }
  };

  const incomingMaterials = commercialLines.filter(l => l.lineType === 'CUSTOMER_SUPPLIED_MATERIAL');
  const productDeliveries = commercialLines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ثبت قرارداد جدید و تعهدات تجاری / تأمین مواد</h2>
              <p className="text-xs text-slate-400">
                تعریف قراردادهای تأمین امانی ساپکو، قطعات تأمینی مشتری (ورق، پیچ و مهره، لاستیک) و تعهدات تحویل محصول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('BASE')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'BASE'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            ۱. اطلاعات پایه و طرف حساب
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MATERIALS')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'MATERIALS'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            ۲. مواد دریافتی از مشتری ({toPersianDigits(incomingMaterials.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'PRODUCTS'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            ۳. تعهدات تحویل محصول ({toPersianDigits(productDeliveries.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COILS')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'COILS'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            ۴. تخصیص کلاف‌های اولیه ({toPersianDigits(selectedCoilAllocations.length)})
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* TAB 1: BASE INFO */}
          {activeTab === 'BASE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  شماره قرارداد <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNT-SAPCO-1403-Q4 یا CNT-SAIPA-1404-01"
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  کد یکتای ثبت قرارداد در دفاتر مالی و زنجیره تأمین
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  عنوان یا موضوع قرارداد <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. تأمین ورق DC04 و مهره جوشی جهت تحویل براکت رام پژو ۲۰۶"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    طرف حساب / مشتری / کارفرما <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveQuickModal('CUSTOMER')}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ مشتری جدید</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  {localCustomers.length > 0 && (
                    <select
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value={customerName}>{customerName}</option>
                      {localCustomers.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    required
                    placeholder="e.g. شرکت ساپکو، سازه‌گستر سایپا، ایران‌خودرو"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نوع ساختار قرارداد</label>
                <select
                  value={contractType}
                  onChange={e => setContractType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="HYBRID">قرارداد دوطرفه (دریافت مواد/قطعات + تعهد تحویل محصول نهایی)</option>
                  <option value="SAPCO_CONSIGNMENT">تأمین امانی مواد و ورق خام ساپکو (Mobarakeh/SAPCO)</option>
                  <option value="CUSTOMER_SUPPLIED">تأمین قطعات و اتصالات توسط مشتری (پیچ، مهره، لاستیک)</option>
                  <option value="PRODUCT_DELIVERY">صرفاً تعهد تحویل و فروش قطعات نهایی به مشتری</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نوع مالکیت متریال در انبار</label>
                <select
                  value={ownership}
                  onChange={e => setOwnership(e.target.value as StockOwnership)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="SAPCO_SUPPLIER_OWNED">امانی تأمین‌کننده (SAPCO_SUPPLIER_OWNED)</option>
                  <option value="CUSTOMER_SUPPLIED">تأمینی مستقیم مشتری (CUSTOMER_SUPPLIED)</option>
                  <option value="COMPANY_OWNED">ملکی کارخانه (COMPANY_OWNED)</option>
                  <option value="THIRD_PARTY_OWNED">شخص ثالث / متفرقه</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">گرید پیش‌فرض فولاد یا مشخصه ماده</label>
                <input
                  type="text"
                  placeholder="e.g. DC04, ST14, DX51D, ST37"
                  value={materialGrade}
                  onChange={e => setMaterialGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  کل سهمیه وزنی قرارداد (کیلوگرم)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={allocatedWeightKg}
                  onChange={e => setAllocatedWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  معادل {formatNumber(Math.round(allocatedWeightKg / 1000))} تن
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">موجودی اول دوره قرارداد (کیلوگرم)</label>
                <input
                  type="number"
                  min="0"
                  value={openingBalanceKg}
                  onChange={e => setOpeningBalanceKg(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ شروع قرارداد</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ انقضا / خاتمه قرارداد</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات و ملاحظات قرارداد</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات بازرگانی، شروط تحویل، تلورانس وزنی باسکول یا درصد ضایعات مجاز..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: INCOMING MATERIALS */}
          {activeTab === 'MATERIALS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">مواد و قطعات دریافتی مستقیم از کارفرما / تأمین‌کننده</h3>
                  <p className="text-[11px] text-slate-400">
                    ورق‌های کلاف، پیچ و مهره‌های جوشی، ضربه‌گیرهای لاستیکی و سایر اقلامی که ساپکو یا مشتری مستقیماً ارسال می‌کند
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPartDefaultCat('RAW_MATERIAL');
                      setActiveQuickModal('PART');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-100 text-emerald-400 border border-slate-200 text-xs font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ تعریف ماده/ورق جدید</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMaterialLine}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن ردیف ماده/قطعه
                  </button>
                </div>
              </div>

              {incomingMaterials.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded bg-slate-50">
                  هیچ ردیف ماده‌ای تعریف نشده است. جهت ثبت سهمیه ورق، پیچ و مهره یا لاستیک دکمه بالا را بزنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingMaterials.map((line, index) => (
                    <div
                      key={line.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      <div className="md:col-span-1 text-center font-mono text-xs text-slate-400">
                        #{toPersianDigits(index + 1)}
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[10px] text-slate-400 mb-1">انتخاب کالا / قطعه</label>
                        <select
                          value={line.partId}
                          onChange={e => handleUpdateLine(line.id, { partId: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        >
                          {localParts.map(p => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name} ({p.unit === 'KG' ? 'کیلوگرم' : 'عدد'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">واحد سنجش</label>
                        <select
                          value={line.unit}
                          onChange={e => handleUpdateLine(line.id, { unit: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="KG">کیلوگرم (KG)</option>
                          <option value="PCS">عدد (PCS)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">سهمیه قرارداد</label>
                        <input
                          type="number"
                          min="0"
                          value={line.contractQty}
                          onChange={e => handleUpdateLine(line.id, { contractQty: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">وزن کل (کیلوگرم)</label>
                        <input
                          type="number"
                          min="0"
                          value={line.contractWeightKg}
                          onChange={e => handleUpdateLine(line.id, { contractWeightKg: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="حذف ردیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCT DELIVERIES */}
          {activeTab === 'PRODUCTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">تعهدات تجاری تحویل محصول تولیدی به مشتری</h3>
                  <p className="text-[11px] text-slate-400">
                    قطعات نهایی پرسی و مجموعه‌های مونتاژی که کارخانه طبق این قرارداد متعهد به تولید و تحویل است
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPartDefaultCat('FINISHED_GOOD');
                      setActiveQuickModal('PART');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-100 text-emerald-400 border border-slate-200 text-xs font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ تعریف محصول جدید</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddProductLine}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن تعهد محصول
                  </button>
                </div>
              </div>

              {productDeliveries.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded bg-slate-50">
                  هیچ تعهد محصولی اضافه نشده است. جهت ثبت قطعات تحویلی دکمه بالا را بزنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {productDeliveries.map((line, index) => (
                    <div
                      key={line.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      <div className="md:col-span-1 text-center font-mono text-xs text-slate-400">
                        #{toPersianDigits(index + 1)}
                      </div>
                      <div className="md:col-span-5">
                        <label className="block text-[10px] text-slate-400 mb-1">قطعه محصول نهایی</label>
                        <select
                          value={line.partId}
                          onChange={e => handleUpdateLine(line.id, { partId: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        >
                          {localParts
                            .filter(p => p.category === 'FINISHED_GOOD' || p.category === 'WIP_PART')
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                [{p.code}] {p.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-1">تیراژ تعهد شده (عدد)</label>
                        <input
                          type="number"
                          min="1"
                          value={line.contractQty}
                          onChange={e => handleUpdateLine(line.id, { contractQty: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">تخمین وزن کل (کیلوگرم)</label>
                        <input
                          type="number"
                          min="0"
                          value={line.contractWeightKg}
                          onChange={e => handleUpdateLine(line.id, { contractWeightKg: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="حذف ردیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INITIAL COIL ALLOCATIONS */}
          {activeTab === 'COILS' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">تخصیص کلاف‌های موجود در انبار به این قرارداد</h3>
                <p className="text-[11px] text-slate-400">
                  می‌توانید یک یا چند کلاف (یا بخشی از وزن یک کلاف) را از همین ابتدا به این شماره قرارداد متصل کنید
                </p>
              </div>

              {coils.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">کلافی در انبار یافت نشد.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-200 rounded p-2 bg-slate-50">
                  {coils.map(coil => {
                    const isSelected = selectedCoilAllocations.some(c => c.coilId === coil.coilId);
                    const selectedAlloc = selectedCoilAllocations.find(c => c.coilId === coil.coilId);

                    return (
                      <div
                        key={coil.id}
                        className={`p-3 rounded border transition-colors flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40'
                            : 'bg-white border-slate-200 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCoil(coil)}
                            className="w-4 h-4 rounded text-blue-600 bg-slate-100 border-slate-200 focus:ring-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">{coil.coilId}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] text-blue-700 font-mono rounded">
                                پکینگ: {coil.coilPackNumber}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                گرید: {coil.materialGrade} | ضخامت: {coil.thicknessMm}mm | عرض: {coil.widthMm}mm
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              انبار: {coil.warehouseName} | مانده در انبار: {formatNumber(coil.remainingWeightKg)} kg
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">وزن تخصیصی:</span>
                            <input
                              type="number"
                              min="1"
                              max={coil.originalWeightKg}
                              value={selectedAlloc?.allocatedWeightKg || coil.remainingWeightKg}
                              onChange={e => handleUpdateCoilWeight(coil.coilId, Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-slate-50 border border-blue-500/50 rounded text-xs text-slate-900 font-mono text-left"
                              dir="ltr"
                            />
                            <span className="text-xs text-slate-400">کیلوگرم</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>ردیف‌های ماده: {toPersianDigits(incomingMaterials.length)}</span>
              <span>•</span>
              <span>تعهدات محصول: {toPersianDigits(productDeliveries.length)}</span>
              <span>•</span>
              <span>کلاف‌های متصل: {toPersianDigits(selectedCoilAllocations.length)}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 text-xs rounded transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded transition-colors"
              >
                {loading ? (
                  <span>در حال ثبت...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ثبت قطعی قرارداد در سیستم
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <QuickEntryModals
        activeModal={activeQuickModal}
        onClose={() => setActiveQuickModal(null)}
        defaultPartCategory={quickPartDefaultCat}
        onCreated={(type, item) => {
          if (type === 'CUSTOMER') {
            setLocalCustomers(prev => [item, ...prev]);
            setCustomerName(item.name);
          } else if (type === 'PART') {
            setLocalParts(prev => [item, ...prev]);
          }
        }}
      />
    </div>
  );
};
