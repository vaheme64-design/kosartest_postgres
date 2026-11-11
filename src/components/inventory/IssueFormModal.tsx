import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  Sparkles,
  Plus,
  Building2,
  Tag,
  Truck,
  Layers,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
  CustomerDefinition,
  SapcoContract,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';
import { ContextualHelp } from '../common/ContextualHelp';
import { SearchableSelect } from '../common/SearchableSelect';

export interface IssueDraftPayload {
  partId?: string;
  partCode?: string;
  partName?: string;
  quantity?: number | string;
  unit?: string;
  warehouseId?: string;
  targetWarehouseId?: string;
  issuePurpose?: 'PRODUCTION_LINE' | 'CUSTOMER_DELIVERY' | 'SUBCONTRACTOR';
  customerId?: string;
  customerName?: string;
  lotNumber?: string;
  referenceNumber?: string;
  vehiclePlate?: string;
  driverName?: string;
  notes?: string;
}

interface IssueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  customers?: CustomerDefinition[];
  contracts?: SapcoContract[];
  balances: DetailedStockBalance[];
  initialDraft?: IssueDraftPayload | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onItemCreated?: () => void;
}

export const IssueFormModal: React.FC<IssueFormModalProps> = ({
  isOpen,
  onClose,
  parts: initialParts,
  warehouses: initialWarehouses,
  customers: initialCustomers = [],
  contracts: initialContracts = [],
  balances,
  initialDraft,
  onSubmit,
  onItemCreated,
}) => {
  // Local master data caches to allow inline quick-creation without dialog disruption
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localWarehouses, setLocalWarehouses] = useState<WarehouseDefinition[]>(initialWarehouses);
  const [localCustomers, setLocalCustomers] = useState<CustomerDefinition[]>(initialCustomers);
  const [localContracts, setLocalContracts] = useState<SapcoContract[]>(initialContracts);

  useEffect(() => setLocalParts(initialParts), [initialParts]);
  useEffect(() => setLocalWarehouses(initialWarehouses), [initialWarehouses]);
  useEffect(() => setLocalCustomers(initialCustomers), [initialCustomers]);
  useEffect(() => setLocalContracts(initialContracts), [initialContracts]);

  const [step, setStep] = useState<1 | 2>(1);
  const [issuePurpose, setIssuePurpose] = useState<'PRODUCTION_LINE' | 'CUSTOMER_DELIVERY' | 'SUBCONTRACTOR'>('PRODUCTION_LINE');
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-WIP-STAMP');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isAiPrefilled, setIsAiPrefilled] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [submittingQuick, setSubmittingQuick] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick-Create sub-modals state
  const [isQuickPartOpen, setIsQuickPartOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isQuickWarehouseOpen, setIsQuickWarehouseOpen] = useState(false);
  const [isQuickContractOpen, setIsQuickContractOpen] = useState(false);

  // Quick-create form states
  const [qPartCode, setQPartCode] = useState('');
  const [qPartName, setQPartName] = useState('');
  const [qPartCategory, setQPartCategory] = useState<'RAW_MATERIAL' | 'WIP_PART' | 'FINISHED_GOOD'>('FINISHED_GOOD');
  const [qPartUnit, setQPartUnit] = useState('PCS');

  const [qCustCode, setQCustCode] = useState('');
  const [qCustName, setQCustName] = useState('');

  const [qWhCode, setQWhCode] = useState('');
  const [qWhName, setQWhName] = useState('');

  const [qCntNumber, setQCntNumber] = useState('');
  const [qCntTitle, setQCntTitle] = useState('');
  const [qCntCustomer, setQCntCustomer] = useState('شرکت ساپکو');
  const [qCntWeight, setQCntWeight] = useState('50000');

  // Sync AI initialDraft when provided
  useEffect(() => {
    if (initialDraft && isOpen) {
      setIsAiPrefilled(true);
      if (initialDraft.issuePurpose) setIssuePurpose(initialDraft.issuePurpose);
      if (initialDraft.quantity) setQuantity(String(initialDraft.quantity));
      if (initialDraft.warehouseId) setWarehouseId(initialDraft.warehouseId);
      if (initialDraft.targetWarehouseId) setTargetWarehouseId(initialDraft.targetWarehouseId);
      if (initialDraft.customerId) setSelectedCustomerId(initialDraft.customerId);
      if (initialDraft.referenceNumber) setReferenceNumber(initialDraft.referenceNumber);
      if (initialDraft.vehiclePlate) setVehiclePlate(initialDraft.vehiclePlate);
      if (initialDraft.driverName) setDriverName(initialDraft.driverName);
      if (initialDraft.notes) setNotes(initialDraft.notes);
      if (initialDraft.partId) {
        setSelectedPartId(initialDraft.partId);
      } else if (initialDraft.partCode) {
        const found = localParts.find(p => p.code.toLowerCase() === initialDraft.partCode?.toLowerCase());
        if (found) setSelectedPartId(found.id);
      }
      setStep(1);
    } else if (!isOpen) {
      setIsAiPrefilled(false);
    }
  }, [initialDraft, isOpen, localParts]);

  // Suggested MO helper
  const generateSuggestedMoNumber = () => {
    const seq = 1010 + Math.floor(Math.random() * 890);
    return `MO-1404-${seq}`;
  };

  // Adjust defaults when issuePurpose changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (issuePurpose === 'CUSTOMER_DELIVERY') {
      setWarehouseId('WH-FINISHED');
      setTargetWarehouseId('WH-OUTFLOW-CUSTOMER');
      if (localCustomers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(localCustomers[0].id || localCustomers[0].code);
      }
      if (!referenceNumber || referenceNumber.startsWith('MO-')) {
        setReferenceNumber(`SHP-1404-${2000 + Math.floor(Math.random() * 7999)}`);
      }
    } else if (issuePurpose === 'PRODUCTION_LINE') {
      setWarehouseId('WH-RAW');
      setTargetWarehouseId('WH-WIP-STAMP');
      if (!referenceNumber || referenceNumber.startsWith('SHP-')) {
        setReferenceNumber(generateSuggestedMoNumber());
      }
    } else if (issuePurpose === 'SUBCONTRACTOR') {
      setWarehouseId('WH-RAW');
      setTargetWarehouseId('WH-SUBCONTRACTOR');
      if (!referenceNumber) {
        setReferenceNumber(`SUB-1404-${300 + Math.floor(Math.random() * 699)}`);
      }
    }
  }, [issuePurpose, isOpen]);

  // Eligible items: filter based on purpose
  const eligibleParts = useMemo(() => {
    if (issuePurpose === 'CUSTOMER_DELIVERY') {
      const fg = localParts.filter(p => p.category === 'FINISHED_GOOD');
      return fg.length > 0 ? fg : localParts;
    }
    const raw = localParts.filter(p => p.category === 'RAW_MATERIAL');
    return raw.length > 0 ? [...raw, ...localParts.filter(p => p.category !== 'RAW_MATERIAL')] : localParts;
  }, [localParts, issuePurpose]);

  useEffect(() => {
    if (eligibleParts.length > 0 && (!selectedPartId || !eligibleParts.some(p => p.id === selectedPartId))) {
      setSelectedPartId(eligibleParts[0].id);
    }
  }, [eligibleParts, selectedPartId]);

  const selectedPart = localParts.find(p => p.id === selectedPartId || p.code === selectedPartId);

  // Match lots by partId OR partCode; prefer current warehouse, fallback to all warehouses if current has none
  const availableLots = useMemo(() => {
    const matchesPart = (b: DetailedStockBalance) =>
      b.partId === selectedPartId ||
      (selectedPart && (b.partId === selectedPart.id || b.partCode === selectedPart.code));

    const inSelectedWh = balances.filter(
      b => matchesPart(b) && b.warehouseId === warehouseId && b.availableQty > 0
    );
    if (inSelectedWh.length > 0) return inSelectedWh;

    // Fallback: any warehouse that holds available stock for this part
    return balances.filter(b => matchesPart(b) && b.availableQty > 0);
  }, [balances, selectedPartId, selectedPart, warehouseId]);

  useEffect(() => {
    if (availableLots.length > 0) {
      const firstLot = availableLots[0];
      setSelectedLotNumber(firstLot.lotNumber || '');
      // If the lot is in a different warehouse, sync warehouseId automatically
      if (firstLot.warehouseId && firstLot.warehouseId !== warehouseId) {
        setWarehouseId(firstLot.warehouseId);
      }
    } else {
      setSelectedLotNumber('');
    }
  }, [availableLots]);

  const selectedLotBalance =
    availableLots.find(l => (l.lotNumber || '') === selectedLotNumber) || availableLots[0];

  // Auto-populate contract when a part or coil/lot with an associated contract is selected
  useEffect(() => {
    if (selectedLotBalance && (selectedLotBalance.contractId || selectedLotBalance.contractNumber)) {
      const matchedCnt = localContracts.find(
        c =>
          c.id === selectedLotBalance.contractId ||
          c.contractNumber === selectedLotBalance.contractNumber ||
          c.contractNumber === selectedLotBalance.contractId
      );
      if (matchedCnt) {
        setSelectedContractId(matchedCnt.id);
        return;
      }
    }
    // Also check if any lot of this part has a contract or if a contract matches this part/grade
    const lotWithContract = availableLots.find(l => l.contractId || l.contractNumber);
    if (lotWithContract) {
      const matchedCnt = localContracts.find(
        c =>
          c.id === lotWithContract.contractId ||
          c.contractNumber === lotWithContract.contractNumber ||
          c.contractNumber === lotWithContract.contractId
      );
      if (matchedCnt) {
        setSelectedContractId(matchedCnt.id);
        return;
      }
    }
  }, [selectedPartId, selectedLotNumber, selectedLotBalance, availableLots, localContracts]);

  const totalAvailableInWarehouse = useMemo(() => {
    const matchesPart = (b: DetailedStockBalance) =>
      b.partId === selectedPartId ||
      (selectedPart && (b.partId === selectedPart.id || b.partCode === selectedPart.code));
    const list = balances.filter(b => matchesPart(b) && b.warehouseId === warehouseId);
    const sumWh = list.reduce((sum, b) => sum + b.availableQty, 0);
    if (sumWh > 0) return sumWh;
    return balances.filter(b => matchesPart(b)).reduce((sum, b) => sum + b.availableQty, 0);
  }, [balances, selectedPartId, selectedPart, warehouseId]);

  const availableToIssue = selectedLotBalance ? selectedLotBalance.availableQty : totalAvailableInWarehouse;
  const requestedQty = Number(quantity) || 0;
  const isOverdraft = requestedQty > availableToIssue;

  const calculatedWeightKg = useMemo(() => {
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return requestedQty;
    return Number((requestedQty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [requestedQty, selectedPart]);

  if (!isOpen) return null;

  // Inline Quick Creation Handlers
  const handleQuickCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qPartCode.trim() || !qPartName.trim()) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: qPartCode.trim(),
          name: qPartName.trim(),
          category: qPartCategory,
          unit: qPartUnit,
          weightPerUnitKg: 1,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLocalParts(prev => [data.data, ...prev]);
        setSelectedPartId(data.data.id);
        setIsQuickPartOpen(false);
        setQPartCode('');
        setQPartName('');
        if (onItemCreated) onItemCreated();
      } else {
        alert(data.error || 'خطا در ثبت کالا');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qCustCode.trim() || !qCustName.trim()) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: qCustCode.trim(),
          name: qCustName.trim(),
          contractType: 'خرید قطعات پرسکاری',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLocalCustomers(prev => [...prev, data.data]);
        setSelectedCustomerId(data.data.id || data.data.code);
        setIsQuickCustomerOpen(false);
        setQCustCode('');
        setQCustName('');
        if (onItemCreated) onItemCreated();
      } else {
        alert(data.error || 'خطا در ثبت مشتری');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleQuickCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qWhCode.trim() || !qWhName.trim()) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: qWhCode.trim(),
          name: qWhName.trim(),
          type: issuePurpose === 'CUSTOMER_DELIVERY' ? 'FINISHED_GOODS' : 'RAW_MATERIALS',
          locations: ['LOC-01'],
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLocalWarehouses(prev => [...prev, data.data]);
        setWarehouseId(data.data.id);
        setIsQuickWarehouseOpen(false);
        setQWhCode('');
        setQWhName('');
        if (onItemCreated) onItemCreated();
      } else {
        alert(data.error || 'خطا در ثبت انبار');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleQuickCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qCntNumber.trim()) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch('/api/inventory/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: qCntNumber.trim(),
          title: qCntTitle.trim() || `قرارداد تحویل قطعات به ${qCntCustomer}`,
          customerName: qCntCustomer.trim() || 'شرکت ساپکو',
          allocatedWeightKg: Number(qCntWeight) || 50000,
          materialGrade: 'DC04',
          ownership: 'COMPANY_OWNED',
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      const created = data.contract || data.data;
      if (data.success && created) {
        setLocalContracts(prev => [created, ...prev]);
        setSelectedContractId(created.id);
        setIsQuickContractOpen(false);
        setQCntNumber('');
        setQCntTitle('');
        if (onItemCreated) onItemCreated();
      } else {
        alert(data.error || 'خطا در ثبت قرارداد');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (requestedQty <= 0) {
      setErrorMessage('لطفاً مقدار یا وزن درخواستی برای خروج از انبار را وارد نمایید.');
      return;
    }
    if (isOverdraft) {
      setErrorMessage(
        `موجودی قابل استفاده این رول/کالا کافی نیست. موجودی قابل استفاده: ${formatNumber(availableToIssue)} ${
          selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'
        }؛ مقدار درخواست‌شده: ${formatNumber(requestedQty)} ${selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}.`
      );
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (autoPost: boolean) => {
    setLoading(true);
    setErrorMessage(null);

    const warehouse = localWarehouses.find(w => w.id === warehouseId);
    const targetWh = localWarehouses.find(w => w.id === targetWarehouseId);
    const customer = localCustomers.find(c => c.id === selectedCustomerId || c.code === selectedCustomerId);
    const contract = localContracts.find(c => c.id === selectedContractId);

    const docType =
      issuePurpose === 'CUSTOMER_DELIVERY'
        ? 'DELIVERY_CUSTOMER'
        : issuePurpose === 'SUBCONTRACTOR'
        ? 'TRANSFER'
        : 'ISSUE_RAW_MATERIAL';

    const payload = {
      documentType: docType,
      warehouseId,
      warehouseName: warehouse?.name,
      targetWarehouseId,
      targetWarehouseName: targetWh?.name || (issuePurpose === 'CUSTOMER_DELIVERY' ? `تحویل به ${customer?.name || 'مشتری'}` : undefined),
      ownership: selectedLotBalance?.ownership || 'COMPANY_OWNED',
      contractId: contract?.id || selectedLotBalance?.contractId,
      contractNumber: contract?.contractNumber || selectedLotBalance?.contractNumber,
      referenceType: issuePurpose === 'CUSTOMER_DELIVERY' ? 'SHIPPING_WAYBILL' : 'MANUFACTURING_ORDER',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: selectedLotNumber || undefined,
          heatNumber: selectedLotBalance?.heatNumber,
          ownership: selectedLotBalance?.ownership || 'COMPANY_OWNED',
          contractId: contract?.id || selectedLotBalance?.contractId,
          contractNumber: contract?.contractNumber || selectedLotBalance?.contractNumber,
          locationCode: selectedLotBalance?.locationCode || 'LOC-01',
          quantity: requestedQty,
          unit: selectedPart?.unit || 'PCS',
          qualityStatus: 'AVAILABLE',
          notes: notes.trim()
            ? `${notes.trim()}${driverName ? ` | راننده: ${driverName}` : ''}${vehiclePlate ? ` | پلاک: ${vehiclePlate}` : ''}`
            : driverName || vehiclePlate
            ? `راننده: ${driverName || '—'} | پلاک: ${vehiclePlate || '—'}`
            : undefined,
        },
      ],
    };

    const res = await onSubmit(payload);
    setLoading(false);

    if (res.success) {
      setStep(1);
      setQuantity('');
      setReferenceNumber('');
      setVehiclePlate('');
      setDriverName('');
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در صدور حواله خروج از انبار');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-6 text-right" dir="rtl">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-600 text-white rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                {issuePurpose === 'CUSTOMER_DELIVERY'
                  ? 'صدور حواله خروج و تحویل محصول نهایی به مشتری / خودروساز'
                  : 'صدور حواله خروج کالا و ارسال رول / متریال به خط تولید'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ثبت بدون وقفه خروج‌ها، ثبت درجا مشتری/کالا/انبار/قرارداد، و کسر هوشمند از کاردکس موجودی
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

        {/* Stepper */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-4 text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step === 1 ? 'text-slate-900' : 'text-emerald-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-white text-white' : 'bg-emerald-600 text-white'}`}>
              ۱
            </span>
            <span>انتخاب هدف خروج، کالا و مقدار</span>
          </div>
          <span className="text-slate-700">───</span>
          <div className={`flex items-center gap-2 font-semibold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
              ۲
            </span>
            <span>پیش‌نمایش و ثبت قطعی / موقت</span>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {isAiPrefilled && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-amber-900">پیش‌نویس خودکار توسط دستیار هوش مصنوعی</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    مقادیر کالا، مقدار خروج و انبارها پر شده است. لطفاً بررسی و تایید بفرمایید.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-amber-200 text-amber-900 font-bold text-[10px]">
                آماده تایید
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {/* Purpose Selection Bar */}
              <div>
                <label className="block text-slate-800 font-bold mb-2">
                  ۱. نوع عملیات خروج از انبار را انتخاب کنید <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'PRODUCTION_LINE', label: 'ارسال مواد و رول به خط تولید', desc: 'خروج ورق، پیچ، مهره، لاستیک جهت مصرف در سالن پرس و مونتاژ' },
                    { id: 'CUSTOMER_DELIVERY', label: 'تحویل محصول نهایی به مشتری', desc: 'ارسال قطعات پرسکاری و مجموعه‌های نهایی به ساپکو، سایپا و...' },
                    { id: 'SUBCONTRACTOR', label: 'ارسال به پیمانکار بیرونی', desc: 'خروج کالا برای عملیات آبکاری، رنگ یا پوشش‌دهی بیرون کارخانه' },
                  ].map(p => {
                    const active = issuePurpose === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setIssuePurpose(p.id as any)}
                        className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs">{p.label}</div>
                        <div className={`text-[11px] mt-1 ${active ? 'text-slate-700' : 'text-slate-500'}`}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Warehouse & Customer Select Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      انبار مبدا خروج <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickWarehouseOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ انبار جدید</span>
                    </button>
                  </div>
                  <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  >
                    {localWarehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                {issuePurpose === 'CUSTOMER_DELIVERY' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-semibold">
                        مشتری / خودروساز تحویل‌گیرنده <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCustomerOpen(true)}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ مشتری جدید</span>
                      </button>
                    </div>
                    <select
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:bg-white"
                    >
                      {localCustomers.map(c => (
                        <option key={c.id || c.code} value={c.id || c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      ایستگاه / انبار مقصد تحویل <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetWarehouseId}
                      onChange={e => setTargetWarehouseId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                    >
                      <option value="WH-WIP-STAMP">انبار پای کار سالن پرس (WIP)</option>
                      <option value="WH-WIP-WELD">انبار پای کار سالن جوشکاری و مونتاژ</option>
                      <option value="LINE-SHEAR-01">خط نواربری و قیچی گیوتین</option>
                      <option value="LINE-PRESS-800">پرس سنگین ۸۰۰ تن کشش عمیق</option>
                      <option value="WH-SUBCONTRACTOR">انبار پیمانکار بیرونی</option>
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">
                      {issuePurpose === 'CUSTOMER_DELIVERY'
                        ? 'شماره حواله خروج / بارنامه'
                        : 'شماره دستور ساخت (MO) - پیشنهاد سیستم (قابل ویرایش)'}
                    </label>
                    {issuePurpose !== 'CUSTOMER_DELIVERY' && (
                      <button
                        type="button"
                        onClick={() => setReferenceNumber(generateSuggestedMoNumber())}
                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                      >
                        پیشنهاد کد جدید
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder={issuePurpose === 'CUSTOMER_DELIVERY' ? 'مثلاً SHP-1404-8820' : 'مثلاً MO-1404-1025'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                  {issuePurpose !== 'CUSTOMER_DELIVERY' && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
                      <span className="text-slate-500">دستورات فعال:</span>
                      {['MO-1404-1001', 'MO-1404-1002', 'MO-1404-5000'].map(moCode => (
                        <button
                          key={moCode}
                          type="button"
                          onClick={() => setReferenceNumber(moCode)}
                          className={`px-2 py-0.5 rounded font-mono border cursor-pointer ${
                            referenceNumber === moCode
                              ? 'bg-slate-900 text-white border-slate-900 font-bold'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {moCode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Contract & Part Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      {issuePurpose === 'CUSTOMER_DELIVERY'
                        ? 'جستجو و انتخاب محصول نهایی / مجموعه جهت تحویل'
                        : 'جستجو و انتخاب کالا / ورق / قطعه مورد نیاز'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickPartOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ تعریف سریع کالا جدید</span>
                    </button>
                  </div>
                  <SearchableSelect
                    value={selectedPartId}
                    onChange={val => setSelectedPartId(val)}
                    placeholder="جستجو با نام، کد کالا، گرید ورق یا ابعاد..."
                    searchPlaceholder="تایپ نام یا کد ورق / کالا (مثلاً DC01A یا 1140)..."
                    options={eligibleParts.map(p => {
                      const partStock = balances
                        .filter(b => b.partId === p.id || b.partCode === p.code)
                        .reduce((s, b) => s + b.availableQty, 0);
                      return {
                        value: p.id,
                        label: `${p.name} (${p.code})`,
                        sublabel: `واحد: ${p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}${
                          p.materialGrade ? ` • گرید: ${p.materialGrade}` : ''
                        }`,
                        badge: `موجودی: ${formatNumber(partStock)} ${p.unit === 'KG' ? 'kg' : 'عدد'}`,
                      };
                    })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      قرارداد مرتبط (پیشنهاد خودکار / قابل حذف)
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedContractId && (
                        <button
                          type="button"
                          onClick={() => setSelectedContractId('')}
                          className="text-rose-600 hover:text-rose-800 font-bold text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 cursor-pointer"
                        >
                          حذف قرارداد
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsQuickContractOpen(true)}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ جدید</span>
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedContractId}
                    onChange={e => setSelectedContractId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white"
                  >
                    <option value="">-- بدون قرارداد / آزاد --</option>
                    {localContracts.map(cnt => (
                      <option key={cnt.id} value={cnt.id}>
                        {cnt.contractNumber} ({cnt.customerName || 'ساپکو'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Specific Coil-Pack / Lot */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  انتخاب کویل‌پک / پالت / بچ موجود در انبار <span className="text-rose-500">*</span>
                  <ContextualHelp
                    title="انتخاب کویل‌پک / پالت"
                    description="فهرست رول‌ها یا پالت‌هایی که هم‌اکنون در انبار موجودی آزاد دارند."
                    whyNeeded="برای کسر دقیق از همان بسته و به‌روزرسانی کاردکس."
                    mandatory
                  />
                </label>
                {availableLots.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>در حال حاضر هیچ موجودی آزادی از این کالا در انبار وجود ندارد.</span>
                  </div>
                ) : (
                  <select
                    value={selectedLotNumber}
                    onChange={e => setSelectedLotNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold"
                  >
                    {availableLots.map(lot => (
                      <option key={lot.id} value={lot.lotNumber || ''}>
                        کویل/بچ: {lot.lotNumber || 'عمومی'} | موجودی آزاد: {formatNumber(lot.availableQty)}{' '}
                        {lot.unit === 'KG' ? 'کیلوگرم' : 'عدد'} | انبار: {lot.warehouseName} | مالکیت:{' '}
                        {lot.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه'}
                        {lot.contractNumber ? ` | قرارداد: ${lot.contractNumber}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Eligible Stock Details Card */}
              {selectedLotBalance && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">بچ / کویل‌پک انتخابی</span>
                    <strong className="font-mono text-slate-900 mt-0.5 block">{selectedLotBalance.lotNumber || 'عمومی'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">موجودی قابل استفاده این کویل</span>
                    <strong className="font-mono text-emerald-700 text-sm mt-0.5 block">
                      {formatNumber(selectedLotBalance.availableQty)} {selectedLotBalance.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">نوع مالکیت</span>
                    <strong className="text-slate-900 mt-0.5 block">
                      {selectedLotBalance.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">شماره قرارداد کویل</span>
                    <strong className="font-mono text-slate-900 mt-0.5 block">
                      {selectedLotBalance.contractNumber || 'آزاد / عمومی'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quantity & Weight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    مقدار / وزن درخواستی جهت خروج ({selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="مثلاً 500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                  {/* Explicit Warehouse Stock Display Directly Underneath Quantity Input */}
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="text-emerald-950">
                      <span>موجودی این کالا در انبار: </span>
                      <strong className="font-mono text-emerald-800 text-xs">
                        {formatNumber(totalAvailableInWarehouse)} {selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                      </strong>
                      {selectedLotBalance && (
                        <span className="text-emerald-700 mr-1.5">
                          (موجودی کویل/بچ انتخابی:{' '}
                          <strong className="font-mono">{formatNumber(selectedLotBalance.availableQty)}</strong>{' '}
                          {selectedPart?.unit === 'KG' ? 'kg' : 'عدد'})
                        </span>
                      )}
                    </div>
                    {availableToIssue > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuantity(String(availableToIssue))}
                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-[10px] cursor-pointer"
                      >
                        انتخاب کل موجودی ({formatNumber(availableToIssue)})
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    معادل وزنی کل (کیلوگرم)
                  </label>
                  <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm">
                    {formatWeightKg(calculatedWeightKg)}
                  </div>
                </div>
              </div>

              {/* Vehicle & Shipping info for Customer Delivery */}
              {issuePurpose === 'CUSTOMER_DELIVERY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">نام راننده و ناوگان حمل</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                      placeholder="آقای احمدی - باربری کوثر"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">شماره پلاک خودروی حمل</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value)}
                      placeholder="۶۸ ب ۴۴۱ ایران ۵۵"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">توضیحات و ملاحظات خروج</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="شماره پالت، بسته‌بندی، تحویل‌گیرنده..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>
          ) : (
            /* STEP 2: Review & Confirm */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>پیش‌نمایش حواله خروج پیش از ثبت قطعی</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">هدف و انبار مبدا:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {issuePurpose === 'CUSTOMER_DELIVERY' ? 'تحویل به مشتری' : 'ارسال به تولید'} — {localWarehouses.find(w => w.id === warehouseId)?.name}
                  </strong>
                </div>

                {issuePurpose === 'CUSTOMER_DELIVERY' ? (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <span className="text-blue-700 block">مشتری تحویل‌گیرنده:</span>
                    <strong className="text-blue-900 font-bold mt-1 block">
                      {localCustomers.find(c => c.id === selectedCustomerId || c.code === selectedCustomerId)?.name || 'مشتری'}
                    </strong>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">ایستگاه مقصد:</span>
                    <strong className="text-slate-900 mt-1 block">{targetWarehouseId}</strong>
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">کالا / محصول:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {selectedPart?.name} ({selectedPart?.code})
                  </strong>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block">مقدار / وزن خروجی:</span>
                  <strong className="text-amber-900 font-mono text-sm mt-1 block">
                    {formatNumber(requestedQty)} {selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'} ({formatWeightKg(calculatedWeightKg)})
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">بچ / کویل‌پک:</span>
                  <strong className="text-slate-900 font-mono mt-1 block">{selectedLotNumber || 'عمومی'}</strong>
                </div>

                {referenceNumber && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">شماره ارجاع / بارنامه:</span>
                    <strong className="text-slate-900 font-mono mt-1 block">{referenceNumber}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                انصراف
              </button>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  بازگشت
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>پیش‌نمایش حواله خروج</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalSubmit(false)}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ثبت موقت (پیش‌نویس)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalSubmit(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'در حال خروج...' : 'ثبت قطعی و کسر از کاردکس'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK PART CREATION SUB-MODAL */}
      {isQuickPartOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع کالا / محصول جدید (درجا)</span>
              </h4>
              <button type="button" onClick={() => setIsQuickPartOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreatePart} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">کد کالا *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً PRT-FG-102"
                  value={qPartCode}
                  onChange={e => setQPartCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام کالا / شرح قطعه *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً مجموعه رام زیر موتور پژو ۲۰۶"
                  value={qPartName}
                  onChange={e => setQPartName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">گروه کالا</label>
                  <select
                    value={qPartCategory}
                    onChange={e => setQPartCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="FINISHED_GOOD">محصول نهایی</option>
                    <option value="WIP_PART">نیم‌ساخته (WIP)</option>
                    <option value="RAW_MATERIAL">ماده اولیه (ورق/پیچ/لاستیک)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">واحد سنجش</label>
                  <select
                    value={qPartUnit}
                    onChange={e => setQPartUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="PCS">عدد (PCS)</option>
                    <option value="KG">کیلوگرم (KG)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickPartOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب کالا'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER CREATION SUB-MODAL */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع مشتری / خودروساز جدید (درجا)</span>
              </h4>
              <button type="button" onClick={() => setIsQuickCustomerOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">کد مشتری *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً CUST-BAHMAN"
                  value={qCustCode}
                  onChange={e => setQCustCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام مشتری / خودروساز *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً شرکت بهمن موتور / سازه‌گستر"
                  value={qCustName}
                  onChange={e => setQCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب مشتری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK WAREHOUSE CREATION SUB-MODAL */}
      {isQuickWarehouseOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع انبار جدید (درجا)</span>
              </h4>
              <button type="button" onClick={() => setIsQuickWarehouseOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">کد انبار *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً WH-FG-02"
                  value={qWhCode}
                  onChange={e => setQWhCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام انبار *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً انبار شماره ۲ محصول نهایی"
                  value={qWhName}
                  onChange={e => setQWhName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickWarehouseOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CONTRACT CREATION SUB-MODAL */}
      {isQuickContractOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع قرارداد جدید (درجا)</span>
              </h4>
              <button type="button" onClick={() => setIsQuickContractOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateContract} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">شماره قرارداد *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً CNT-SAPCO-1404-02 یا CNT-SAIPA-101"
                  value={qCntNumber}
                  onChange={e => setQCntNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام مشتری / طرف قرارداد *</label>
                <input
                  type="text"
                  required
                  placeholder="شرکت ساپکو / سازه‌گستر سایپا"
                  value={qCntCustomer}
                  onChange={e => setQCntCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">عنوان قرارداد</label>
                <input
                  type="text"
                  placeholder="تحویل قطعات پرسی و مجموعه‌ها"
                  value={qCntTitle}
                  onChange={e => setQCntTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">سهمیه وزنی (کیلوگرم)</label>
                <input
                  type="number"
                  value={qCntWeight}
                  onChange={e => setQCntWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickContractOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب قرارداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
