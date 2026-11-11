import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  Info,
  Sparkles,
  Building2,
  Tag,
  Hash,
  Scale,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  SapcoContract,
  StockOwnership,
  StockQualityStatus,
  InventoryDocType,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';
import { ContextualHelp } from '../common/ContextualHelp';

export type GuidedReceiptSubType =
  | 'SAPCO_MATERIAL'
  | 'CUSTOMER_SUPPLIED'
  | 'SUPPLIER_PURCHASE'
  | 'OPENING_BALANCE'
  | 'FINISHED_PRODUCT';

export interface ReceiptDraftPayload {
  subType?: GuidedReceiptSubType;
  partId?: string;
  partCode?: string;
  partName?: string;
  quantity?: number | string;
  unit?: string;
  coilPackNumber?: string;
  physicalCoilCode?: string;
  heatNumber?: string;
  warehouseId?: string;
  locationCode?: string;
  ownership?: StockOwnership;
  referenceNumber?: string;
  notes?: string;
}

export interface BatchCoilRow {
  id: string;
  coilPackNumber: string;
  physicalCoilCode: string;
  weightKg: string;
  heatNumber: string;
}

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  contracts: SapcoContract[];
  initialDraft?: ReceiptDraftPayload | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onItemCreated?: () => void;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  parts: initialParts,
  warehouses: initialWarehouses,
  contracts: initialContracts,
  initialDraft,
  onSubmit,
  onItemCreated,
}) => {
  // Local master data caches to allow inline quick-creation without closing the dialog
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localWarehouses, setLocalWarehouses] = useState<WarehouseDefinition[]>(initialWarehouses);
  const [localContracts, setLocalContracts] = useState<SapcoContract[]>(initialContracts);

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);
  useEffect(() => {
    setLocalWarehouses(initialWarehouses);
  }, [initialWarehouses]);
  useEffect(() => {
    setLocalContracts(initialContracts);
  }, [initialContracts]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [receiptSubType, setReceiptSubType] = useState<GuidedReceiptSubType>('SAPCO_MATERIAL');
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [locationCode, setLocationCode] = useState<string>('LOC-RAW-A1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partSearch, setPartSearch] = useState<string>('');
  const [isAiPrefilled, setIsAiPrefilled] = useState<boolean>(false);

  // Tracking fields (Single Coil mode)
  const [coilPackNumber, setCoilPackNumber] = useState<string>('');
  const [physicalCoilCode, setPhysicalCoilCode] = useState<string>('');
  const [heatNumber, setHeatNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [ownership, setOwnership] = useState<StockOwnership>('SAPCO_SUPPLIER_OWNED');
  const [qualityStatus, setQualityStatus] = useState<StockQualityStatus>('AVAILABLE');
  const [notes, setNotes] = useState<string>('');

  // Multi-Coil Consignment Entry (e.g. 3 coils arrive at once)
  const [coilEntryMode, setCoilEntryMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [batchCoils, setBatchCoils] = useState<BatchCoilRow[]>([
    { id: '1', coilPackNumber: 'CP-1403-101', physicalCoilCode: 'COIL-01', weightKg: '2150', heatNumber: 'HT-4401' },
    { id: '2', coilPackNumber: 'CP-1403-102', physicalCoilCode: 'COIL-02', weightKg: '1980', heatNumber: 'HT-4401' },
    { id: '3', coilPackNumber: 'CP-1403-103', physicalCoilCode: 'COIL-03', weightKg: '2050', heatNumber: 'HT-4401' },
  ]);

  // Quick-Create Modals State
  const [isQuickContractOpen, setIsQuickContractOpen] = useState<boolean>(false);
  const [isQuickPartOpen, setIsQuickPartOpen] = useState<boolean>(false);
  const [isQuickWarehouseOpen, setIsQuickWarehouseOpen] = useState<boolean>(false);

  // Quick-create form fields
  const [qContractNumber, setQContractNumber] = useState<string>('');
  const [qContractCustomer, setQContractCustomer] = useState<string>('ساپکو');
  const [qContractWeight, setQContractWeight] = useState<string>('50000');
  const [qContractGrade, setQContractGrade] = useState<string>('DC04');
  const [qContractThickness, setQContractThickness] = useState<string>('0.8');

  const [qPartCode, setQPartCode] = useState<string>('');
  const [qPartName, setQPartName] = useState<string>('');
  const [qPartCategory, setQPartCategory] = useState<'RAW_MATERIAL' | 'WIP_PART' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [qPartUnit, setQPartUnit] = useState<string>('KG');
  const [qPartGrade, setQPartGrade] = useState<string>('DC04');
  const [qPartThickness, setQPartThickness] = useState<string>('0.8');
  const [qPartWidth, setQPartWidth] = useState<string>('1250');

  const [qWhCode, setQWhCode] = useState<string>('');
  const [qWhName, setQWhName] = useState<string>('');
  const [qWhLocations, setQWhLocations] = useState<string>('LOC-01, LOC-02');

  // Multi-contract allocation for sheet metal coils
  const [contractAllocations, setContractAllocations] = useState<
    Array<{ contractId: string; allocatedWeightKg: string }>
  >([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [submittingQuick, setSubmittingQuick] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with AI initial draft when provided
  useEffect(() => {
    if (initialDraft && isOpen) {
      setIsAiPrefilled(true);
      if (initialDraft.subType) setReceiptSubType(initialDraft.subType);
      if (initialDraft.warehouseId) setWarehouseId(initialDraft.warehouseId);
      if (initialDraft.locationCode) setLocationCode(initialDraft.locationCode);
      if (initialDraft.quantity) setQuantity(String(initialDraft.quantity));
      if (initialDraft.coilPackNumber) setCoilPackNumber(initialDraft.coilPackNumber);
      if (initialDraft.physicalCoilCode) setPhysicalCoilCode(initialDraft.physicalCoilCode);
      if (initialDraft.heatNumber) setHeatNumber(initialDraft.heatNumber);
      if (initialDraft.ownership) setOwnership(initialDraft.ownership);
      if (initialDraft.referenceNumber) setReferenceNumber(initialDraft.referenceNumber);
      if (initialDraft.notes) setNotes(initialDraft.notes);

      if (initialDraft.partId) {
        setSelectedPartId(initialDraft.partId);
      } else if (initialDraft.partCode) {
        const found = localParts.find(p => p.code.toLowerCase() === initialDraft.partCode?.toLowerCase());
        if (found) setSelectedPartId(found.id);
      }
      setStep(2);
    } else if (!isOpen) {
      setIsAiPrefilled(false);
    }
  }, [initialDraft, isOpen, localParts]);

  const docType: InventoryDocType = useMemo(() => {
    if (receiptSubType === 'OPENING_BALANCE') return 'OPENING_BALANCE';
    if (receiptSubType === 'FINISHED_PRODUCT') return 'RECEIPT_FINISHED_GOODS';
    return 'RECEIPT_RAW_MATERIAL';
  }, [receiptSubType]);

  // Adjust defaults when receiptSubType changes
  useEffect(() => {
    if (receiptSubType === 'SAPCO_MATERIAL') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('SAPCO_SUPPLIER_OWNED');
    } else if (receiptSubType === 'CUSTOMER_SUPPLIED') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('CUSTOMER_SUPPLIED' as StockOwnership);
    } else if (receiptSubType === 'SUPPLIER_PURCHASE') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-B1');
      setOwnership('COMPANY_OWNED');
    } else if (receiptSubType === 'OPENING_BALANCE') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('COMPANY_OWNED');
    } else if (receiptSubType === 'FINISHED_PRODUCT') {
      setWarehouseId('WH-FINISHED');
      setLocationCode('LOC-FIN-P1');
      setOwnership('COMPANY_OWNED');
    }
  }, [receiptSubType]);

  const currentWarehouse = useMemo(
    () => localWarehouses.find(w => w.id === warehouseId),
    [localWarehouses, warehouseId]
  );
  const availableLocations = currentWarehouse ? currentWarehouse.locations : ['LOC-01'];

  // Filter parts based on receipt type & search
  const eligibleParts = useMemo(() => {
    const base =
      receiptSubType === 'FINISHED_PRODUCT'
        ? localParts.filter(p => p.category === 'FINISHED_GOOD')
        : receiptSubType === 'OPENING_BALANCE'
        ? localParts
        : localParts.filter(p => p.category === 'RAW_MATERIAL' || p.category === 'WIP_PART');

    if (!partSearch.trim()) return base;
    const q = partSearch.toLowerCase();
    return base.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.materialGrade && p.materialGrade.toLowerCase().includes(q))
    );
  }, [localParts, receiptSubType, partSearch]);

  useEffect(() => {
    if (eligibleParts.length > 0 && (!selectedPartId || !eligibleParts.some(p => p.id === selectedPartId))) {
      setSelectedPartId(eligibleParts[0].id);
    }
  }, [eligibleParts, selectedPartId]);

  const selectedPart = localParts.find(p => p.id === selectedPartId);

  // Determine if selected item is Sheet Metal (progressive disclosure)
  const isSheetMetal = useMemo(() => {
    if (!selectedPart) return false;
    return (
      selectedPart.unit === 'KG' ||
      Boolean(selectedPart.thicknessMm && selectedPart.thicknessMm > 0) ||
      selectedPart.name.includes('ورق') ||
      selectedPart.name.includes('کلاف') ||
      selectedPart.name.includes('رول')
    );
  }, [selectedPart]);

  // Calculate total batch weight if in MULTI mode
  const totalBatchWeightKg = useMemo(() => {
    return batchCoils.reduce((sum, item) => sum + (Number(item.weightKg) || 0), 0);
  }, [batchCoils]);

  // Sync quantity with multi-coil total when in MULTI mode
  useEffect(() => {
    if (isSheetMetal && coilEntryMode === 'MULTI') {
      setQuantity(String(totalBatchWeightKg));
      if (contractAllocations.length === 1) {
        setContractAllocations([{ ...contractAllocations[0], allocatedWeightKg: String(totalBatchWeightKg) }]);
      }
    }
  }, [isSheetMetal, coilEntryMode, totalBatchWeightKg, contractAllocations.length]);

  // Initialize default contract allocation when sheet metal is selected
  useEffect(() => {
    if (isSheetMetal && localContracts.length > 0 && contractAllocations.length === 0) {
      setContractAllocations([{ contractId: localContracts[0].id, allocatedWeightKg: quantity || '' }]);
    }
  }, [isSheetMetal, localContracts, contractAllocations.length, quantity]);

  const enteredQty = Number(quantity) || 0;
  const calculatedWeightKg = useMemo(() => {
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return enteredQty;
    return Number((enteredQty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [enteredQty, selectedPart]);

  // Multi-contract allocation calculations
  const totalAllocatedKg = useMemo(() => {
    return contractAllocations.reduce((sum, item) => sum + (Number(item.allocatedWeightKg) || 0), 0);
  }, [contractAllocations]);

  const allocationDiffKg = Number((calculatedWeightKg - totalAllocatedKg).toFixed(2));

  if (!isOpen) return null;

  const handleAddContractRow = () => {
    if (localContracts.length === 0) return;
    const remaining = Math.max(0, allocationDiffKg);
    setContractAllocations(prev => [
      ...prev,
      { contractId: localContracts[0].id, allocatedWeightKg: remaining > 0 ? String(remaining) : '' },
    ]);
  };

  const handleRemoveContractRow = (idx: number) => {
    setContractAllocations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddBatchCoilRow = () => {
    const nextIdx = batchCoils.length + 1;
    setBatchCoils(prev => [
      ...prev,
      {
        id: String(Date.now()),
        coilPackNumber: `CP-1403-10${nextIdx}`,
        physicalCoilCode: `COIL-0${nextIdx}`,
        weightKg: '2000',
        heatNumber: batchCoils[0]?.heatNumber || '',
      },
    ]);
  };

  const handleRemoveBatchCoilRow = (id: string) => {
    setBatchCoils(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateBatchCoil = (id: string, field: keyof BatchCoilRow, val: string) => {
    setBatchCoils(prev => prev.map(c => (c.id === id ? { ...c, [field]: val } : c)));
  };

  // Inline Quick Create Handlers
  const handleQuickCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qContractNumber.trim()) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch('/api/inventory/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: qContractNumber.trim(),
          customerName: qContractCustomer.trim() || 'ساپکو',
          allocatedWeightKg: Number(qContractWeight) || 50000,
          materialGrade: qContractGrade.trim() || 'DC04',
          thicknessMm: Number(qContractThickness) || 0.8,
          title: `قرارداد تامین ورق ${qContractGrade} - ${qContractCustomer}`,
          ownership,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (data.success && data.contract) {
        setLocalContracts(prev => [data.contract, ...prev]);
        setContractAllocations([{ contractId: data.contract.id, allocatedWeightKg: quantity || '' }]);
        setIsQuickContractOpen(false);
        setQContractNumber('');
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
          materialGrade: qPartGrade.trim(),
          thicknessMm: Number(qPartThickness) || undefined,
          widthMm: Number(qPartWidth) || undefined,
          weightPerUnitKg: qPartUnit === 'KG' ? 1 : 1,
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
        alert(data.error || 'خطا در ثبت قطعه');
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
      const locs = qWhLocations.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: qWhCode.trim(),
          name: qWhName.trim(),
          type: 'RAW_MATERIAL',
          locations: locs.length > 0 ? locs : ['LOC-01'],
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLocalWarehouses(prev => [...prev, data.data]);
        setWarehouseId(data.data.id);
        if (data.data.locations?.[0]) setLocationCode(data.data.locations[0]);
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

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!selectedPartId) {
      setErrorMessage('لطفاً کالا یا ورق مورد نظر را از لیست انتخاب کنید.');
      return;
    }
    if (enteredQty <= 0) {
      setErrorMessage('مقدار / وزن دریافتی باید بزرگتر از صفر باشد.');
      return;
    }
    if (isSheetMetal && coilEntryMode === 'SINGLE' && !coilPackNumber.trim()) {
      setErrorMessage('برای ورود ورق، ثبت «شماره کویل‌پک (Coil-Pack)» جهت رهگیری در انبار الزامی است.');
      return;
    }
    if (isSheetMetal && coilEntryMode === 'MULTI' && batchCoils.some(c => !c.coilPackNumber.trim() || !Number(c.weightKg))) {
      setErrorMessage('لطفاً شماره کویل‌پک و وزن همه رول‌های محموله را مشخص کنید.');
      return;
    }
    if (isSheetMetal && totalAllocatedKg > calculatedWeightKg) {
      setErrorMessage(
        `مجموع وزن تخصیص‌یافته به قراردادها (${formatNumber(totalAllocatedKg)} کیلوگرم) نمی‌تواند بیشتر از وزن باسکول رول دریافتی (${formatNumber(calculatedWeightKg)} کیلوگرم) باشد.`
      );
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (autoPost: boolean) => {
    setErrorMessage(null);
    setLoading(true);

    const primaryContractId =
      contractAllocations.length > 0 ? contractAllocations[0].contractId : localContracts[0]?.id;
    const primaryContract = localContracts.find(c => c.id === primaryContractId);

    // Build document lines
    let docLines: any[] = [];
    if (isSheetMetal && coilEntryMode === 'MULTI') {
      docLines = batchCoils.map(b => ({
        partId: selectedPartId,
        partCode: selectedPart?.code,
        partName: selectedPart?.name,
        lotNumber: b.coilPackNumber.trim() || b.physicalCoilCode.trim(),
        heatNumber: b.heatNumber.trim() || undefined,
        ownership,
        contractId: primaryContract?.id,
        contractNumber: primaryContract?.contractNumber,
        locationCode,
        quantity: Number(b.weightKg),
        unit: 'KG',
        qualityStatus,
        notes: notes.trim() || `ورود کلاف محموله دسته‌ای ${b.physicalCoilCode}`,
      }));
    } else {
      const effectiveLot = coilPackNumber.trim() || physicalCoilCode.trim() || undefined;
      docLines = [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: effectiveLot,
          heatNumber: heatNumber.trim() || undefined,
          ownership,
          contractId: primaryContract?.id,
          contractNumber: primaryContract?.contractNumber,
          locationCode,
          quantity: enteredQty,
          unit: selectedPart?.unit || 'KG',
          qualityStatus,
          notes: notes.trim() || undefined,
        },
      ];
    }

    const payload = {
      documentType: docType,
      warehouseId,
      ownership,
      referenceType:
        receiptSubType === 'SAPCO_MATERIAL'
          ? 'SAPCO_WAYBILL'
          : receiptSubType === 'FINISHED_PRODUCT'
          ? 'PRODUCTION_REPORT'
          : 'SUPPLIER_WAYBILL',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost,
      lines: docLines,
    };

    const res = await onSubmit(payload);

    // Register physical coils into /api/inventory/coils
    if (res.success && isSheetMetal) {
      try {
        const validAllocations = contractAllocations
          .filter(a => Number(a.allocatedWeightKg) > 0)
          .map(a => {
            const cnt = localContracts.find(c => c.id === a.contractId);
            return {
              contractId: a.contractId,
              contractNumber: cnt?.contractNumber || a.contractId,
              allocatedWeightKg: Number(a.allocatedWeightKg),
            };
          });

        if (coilEntryMode === 'MULTI') {
          // Register each coil in the batch
          for (const b of batchCoils) {
            const w = Number(b.weightKg);
            await fetch('/api/inventory/coils', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coilId: b.physicalCoilCode.trim() || `COIL-${Date.now().toString().slice(-5)}`,
                coilPackNumber: b.coilPackNumber.trim(),
                partId: selectedPart?.id,
                partCode: selectedPart?.code,
                partName: selectedPart?.name,
                materialGrade: selectedPart?.materialGrade || 'DC04',
                thicknessMm: selectedPart?.thicknessMm || 0.8,
                widthMm: (selectedPart as any)?.widthMm || 1250,
                originalWeightKg: w,
                remainingWeightKg: w,
                ownership,
                warehouseId,
                warehouseLocationCode: locationCode,
                heatNumber: b.heatNumber.trim() || undefined,
                allocations: validAllocations,
              }),
            });
          }
        } else if (coilPackNumber.trim()) {
          // Register single coil
          await fetch('/api/inventory/coils', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coilId: physicalCoilCode.trim() || `COIL-${Date.now().toString().slice(-5)}`,
              coilPackNumber: coilPackNumber.trim(),
              partId: selectedPart?.id,
              partCode: selectedPart?.code,
              partName: selectedPart?.name,
              materialGrade: selectedPart?.materialGrade || 'DC04',
              thicknessMm: selectedPart?.thicknessMm || 0.8,
              widthMm: (selectedPart as any)?.widthMm || 1250,
              originalWeightKg: calculatedWeightKg,
              remainingWeightKg: calculatedWeightKg,
              ownership,
              warehouseId,
              warehouseLocationCode: locationCode,
              heatNumber: heatNumber.trim() || undefined,
              allocations: validAllocations,
            }),
          });
        }
      } catch (err) {
        console.warn('Coil registration sync note:', err);
      }
    }

    setLoading(false);

    if (res.success) {
      setStep(1);
      setQuantity('');
      setCoilPackNumber('');
      setPhysicalCoilCode('');
      setHeatNumber('');
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت سند رسید کالا');
    }
  };

  const receiptTypes: Array<{ id: GuidedReceiptSubType; title: string; subtitle: string }> = [
    {
      id: 'SAPCO_MATERIAL',
      title: 'رسید ورق و مواد امانی ساپکو',
      subtitle: 'ورود رول ورق یا اقلام امانی خودروساز با حواله ساپکو',
    },
    {
      id: 'CUSTOMER_SUPPLIED',
      title: 'رسید مواد ارسالی مستقیم مشتری',
      subtitle: 'ورق، پیچ و مهره یا قطعاتی که مشتری طبق قرارداد تامین می‌کند',
    },
    {
      id: 'SUPPLIER_PURCHASE',
      title: 'خرید مستقیم از تامین‌کننده (ملکی)',
      subtitle: 'ورق، پیچ، مهره و لاستیک خریداری‌شده با مالکیت شرکت کوثر',
    },
    {
      id: 'OPENING_BALANCE',
      title: 'ثبت موجودی اول دوره',
      subtitle: 'ورود موجودی شمارش‌شده ابتدای دوره به کاردکس انبار',
    },
    {
      id: 'FINISHED_PRODUCT',
      title: 'رسید محصول نهایی از سالن تولید',
      subtitle: 'تحویل قطعات پرسکاری و مونتاژشده به انبار محصول',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-600 text-white rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                ثبت رسید ورود کالا، رول ورق و قطعات به انبار
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ثبت بدون وقفه محموله‌ها، تعریف سریع قرارداد/کالا/انبار درجا، و پشتیبانی از ورود همزمان چند رول
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

        {/* Guided Stepper Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto gap-3">
          {[
            { num: 1, label: '۱. نوع رسید و انبار مقصد' },
            { num: 2, label: '۲. انتخاب کالا، وزن، محموله رول و قرارداد' },
            { num: 3, label: '۳. پیش‌نمایش و ثبت قطعی / موقت' },
          ].map(s => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num as 1 | 2 | 3);
              }}
              className={`flex items-center gap-2 font-semibold whitespace-nowrap cursor-pointer ${
                step === s.num
                  ? 'text-slate-900'
                  : step > s.num
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === s.num
                    ? 'bg-white text-slate-900'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {toPersianDigits(s.num)}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[78vh] overflow-y-auto">
          {isAiPrefilled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-emerald-800">تکمیل هوشمند توسط دستیار هوش مصنوعی کارخانه</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    فیلدهای رسید کالا با مشخصات دریافتی از دستور صوتی/متنی شما پر شده‌اند.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-emerald-200/80 text-emerald-900 font-bold text-[11px]">
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

          {/* STEP 1: Receipt Type & Warehouse */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-slate-800 font-bold mb-2">
                  گام اول: نوع عملیات ورود کالا را انتخاب کنید <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {receiptTypes.map(rt => {
                    const active = receiptSubType === rt.id;
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setReceiptSubType(rt.id)}
                        className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs">{rt.title}</div>
                        <div className={`text-[11px] mt-1 ${active ? 'text-slate-700' : 'text-slate-500'}`}>
                          {rt.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-semibold">
                      انبار تحویل‌گیرنده <span className="text-rose-500">*</span>
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
                    onChange={e => {
                      setWarehouseId(e.target.value);
                      const wh = localWarehouses.find(w => w.id === e.target.value);
                      if (wh && wh.locations.length > 0) setLocationCode(wh.locations[0]);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {localWarehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    جایگاه / پالت انبارش
                    <ContextualHelp
                      title="جایگاه انبارش"
                      description="کد محل قرارگیری فیزیکی رول یا پالت در سالن انبار."
                      example="LOC-RAW-A1"
                    />
                  </label>
                  <select
                    value={locationCode}
                    onChange={e => setLocationCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {availableLocations.map(loc => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    شماره بارنامه / قبض باسکول
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="مثلاً WB-1403-8821"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Item Selection, Smart Progressive Disclosure & Multi-Contract Split */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Item Search & Select + Quick Create Part Button */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    جستجوی سریع کالا / ورق
                  </label>
                  <input
                    type="text"
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    placeholder="جستجو با نام، کد یا گرید ST12..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-semibold">
                      انتخاب کالا از فهرست کاتالوگ <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickPartOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ تعریف سریع کالا / ورق جدید</span>
                    </button>
                  </div>
                  <select
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {eligibleParts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — واحد: {p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automatic Read-Only Item Master Specification Banner */}
              {selectedPart && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-slate-600">مشخصات فنی کالا:</span>
                    <strong className="text-slate-900">{selectedPart.name}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span>کد: {selectedPart.code}</span>
                    {selectedPart.materialGrade && (
                      <>
                        <span>·</span>
                        <span>گرید: {selectedPart.materialGrade}</span>
                      </>
                    )}
                    {selectedPart.thicknessMm && (
                      <>
                        <span>·</span>
                        <span>ضخامت: {selectedPart.thicknessMm} mm</span>
                      </>
                    )}
                    <span>·</span>
                    <span>واحد: {selectedPart.unit === 'KG' ? 'کیلوگرم (KG)' : 'عدد (PCS)'}</span>
                  </div>
                </div>
              )}

              {/* PROGRESSIVE DISCLOSURE: Sheet Metal Specific Tracking & Multi-Coil Consignment */}
              {isSheetMetal ? (
                <div className="space-y-4 bg-blue-50/40 border border-blue-200/80 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>نحوه ورود رول/کلاف‌های ورق</span>
                    </div>

                    {/* Mode Toggle: Single Coil vs Multi-Coils (Batch) */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-blue-200">
                      <button
                        type="button"
                        onClick={() => setCoilEntryMode('SINGLE')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          coilEntryMode === 'SINGLE'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ثبت تک‌رول
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoilEntryMode('MULTI')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          coilEntryMode === 'MULTI'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ورود دسته‌ای چند رول همزمان (مثلاً ۳ رول)
                      </button>
                    </div>
                  </div>

                  {coilEntryMode === 'SINGLE' ? (
                    /* Single Coil Fields */
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          شماره کویل‌پک (Coil-Pack) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={coilPackNumber}
                          onChange={e => setCoilPackNumber(e.target.value)}
                          placeholder="مثلاً PK-ST12-1403-09"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          شناسه رول در کارخانه (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={physicalCoilCode}
                          onChange={e => setPhysicalCoilCode(e.target.value)}
                          placeholder="مثلاً COIL-01"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          وزن باسکول (کیلوگرم) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={quantity}
                          onChange={e => {
                            const val = e.target.value;
                            setQuantity(val);
                            if (contractAllocations.length === 1) {
                              setContractAllocations([{ ...contractAllocations[0], allocatedWeightKg: val }]);
                            }
                          }}
                          placeholder="مثلاً 2000"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          شماره ذوب (Heat No)
                        </label>
                        <input
                          type="text"
                          value={heatNumber}
                          onChange={e => setHeatNumber(e.target.value)}
                          placeholder="مثلاً HT-MOB-9921"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Multi-Coil Consignment Table (3 coils scenario) */
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs">
                          فهرست رول‌های محموله (تعداد: {batchCoils.length} حلقه رول)
                        </span>
                        <button
                          type="button"
                          onClick={handleAddBatchCoilRow}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-[11px] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن رول دیگر به محموله</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-2.5">ردیف</th>
                              <th className="py-2 px-2.5">شماره کویل‌پک (پلاک ساپکو)</th>
                              <th className="py-2 px-2.5">کد رول در کارگاه</th>
                              <th className="py-2 px-2.5">وزن خالص باسکول (kg)</th>
                              <th className="py-2 px-2.5">شماره ذوب</th>
                              <th className="py-2 px-2.5 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {batchCoils.map((coil, idx) => (
                              <tr key={coil.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    value={coil.coilPackNumber}
                                    onChange={e => handleUpdateBatchCoil(coil.id, 'coilPackNumber', e.target.value)}
                                    placeholder="CP-1403-..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    value={coil.physicalCoilCode}
                                    onChange={e => handleUpdateBatchCoil(coil.id, 'physicalCoilCode', e.target.value)}
                                    placeholder="COIL-..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2.5">
                                  <input
                                    type="number"
                                    value={coil.weightKg}
                                    onChange={e => handleUpdateBatchCoil(coil.id, 'weightKg', e.target.value)}
                                    placeholder="2000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono font-bold text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    value={coil.heatNumber}
                                    onChange={e => handleUpdateBatchCoil(coil.id, 'heatNumber', e.target.value)}
                                    placeholder="HT-..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  {batchCoils.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBatchCoilRow(coil.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-semibold text-xs">
                        <span className="text-slate-600">مجموع وزن باسکول محموله ({batchCoils.length} رول):</span>
                        <span className="font-mono text-blue-700 font-bold text-sm">
                          {formatWeightKg(totalBatchWeightKg)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Multi-Contract Split Section + Quick Create Contract Button */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-800">
                        تخصیص وزن رول به قراردادها
                        <ContextualHelp
                          title="تخصیص قرارداد"
                          description="اگر این رول‌ها برای قرارداد خاصی هستند، آن را انتخاب کنید. اگر هنوز قراردادی ثبت نشده، با کلیک بر روی «+ قرارداد جدید» درجا آن را بسازید."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickContractOpen(true)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ تعریف سریع قرارداد جدید</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddContractRow}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تسهیم چند قراردادی</span>
                        </button>
                      </div>
                    </div>

                    {localContracts.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-900 text-xs">
                        <span>هنوز هیچ قراردادی در سیستم تعریف نشده است. جهت ثبت سهمیه، دکمه «+ تعریف سریع قرارداد جدید» را بزنید.</span>
                        <button
                          type="button"
                          onClick={() => setIsQuickContractOpen(true)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          ثبت فوری قرارداد
                        </button>
                      </div>
                    ) : (
                      contractAllocations.map((row, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="sm:col-span-7">
                            <select
                              value={row.contractId}
                              onChange={e => {
                                const next = [...contractAllocations];
                                next[index].contractId = e.target.value;
                                setContractAllocations(next);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                            >
                              {localContracts.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.contractNumber} — {c.title || c.customerName} ({c.materialGrade || 'DC04'})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-4 flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={row.allocatedWeightKg}
                              onChange={e => {
                                const next = [...contractAllocations];
                                next[index].allocatedWeightKg = e.target.value;
                                setContractAllocations(next);
                              }}
                              placeholder="وزن سهم (kg)"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold"
                            />
                            <span className="text-slate-500 font-mono">kg</span>
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            {contractAllocations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveContractRow(index)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="حذف این ردیف قرارداد"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 text-slate-600">
                      <span>
                        مجموع تخصیص‌یافته به قراردادها:{' '}
                        <strong className="font-mono text-slate-900">{formatWeightKg(totalAllocatedKg)}</strong>
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          allocationDiffKg < 0
                            ? 'text-rose-600'
                            : allocationDiffKg === 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {allocationDiffKg === 0
                          ? '✓ کل وزن رول به طور کامل به قرارداد(ها) تخصیص یافت'
                          : allocationDiffKg > 0
                          ? `وزن آزاد / بدون قرارداد: ${formatWeightKg(allocationDiffKg)}`
                          : `خطا: اضافه‌تخصیص بیش از وزن رول (${formatWeightKg(Math.abs(allocationDiffKg))})`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Screws, Nuts, or Finished Goods */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      مقدار دریافتی ({selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="مثلاً 500"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      شماره بچ / ردیابی
                    </label>
                    <input
                      type="text"
                      value={coilPackNumber}
                      onChange={e => setCoilPackNumber(e.target.value)}
                      placeholder="BATCH-..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      قرارداد مرتبط
                    </label>
                    <select
                      value={contractAllocations[0]?.contractId || ''}
                      onChange={e =>
                        setContractAllocations(
                          e.target.value ? [{ contractId: e.target.value, allocatedWeightKg: String(calculatedWeightKg) }] : []
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    >
                      <option value="">بدون قرارداد (عمومی)</option>
                      {localContracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.contractNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Quality Status & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    وضعیت تایید کنترل کیفیت (QC)
                  </label>
                  <select
                    value={qualityStatus}
                    onChange={e => setQualityStatus(e.target.value as StockQualityStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    <option value="AVAILABLE">سالم و قابل مصرف در خطوط پرس</option>
                    <option value="QUARANTINE">در انتظار آزمایشگاه / قرنطینه</option>
                    <option value="QUALITY_BLOCKED">مردود / بلوکه کیفی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    توضیحات و یادداشت سند
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="نام راننده، شماره پلاک خودرو، توضیحات تخلیه..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>پیش‌نمایش اطلاعات سند پیش از ثبت نهایی</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">نوع رسید و انبار:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {receiptTypes.find(r => r.id === receiptSubType)?.title} — {currentWarehouse?.name} ({locationCode})
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">کالا / متریال انتخابی:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {selectedPart?.name} ({selectedPart?.code})
                  </strong>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">وزن / مقدار کل ورودی:</span>
                  <strong className="text-emerald-900 font-mono text-sm mt-1 block">
                    {formatWeightKg(calculatedWeightKg)} ({formatNumber(enteredQty)} {selectedPart?.unit})
                  </strong>
                </div>
              </div>

              {isSheetMetal && coilEntryMode === 'MULTI' && (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1.5 font-semibold">
                    کلاف‌های ثبت‌شده در این محموله ({batchCoils.length} رول):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {batchCoils.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded text-slate-800 font-mono text-[11px]">
                        <strong>{c.coilPackNumber}</strong> ({formatNumber(Number(c.weightKg))} kg)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                انصراف
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                  disabled={loading}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  بازگشت
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ادامه: انتخاب کالا و مقدار</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>پیش‌نمایش سند</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
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
                    <span>{loading ? 'در حال ثبت...' : 'ثبت قطعی در کاردکس'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK CONTRACT CREATION MODAL */}
      {isQuickContractOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع قرارداد و سهمیه جدید (درجا)</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsQuickContractOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateContract} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  شماره قرارداد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً CNT-1403-SAPCO-12"
                  value={qContractNumber}
                  onChange={e => setQContractNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  طرف حساب / مشتری
                </label>
                <input
                  type="text"
                  placeholder="ساپکو / شرکت سازه‌گستر..."
                  value={qContractCustomer}
                  onChange={e => setQContractCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">سهمیه وزنی (kg)</label>
                  <input
                    type="number"
                    value={qContractWeight}
                    onChange={e => setQContractWeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">گرید متریال</label>
                  <input
                    type="text"
                    value={qContractGrade}
                    onChange={e => setQContractGrade(e.target.value)}
                    placeholder="DC04"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickContractOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب قرارداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PART CREATION MODAL */}
      {isQuickPartOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع کالا / ورق در کاتالوگ (درجا)</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsQuickPartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreatePart} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  کد کالا / رول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً PRT-RAW-DC04-08"
                  value={qPartCode}
                  onChange={e => setQPartCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نام کالا / شرح ورق <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ورق رول DC04 ضخامت ۰.۸ میلیمتر عرض ۱۲۵۰"
                  value={qPartName}
                  onChange={e => setQPartName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-200 focus:bg-white focus:outline-none"
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
                    <option value="RAW_MATERIAL">ماده اولیه (ورق و رول)</option>
                    <option value="WIP_PART">نیم‌ساخته (WIP)</option>
                    <option value="FINISHED_GOOD">محصول نهایی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">واحد سنجش</label>
                  <select
                    value={qPartUnit}
                    onChange={e => setQPartUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="KG">کیلوگرم (KG)</option>
                    <option value="PCS">عدد (PCS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">گرید</label>
                  <input
                    type="text"
                    value={qPartGrade}
                    onChange={e => setQPartGrade(e.target.value)}
                    placeholder="DC04"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضخامت (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={qPartThickness}
                    onChange={e => setQPartThickness(e.target.value)}
                    placeholder="0.8"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">عرض (mm)</label>
                  <input
                    type="number"
                    value={qPartWidth}
                    onChange={e => setQPartWidth(e.target.value)}
                    placeholder="1250"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickPartOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب کالا'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK WAREHOUSE CREATION MODAL */}
      {isQuickWarehouseOpen && (
        <div className="fixed inset-0 z-60 bg-white backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع انبار جدید (درجا)</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsQuickWarehouseOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  کد انبار <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً WH-RAW-NEW"
                  value={qWhCode}
                  onChange={e => setQWhCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نام انبار <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً انبار مرکزی رول و ورق شماره ۲"
                  value={qWhName}
                  onChange={e => setQWhName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  جایگاه‌های فیزیکی (با کاما جدا کنید)
                </label>
                <input
                  type="text"
                  placeholder="LOC-A1, LOC-A2, LOC-B1"
                  value={qWhLocations}
                  onChange={e => setQWhLocations(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickWarehouseOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingQuick}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submittingQuick ? 'در حال ثبت...' : 'ثبت و انتخاب انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
