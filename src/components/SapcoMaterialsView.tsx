import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Scale,
  Search,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  X,
  Settings,
  GitBranch,
  Link2,
  Compass,
  Tag,
  FileCheck2,
} from 'lucide-react';
import {
  SapcoCoilReceipt,
  Part,
  LinkedCoilProductionBatch,
} from '../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  exportToCsv,
} from '../utils/formatters';
import { InventoryModuleSkeleton } from './ui/Skeleton';
import { SearchableSelect } from './common/SearchableSelect';
import { formatToJalali } from '../utils/jalali';

interface SapcoMaterialsViewProps {
  coils: SapcoCoilReceipt[];
  parts: Part[];
  onRefresh: () => Promise<void>;
  loading: boolean;
  onNavigateToDashboardOrder?: () => void;
}

const DEFAULT_HEAT_LINKS: Record<
  string,
  {
    heatNumber: string;
    batchNumber: string;
    linkedProductionBatches: LinkedCoilProductionBatch[];
  }
> = {
  '0': {
    heatNumber: 'HT-99412-MOB',
    batchNumber: 'BCH-SAP-ECU-101',
    linkedProductionBatches: [
      {
        batchCode: 'BCH-PRD-ECU-MAIN',
        moCode: 'MO-ECU-MAIN-01',
        partCode: 'WIP-ECU-MAIN-BRK',
        partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
        allocatedKg: 1500,
        targetQtyPcs: 1500,
        linkedAt: formatToJalali(new Date()),
      },
      {
        batchCode: 'BCH-PRD-ECU-COMP',
        moCode: 'MO-ECU-COMP-01',
        partCode: 'WIP-ECU-COMP-BRK',
        partName: 'قطعه مکمل براکت ضدسرقت رایانه موتور',
        allocatedKg: 720,
        targetQtyPcs: 1500,
        linkedAt: formatToJalali(new Date()),
      },
    ],
  },
  '1': {
    heatNumber: 'HT-99415-MOB',
    batchNumber: 'BCH-SAP-ECU-102',
    linkedProductionBatches: [
      {
        batchCode: 'BCH-PRD-ECU-ASY',
        moCode: 'MO-ECU-ASY-01',
        partCode: 'SAPCO-ASY-ECU-BRK-01',
        partName: 'مجموعه براکت ضدسرقت رایانه موتور (ECU)',
        allocatedKg: 2220,
        targetQtyPcs: 1500,
        linkedAt: formatToJalali(new Date()),
      },
    ],
  },
};

