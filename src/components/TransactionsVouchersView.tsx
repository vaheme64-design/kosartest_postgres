import React, { useState, useEffect, useMemo } from 'react';
import {
  FilePlus2,
  Truck,
  TrendingDown,
  CheckCircle2,
  AlertOctagon,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Scale,
  Cpu,
  Layers,
  Send,
  Check,
  Search,
  Filter,
  Car,
  Wrench,
  UserCheck,
  Zap,
  Plus,
} from 'lucide-react';
import {
  Part,
  Machine,
  VoucherType,
  FACTORY_STAGES,
  SCRAP_REASONS,
  StageInventorySummary,
  DieMold,
  Operator,
  PartCategory,
  CustomerDefinition,
  SapcoContract,
} from '../types/inventory';
import { formatNumber, formatWeightKg, getVoucherTypeLabel, toPersianDigits } from '../utils/formatters';
import { QuickEntryModals, QuickCreateEntityType } from './common/QuickEntryModals';
import { MasterDataSkeleton } from './ui/Skeleton';
import { DynamicSelect } from './common/DynamicSelect';

interface TransactionsVouchersViewProps {
  parts: Part[];
  machines: Machine[];
  dies?: DieMold[];
  operators?: Operator[];
  stageBalances: StageInventorySummary[];
  initialVoucherType?: VoucherType;
  initialPartId?: string;
  initialStageId?: string;
  onSubmitVoucher: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onTrackVoucher?: () => void;
  onCancel?: () => void;
}

