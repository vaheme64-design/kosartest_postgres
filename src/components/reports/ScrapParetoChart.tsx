import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  ShieldAlert,
  Clock,
  CheckCircle2,
  TrendingDown,
  Edit3,
  Trash2,
  Plus,
} from 'lucide-react';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';

export interface ParetoCauseItem {
  id: string;
  title: string;
  category6M: string;
  value: number;
  unitLabel: string;
  affectedStation: string;
  capaAction: string;
  isDeleted?: boolean;
}

const INITIAL_SCRAP_CAUSES: ParetoCauseItem[] = [
  {
    id: 'SCR-01',
    title: 'ایراد قالب، کندی لبه برش و پلیسه سنبه/ماتریس (Die & Tooling Wear)',
    category6M: 'قالب و ابزار (Tooling)',
    value: 54,
    unitLabel: 'قطعه',
    affectedStation: 'پرس ۲۵۰ تن و ۴۰۰ تن (OP-10 / OP-20)',
    capaAction: 'سنگ‌زنی لبه برش قالب DIE-206-DRW-02 و تنظیم لقی سنبه به ۰.۱۲ میلی‌متر',
  },
  {
    id: 'SCR-02',
    title: 'کیفیت ورق، نوسان ضخامت و ترک در کشش عمیق (Coil Material Defect)',
    category6M: 'مواد اولیه (Material)',
    value: 36,
    unitLabel: 'قطعه',
    affectedStation: 'پرس هیدرولیک ۸۰۰ تن (کشش ستون B و صندلی)',
    capaAction: 'ثبت گزارش عدم انطباق (NCR) برای ذوب HT-88412 و بهینه‌سازی روغن‌کاری ورق',
  },
  {
    id: 'SCR-03',
    title: 'خطای اپراتور در استقرار قطعه و گام‌دهی اولیه نوار (Operator Positioning)',
    category6M: 'نیروی انسانی (Man)',
    value: 19,
    unitLabel: 'قطعه',
    affectedStation: 'پرس ضربه‌ای ۱۶۰ تن (پانچ و خم کاری)',
    capaAction: 'نصب پین خطاناپذیر (Poka-Yoke) روی کفشک قالب و بازآموزی اپراتور شیفت',
  },
  {
    id: 'SCR-04',
    title: 'نوسان فشار بالشتک هیدرولیک و چروک لبه قطعه (Die Cushion Pressure)',
    category6M: 'ماشین‌آلات (Machine)',
    value: 12,
    unitLabel: 'قطعه',
    affectedStation: 'پرس هیدرولیک ۴۰۰ تن ۱',
    capaAction: 'کالیبراسیون شیر تناسبی هیدرولیک و تثبیت فشار بالشتک روی ۱۲۰ بار',
  },
  {
    id: 'SCR-05',
    title: 'پاشش جرقه جوش و انحراف جزئی مهره جوشی M6/M8 (Weld Spatter)',
    category6M: 'فرآیند جوش (Method)',
    value: 7,
    unitLabel: 'قطعه',
    affectedStation: 'ایستگاه پرس‌جوش مقاومتی و ربات CO2',
    capaAction: 'پاکسازی الکترود مسی و تنظیم جریان جوش مقاومتی به ۱۱.۵ کیلوآمپر',
  },
];