export const SapcoMaterialsView: React.FC<SapcoMaterialsViewProps> = ({
  coils,
  parts,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  // Persisted Heat/Batch & Production Batch Link Map
  const [coilBatchLinks, setCoilBatchLinks] = useState<
    Record<
      string,
      {
        heatNumber: string;
        batchNumber: string;
        linkedProductionBatches: LinkedCoilProductionBatch[];
      }
    >
  >(() => {
    try {
      const saved = localStorage.getItem('kpims_sapco_coil_batch_links_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const saveCoilBatchLinks = (
    next: Record<
      string,
      {
        heatNumber: string;
        batchNumber: string;
        linkedProductionBatches: LinkedCoilProductionBatch[];
      }
    >
  ) => {
    setCoilBatchLinks(next);
    try {
      localStorage.setItem('kpims_sapco_coil_batch_links_v3', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Dynamic Steel Grades Management
  const [materialGradesList, setMaterialGradesList] = useState<
    Array<{ code: string; name: string; standard?: string; yieldStrengthMpa?: number }>
  >([
    { code: 'DC01A', name: 'DC01A (فرم‌پذیر استاندارد)', standard: 'EN 10130' },
    { code: 'DC04', name: 'DC04 (کشش عمیق)', standard: 'EN 10130' },
    { code: 'ST14', name: 'ST14 (نورد سرد فوق کشش)', standard: 'DIN 1623' },
    { code: 'ST12', name: 'ST12 (کشش معمولی)', standard: 'DIN 1623' },
    { code: 'DX51D', name: 'DX51D (گالوانیزه)', standard: 'EN 10346' },
    { code: 'ST37', name: 'ST37 (ساختمانی/شاسی)', standard: 'DIN 17100' },
  ]);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [newGradeCode, setNewGradeCode] = useState('');
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeStandard, setNewGradeStandard] = useState('');

  // Form State for New Coil Receipt (with Batch & Heat Number!)
  const [receiptNumber, setReceiptNumber] = useState('');
  const [coilNumber, setCoilNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [heatNumber, setHeatNumber] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [materialGrade, setMaterialGrade] = useState('DC01A');
  const [thicknessMm, setThicknessMm] = useState<number>(2.0);
  const [widthMm, setWidthMm] = useState<number>(1140);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(8450);
  const [initialLinkedMoCode, setInitialLinkedMoCode] = useState<string>('');

  // Modal for Linking an Existing Coil/Heat to a Production Batch (MO)
  const [linkingCoil, setLinkingCoil] = useState<SapcoCoilReceipt | null>(null);
  const [selectedMoForLink, setSelectedMoForLink] = useState<string>('');
  const [linkProductionBatchCode, setLinkProductionBatchCode] = useState<string>('');
  const [linkAllocatedKg, setLinkAllocatedKg] = useState<string>('1500');

  // Modal for viewing End-to-End Heat/Batch Traceability Tree
  const [traceabilityCoil, setTraceabilityCoil] = useState<SapcoCoilReceipt | null>(null);

  // Load active Manufacturing Orders from localStorage so we can link coils directly to them
  const activeManufacturingOrders = useMemo(() => {
    try {
      const saved = localStorage.getItem('kpims_highway_scenarios_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'SCN-ECU-MAIN',
        orderCode: 'MO-ECU-MAIN-01',
        partCode: 'WIP-ECU-MAIN-BRK',
        partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
        orderQty: 1500,
      },
      {
        id: 'SCN-ECU-COMP',
        orderCode: 'MO-ECU-COMP-01',
        partCode: 'WIP-ECU-COMP-BRK',
        partName: 'قطعه مکمل براکت ضدسرقت رایانه موتور',
        orderQty: 1500,
      },
      {
        id: 'SCN-ECU-BRK',
        orderCode: 'MO-ECU-ASY-01',
        partCode: 'SAPCO-ASY-ECU-BRK-01',
        partName: 'مجموعه براکت ضدسرقت رایانه موتور (ECU)',
        orderQty: 1500,
      },
    ];
  }, [linkingCoil, showModal, coilBatchLinks]);

  const loadGrades = async () => {
    try {
      const res = await fetch('/api/material-grades');
      const json = await res.json();
      if (json.success && json.data) {
        setMaterialGradesList(json.data);
      }
    } catch {
      // use defaults
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  // Enrich coils with Batch Number, Heat Number, and Linked Production Batches
  const enrichedCoils: SapcoCoilReceipt[] = useMemo(() => {
    const sourceList: SapcoCoilReceipt[] =
      coils.length > 0
        ? coils
        : [
            {
              id: 'COIL-DEF-1',
              receiptNumber: 'SAP-RC-1404-881',
              coilNumber: 'MOB-2025-DC01-409',
              partId: 'RM-1',
              partCode: 'RM-COIL-DC01A-2.0-1140',
              partName: 'رول ورق DC01A ضخامت 2.0 عرض 1140',
              materialGrade: 'DC01A',
              thicknessMm: 2.0,
              widthMm: 1140,
              receivedWeightKg: 18500,
              consumedWeightKg: 7613,
              heatNumber: 'HT-99412-MOB',
              batchNumber: 'BCH-SAP-1404-101',
              receiptDate: '۱۴۰۴/۰۲/۱۸',
              status: 'IN_CUTTING',
            },
            {
              id: 'COIL-DEF-2',
              receiptNumber: 'SAP-RC-1404-884',
              coilNumber: 'MOB-2025-DC04-512',
              partId: 'RM-2',
              partCode: 'RM-COIL-DC04-1.2-1250',
              partName: 'رول ورق کشش عمیق DC04 ضخامت 1.2',
              materialGrade: 'DC04',
              thicknessMm: 1.2,
              widthMm: 1250,
              receivedWeightKg: 24000,
              consumedWeightKg: 8778,
              heatNumber: 'HT-88305-MOB',
              batchNumber: 'BCH-SAP-1404-102',
              receiptDate: '۱۴۰۴/۰۲/۱۹',
              status: 'IN_CUTTING',
            },
            {
              id: 'COIL-DEF-3',
              receiptNumber: 'SAP-RC-1404-890',
              coilNumber: 'FOO-2025-ST37-701',
              partId: 'RM-3',
              partCode: 'RM-COIL-ST37-2.5-1250',
              partName: 'ورق ضخیم ST37 ضخامت 2.5 عرض 1250',
              materialGrade: 'ST37',
              thicknessMm: 2.5,
              widthMm: 1250,
              receivedWeightKg: 32000,
              consumedWeightKg: 11178,
              heatNumber: 'HT-77190-FOOLAD',
              batchNumber: 'BCH-SAP-1404-103',
              receiptDate: '۱۴۰۴/۰۲/۲۰',
              status: 'IN_STOCK',
            },
          ];

    return sourceList.map((c, idx) => {
      const savedMeta =
        coilBatchLinks[c.id] ||
        coilBatchLinks[c.coilNumber] ||
        DEFAULT_HEAT_LINKS[String(idx)];

      return {
        ...c,
        heatNumber:
          savedMeta?.heatNumber ||
          c.heatNumber ||
          `HT-${99100 + idx * 117}-MOB`,
        batchNumber:
          savedMeta?.batchNumber ||
          c.batchNumber ||
          `BCH-SAP-1404-${101 + idx}`,
        linkedProductionBatches:
          savedMeta?.linkedProductionBatches ||
          c.linkedProductionBatches ||
          [],
      };
    });
  }, [coils, coilBatchLinks]);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeCode.trim() || !newGradeName.trim()) return;
    try {
      const res = await fetch('/api/material-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newGradeCode.trim(),
          name: newGradeName.trim(),
          standard: newGradeStandard.trim() || 'استاندارد ساپکو',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMaterialGrade(newGradeCode.trim().toUpperCase());
        setNewGradeCode('');
        setNewGradeName('');
        setNewGradeStandard('');
        setIsGradeModalOpen(false);
        await loadGrades();
      }
    } catch (err) {
      console.error('Error adding grade', err);
    }
  };

  const handleDeleteGrade = async (code: string) => {
    try {
      await fetch(`/api/material-grades/${code}`, { method: 'DELETE' });
      await loadGrades();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && enrichedCoils.length === 0) {
    return <InventoryModuleSkeleton />;
  }

  const rawParts = parts.filter(p => p.category === 'RAW_MATERIAL');

  const filteredCoils = enrichedCoils.filter(c => {
    if (gradeFilter !== 'ALL' && c.materialGrade !== gradeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchLinkedBatch = (c.linkedProductionBatches || []).some(
        b =>
          b.batchCode.toLowerCase().includes(q) ||
          b.moCode.toLowerCase().includes(q) ||
          b.partName.toLowerCase().includes(q)
      );
      return (
        c.coilNumber.toLowerCase().includes(q) ||
        c.receiptNumber.toLowerCase().includes(q) ||
        c.partName.toLowerCase().includes(q) ||
        (c.heatNumber && c.heatNumber.toLowerCase().includes(q)) ||
        (c.batchNumber && c.batchNumber.toLowerCase().includes(q)) ||
        matchLinkedBatch
      );
    }
    return true;
  });

  const totalReceivedKg = enrichedCoils.reduce((acc, c) => acc + c.receivedWeightKg, 0);
  const totalConsumedKg = enrichedCoils.reduce((acc, c) => acc + c.consumedWeightKg, 0);
  const remainingKg = totalReceivedKg - totalConsumedKg;
  const totalLinkedBatchesCount = enrichedCoils.reduce(
    (acc, c) => acc + (c.linkedProductionBatches?.length || 0),
    0
  );

  // Sync a linked Coil/Heat/Batch directly into the Dashboard Manufacturing Orders (`kpims_highway_scenarios_v3`)
  const syncCoilHeatToManufacturingOrder = (
    moCode: string,
    coilNumberVal: string,
    heatNumberVal: string,
    coilBatchNumberVal: string,
    productionBatchCodeVal: string
  ) => {
    try {
      const saved = localStorage.getItem('kpims_highway_scenarios_v3');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      const updated = parsed.map((scn: any) => {
        if (scn.orderCode !== moCode) return scn;
        return {
          ...scn,
          coilNumber: coilNumberVal,
          heatNumber: heatNumberVal,
          sapcoBatchNumber: coilBatchNumberVal,
          productionBatchCode: productionBatchCodeVal,
        };
      });
      localStorage.setItem('kpims_highway_scenarios_v3', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleCreateCoil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber || !coilNumber || !selectedPartId || receivedWeightKg <= 0) {
      setErrorMsg('لطفاً شماره رسید، شماره کویل، شماره ذوب، پارت مرتبط و وزن را وارد کنید.');
      return;
    }

    const finalHeat = heatNumber.trim() || `HT-${Math.floor(10000 + Math.random() * 89999)}-MOB`;
    const finalBatch =
      batchNumber.trim() || `BCH-SAP-1404-${Math.floor(110 + Math.random() * 800)}`;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const initialBatches: LinkedCoilProductionBatch[] = [];
      if (initialLinkedMoCode) {
        const targetMo = activeManufacturingOrders.find(
          (m: any) => m.orderCode === initialLinkedMoCode
        );
        if (targetMo) {
          const prodBatchCode = `BCH-PRD-${initialLinkedMoCode.replace('MO-', '')}`;
          initialBatches.push({
            batchCode: prodBatchCode,
            moCode: targetMo.orderCode,
            partCode: targetMo.partCode,
            partName: targetMo.partName,
            allocatedKg: Math.min(Number(receivedWeightKg), 5000),
            targetQtyPcs: targetMo.orderQty || 2000,
            linkedAt: 'امروز - ثبت همزمان با رسید',
          });
          syncCoilHeatToManufacturingOrder(
            targetMo.orderCode,
            coilNumber,
            finalHeat,
            finalBatch,
            prodBatchCode
          );
        }
      }

      saveCoilBatchLinks({
        ...coilBatchLinks,
        [coilNumber]: {
          heatNumber: finalHeat,
          batchNumber: finalBatch,
          linkedProductionBatches: initialBatches,
        },
      });

      const res = await fetch('/api/sapco/coils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber,
          coilNumber,
          batchNumber: finalBatch,
          partId: selectedPartId,
          materialGrade,
          thicknessMm: Number(thicknessMm),
          widthMm: Number(widthMm),
          receivedWeightKg: Number(receivedWeightKg),
          heatNumber: finalHeat,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت کلاف ساپکو');
      }

      setShowModal(false);
      setReceiptNumber('');
      setCoilNumber('');
      setHeatNumber('');
      setBatchNumber('');
      setInitialLinkedMoCode('');
      setToastNotice({
        title: `رسید کلاف ${coilNumber} با شماره ذوب ${finalHeat} ثبت شد`,
        detail: `بچ ورودی ${finalBatch} در سیستم ردیابی ثبت گردید${
          initialBatches.length > 0
            ? ` و به دستور تولید ${initialBatches[0].moCode} متصل شد.`
            : '.'
        }`,
      });
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Linking an Existing Coil (Heat/Batch) to a Production Order Batch
  const handleSaveProductionBatchLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingCoil || !selectedMoForLink) return;

    const targetMo = activeManufacturingOrders.find(
      (m: any) => m.orderCode === selectedMoForLink
    );
    if (!targetMo) return;

    const allocKg = Math.max(1, Number(linkAllocatedKg) || 1000);
    const prodBatchCode =
      linkProductionBatchCode.trim() ||
      `BCH-PRD-${targetMo.orderCode.replace('MO-', '')}`;

    const newLink: LinkedCoilProductionBatch = {
      batchCode: prodBatchCode,
      moCode: targetMo.orderCode,
      partCode: targetMo.partCode,
      partName: targetMo.partName,
      allocatedKg: allocKg,
      targetQtyPcs: targetMo.orderQty || 2000,
      linkedAt: 'امروز - ثبت ردیابی ذوب',
    };

    const existingEntry = coilBatchLinks[linkingCoil.id] ||
      coilBatchLinks[linkingCoil.coilNumber] || {
        heatNumber: linkingCoil.heatNumber || 'HT-99412-MOB',
        batchNumber: linkingCoil.batchNumber || 'BCH-SAP-1404-101',
        linkedProductionBatches: linkingCoil.linkedProductionBatches || [],
      };

    const updatedBatches = [
      newLink,
      ...existingEntry.linkedProductionBatches.filter(
        b => b.moCode !== targetMo.orderCode
      ),
    ];

    saveCoilBatchLinks({
      ...coilBatchLinks,
      [linkingCoil.id]: {
        ...existingEntry,
        linkedProductionBatches: updatedBatches,
      },
      [linkingCoil.coilNumber]: {
        ...existingEntry,
        linkedProductionBatches: updatedBatches,
      },
    });

    syncCoilHeatToManufacturingOrder(
      targetMo.orderCode,
      linkingCoil.coilNumber,
      existingEntry.heatNumber,
      existingEntry.batchNumber,
      prodBatchCode
    );

    setToastNotice({
      title: `اتصال شماره ذوب ${existingEntry.heatNumber} به بچ تولید ${prodBatchCode} انجام شد`,
      detail: `کلاف ${linkingCoil.coilNumber} (${formatNumber(allocKg)} کیلوگرم) به دستور ساخت ${targetMo.orderCode} (${targetMo.partName}) متصل گردید.`,
    });
    setLinkingCoil(null);
  };

  const handleExport = () => {
    const headers = [
      'شماره رسید ساپکو',
      'شماره بچ محموله',
      'شماره سریال کویل',
      'شماره ذوب (Heat No)',
      'عنوان ورق',
      'گرید آلیاژ',
      'ضخامت (mm)',
      'عرض (mm)',
      'وزن ورودی (kg)',
      'مصرف شده (kg)',
      'مانده (kg)',
      'بچ‌های تولید متصل (MO)',
      'وضعیت',
    ];
    const rows = filteredCoils.map(c => [
      c.receiptNumber,
      c.batchNumber || '—',
      c.coilNumber,
      c.heatNumber || '—',
      c.partName,
      c.materialGrade,
      c.thicknessMm,
      c.widthMm,
      c.receivedWeightKg,
      c.consumedWeightKg,
      c.receivedWeightKg - c.consumedWeightKg,
      (c.linkedProductionBatches || [])
        .map(b => `${b.batchCode} (${b.moCode})`)
        .join(' | ') || 'بدون اتصال',
      c.status === 'IN_STOCK' ? 'موجود در انبار' : 'در حال برش',
    ]);
    exportToCsv(`ردیابی_شماره_ذوب_و_بچ_کلاف_های_ساپکو_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-5 font-sans text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-900" />
            <h2 className="text-base font-bold text-slate-900">
              رهگیری کلاف‌های ساپکو، شماره ذوب (Heat No) و اتصال به بچ‌های تولید
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت شماره ذوب فولاد مبارکه، شماره بچ ورود کلاف و پیوند مستقیم ماده اولیه با بچ‌های ساخت (MO) در خط تولید
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل ردیابی ذوب</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReceiptNumber(`SAP-RC-1404-${Math.floor(891 + Math.random() * 99)}`);
              setCoilNumber(`MOB-2025-${materialGrade}-${Math.floor(500 + Math.random() * 499)}`);
              setHeatNumber(`HT-${Math.floor(10000 + Math.random() * 89999)}-MOB`);
              setBatchNumber(`BCH-SAP-1404-${Math.floor(105 + Math.random() * 80)}`);
              if (rawParts[0] && !selectedPartId) setSelectedPartId(rawParts[0].id);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>ثبت رسید کلاف و شماره ذوب</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">{toastNotice.title}: </span>
              <span>{toastNotice.detail}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 font-semibold cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Minimal Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span>کلاف‌های دارای شناسنامه ذوب</span>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1 tabular-nums">
            {toPersianDigits(enrichedCoils.length)} رول ورق
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span>مجموع وزن ورودی ساپکو</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1 tabular-nums">
            {formatWeightKg(totalReceivedKg)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span>مانده خالص در انبار ورق</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1 tabular-nums">
            {formatWeightKg(remainingKg)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span>بچ‌های تولید متصل به شماره ذوب</span>
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-700 font-mono mt-1 tabular-nums">
            {toPersianDigits(totalLinkedBatchesCount)} بچ ساخت (MO)
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی شماره ذوب (HT-...)، بچ کلاف، سریال کویل یا دستور تولید (MO)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'DC04', 'DC01A', 'ST14', 'DX51D', 'ST37'].map(grade => (
            <button
              key={grade}
              type="button"
              onClick={() => setGradeFilter(grade)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                gradeFilter === grade
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {grade === 'ALL' ? 'همه گریدها' : `گرید ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {/* Coils & Heat/Batch Traceability Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3.5">شماره رسید و سریال کویل</th>
                <th className="p-3.5">شماره ذوب (Heat No) و بچ ورود</th>
                <th className="p-3.5">مشخصات ورق و گرید</th>
                <th className="p-3.5">وزن دریافتی / مانده</th>
                <th className="p-3.5">بچ‌های تولید متصل (Production Batches)</th>
                <th className="p-3.5 text-left">ردیابی و اتصال به تولید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredCoils.map(coil => {
                const rem = Math.max(0, coil.receivedWeightKg - coil.consumedWeightKg);
                const remPercent = Math.round(
                  (rem / Math.max(1, coil.receivedWeightKg)) * 100
                );
                const linkedBatches = coil.linkedProductionBatches || [];

                return (
                  <tr key={coil.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{coil.coilNumber}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        رسید: {coil.receiptNumber}
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-[11px]">
                        <span>ذوب: {coil.heatNumber || '—'}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        بچ ورود: {coil.batchNumber || '—'}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{coil.partName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        گرید {coil.materialGrade} · ضخامت {toPersianDigits(coil.thicknessMm)} × عرض{' '}
                        {toPersianDigits(coil.widthMm)} mm
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap font-mono">
                      <div className="font-bold text-emerald-700">
                        مانده: {formatWeightKg(rem)} ({toPersianDigits(remPercent)}٪)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ورودی اولیه: {formatWeightKg(coil.receivedWeightKg)}
                      </div>
                    </td>

                    <td className="p-3.5">
                      {linkedBatches.length === 0 ? (
                        <span className="text-slate-400 text-[11px]">
                          هنوز به بچ تولید متصل نشده
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedBatches.map(b => (
                            <span
                              key={b.batchCode + b.moCode}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px]"
                            >
                              <span className="font-mono font-bold text-slate-900">
                                {b.batchCode}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="font-mono text-indigo-700 font-semibold">
                                {b.moCode}
                              </span>
                              <span className="text-slate-500">({b.partName})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setLinkingCoil(coil);
                            const defaultMo =
                              activeManufacturingOrders[0]?.orderCode || 'MO-1404-2001';
                            setSelectedMoForLink(defaultMo);
                            setLinkProductionBatchCode(
                              `BCH-PRD-${defaultMo.replace('MO-', '')}`
                            );
                            setLinkAllocatedKg('2500');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>اتصال به بچ تولید</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTraceabilityCoil(coil)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5 text-slate-600" />
                          <span>شجره‌نامه ذوب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: NEW SAPCO COIL RECEIPT WITH HEAT & BATCH TRACKING           */}
      {/* ==================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ثبت رسید ورود کلاف ساپکو با شماره ذوب (Heat No) و بچ تولید
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  اطلاعات ذوب و بچ کلاف مستقیماً در کاردکس انبار و شناسنامه بچ‌های تولید ثبت می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCoil} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    شماره رسید حواله ساپکو *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: SAP-RC-98520"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    شماره سریال کویل فولاد مبارکه *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: MOB-2025-DC04-912"
                    value={coilNumber}
                    onChange={e => setCoilNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Heat Number & Batch Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <div>
                  <label className="block text-amber-950 font-bold mb-1">
                    شماره ذوب فولاد (Heat Number) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: HT-99412-MOB"
                    value={heatNumber}
                    onChange={e => setHeatNumber(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-amber-950 font-bold mb-1">
                    شماره بچ محموله ورودی (Batch No) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: BCH-SAP-1404-105"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ماده اولیه مرتبط در کاتالوگ (متصل به اطلاعات پایه) *
                </label>
                <SearchableSelect
                  value={selectedPartId}
                  onChange={val => setSelectedPartId(val)}
                  placeholder="-- جستجو و انتخاب ورق / ماده اولیه --"
                  searchPlaceholder="جستجو با کد یا عنوان کالا..."
                  options={rawParts.map(p => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `${p.code} • ${p.unit || 'کیلوگرم'}`,
                    badge: 'ماده اولیه',
                  }))}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">گرید آلیاژ</label>
                    <button
                      type="button"
                      onClick={() => setIsGradeModalOpen(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      + گرید جدید
                    </button>
                  </div>
                  <select
                    value={materialGrade}
                    onChange={e => setMaterialGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-semibold text-slate-900 cursor-pointer"
                  >
                    {materialGradesList.map(g => (
                      <option key={g.code} value={g.code}>
                        {g.code} — {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضخامت (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0.1}
                    value={thicknessMm}
                    onChange={e => setThicknessMm(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">عرض کویل (mm)</label>
                  <input
                    type="number"
                    min={100}
                    value={widthMm}
                    onChange={e => setWidthMm(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    وزن دریافتی کلاف (کیلوگرم) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={receivedWeightKg}
                    onChange={e => setReceivedWeightKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    اتصال مستقیم به دستور تولید فعال (اختیاری):
                  </label>
                  <select
                    value={initialLinkedMoCode}
                    onChange={e => setInitialLinkedMoCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 cursor-pointer"
                  >
                    <option value="">-- بدون تخصیص اولیه (مانده آزاد در انبار) --</option>
                    {activeManufacturingOrders.map((mo: any) => (
                      <option key={mo.orderCode} value={mo.orderCode}>
                        {mo.orderCode} — {mo.partName} ({formatNumber(mo.orderQty)} عدد)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت رسید کلاف و شناسنامه ذوب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: LINK COIL HEAT NUMBER DIRECTLY TO A PRODUCTION BATCH (MO)   */}
      {/* ==================================================================== */}
      {linkingCoil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  اتصال شماره ذوب کلاف به بچ تولید (Production Batch)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  کلاف {linkingCoil.coilNumber} · شماره ذوب:{' '}
                  <strong className="font-mono text-slate-800">
                    {linkingCoil.heatNumber}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingCoil(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductionBatchLink} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  انتخاب دستور تولید (MO) در جریان کارگاه:
                </label>
                <select
                  value={selectedMoForLink}
                  onChange={e => {
                    const moCode = e.target.value;
                    setSelectedMoForLink(moCode);
                    setLinkProductionBatchCode(`BCH-PRD-${moCode.replace('MO-', '')}`);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-semibold text-slate-900 cursor-pointer"
                >
                  {activeManufacturingOrders.map((mo: any) => (
                    <option key={mo.orderCode} value={mo.orderCode}>
                      {mo.orderCode} — {mo.partName} ({formatNumber(mo.orderQty)} عدد)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  شماره بچ تولیدی اختصاص‌یافته (Production Batch Code):
                </label>
                <input
                  type="text"
                  required
                  value={linkProductionBatchCode}
                  onChange={e => setLinkProductionBatchCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  وزن ورق تخصیص‌یافته از این ذوب به بچ تولید (کیلوگرم):
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, linkingCoil.receivedWeightKg - linkingCoil.consumedWeightKg)}
                  required
                  value={linkAllocatedKg}
                  onChange={e => setLinkAllocatedKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLinkingCoil(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  ثبت اتصال ذوب به بچ تولید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: END-TO-END HEAT & BATCH TRACEABILITY TREE                   */}
      {/* ==================================================================== */}
      {traceabilityCoil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Compass className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    شجره‌نامه ردیابی شماره ذوب {traceabilityCoil.heatNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ردیابی کامل از رسید ساپکو تا بچ‌های ساخت محصول نهایی
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTraceabilityCoil(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Raw Coil & Heat Certificate */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">
                ۱. شناسنامه ورود کلاف و آنالیز ذوب (فولاد مبارکه / ساپکو)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">شماره ذوب (Heat No): </span>
                  <strong className="font-mono text-amber-800">
                    {traceabilityCoil.heatNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">شماره بچ ورود: </span>
                  <strong className="font-mono text-slate-900">
                    {traceabilityCoil.batchNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">سریال کلاف: </span>
                  <strong className="font-mono text-slate-900">
                    {traceabilityCoil.coilNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">شماره رسید ساپکو: </span>
                  <strong className="font-mono text-slate-900">
                    {traceabilityCoil.receiptNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">گرید و ابعاد: </span>
                  <strong className="font-mono text-slate-900">
                    {traceabilityCoil.materialGrade} ({traceabilityCoil.thicknessMm}×
                    {traceabilityCoil.widthMm})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">وزن کل کلاف: </span>
                  <strong className="font-mono text-slate-900">
                    {formatWeightKg(traceabilityCoil.receivedWeightKg)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Step 2: Linked Production Batches */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>۲. بچ‌های تولید و قطعات ساخته‌شده از این شماره ذوب:</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(traceabilityCoil.linkedProductionBatches || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    هیچ بچ تولیدی به این شماره ذوب متصل نشده است.
                  </div>
                ) : (
                  (traceabilityCoil.linkedProductionBatches || []).map(batch => (
                    <div
                      key={batch.batchCode + batch.moCode}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                            {batch.batchCode}
                          </span>
                          <span className="font-mono font-bold text-indigo-700">
                            {batch.moCode}
                          </span>
                          <span className="font-bold text-slate-900">{batch.partName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">
                          کد فنی محصول: {batch.partCode} · تاریخ تخصیص: {batch.linkedAt}
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <div className="font-bold text-slate-900">
                          ورق مصرفی: {formatNumber(batch.allocatedKg)} ک.گ
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          تیراژ هدف: {formatNumber(batch.targetQtyPcs)} عدد
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setTraceabilityCoil(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
              >
                بستن شجره‌نامه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Steel Grades Management Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  مدیریت گریدهای آلیاژ فولاد ساپکو
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {materialGradesList.map(g => (
                <div key={g.code} className="flex items-center justify-between py-2 px-1 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{g.code}</span>
                    <span className="text-slate-500 mr-2 text-[11px]">{g.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGrade(g.code)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddGrade} className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">کد گرید *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: CR240"
                    value={newGradeCode}
                    onChange={e => setNewGradeCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">استاندارد مرجع</label>
                  <input
                    type="text"
                    placeholder="DIN 1623"
                    value={newGradeStandard}
                    onChange={e => setNewGradeStandard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">عنوان فارسی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ورق استحکام بالا"
                  value={newGradeName}
                  onChange={e => setNewGradeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs cursor-pointer"
                >
                  بستن
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  + ذخیره گرید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
