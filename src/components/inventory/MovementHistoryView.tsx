import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Building2,
  RefreshCw,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Boxes,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpLeft,
  Scale,
  Truck,
} from 'lucide-react';
import {
  InventoryDocument,
  WarehouseDefinition,
  InventoryDocType,
  PostingStatus,
  StockOwnership,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../../utils/formatters';

interface MovementHistoryViewProps {
  documents: InventoryDocument[];
  warehouses: WarehouseDefinition[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onReverseDocument: (documentId: string, reason: string) => Promise<{ success: boolean; message: string }>;
}

export const MovementHistoryView: React.FC<MovementHistoryViewProps> = ({
  documents,
  warehouses,
  loading,
  onRefresh,
  onReverseDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Reversal dialog state
  const [reversalDoc, setReversalDoc] = useState<InventoryDocument | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const docTypeLabels: Record<InventoryDocType, { label: string; color: string; icon: any }> = {
    OPENING_BALANCE: { label: 'موجودی اول دوره', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Scale },
    RECEIPT_RAW_MATERIAL: { label: 'رسید ورود مواد اولیه', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: ArrowDownRight },
    ISSUE_RAW_MATERIAL: { label: 'حواله خروج و مصرف', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: ArrowUpLeft },
    RECEIPT_FINISHED_GOODS: { label: 'رسید محصول نهایی', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: CheckCircle2 },
    ISSUE_FINISHED_GOODS: { label: 'حواله خروج محصول نهایی', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: ArrowUpLeft },
    DELIVERY_CUSTOMER: { label: 'تحویل و خروج به مشتری', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: Truck },
    SHIPMENT_CUSTOMER: { label: 'حواله بارنامه و تحویل به خودروساز', color: 'bg-cyan-50 text-cyan-800 border-cyan-200', icon: Truck },
    TRANSFER: { label: 'انتقال بین‌انباری', color: 'bg-purple-50 text-purple-800 border-purple-200', icon: ArrowRightLeft },
    ADJUSTMENT: { label: 'تعدیل انبارگردانی', color: 'bg-orange-50 text-orange-800 border-orange-200', icon: Scale },
    REVERSAL: { label: 'سند اصلاحی / ابطال', color: 'bg-rose-50 text-rose-800 border-rose-200', icon: RotateCcw },
  };

  const statusLabels: Record<PostingStatus, { label: string; color: string }> = {
    POSTED: { label: 'قطعی (ثبت کاردکس)', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    UNPOSTED: { label: 'پیش‌نویس (غیرقطعی)', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
    REVERSED: { label: 'ابطال‌شده با سند معکوس', color: 'bg-rose-50 text-rose-700 border border-rose-200' },
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (selectedTypeFilter !== 'ALL' && doc.documentType !== selectedTypeFilter) {
        return false;
      }
      if (selectedWarehouseFilter !== 'ALL' && doc.warehouseId !== selectedWarehouseFilter && doc.targetWarehouseId !== selectedWarehouseFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ALL' && doc.postingStatus !== selectedStatusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesDocNo = doc.documentNumber.toLowerCase().includes(q);
        const matchesRef = doc.referenceNumber ? doc.referenceNumber.toLowerCase().includes(q) : false;
        const matchesNote = doc.auditNote ? doc.auditNote.toLowerCase().includes(q) : false;
        const matchesContract = doc.contractNumber ? doc.contractNumber.toLowerCase().includes(q) : false;
        const matchesLine = doc.lines.some(l => 
          l.partName.toLowerCase().includes(q) ||
          l.partCode.toLowerCase().includes(q) ||
          (l.lotNumber && l.lotNumber.toLowerCase().includes(q)) ||
          (l.heatNumber && l.heatNumber.toLowerCase().includes(q))
        );
        if (!matchesDocNo && !matchesRef && !matchesNote && !matchesContract && !matchesLine) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, selectedTypeFilter, selectedWarehouseFilter, selectedStatusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const pagedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Statistics for top cards
  const postedCount = documents.filter(d => d.postingStatus === 'POSTED').length;
  const reversalCount = documents.filter(d => d.documentType === 'REVERSAL' || d.postingStatus === 'REVERSED').length;
  const unpostedCount = documents.filter(d => d.postingStatus === 'UNPOSTED').length;
  const totalWeightIn = documents
    .filter(d => (d.documentType === 'RECEIPT_RAW_MATERIAL' || d.documentType === 'RECEIPT_FINISHED_GOODS') && d.postingStatus === 'POSTED')
    .reduce((s, d) => s + d.totalWeightKg, 0);
  const totalWeightOut = documents
    .filter(d => d.documentType === 'ISSUE_RAW_MATERIAL' && d.postingStatus === 'POSTED')
    .reduce((s, d) => s + d.totalWeightKg, 0);

  const handleExportCsv = () => {
    const headers = [
      'شماره سند',
      'نوع سند',
      'تاریخ سند',
      'وضعیت قطعی',
      'انبار مبدأ',
      'انبار مقصد',
      'مالکیت',
      'قرارداد ساپکو',
      'شماره ارجاع / بارنامه',
      'تعداد اقلام',
      'تعداد کل',
      'وزن کل (کیلوگرم)',
      'سند اصلی ابطال‌شده',
      'علت / یادداشت حسابرسی',
      'ثبت‌کننده',
    ];

    const rows = filteredDocs.map(d => [
      d.documentNumber,
      docTypeLabels[d.documentType]?.label || d.documentType,
      d.documentDate,
      statusLabels[d.postingStatus]?.label || d.postingStatus,
      d.warehouseName,
      d.targetWarehouseName || '-',
      d.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه',
      d.contractNumber || '-',
      d.referenceNumber || '-',
      d.lines.length,
      d.totalQuantity,
      d.totalWeightKg,
      d.reversalOfDocNumber || '-',
      d.adjustmentReason || d.auditNote || '-',
      d.createdByName,
    ]);

    exportToCsv(`کاردکس_و_تاریخچه_اسناد_انبار_${Date.now()}`, headers, rows);
  };

  const handleConfirmReversal = async () => {
    if (!reversalDoc) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      setReversalError('لطفاً دلیل مستند و مشخصی برای ابطال و صدور سند معکوس درج کنید (حداقل ۵ کاراکتر).');
      return;
    }

    setIsSubmittingReversal(true);
    setReversalError(null);

    try {
      const res = await onReverseDocument(reversalDoc.id, reversalReason.trim());
      if (res.success) {
        setReversalDoc(null);
        setReversalReason('');
        await onRefresh();
      } else {
        setReversalError(res.message);
      }
    } catch (err: any) {
      setReversalError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            تاریخچه تراکنش‌ها و کاردکس اسناد انبار (Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            دفتر ثبت رویدادهای غیرقابل تغییر (Immutable Ledger)؛ هرگونه اصلاح منحصراً از طریق صدور سند معکوس (Reversal) با حفظ ردپای حسابرسی انجام می‌پذیرد.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-400' : 'text-slate-500'}`} />
            <span>به‌روزرسانی کاردکس</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">اسناد قطعی ثبت‌شده</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatNumber(postedCount)} <span className="text-xs font-normal text-slate-400">سند</span>
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">مجموع وزن ورودی (رسیدها)</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatWeightKg(totalWeightIn)}
            </div>
          </div>
          <ArrowDownRight className="w-8 h-8 text-blue-500/20" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">مجموع وزن خروجی (حواله‌ها)</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatWeightKg(totalWeightOut)}
            </div>
          </div>
          <ArrowUpLeft className="w-8 h-8 text-amber-500/20" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">اسناد اصلاحی / ابطال</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatNumber(reversalCount)} <span className="text-xs font-normal text-slate-400">مورد</span>
            </div>
          </div>
          <RotateCcw className="w-8 h-8 text-rose-500/20" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="جستجوی شماره سند، کد/نام قطعه، لوت، ذوب یا بارنامه..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          {/* Doc Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={e => { setSelectedTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
          >
            <option value="ALL">همه انواع اسناد</option>
            <option value="RECEIPT_RAW_MATERIAL">رسید مواد اولیه (ورق و کویل)</option>
            <option value="ISSUE_RAW_MATERIAL">حواله خروج و مصرف مواد/قطعات</option>
            <option value="RECEIPT_FINISHED_GOODS">رسید محصول نهایی</option>
            <option value="ISSUE_FINISHED_GOODS">حواله خروج محصول نهایی</option>
            <option value="DELIVERY_CUSTOMER">تحویل و خروج به مشتری</option>
            <option value="SHIPMENT_CUSTOMER">حواله بارنامه و تحویل به خودروساز</option>
            <option value="TRANSFER">انتقال بین‌انباری</option>
            <option value="ADJUSTMENT">تعدیل انبارگردانی</option>
            <option value="REVERSAL">سند معکوس / اصلاحی</option>
            <option value="OPENING_BALANCE">موجودی اول دوره</option>
          </select>

          {/* Warehouse Filter */}
          <select
            value={selectedWarehouseFilter}
            onChange={e => { setSelectedWarehouseFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
          >
            <option value="ALL">همه انبارها</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="POSTED">قطعی (Posted)</option>
            <option value="UNPOSTED">پیش‌نویس (Unposted)</option>
            <option value="REVERSED">ابطال‌شده (Reversed)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          تعداد اسناد: <span className="font-bold text-slate-900 font-mono">{toPersianDigits(filteredDocs.length)}</span>
        </div>
      </div>

      {/* Documents List & Accordion */}
      <div className="space-y-3">
        {pagedDocs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80 shadow-xs text-slate-400">
            هیچ سندی منطبق با معیارهای فیلتر یافت نشد.
          </div>
        ) : (
          pagedDocs.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            const typeInfo = docTypeLabels[doc.documentType] || { label: doc.documentType, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText };
            const statusInfo = statusLabels[doc.postingStatus] || { label: doc.postingStatus, color: 'bg-slate-100 text-slate-700' };
            const Icon = typeInfo.icon;
            const canReverse = doc.postingStatus === 'POSTED' && doc.documentType !== 'REVERSAL';

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded ? 'border-slate-400 shadow-md' : 'border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Document Main Row */}
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border ${typeInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {doc.documentNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {doc.ownership === 'SAPCO_SUPPLIER_OWNED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            امانی ساپکو
                          </span>
                        )}
                        {doc.reversalOfDocNumber && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            اصلاحیه سند: {doc.reversalOfDocNumber}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>تاریخ: <span className="font-mono text-slate-700">{doc.documentDate}</span></span>
                        <span>انبار: <span className="text-slate-800 font-medium">{doc.warehouseName}</span></span>
                        {doc.targetWarehouseName && (
                          <span>مقصد: <span className="text-slate-800 font-medium">{doc.targetWarehouseName}</span></span>
                        )}
                        {doc.contractNumber && (
                          <span>قرارداد: <span className="font-mono text-slate-800 font-medium">{doc.contractNumber}</span></span>
                        )}
                        {doc.referenceNumber && (
                          <span>ارجاع/بارنامه: <span className="font-mono text-slate-700">{doc.referenceNumber}</span></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {formatWeightKg(doc.totalWeightKg)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {toPersianDigits(doc.lines.length)} ردیف کالا ({formatNumber(doc.totalQuantity)} عدد/شیت)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canReverse && (
                        <button
                          onClick={() => {
                            setReversalDoc(doc);
                            setReversalReason('');
                            setReversalError(null);
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                          title="صدور سند اصلاحی و ابطال معکوس"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ابطال سند</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'بستن اقلام' : 'مشاهده اقلام'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Lines Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/70 rounded-b-xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div>
                        اقلام ثبت‌شده در سند <span className="font-mono font-bold text-slate-900">{doc.documentNumber}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>ثبت‌کننده: <strong className="text-slate-800 font-semibold">{doc.createdByName}</strong></span>
                        {doc.postedByName && (
                          <span>تأیید نهایی: <strong className="text-emerald-700 font-semibold">{doc.postedByName}</strong></span>
                        )}
                      </div>
                    </div>

                    {(doc.adjustmentReason || doc.auditNote) && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start gap-2 shadow-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>علت یا یادداشت حسابرسی: </strong>
                          <span>{doc.adjustmentReason || doc.auditNote}</span>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="py-2.5 px-3">ردیف</th>
                            <th className="py-2.5 px-3">کد کاتالوگ</th>
                            <th className="py-2.5 px-3">عنوان کالا</th>
                            <th className="py-2.5 px-3">شماره رول / لوت</th>
                            <th className="py-2.5 px-3">شماره ذوب</th>
                            <th className="py-2.5 px-3">آدرس در انبار</th>
                            <th className="py-2.5 px-3">وضعیت کیفی</th>
                            <th className="py-2.5 px-3 text-left">تعداد</th>
                            <th className="py-2.5 px-3">واحد</th>
                            <th className="py-2.5 px-3 text-left">وزن (کیلوگرم)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {doc.lines.map((line, idx) => (
                            <tr key={line.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{line.partCode}</td>
                              <td className="py-2.5 px-3 text-slate-800 font-medium">{line.partName}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">{line.lotNumber || '-'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{line.heatNumber || '-'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{line.locationCode}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  line.qualityStatus === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-800' :
                                  line.qualityStatus === 'QUALITY_BLOCKED' ? 'bg-rose-50 text-rose-800' :
                                  line.qualityStatus === 'REJECTED' ? 'bg-red-100 text-red-900' :
                                  'bg-amber-50 text-amber-800'
                                }`}>
                                  {line.qualityStatus === 'AVAILABLE' ? 'قابل استفاده' :
                                   line.qualityStatus === 'QUALITY_BLOCKED' ? 'مسدود کیفی' :
                                   line.qualityStatus === 'REJECTED' ? 'نامنطبق / ضایعات' : 'قرنطینه'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-left">
                                {formatNumber(line.quantity)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-medium">{line.unit}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-left">
                                {formatWeightKg(line.quantityKg)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-500 shadow-xs">
          <div>
            نمایش صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              قبلی
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {toPersianDigits(pageNum)}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ابطال سند و صدور سند معکوس (Reversal)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سند شماره <span className="font-mono text-slate-900 font-bold">{reversalDoc.documentNumber}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>قانون تغییرناپذیری اسناد انبار (Immutable Documents)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                اسناد قطعی ثبت‌شده قابل حذف یا ویرایش مستقیم نیستند. این عملیات یک سند معکوس هم‌ارز با مقادیر جبرانی صادر کرده و وضعیت سند جاری را به «ابطال‌شده» تغییر می‌دهد تا دفاتر کاردکس و موجودی تصحیح شوند.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                دلیل رسمی ابطال و صدور سند معکوس <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="مثال: اصلاح خطای اپراتور در ثبت بارنامه، مغایرت تناژ با باسکول، برگشت سفارش تولید..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{reversalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalDoc(null)}
                disabled={isSubmittingReversal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={isSubmittingReversal}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isSubmittingReversal ? 'animate-spin' : ''}`} />
                <span>تأیید و صدور سند معکوس</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