const INITIAL_DOWNTIME_CAUSES: ParetoCauseItem[] = [
  {
    id: 'DT-P01',
    title: 'خرابی اضطراری مدار هیدرولیک و بالشتک کشش پرس (Hydraulic Breakdown)',
    category6M: 'ماشین‌آلات (TPM)',
    value: 95,
    unitLabel: 'دقیقه',
    affectedStation: 'پرس ۲۵۰ تن و ۴۰۰ تن',
    capaAction: 'تعویض پیشگیرانه شیلنگ‌های فشارقوی در برنامه PM هفتگی',
  },
  {
    id: 'DT-P02',
    title: 'زمان تعویض قالب، تنظیم ارتفاع بسته و رگلاژ اولیه (SMED Setup)',
    category6M: 'تعویض قالب (Setup)',
    value: 80,
    unitLabel: 'دقیقه',
    affectedStation: 'سالن پرس سنگین و متوسط',
    capaAction: 'استانداردسازی کلمپ‌های سریع و آماده‌سازی قالب بعدی بیرون خط (External Setup)',
  },
  {
    id: 'DT-P03',
    title: 'تأخیر در تغذیه فیدر اتوماتیک و گیرکردن قطعه در پران قالب (Minor Stops)',
    category6M: 'قالب و فیدر (Tooling)',
    value: 45,
    unitLabel: 'دقیقه',
    affectedStation: 'پرس ۱۶۰ تن ۲ و فیدر مهره‌جوش',
    capaAction: 'تعویض فنرهای پین پران (Ejector Pin) و شارژ به‌موقع مخزن فیدر',
  },
  {
    id: 'DT-P04',
    title: 'انتظار تأمین شیت برش‌خورده و جابجایی لیفتراک (Material Handling)',
    category6M: 'لجستیک خط (Material)',
    value: 28,
    unitLabel: 'دقیقه',
    affectedStation: 'خط برش گیوتین به سالن پرس',
    capaAction: 'تعریف بافر کانبان ۲ ساعته پای هر پرس بر اساس تقویم ظرفیت',
  },
  {
    id: 'DT-P05',
    title: 'سرویس نازل تورچ و تعویض قرقره سیم جوش CO2 (Consumables)',
    category6M: 'ایستگاه جوش (Method)',
    value: 18,
    unitLabel: 'دقیقه',
    affectedStation: 'کابین جوش CO2 شماره ۱',
    capaAction: 'استفاده از اسپری ضدجرقه اتوماتیک در هر ۵۰ سیکل کاری',
  },
];