export const TransactionsVouchersView: React.FC<TransactionsVouchersViewProps> = ({
  parts: initialParts,
  machines,
  dies = [],
  operators = [],
  stageBalances,
  initialVoucherType = 'RECEIPT',
  initialPartId,
  initialStageId,
  onSubmitVoucher,
  onTrackVoucher,
}) => {
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localCustomers, setLocalCustomers] = useState<CustomerDefinition[]>([]);
  const [localContracts, setLocalContracts] = useState<SapcoContract[]>([]);
  const [activeQuickModal, setActiveQuickModal] = useState<QuickCreateEntityType | null>(null);

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()).catch(() => null),
      fetch('/api/inventory/contracts').then(r => r.json()).catch(() => null),
    ]).then(([custRes, cntRes]) => {
      if (custRes?.success && Array.isArray(custRes.data)) setLocalCustomers(custRes.data);
      if (cntRes?.success && Array.isArray(cntRes.data)) setLocalContracts(cntRes.data);
    });
  }, []);

  const [voucherType, setVoucherType] = useState<VoucherType>(initialVoucherType);
  const [selectedPartId, setSelectedPartId] = useState<string>(initialPartId || '');
  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId || 'STAGE_RAW_STORE');
  const [targetStageId, setTargetStageId] = useState<string>('STAGE_BLANKING');
  const [customerName, setCustomerName] = useState<string>('شرکت ساپکو');
  const [contractNumber, setContractNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');
  const [dieMoldId, setDieMoldId] = useState<string>('');
  const [shift, setShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [scrapReason, setScrapReason] = useState<string>(SCRAP_REASONS[0]);
  const [notes, setNotes] = useState<string>('');

  // Smart Part Filtering States
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PartCategory>('RAW_MATERIAL');
  const [partSearch, setPartSearch] = useState('');
  const [carModelFilter, setCarModelFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-configure category default based on voucher type
  useEffect(() => {
    if (voucherType === 'RECEIPT') {
      setCategoryFilter('RAW_MATERIAL');
      setSelectedStageId('STAGE_RAW_STORE');
      const rawPart = localParts.find(p => p.category === 'RAW_MATERIAL');
      if (rawPart) setSelectedPartId(rawPart.id);
    } else if (voucherType === 'ISSUE') {
      setCategoryFilter('RAW_MATERIAL');
      setSelectedStageId('STAGE_RAW_STORE');
      setTargetStageId('STAGE_SHEARING');
      const rawPart = localParts.find(p => p.category === 'RAW_MATERIAL');
      if (rawPart) setSelectedPartId(rawPart.id);
    } else if (voucherType === 'CUSTOMER_DELIVERY') {
      setCategoryFilter('FINISHED_GOOD');
      setSelectedStageId('STAGE_FINISHED_STORE');
      const finPart = localParts.find(p => p.category === 'FINISHED_GOOD') || localParts[0];
      if (finPart) setSelectedPartId(finPart.id);
    } else if (voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') {
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_BLANKING');
      const wipPart = localParts.find(p => p.category === 'WIP_PART') || localParts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'WIP_TRANSFER_DISPATCH') {
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_SHEARING');
      setTargetStageId('STAGE_BLANKING');
      const wipPart = localParts.find(p => p.category === 'WIP_PART') || localParts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'WIP_TRANSFER_RECEIPT') {
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_BLANKING');
      const wipPart = localParts.find(p => p.category === 'WIP_PART') || localParts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'OPENING_BALANCE') {
      setCategoryFilter('ALL');
    }
    setErrorMessage(null);
  }, [voucherType, localParts]);

  // Unique car models for quick filtering
  const carModelsList = useMemo(() => {
    const list = new Set<string>();
    localParts.forEach(p => {
      if (p.carModel) {
        if (p.carModel.includes('۲۰۶')) list.add('پژو ۲۰۶ / ۲۰۷');
        else if (p.carModel.includes('تارا')) list.add('تارا');
        else if (p.carModel.includes('دنا')) list.add('دنا پلاس');
        else if (p.carModel.includes('شاهین')) list.add('شاهین');
        else if (p.carModel.includes('کوییک')) list.add('کوییک / تیبا');
      }
    });
    return Array.from(list);
  }, [localParts]);

  // Filtered parts for selection
  const eligibleParts = useMemo(() => {
    return localParts.filter(p => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      if (carModelFilter !== 'ALL') {
        if (!p.carModel || !p.carModel.includes(carModelFilter.split(' ')[0])) {
          return false;
        }
      }
      if (partSearch.trim()) {
        const q = partSearch.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesGrade = p.materialGrade?.toLowerCase().includes(q) || false;
        const matchesSapco = p.sapcoCode?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesCode && !matchesGrade && !matchesSapco) {
          return false;
        }
      }
      return true;
    });
  }, [localParts, categoryFilter, carModelFilter, partSearch]);

  const selectedPart = localParts.find(p => p.id === selectedPartId);

  // Dies compatible with selected part or all dies
  const matchingDies = useMemo(() => {
    if (!selectedPartId) return dies;
    const directMatches = dies.filter(d => d.partId === selectedPartId);
    return directMatches.length > 0 ? directMatches : dies;
  }, [dies, selectedPartId]);

  // Auto-fill die if only 1 matching die exists
  useEffect(() => {
    if (voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') {
      const match = dies.find(d => d.partId === selectedPartId);
      if (match) {
        setDieMoldId(match.id);
        // If die has compatible machines, pick first one
        if (match.compatibleMachineCodes && match.compatibleMachineCodes.length > 0) {
          const compatibleMachine = machines.find(m => match.compatibleMachineCodes?.includes(m.code));
          if (compatibleMachine) setMachineId(compatibleMachine.id);
        }
      }
    }
  }, [selectedPartId, voucherType, dies, machines]);

  if (initialParts.length === 0 && machines.length === 0) {
    return <MasterDataSkeleton />;
  }

  // Available stock at source stage
  const currentStageStock = stageBalances.find(
    sb => sb.stageId === selectedStageId && sb.partId === selectedPartId
  );
  const availableUsableQty = currentStageStock ? currentStageStock.usableQty : 0;

  // Live conversion to KG
  const numQty = parseFloat(quantity) || 0;
  const computedWeightKg = selectedPart
    ? selectedPart.unit === 'KG'
      ? numQty
      : numQty * (selectedPart.weightPerUnitKg || 1)
    : 0;

  // Stock depletion check
  const isDeduction = ['ISSUE', 'SCRAP', 'WIP_TRANSFER_DISPATCH', 'CUSTOMER_DELIVERY'].includes(voucherType);
  const isExceedingStock = isDeduction && numQty > availableUsableQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedPartId) {
      setErrorMessage('لطفاً قطعه یا ماده اولیه را از لیست انتخاب کنید.');
      return;
    }

    if (numQty <= 0) {
      setErrorMessage('مقدار تراکنش باید بزرگتر از صفر باشد.');
      return;
    }

    if (isExceedingStock) {
      setErrorMessage(
        `خطای کنترل موجودی: موجودی در دسترس در این مرحله (${availableUsableQty} ${selectedPart?.unit}) کمتر از مقدار درخواستی (${numQty}) است. سیستم از ثبت موجودی منفی جلوگیری می‌کند.`
      );
      return;
    }

    if (voucherType === 'WIP_TRANSFER_DISPATCH' && selectedStageId === targetStageId) {
      setErrorMessage('مرحله مبدا و مقصد انتقال نمی‌تواند یکسان باشد.');
      return;
    }

    setLoading(true);

    try {
      const selectedDie = dies.find(d => d.id === dieMoldId);
      const selectedOp = operators.find(o => o.id === operatorId);

      const enrichedNotes =
        voucherType === 'CUSTOMER_DELIVERY'
          ? `تحویل بار به مشتری: ${customerName}${contractNumber ? ` | قرارداد: ${contractNumber}` : ''}${notes ? ` | ${notes}` : ''}`
          : notes;

      const payload = {
        voucherType,
        partId: selectedPartId,
        stageId: voucherType === 'CUSTOMER_DELIVERY' ? 'STAGE_FINISHED_STORE' : selectedStageId,
        targetStageId: voucherType === 'WIP_TRANSFER_DISPATCH' || voucherType === 'ISSUE' ? targetStageId : undefined,
        quantity: numQty,
        referenceDoc: referenceDoc || (voucherType === 'CUSTOMER_DELIVERY' && contractNumber ? contractNumber : undefined),
        operatorName: selectedOp ? selectedOp.fullName : operatorName || undefined,
        machineId: machineId || undefined,
        dieMoldId: dieMoldId || undefined,
        dieMoldName: selectedDie ? selectedDie.name : undefined,
        shift,
        scrapReason: voucherType === 'SCRAP' ? scrapReason : undefined,
        notes: enrichedNotes,
        isDemo: false,
      };

      const result = await onSubmitVoucher(payload);
      if (result.success) {
        setSuccessMessage(result.message || 'سند با موفقیت صادر و در دفاتر کل ثبت گردید.');
        setQuantity('');
        setNotes('');
        setReferenceDoc('');
      } else {
        setErrorMessage(result.error || 'خطا در ثبت سند در پایگاه داده.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'خطای ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const voucherTypesList: { id: VoucherType; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'RECEIPT',
      label: '۱. رسید ورود کالا (انبار مواد و محصول)',
      shortLabel: 'رسید ورود کالا',
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      desc: 'ورود کلاف‌های ورق فولادی از ساپکو / محصولات نهایی به انبار',
    },
    {
      id: 'ISSUE',
      label: '۲. حواله مصرف مواد (تخصیص به خطوط برش)',
      shortLabel: 'حواله مصرف مواد',
      icon: <TrendingDown className="w-4 h-4 text-amber-600" />,
      desc: 'تخصیص ورق از انبار مواد به خطوط برش و بلنکینگ',
    },
    {
      id: 'PRODUCTION_OUTPUT',
      label: '۳. ثبت تولید سالم (خروجی پرسکاری و جوش)',
      shortLabel: 'ثبت تولید سالم',
      icon: <CheckCircle2 className="w-4 h-4 text-cyan-600" />,
      desc: 'ثبت قطعات سالم خروجی از پرس با قالب و اپراتور معین',
    },
    {
      id: 'SCRAP',
      label: '۴. ثبت ضایعات و عیوب کیفی (QC Scrap)',
      shortLabel: 'ثبت ضایعات',
      icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
      desc: 'ثبت قطعات معیوب با ثبت دلیل عیب قالب یا ورق',
    },
    {
      id: 'WIP_TRANSFER_DISPATCH',
      label: '۵. ارسال بین مراحل (کانبان خروجی ایستگاه)',
      shortLabel: 'ارسال بین مراحل',
      icon: <ArrowRightLeft className="w-4 h-4 text-purple-600" />,
      desc: 'ارسال قطعات نیمه‌ساخته از یک ایستگاه به ایستگاه بعدی با کانبان',
    },
    {
      id: 'WIP_TRANSFER_RECEIPT',
      label: '۶. تأیید دریافت در مقصد (وصول ایستگاه)',
      shortLabel: 'تأیید دریافت مقصد',
      icon: <Check className="w-4 h-4 text-indigo-600" />,
      desc: 'وصول قطعات ارسال‌شده در مرحله مقصد بدون ایجاد موجودی مضاعف',
    },
    {
      id: 'OPENING_BALANCE',
      label: '۷. موجودی اول دوره و کالیبراسیون انبارگردانی',
      shortLabel: 'موجودی اول دوره',
      icon: <Calendar className="w-4 h-4 text-blue-600" />,
      desc: 'سند انبارگردانی و تعیین موجودی ابتدای دوره یا کالیبراسیون',
    },
    {
      id: 'CUSTOMER_DELIVERY',
      label: '۸. تحویل بار به مشتری (خروج محصول نهایی)',
      shortLabel: 'تحویل بار به مشتری',
      icon: <Truck className="w-4 h-4 text-indigo-600" />,
      desc: 'حواله خروج و تحویل محصول نهایی به ساپکو، سایپا و سایر مشتریان با کسر از انبار نهایی',
    },
  ];

  const currentVoucherMeta = voucherTypesList.find(v => v.id === voucherType) || voucherTypesList[0];

  return (
    <div className="space-y-5">
      {/* Unified Light Header & Dropdown List Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-bold text-slate-900">
                مرکز صدور و ثبت اسناد تولید و انبار
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                فرم‌های تفکیک‌شده و هوشمند بر اساس نوع سند با فیلتر خودکار ورق‌ها، قطعات نیمه‌ساخته WIP، قالب‌های متصل و تحویل بار به مشتری
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80">
            <span>وضعیت دفتر کل:</span>
            <span className="font-bold text-emerald-700">ثبت آنی و کنترل موجودی فعال</span>
          </div>
        </div>

        {/* Unified Dropdown List Selector + Quick Filter Chips */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-1.5">
              <FilePlus2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                انتخاب نوع سند تولید / انبار:
              </span>
              <select
                value={voucherType}
                onChange={e => setVoucherType(e.target.value as VoucherType)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1 pl-4 py-0.5"
              >
                {voucherTypesList.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Quick Filter Chips */}
            <div className="hidden xl:flex items-center gap-1.5 flex-wrap">
              {voucherTypesList.slice(0, 6).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVoucherType(item.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    voucherType === item.id
                      ? 'bg-orange-50 text-orange-700 border border-orange-200/90'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            {currentVoucherMeta.icon}
            <span>{currentVoucherMeta.desc}</span>
          </div>
        </div>
      </div>

      {/* Main Voucher Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {currentVoucherMeta.icon}
            <span className="text-sm font-bold text-slate-900">
              فرم صدور: {currentVoucherMeta.label}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            سیستم ثبت: <span className="font-mono text-emerald-700 font-bold">دفتر کل معتبر و بلادرنگ</span>
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">خطا در اعتبارسنجی سند:</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ثبت موفق سند:</p>
                <p className="mt-0.5 leading-relaxed">{successMessage}</p>
              </div>
            </div>
            {onTrackVoucher && (
              <button
                type="button"
                onClick={onTrackVoucher}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0 self-end sm:self-center"
              >
                پیگیری سند در کاردکس / خط ⟵
              </button>
            )}
          </div>
        )}

        {/* SECTION 1: SMART PART SELECTOR WITH CATEGORY TABS & SEARCH */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-600" />
                <span>انتخاب قطعه یا ماده اولیه هدف سند *</span>
              </label>
              <button
                type="button"
                onClick={() => setActiveQuickModal('PART')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+ تعریف سریع کالا / ورق جدید</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('RAW_MATERIAL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  categoryFilter === 'RAW_MATERIAL'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ورق و مواد اولیه ({localParts.filter(p => p.category === 'RAW_MATERIAL').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('WIP_PART')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  categoryFilter === 'WIP_PART'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                نیمه‌ساخته WIP ({localParts.filter(p => p.category === 'WIP_PART').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('FINISHED_GOOD')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  categoryFilter === 'FINISHED_GOOD'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                محصولات نهایی ({localParts.filter(p => p.category === 'FINISHED_GOOD').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه ({localParts.length})
              </button>
            </div>
          </div>

          {/* Quick Search & Car Model Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={partSearch}
                onChange={e => setPartSearch(e.target.value)}
                placeholder="جستجوی سریع در نام قطعه، کد کاتالوگ (مثلاً: ST14, DC04, ۲۰۶, تارا, سپر)..."
                className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            {carModelsList.length > 0 && categoryFilter !== 'RAW_MATERIAL' && (
              <select
                value={carModelFilter}
                onChange={e => setCarModelFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="ALL">همه خودروها</option>
                {carModelsList.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtered Dropdown or Cards */}
          <div className="space-y-1">
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
              required
            >
              <option value="">-- انتخاب از میان {toPersianDigits(eligibleParts.length)} قلم منطبق با فیلتر --</option>
              {eligibleParts.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name} {p.thicknessMm ? `(ضخامت ${p.thicknessMm}mm)` : ''} {p.carModel ? `[${p.carModel}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Part Details Card */}
          {selectedPart && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-700 font-mono bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{selectedPart.code}</span>
                <span className="text-slate-900 font-semibold">{selectedPart.name}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span>واحد سنجش: <strong className="text-slate-900">{selectedPart.unit}</strong></span>
                <span>وزن واحد: <strong className="text-slate-900">{selectedPart.weightPerUnitKg} کیلوگرم</strong></span>
                {selectedPart.materialGrade && (
                  <span>گرید فولاد: <strong className="text-cyan-700">{selectedPart.materialGrade}</strong></span>
                )}
                {selectedPart.sapcoCode && (
                  <span>کد ساپکو: <strong className="text-slate-700 font-mono">{selectedPart.sapcoCode}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CUSTOMER DELIVERY DEDICATED BANNER & FIELDS */}
        {voucherType === 'CUSTOMER_DELIVERY' && (
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>اطلاعات تحویل بار و خروج محصول نهایی به مشتری (ساپکو، سایپا و...)</span>
              </div>
              <span className="text-[11px] text-indigo-700 bg-white border border-indigo-200 px-2.5 py-0.5 rounded-md font-semibold">
                کسر مستقیم از انبار قطعات و محصولات نهایی
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">مشتری تحویل‌گیرنده بار *</label>
                  <button
                    type="button"
                    onClick={() => setActiveQuickModal('CUSTOMER')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ مشتری جدید</span>
                  </button>
                </div>
                {localCustomers.length > 0 ? (
                  <select
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={customerName}>{customerName}</option>
                    {localCustomers.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="شرکت ساپکو / سازه‌گستر سایپا..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">شماره قرارداد تحویل (اختیاری)</label>
                  <button
                    type="button"
                    onClick={() => setActiveQuickModal('CONTRACT')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ قرارداد جدید</span>
                  </button>
                </div>
                <select
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- بدون الصاق به قرارداد مشخص --</option>
                  {localContracts.map(cnt => (
                    <option key={cnt.id} value={cnt.contractNumber}>
                      {cnt.contractNumber} — {cnt.customerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: TRANSACTION PARAMETERS & STAGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Source Stage / Store */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {voucherType === 'WIP_TRANSFER_DISPATCH'
                ? 'ایستگاه مبدا (ارسال‌کننده) *'
                : voucherType === 'CUSTOMER_DELIVERY'
                ? 'انبار خروجی تحویل به مشتری *'
                : 'ایستگاه / انبار مرجع *'}
            </label>
            <select
              value={selectedStageId}
              onChange={e => setSelectedStageId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              required
            >
              {FACTORY_STAGES.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.type})
                </option>
              ))}
            </select>

            {/* Live Stock Status Indicator */}
            {selectedPart && (
              <div className="text-[11px] pt-1 flex items-center justify-between">
                <span className="text-slate-500">موجودی آزاد در این مرحله:</span>
                <span className={`font-bold font-mono ${availableUsableQty > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {formatNumber(availableUsableQty)} {selectedPart.unit}
                </span>
              </div>
            )}
          </div>

          {/* Target Stage (For Transfers and Issues) */}
          {(voucherType === 'WIP_TRANSFER_DISPATCH' || voucherType === 'ISSUE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                ایستگاه مقصد (دریافت‌کننده) *
              </label>
              <select
                value={targetStageId}
                onChange={e => setTargetStageId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                required
              >
                {FACTORY_STAGES.filter(st => st.id !== selectedStageId).map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-purple-700 pt-1">
                ارسال به وضعیت «در راه» در مرحله مقصد می‌رود تا پس از تأیید وصول ثبت نهایی شود.
              </p>
            </div>
          )}

          {/* Quantity Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>مقدار تراکنش ({selectedPart ? selectedPart.unit : 'عدد/کیلوگرم'}) *</span>
              {isExceedingStock && (
                <span className="text-[11px] text-rose-600 font-bold">کسری موجودی!</span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مثلاً: 1200"
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none ${
                  isExceedingStock ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-slate-400'
                }`}
                required
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-medium">
                {selectedPart ? selectedPart.unit : ''}
              </span>
            </div>

            {/* Live Weight Equivalent Preview */}
            {selectedPart && numQty > 0 && (
              <div className="text-[11px] text-cyan-700 flex items-center gap-1 pt-1">
                <Scale className="w-3 h-3" />
                <span>وزن معادل کل: <strong>{formatWeightKg(computedWeightKg)}</strong></span>
              </div>
            )}
          </div>

          {/* Machine Selector (For Production & Scrap) */}
          {(voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">پرس یا ماشین مورد استفاده *</label>
              <select
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                <option value="">-- انتخاب ماشین خط تولید --</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.tonnage ? `${m.tonnage}T` : m.processType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Die / Mold Selector (For Production & Scrap) */}
          {(voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>قالب پرس متصل (Die / Mold) *</span>
                {matchingDies.length > 0 && (
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {matchingDies.length} قالب سازگار یافت شد
                  </span>
                )}
              </label>
              <select
                value={dieMoldId}
                onChange={e => setDieMoldId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                <option value="">-- انتخاب قالب سنبه ماتریس / کشش --</option>
                {matchingDies.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name} ({d.requiredTonnage} تن - {d.status === 'READY' ? 'آماده' : 'سرویس'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Operator Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">اپراتور / تکنسین ثبت‌کننده</label>
            {operators.length > 0 ? (
              <select
                value={operatorId}
                onChange={e => {
                  setOperatorId(e.target.value);
                  const op = operators.find(o => o.id === e.target.value);
                  if (op) setOperatorName(op.fullName);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                <option value="">-- انتخاب اپراتور یا ثبت دستی --</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>
                    [{op.personnelCode}] {op.fullName} (شیفت {op.defaultShift === 'MORNING' ? 'صبح' : op.defaultShift === 'EVENING' ? 'عصر' : 'شب'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                placeholder="نام اپراتور یا تکنسین شیفت"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            )}
          </div>

          {/* Shift */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">شیفت کاری</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            >
              <option value="MORNING">شیفت صبح (۰۷:۰۰ الی ۱۵:۰۰)</option>
              <option value="EVENING">شیفت عصر (۱۵:۰۰ الی ۲۳:۰۰)</option>
              <option value="NIGHT">شیفت شب (۲۳:۰۰ الی ۰۷:۰۰)</option>
            </select>
          </div>

          {/* Scrap Reason (For Scrap only) */}
          {voucherType === 'SCRAP' && (
            <DynamicSelect
              categoryCode="SCRAP_REASON"
              label="علت عیب و بروز ضایعات (استخراج از دیتابیس MasterItem)"
              value={scrapReason}
              valueField="value"
              onChange={(val, item) => setScrapReason(item?.value || val)}
              required
              allowAddOption={true}
              placeholder="-- انتخاب علت ضایعات از پایگاه داده --"
            />
          )}

          {/* Reference Document */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {voucherType === 'CUSTOMER_DELIVERY' ? 'شماره بارنامه / حواله خروج / پلاک خودرو' : 'سند عطف / شماره بارنامه / کانبان'}
            </label>
            <input
              type="text"
              value={referenceDoc}
              onChange={e => setReferenceDoc(e.target.value)}
              placeholder={voucherType === 'CUSTOMER_DELIVERY' ? 'مثلاً: بارنامه ۹۸۲۴۱۵ ساپکو - پلاک ۴۴ع۷۸۱' : 'مثلاً: بارنامه ۹۸۲۴۱۵ ساپکو یا دستور کار WO-401'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">توضیحات و یادداشت تکمیلی سند</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="هرگونه یادداشت بازرسی QC، شرایط محیطی، وضعیت قالب پرس، شماره ذوب کویل یا پالت..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {isDeduction && (
              <span>
                کنترل موجودی مبدا فعال است: خروج بدون موجودی مجاز نخواهد بود.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || isExceedingStock}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'در حال ثبت در سرور و دفاتر...' : 'تأیید و صدور نهایی سند'}</span>
          </button>
        </div>
      </form>

      <QuickEntryModals
        activeModal={activeQuickModal}
        onClose={() => setActiveQuickModal(null)}
        defaultPartCategory={voucherType === 'CUSTOMER_DELIVERY' ? 'FINISHED_GOOD' : categoryFilter === 'ALL' ? 'RAW_MATERIAL' : categoryFilter}
        defaultCustomerName={customerName}
        onCreated={(type, item) => {
          if (type === 'PART') {
            setLocalParts(prev => [item, ...prev]);
            setSelectedPartId(item.id);
          } else if (type === 'CUSTOMER') {
            setLocalCustomers(prev => [item, ...prev]);
            setCustomerName(item.name);
          } else if (type === 'CONTRACT') {
            setLocalContracts(prev => [item, ...prev]);
            setContractNumber(item.contractNumber);
            if (item.customerName) setCustomerName(item.customerName);
          }
        }}
      />
    </div>
  );
};
