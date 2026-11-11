import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  FileUp,
  Plus,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber, toPersianDigits, exportToCsv } from '../../utils/formatters';

interface DataImportExportViewProps {
  currentUser: {
    uid: string;
    displayName: string;
  };
  onSuccess?: () => void;
}

export const DataImportExportView: React.FC<DataImportExportViewProps> = ({ currentUser, onSuccess }) => {
  const [activeMode, setActiveMode] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [templateType, setTemplateType] = useState<string>('PHYSICAL_COILS');
  const [templateData, setTemplateData] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCreatingMasterData, setIsCreatingMasterData] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Export mode state
  const [exportDataset, setExportDataset] = useState<'STOCK' | 'COILS' | 'CONTRACTS'>('COILS');
  const [exportFilterGrade, setExportFilterGrade] = useState<string>('ALL');
  const [exportPreviewList, setExportPreviewList] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchTemplate = async (type: string) => {
    try {
      const res = await fetch(`/api/inventory/import/templates/${type}`);
      const data = await res.json();
      if (data.success) {
        setTemplateData(data.data);
        if (data.data.sampleRows) {
          setPreviewRows(data.data.sampleRows);
        }
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    }
  };

  useEffect(() => {
    fetchTemplate(templateType);
    setValidationResult(null);
  }, [templateType]);

  // Load live data for Export Center
  useEffect(() => {
    if (activeMode !== 'EXPORT') return;
    setExportLoading(true);
    const endpoint =
      exportDataset === 'COILS'
        ? '/api/inventory/coils'
        : exportDataset === 'CONTRACTS'
        ? '/api/inventory/contracts'
        : '/api/inventory/stock-inquiry';

    fetch(endpoint)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setExportPreviewList(res.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setExportLoading(false));
  }, [activeMode, exportDataset]);

  // Parse uploaded Excel (.xlsx, .xls) or CSV file into previewRows using sheetjs
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateData) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      reader.onload = evt => {
        try {
          const text = String(evt.target?.result || '').replace(/^\uFEFF/, '');
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!parsed || parsed.length === 0) {
            setNotification({
              type: 'error',
              message: 'فایل انتخاب‌شده فاقد ردیف داده است. لطفاً فایل معتبری انتخاب کنید.',
            });
            return;
          }

          setPreviewRows(parsed);
          setValidationResult(null);
          setNotification({
            type: 'success',
            message: `تعداد ${toPersianDigits(parsed.length)} ردیف از فایل «${file.name}» با موفقیت خوانده شد. اکنون دکمه «بررسی و اعتبارسنجی» را بزنید.`,
          });
        } catch (err) {
          setNotification({ type: 'error', message: 'خطا در خواندن فایل CSV. لطفاً ساختار فایل را بررسی فرمایید.' });
        }
      };
      reader.readAsText(file, 'utf-8');
    } else {
      reader.onload = evt => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!parsed || parsed.length === 0) {
            setNotification({
              type: 'error',
              message: 'فایل اکسل انتخاب‌شده خالی است یا برگه اول آن فاقد ردیف داده است.',
            });
            return;
          }

          setPreviewRows(parsed);
          setValidationResult(null);
          setNotification({
            type: 'success',
            message: `تعداد ${toPersianDigits(parsed.length)} ردیف از فایل اکسل «${file.name}» خوانده شد. اکنون دکمه «بررسی و اعتبارسنجی» را بزنید.`,
          });
        } catch (err) {
          setNotification({ type: 'error', message: 'خطا در خواندن فایل اکسل. فایل ممکن است آسیب‌دیده یا رمزگذاری‌شده باشد.' });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const safeParseResponse = async (res: Response): Promise<any> => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    if (res.status === 413) {
      throw new Error('حجم فایل انتخاب‌شده بیش از حد مجاز سرور است (خطای ۴۱۳). لطفاً فایل را در بخش‌های کوچکتری وارد نمایید.');
    }
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(`خطای پاسخ سرور (${res.status}). لطفاً دوباره تلاش نمایید.`);
    }
    throw new Error(text || `خطای سرور (${res.status})`);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/inventory/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchType: templateType,
          rows: previewRows,
        }),
      });

      const data = await safeParseResponse(res);
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در بررسی اطلاعات' });
      } else {
        setValidationResult(data);
        if (data.invalidRowsCount === 0 && !data.missingMasterData?.hasMissingMasterData) {
          setNotification({
            type: 'success',
            message: 'همه ردیف‌ها معتبر هستند و اطلاعات پایه کامل است. می‌توانید دکمه «تایید و ثبت نهایی» را بزنید.',
          });
        } else if (data.missingMasterData?.hasMissingMasterData) {
          setNotification({
            type: 'error',
            message: 'اطلاعات پایه جدید (واحد، انبار، کالا، یا مشتری) در فایل شناسایی شد. جهت افزودن سریع دکمه «افزودن خودکار به اطلاعات پایه» را بزنید.',
          });
        } else {
          setNotification({
            type: 'error',
            message: `در ${toPersianDigits(data.invalidRowsCount)} ردیف خطا مشاهده شد. لطفاً جدول خطاها در پایین را بررسی کنید.`,
          });
        }
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateMissingMasterData = async () => {
    if (!validationResult?.missingMasterData) return;
    setIsCreatingMasterData(true);
    try {
      const res = await fetch('/api/inventory/import/create-missing-master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.missingMasterData),
      });

      const data = await safeParseResponse(res);
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در ثبت اطلاعات پایه' });
      } else {
        setNotification({
          type: 'success',
          message: `${data.message || 'اطلاعات پایه جدید با موفقیت اضافه شدند.'} اکنون جهت ثبت نهایی کالاها در انبار، دکمه «تایید و ثبت نهایی در نرم‌افزار» را کلیک کنید.`,
        });
        if (onSuccess) onSuccess();
        // Automatically re-validate so previewRows validation passes 100%
        await handleValidate();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    } finally {
      setIsCreatingMasterData(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setIsConfirming(true);
    try {
      const res = await fetch('/api/inventory/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `BATCH-${Date.now()}`,
          batchType: templateType,
          rows: previewRows,
          user: currentUser,
        }),
      });

      const data = await safeParseResponse(res);
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در ثبت اطلاعات در پایگاه داده' });
      } else {
        setNotification({
          type: 'success',
          message: `${data.message || 'اطلاعات با موفقیت در بانک اطلاعاتی انبار ثبت شد.'} هم‌اکنون کلیه ردیف‌ها در بخش «استعلام موجودی و کاردکس» قابل مشاهده می‌باشند.`,
        });
        setValidationResult(null);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    if (!templateData) return;
    const cols = templateData.columns || [];
    const headers = cols.map((c: any) => c.titlePersian || c.label || c.key).join(',');
    const sampleRows = (templateData.sampleRows || []).map((row: any) =>
      cols.map((c: any) => `"${row[c.key] ?? ''}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قالب_ورود_${templateType}.csv`;
    a.click();
  };

  const handleExecuteExport = () => {
    if (exportDataset === 'COILS') {
      const rows = exportPreviewList
        .filter(c => exportFilterGrade === 'ALL' || c.materialGrade === exportFilterGrade)
        .map(c => [
          c.coilId,
          c.coilPackNumber,
          c.partName || 'ورق فولادی',
          c.materialGrade,
          c.thicknessMm,
          c.widthMm,
          c.originalWeightKg,
          c.remainingWeightKg,
          c.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه',
          (c.allocations || []).map((a: any) => `${a.contractNumber || a.contractId}:${a.allocatedWeightKg}kg`).join(' | ') || 'آزاد',
        ]);
      exportToCsv(
        `گزارش_رول_و_کویل_پک_${Date.now()}`,
        [
          'کد رول فیزیکی',
          'شماره کویل‌پک',
          'نام کالا',
          'جنس / گرید ورق',
          'ضخامت (mm)',
          'عرض (mm)',
          'وزن اولیه (kg)',
          'وزن باقی‌مانده (kg)',
          'نوع مالکیت',
          'قراردادهای متصل',
        ],
        rows
      );
    } else if (exportDataset === 'CONTRACTS') {
      const rows = exportPreviewList.map(c => [
        c.contractNumber,
        c.title,
        c.customerName || 'ساپکو',
        c.materialGrade,
        c.allocatedWeightKg,
        c.totalReceivedKg,
        c.totalConsumedKg,
        c.closingBalanceKg,
        c.status,
      ]);
      exportToCsv(
        `گزارش_قراردادها_${Date.now()}`,
        [
          'شماره قرارداد',
          'عنوان قرارداد',
          'نام مشتری / کارفرما',
          'گرید ورق',
          'سقف سهمیه (kg)',
          'ورودی کل (kg)',
          'مصرف‌شده (kg)',
          'مانده تعهد (kg)',
          'وضعیت',
        ],
        rows
      );
    } else {
      const rows = exportPreviewList.map(b => [
        b.partCode,
        b.partName,
        b.warehouseName,
        b.lotNumber || '—',
        b.contractNumber || '—',
        b.physicalQty,
        b.availableQty,
        b.unit,
        b.physicalKg,
      ]);
      exportToCsv(
        `گزارش_موجودی_انبار_${Date.now()}`,
        ['کد کالا', 'نام کالا', 'انبار', 'کویل‌پک / بچ', 'قرارداد', 'موجودی فیزیکی', 'موجودی آزاد', 'واحد', 'وزن کل (kg)'],
        rows
      );
    }
  };

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>مرکز ورود اطلاعات از اکسل (.xlsx / .csv) و دریافت خروجی‌های کارخانه‌ای</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ورود گروهی رول‌ها، کالاها (ورق، پیچ و مهره، لاستیک)، انبارها و قراردادها همراه با پشتیبانی مستقیم از فایل‌های اکسل Excel
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('IMPORT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'IMPORT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>۱. ورود اطلاعات از اکسل (Import)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('EXPORT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'EXPORT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>۲. خروجی اکسل و گزارشات (Export)</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {activeMode === 'IMPORT' ? (
        <div className="space-y-5">
          {/* Step 1 & 2: Choose Type & Download Template */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  گام اول: نوع اطلاعاتی که می‌خواهید وارد کنید را انتخاب نمایید
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  پس از انتخاب نوع اطلاعات، فایل نمونه اکسل را دانلود کرده و طبق راهنمای ستون‌ها تکمیل کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل نمونه اکسل (CSV/Excel)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {[
                { id: 'PHYSICAL_COILS', label: 'رول‌های ورق و کویل‌پک' },
                { id: 'CONTRACTS', label: 'قراردادها و سهمیه‌ها' },
                { id: 'PARTS', label: 'کالاها (ورق، پیچ، لاستیک)' },
                { id: 'WAREHOUSES', label: 'انبارها' },
                { id: 'CUSTOMERS', label: 'مشتریان و خودروسازان' },
                { id: 'OPENING_BALANCES', label: 'موجودی اول دوره' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateType(t.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    templateType === t.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Persian Column Guide Table */}
          {templateData && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Info className="w-4 h-4 text-blue-600" />
                <span>گام دوم: راهنمای ستون‌های فایل اکسل «{templateData.title}»</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">عنوان ستون</th>
                      <th className="py-2.5 px-3">نام لاتین ستون (کلید)</th>
                      <th className="py-2.5 px-3">وضعیت الزامی</th>
                      <th className="py-2.5 px-3">نمونه مقدار معتبر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(templateData.columns || []).map((col: any) => (
                      <tr key={col.key} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{col.titlePersian || col.label || col.key}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-700">{col.key}</td>
                        <td className="py-2.5 px-3">
                          {col.required ? (
                            <span className="text-rose-600 font-semibold">الزامی (*)</span>
                          ) : (
                            <span className="text-slate-500">اختیاری</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700">{String(col.example ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4 & 5: File Upload + Visual Table Preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  گام سوم: بارگذاری فایل اکسل (.xlsx / .csv) و پیش‌نمایش
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  فایل اکسل خود را انتخاب فرمایید. سیستم به صورت اتوماتیک ستون‌ها را اعتبارسنجی می‌کند.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                  <FileUp className="w-4 h-4 text-emerald-600" />
                  <span>انتخاب فایل اکسل (.xlsx / .csv)</span>
                  <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleExcelFileUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || previewRows.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isValidating ? 'در حال اعتبارسنجی...' : 'بررسی و اعتبارسنجی ردیف‌ها'}</span>
                </button>
              </div>
            </div>

            {/* Visual Table Preview */}
            {previewRows.length > 0 && templateData && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-80">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-12">ردیف</th>
                      {(templateData.columns || []).map((c: any) => (
                        <th key={c.key} className="py-2 px-3">
                          {c.titlePersian || c.label || c.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                        {(templateData.columns || []).map((c: any) => {
                          const val = row[c.key] ?? row[c.titlePersian] ?? row[c.label] ?? '';
                          return (
                            <td key={c.key} className="py-2 px-3 font-mono text-slate-800">
                              <input
                                type="text"
                                value={val}
                                onChange={e => {
                                  const next = [...previewRows];
                                  next[idx] = { ...next[idx], [c.key]: e.target.value };
                                  setPreviewRows(next);
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded focus:outline-none"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Step 6 & 7: Validation Results & Confirm Import */}
            {validationResult && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                {/* Missing Master Data Auto-Addition Prompt Section */}
                {validationResult.missingMasterData && validationResult.missingMasterData.hasMissingMasterData && (
                  <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">
                            شناسایی اطلاعات پایه جدید (واحدهای سنجش، دسته‌بندی‌ها، انبارها، قطعات یا مشتریان غیرموجود)
                          </h4>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            در این فایل اکسل، مواردی یافت شد که هنوز در اطلاعات پایه نرم‌افزار ثبت نشده‌اند. نیازی به اصلاح فایل اکسل نیست؛ با کلیک دکمه زیر، این موارد خودکار به اطلاعات پایه افزوده شده و اعتبارسنجی تکمیل می‌شود.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateMissingMasterData}
                        disabled={isCreatingMasterData}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {isCreatingMasterData
                            ? 'در حال افزودن اطلاعات پایه...'
                            : 'افزودن خودکار به اطلاعات پایه و تکمیل فایل'}
                        </span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/80 text-[11px]">
                      {validationResult.missingMasterData.units?.map((u: any, idx: number) => (
                        <span key={`u-${idx}`} className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span className="font-semibold text-amber-800">واحد سنجش:</span> <span className="font-mono font-bold">{u.symbol}</span> ({toPersianDigits(u.count)} ردیف)
                        </span>
                      ))}
                      {validationResult.missingMasterData.categories?.map((c: any, idx: number) => (
                        <span key={`cat-${idx}`} className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span className="font-semibold text-amber-800">دسته کالا:</span> {c.name} ({toPersianDigits(c.count)} ردیف)
                        </span>
                      ))}
                      {validationResult.missingMasterData.parts?.map((p: any, idx: number) => (
                        <span key={`p-${idx}`} className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span className="font-semibold text-amber-800">کالا/ورق:</span> <span className="font-mono font-bold">{p.code}</span> ({p.name})
                        </span>
                      ))}
                      {validationResult.missingMasterData.warehouses?.map((w: any, idx: number) => (
                        <span key={`wh-${idx}`} className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span className="font-semibold text-amber-800">انبار:</span> <span className="font-mono font-bold">{w.code}</span> ({w.name})
                        </span>
                      ))}
                      {validationResult.missingMasterData.customers?.map((cust: any, idx: number) => (
                        <span key={`cust-${idx}`} className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span className="font-semibold text-amber-800">مشتری:</span> {cust.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4 text-xs">
                    <span>
                      کل ردیف‌های خوانده‌شده: <strong className="font-mono">{formatNumber(validationResult.totalRows)}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      معتبر و قابل ثبت: <strong className="font-mono">{formatNumber(validationResult.validRowsCount)}</strong>
                    </span>
                    <span className="text-rose-600 font-bold">
                      دارای خطا: <strong className="font-mono">{formatNumber(validationResult.invalidRowsCount)}</strong>
                    </span>
                  </div>

                  {validationResult.validRowsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {isConfirming
                          ? 'در حال ذخیره‌سازی در بانک اطلاعاتی...'
                          : `تایید و ثبت نهایی در نرم‌افزار (${toPersianDigits(validationResult.validRowsCount)} ردیف)`}
                      </span>
                    </button>
                  )}
                </div>

                {validationResult.invalidRowsCount > 0 && validationResult.errors && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between"
                      >
                        <span className="font-bold">ردیف شماره {toPersianDigits(err.rowNumber)}:</span>
                        <span>{err.errorMessage}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: Export Builder */
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">دریافت خروجی اکسل (CSV / XLSX فارسی)</h3>
              <p className="text-slate-500 mt-0.5">
                گزارش مورد نظر خود را انتخاب کرده، پیش‌نمایش را مشاهده کنید و فایل اکسل را دانلود نمایید.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExecuteExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل اکسل (CSV)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'COILS', title: 'لیست رول‌های ورق و کویل‌پک‌ها', desc: 'شامل کد کویل‌پک، ضخامت، جنس، وزن باقی‌مانده و قراردادها' },
              { id: 'STOCK', title: 'موجودی لحظه‌ای همه انبارها', desc: 'شامل ورق، پیچ و مهره، لاستیک و قطعات محصول نهایی' },
              { id: 'CONTRACTS', title: 'وضعیت قراردادها و تعهدات', desc: 'شامل سقف قرارداد، مقدار دریافتی، مصرفی و مانده' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExportDataset(item.id as any)}
                className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                  exportDataset === item.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">{item.title}</div>
                <div className={`text-[11px] mt-1 ${exportDataset === item.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 text-slate-500">
            تعداد رکوردهای آماده خروجی: <strong className="text-slate-900 font-mono">{formatNumber(exportPreviewList.length)}</strong> ردیف
            {exportLoading && <span className="mr-2">(در حال بارگذاری...)</span>}
          </div>
        </div>
      )}
    </div>
  );
};