export const ScrapParetoChart: React.FC = () => {
  const { openQuickEditDrawer, requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [mode, setMode] = useState<'SCRAP' | 'DOWNTIME'>('SCRAP');

  // Dynamic State (Persisted in localStorage, Zero Hardcoded Read-Only Arrays)
  const [scrapCauses, setScrapCauses] = useState<ParetoCauseItem[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_pareto_scrap_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_SCRAP_CAUSES;
  });

  const [downtimeCauses, setDowntimeCauses] = useState<ParetoCauseItem[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_pareto_downtime_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_DOWNTIME_CAUSES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kpims_pareto_scrap_v1', JSON.stringify(scrapCauses));
    } catch {
      // ignore
    }
  }, [scrapCauses]);

  useEffect(() => {
    try {
      localStorage.setItem('kpims_pareto_downtime_v1', JSON.stringify(downtimeCauses));
    } catch {
      // ignore
    }
  }, [downtimeCauses]);

  const computedRows = useMemo(() => {
    const source = (mode === 'SCRAP' ? scrapCauses : downtimeCauses).filter(i => !i.isDeleted);
    const sorted = [...source].sort((a, b) => b.value - a.value);
    const total = Math.max(1, sorted.reduce((sum, item) => sum + item.value, 0));
    const maxVal = Math.max(1, sorted[0]?.value || 1);

    let cumulative = 0;
    return sorted.map((item, index) => {
      const sharePercent = Number(((item.value / total) * 100).toFixed(1));
      cumulative = Math.min(100, Number((cumulative + sharePercent).toFixed(1)));
      const widthRatioPercent = Math.round((item.value / maxVal) * 100);
      const isVitalFew = index < 2 || cumulative <= 82;

      return {
        ...item,
        rank: index + 1,
        sharePercent,
        cumulativePercent: cumulative,
        widthRatioPercent,
        isVitalFew,
        total,
      };
    });
  }, [mode, scrapCauses, downtimeCauses]);

  const totalSum = computedRows[0]?.total || 0;
  const topTwoCumulative = computedRows[1]?.cumulativePercent || computedRows[0]?.cumulativePercent || 0;

  // Slide-over Drawer Edit via Pencil Icon
  const handleEditCause = (item: ParetoCauseItem) => {
    openQuickEditDrawer({
      title: `ویرایش علت ${mode === 'SCRAP' ? 'ضایعات' : 'توقف'}: ${item.title}`,
      subtitle: 'بروزرسانی مقادیر به صورت آنی نمودار پارتو (۸۰/۲۰) و درصد تجمعی را بازمحاسبه می‌کند.',
      entityId: item.id,
      entityCode: item.id,
      moduleName: 'گزارشات پارتو و IATF 16949',
      fields: [
        { key: 'title', label: 'عنوان علت ریشه‌ای (Root Cause)', type: 'text' },
        {
          key: 'category6M',
          label: 'دسته‌بندی ۶M ایشیکاوا',
          type: 'select',
          options: [
            { value: 'قالب و ابزار (Tooling)', label: 'قالب و ابزار (Tooling)' },
            { value: 'مواد اولیه (Material)', label: 'مواد اولیه (Material)' },
            { value: 'نیروی انسانی (Man)', label: 'نیروی انسانی (Man)' },
            { value: 'ماشین‌آلات (Machine)', label: 'ماشین‌آلات (Machine)' },
            { value: 'فرآیند و روش (Method)', label: 'فرآیند و روش (Method)' },
            { value: 'تعویض قالب (Setup)', label: 'تعویض قالب (Setup)' },
          ],
        },
        {
          key: 'value',
          label: mode === 'SCRAP' ? 'تعداد ضایعات ثبت‌شده (قطعه)' : 'مدت زمان توقف (دقیقه)',
          type: 'number',
        },
        { key: 'affectedStation', label: 'ایستگاه / پرس درگیر', type: 'text' },
        { key: 'capaAction', label: 'اقدام اصلاحی و پیشگیرانه (8D / CAPA)', type: 'text' },
      ],
      initialValues: {
        title: item.title,
        category6M: item.category6M,
        value: item.value,
        affectedStation: item.affectedStation,
        capaAction: item.capaAction,
      },
      onSave: updated => {
        const updater = (prev: ParetoCauseItem[]) =>
          prev.map(c =>
            c.id === item.id
              ? {
                  ...c,
                  title: String(updated.title || c.title),
                  category6M: String(updated.category6M || c.category6M),
                  value: Math.max(1, Number(updated.value) || 1),
                  affectedStation: String(updated.affectedStation || c.affectedStation),
                  capaAction: String(updated.capaAction || c.capaAction),
                }
              : c
          );
        if (mode === 'SCRAP') setScrapCauses(updater);
        else setDowntimeCauses(updater);
      },
    });
  };

  // Add New Cause via Slide-Over Drawer
  const handleAddNewCause = () => {
    const newId = `${mode === 'SCRAP' ? 'SCR' : 'DT-P'}-${Math.floor(10 + Math.random() * 89)}`;
    openQuickEditDrawer({
      title: mode === 'SCRAP' ? 'ثبت علت ضایعات کیفی جدید در پارتو' : 'ثبت علت توقف خط جدید در پارتو',
      entityId: newId,
      entityCode: newId,
      moduleName: 'گزارشات پارتو و IATF 16949',
      fields: [
        { key: 'title', label: 'عنوان علت ریشه‌ای (Root Cause)', type: 'text' },
        {
          key: 'category6M',
          label: 'دسته‌بندی ۶M ایشیکاوا',
          type: 'select',
          options: [
            { value: 'قالب و ابزار (Tooling)', label: 'قالب و ابزار (Tooling)' },
            { value: 'مواد اولیه (Material)', label: 'مواد اولیه (Material)' },
            { value: 'نیروی انسانی (Man)', label: 'نیروی انسانی (Man)' },
            { value: 'ماشین‌آلات (Machine)', label: 'ماشین‌آلات (Machine)' },
            { value: 'فرآیند و روش (Method)', label: 'فرآیند و روش (Method)' },
          ],
        },
        {
          key: 'value',
          label: mode === 'SCRAP' ? 'تعداد ضایعات (قطعه)' : 'مدت زمان توقف (دقیقه)',
          type: 'number',
        },
        { key: 'affectedStation', label: 'ایستگاه / پرس درگیر', type: 'text' },
        { key: 'capaAction', label: 'اقدام اصلاحی (CAPA)', type: 'text' },
      ],
      initialValues: {
        title: mode === 'SCRAP' ? 'خراشیدگی سطحی ورق در قالب کشش' : 'توقف تنظیم سنسور نوری فیدر',
        category6M: 'قالب و ابزار (Tooling)',
        value: 15,
        affectedStation: 'سالن پرس متوسط',
        capaAction: 'پولیش سطح ماتریس و بازبینی سنسور',
      },
      onSave: vals => {
        const newItem: ParetoCauseItem = {
          id: newId,
          title: String(vals.title || 'علت جدید'),
          category6M: String(vals.category6M || 'قالب و ابزار (Tooling)'),
          value: Math.max(1, Number(vals.value) || 10),
          unitLabel: mode === 'SCRAP' ? 'قطعه' : 'دقیقه',
          affectedStation: String(vals.affectedStation || 'سالن پرس'),
          capaAction: String(vals.capaAction || 'ثبت اقدام اصلاحی'),
        };
        if (mode === 'SCRAP') setScrapCauses(prev => [...prev, newItem]);
        else setDowntimeCauses(prev => [...prev, newItem]);
      },
    });
  };

  // Soft Delete Cause (Protected by ConfirmDialog + Gmail-style Undo)
  const handleDeleteCause = (item: ParetoCauseItem) => {
    requestConfirm({
      title: `حذف منطقی ردیف پارتو (${item.id})`,
      message: `آیا از حذف منطقی علت «${item.title}» از نمودار پارتو اطمینان دارید؟`,
      consequences: [
        'بازمحاسبه خودکار سهم درصدی و منحنی تجمعی ۸۰/۲۰ پارتو',
        'امکان بازگردانی فوری (Undo) تا ۸ ثانیه پس از حذف',
      ],
      confirmLabel: 'حذف منطقی (Soft Delete)',
      variant: 'danger',
      onConfirm: () => {
        if (mode === 'SCRAP') {
          const prevSnap = [...scrapCauses];
          setScrapCauses(prev => prev.map(c => (c.id === item.id ? { ...c, isDeleted: true } : c)));
          recordAudit({
            entityId: item.id,
            entityCode: item.id,
            moduleName: 'پارتو ضایعات',
            actionType: 'SOFT_DELETE',
            title: `حذف منطقی علت ضایعات: ${item.title}`,
            details: `تعداد ${item.value} قطعه از محاسبات پارتو آرشیو شد.`,
          });
          showUndoToast({
            title: `علت ضایعات «${item.id}» حذف منطقی شد`,
            detail: 'برای بازگردانی به نمودار پارتو روی لغو (Undo) کلیک کنید.',
            variant: 'danger',
            onUndo: () => setScrapCauses(prevSnap),
          });
        } else {
          const prevSnap = [...downtimeCauses];
          setDowntimeCauses(prev => prev.map(c => (c.id === item.id ? { ...c, isDeleted: true } : c)));
          recordAudit({
            entityId: item.id,
            entityCode: item.id,
            moduleName: 'پارتو توقفات',
            actionType: 'SOFT_DELETE',
            title: `حذف منطقی علت توقف: ${item.title}`,
            details: `مدت ${item.value} دقیقه از محاسبات پارتو آرشیو شد.`,
          });
          showUndoToast({
            title: `علت توقف «${item.id}» حذف منطقی شد`,
            detail: 'برای بازگردانی به نمودار پارتو روی لغو (Undo) کلیک کنید.',
            variant: 'danger',
            onUndo: () => setDowntimeCauses(prevSnap),
          });
        }
      },
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 text-right" dir="rtl">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                نمودار پارتو ضایعات و توقفات خط (Scrap & Downtime Pareto — تحلیل ۸۰/۲۰)
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                استاندارد IATF 16949 / داینامیک و قابل ویرایش
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              رتبه‌بندی نزولی علل ضایعات و توقفات؛ با کلیک روی آیکون مداد (ویرایش در کشو) می‌توانید مقادیر و اقدام اصلاحی هر ردیف را تغییر دهید.
            </p>
          </div>
        </div>

        {/* Mode Toggle & Add Button */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('SCRAP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'SCRAP'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>پارتو علل ضایعات کیفی (Scrap)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('DOWNTIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'DOWNTIME'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>پارتو علل توقفات خط (Downtime)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddNewCause}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>افزودن علت جدید</span>
          </button>
        </div>
      </div>

      {/* 80/20 Insight Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            تحلیل پارتو (۸۰/۲۰): <strong className="text-rose-700">۲ علت اول</strong> به تنهایی عامل{' '}
            <strong className="font-mono text-slate-900">{toPersianDigits(topTwoCumulative)}٪</strong> از کل{' '}
            {mode === 'SCRAP' ? 'ضایعات ثبت‌شده' : 'توقفات خطوط تولید'} هستند.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-500">
            مجموع کل:{' '}
            <strong className="text-slate-900">
              {formatNumber(totalSum)} {mode === 'SCRAP' ? 'قطعه' : 'دقیقه'}
            </strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-sans font-bold text-[10px]">
            علل بحرانی (Vital 80%)
          </span>
        </div>
      </div>

      {/* Minimal Descending Bar Chart Rows with Pencil Edit & Soft Delete */}
      <div className="space-y-3">
        {computedRows.map(row => (
          <div
            key={row.id}
            className={`p-3.5 rounded-xl border transition-all ${
              row.isVitalFew
                ? 'bg-rose-50/25 border-rose-200/90 hover:border-rose-300'
                : 'bg-white border-slate-200 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                    row.rank === 1
                      ? 'bg-rose-600 text-white'
                      : row.rank === 2
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {toPersianDigits(row.rank)}
                </span>
                <span className="text-xs font-bold text-slate-900">{row.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {row.category6M}
                </span>
                {row.isVitalFew && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    اولویت ۸۰/۲۰
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs shrink-0 self-end sm:self-center">
                <span className="font-black text-slate-900 ml-1">
                  {formatNumber(row.value)}{' '}
                  <span className="text-[10px] font-sans font-normal text-slate-500">{row.unitLabel}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px]">
                  سهم: {toPersianDigits(row.sharePercent)}٪
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                    row.cumulativePercent <= 82
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  تجمعی: {toPersianDigits(row.cumulativePercent)}٪
                </span>

                {/* Pencil Edit Icon (Opens Slide-Over Drawer) */}
                <button
                  type="button"
                  onClick={() => handleEditCause(row)}
                  title="ویرایش در کشو (Edit)"
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Soft Delete Icon (Opens ConfirmDialog + Undo Toast) */}
                <button
                  type="button"
                  onClick={() => handleDeleteCause(row)}
                  title="حذف منطقی (Soft Delete)"
                  className="p-1.5 rounded-lg bg-white hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Descending Horizontal Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  row.rank === 1
                    ? 'bg-rose-600'
                    : row.rank === 2
                    ? 'bg-amber-500'
                    : row.rank === 3
                    ? 'bg-orange-400'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${Math.max(6, row.widthRatioPercent)}%` }}
              />
            </div>

            {/* Sub-row: Station & IATF 16949 Corrective Action */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
              <span>
                ایستگاه درگیر: <strong className="text-slate-700">{row.affectedStation}</strong>
              </span>
              <span className="text-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                اقدام اصلاحی (CAPA): {row.capaAction}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
