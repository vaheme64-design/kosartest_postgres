import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Calculator, Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface MetricDefinition {
  id: string;
  abbr: string;
  persianTitle: string;
  englishTitle: string;
  simpleSummary: string;
  formula?: string;
  example?: string;
  healthyBenchmark?: string;
  warningSign?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  OEE: {
    id: 'OEE',
    abbr: 'OEE',
    persianTitle: 'اثربخشی کلی تجهیزات',
    englishTitle: 'Overall Equipment Effectiveness',
    simpleSummary: 'معیاری استاندارد برای سنجش بهره‌وری واقعی خطوط پرس؛ نشان می‌دهد چه درصدی از زمان برنامه‌ریزی‌شده واقعاً صرف تولید قطعه سالم با سرعت استاندارد شده است.',
    formula: 'OEE = دسترس‌پذیری (Availability) × کارایی سرعت (Performance) × کیفیت (Quality)',
    example: 'اگر پرس ۹۰٪ زمان روشن باشد، با ۹۵٪ سرعت استاندارد کار کند و ۹۹٪ قطعه سالم بزند: OEE = 84.6%',
    healthyBenchmark: 'بالای ۸۵٪ (کلاس جهانی در صنعت خودرو)',
    warningSign: 'زیر ۷۰٪ نشان‌دهنده توقفات مکرر قالب، تعویض طولانی یا ضایعات بالاست'
  },
  ITR: {
    id: 'ITR',
    abbr: 'ITR',
    persianTitle: 'نرخ چرخش موجودی قطعات (Inventory Turnover)',
    englishTitle: 'Inventory Turnover Ratio & DSI',
    simpleSummary: 'نشان می‌دهد موجودی یک قطعه استراتژیک (VIP) در بازه زمانی انتخاب‌شده (۳۰، ۶۰ یا ۹۰ روز) چند بار به‌طور کامل مصرف و جایگزین شده است.',
    formula: 'ITR = کل مصرف یا خروج دوره ÷ میانگین موجودی دوره | دوره ماندگاری (DSI) = تعداد روز دوره ÷ ITR',
    example: 'اگر در ۳۰ روز اخیر ۶,۰۰۰ عدد قطعه مصرف شده و میانگین موجودی انبار ۲,۰۰۰ عدد بوده باشد: ITR = 3.0 بار (معادل ۱۰ روز ماندگاری DSI)',
    healthyBenchmark: 'ITR بالای ۲.۵ در ماه (ماندگاری زیر ۱۲ روز برای قطعات پرمصرف VIP)',
    warningSign: 'ITR زیر ۱.۰ نشان‌دهنده رسوب سرمایه، تولید بیش از تقاضا یا انباشت موجودی راکد است'
  },
  SMED: {
    id: 'SMED',
    abbr: 'SMED',
    persianTitle: 'تعویض سریع قالب (تک‌رقمی کردن زمان ستاپ)',
    englishTitle: 'Single-Minute Exchange of Die',
    simpleSummary: 'مدت زمان توقف پرس از آخرین ضرب قطعه قبلی تا اولین ضرب سالم قطعه جدید (شامل باز کردن قالب قبلی، بستن قالب جدید و تنظیم ارتفاع ضربه).',
    formula: 'زمان کل ستاپ = تنظیمات داخلی (هنگام توقف پرس) + تنظیمات خارجی (آماده‌سازی پیش از توقف)',
    example: 'کاهش زمان تعویض قالب پروگرسیو ۲۵۰ تن از ۴۵ دقیقه به ۱۸ دقیقه با آماده‌سازی پیشین جرثقیل و کلمپ‌ها',
    healthyBenchmark: 'زیر ۲۰ دقیقه برای پرس‌های ضربه‌ای و زیر ۳۰ دقیقه برای قالب‌های بزرگ',
    warningSign: 'بالای ۴۵ دقیقه باعث افت شدید دسترس‌پذیری (Availability) و تاخیر برنامه روزانه می‌شود'
  },
  WIP: {
    id: 'WIP',
    abbr: 'WIP',
    persianTitle: 'موجودی حین ساخت (بین‌ایستگاهی)',
    englishTitle: 'Work In Progress',
    simpleSummary: 'قطعات نیمه‌ساخته‌ای که حداقل یک مرحله عملیاتی (مثلاً OP10 برش) روی آن‌ها انجام شده اما هنوز مرحله نهایی و تحویل به انبار محصول را طی نکرده‌اند.',
    formula: 'WIP ایستگاه فعلی = تولید سالم مرحله قبل (OP n-1) − کل مصرف‌شده در مرحله فعلی (OP n)',
    example: 'اگر در OP10 تعداد ۱,۲۰۰ قطعه برش خورده و در OP20 تعداد ۹۰۰ عدد خم‌کاری شده باشد، WIP پای پرس OP20 برابر ۳۰۰ عدد است.',
    healthyBenchmark: 'معادل ۱ تا ۲ ساعت تولید (جریان تک‌تکه یا دسته کوچک بدون انباشت کف سالن)',
    warningSign: 'انباشت بالای WIP نشانه گلوگاه شدن ایستگاه بعدی یا خرابی قالب مرحله بعد است'
  },
  MRP: {
    id: 'MRP',
    abbr: 'MRP',
    persianTitle: 'برنامه‌ریزی نیازمندی‌های مواد و ورق',
    englishTitle: 'Material Requirements Planning',
    simpleSummary: 'محاسبه خودکار مقدار دقیق ورق، کویل و قطعات نیمه‌ساخته مورد نیاز بر اساس سفارشات مشتریان، درخت محصول (BOM) و موجودی آزاد انبار.',
    formula: 'کسری خالص = نیازمندی ناخالص سفارشات − (موجودی آزاد انبار + سفارشات خرید در راه − موجودی احتیاطی)',
    example: 'برای تولید ۵,۰۰۰ رام زیرموتور با وزن خالص ۱.۸ کیلوگرم، سیستم ۹,۰۰۰ کیلوگرم ورق ST37 نیاز دارد.',
    healthyBenchmark: 'پوشش ۱۰۰٪ سفارشات قطعی حداقل ۷ روز پیش از تاریخ شروع تولید',
    warningSign: 'کسری ورق (تراز منفی) باعث توقف خط پرس و عدم امکان صدور دستور کار قطعی می‌شود'
  },
  CAPA: {
    id: 'CAPA',
    abbr: 'CAPA',
    persianTitle: 'اقدام اصلاحی و پیشگیرانه کیفیت',
    englishTitle: 'Corrective and Preventive Action',
    simpleSummary: 'فرآیند سیستماتیک ریشه‌یابی عیوب تولید (مانند پلیسه، ترک کشش یا خطای ابعاد) و تعریف اقدام مهندسی برای جلوگیری از تکرار مجدد ضایعات.',
    formula: 'شناسایی عدم انطباق (NCR) ← تحلیل ریشه (5-Why) ← اقدام اصلاحی فوری ← بازنگری استاندارد کنترلی',
    example: 'ثبت پرونده CAPA پس از مشاهده پلیسه در لبه قطعه و دستور سنگ‌زنی سنبه قالب شماره D-104',
    healthyBenchmark: 'بسته شدن ۱۰۰٪ پرونده‌های بحرانی پیش از شروع شیفت بعدی تولید همان قطعه',
    warningSign: 'تکرار یک کد ضایعات مشابه در دو بچ متوالی نشان‌دهنده عدم اثربخشی اقدام اصلاحی است'
  },
  SPM: {
    id: 'SPM',
    abbr: 'SPM',
    persianTitle: 'تعداد ضربه پرس در دقیقه',
    englishTitle: 'Strokes Per Minute',
    simpleSummary: 'سرعت کاری کورس پرس؛ نشان می‌دهد رام پرس در هر دقیقه چند بار پایین و بالا می‌رود و مستقیماً تعیین‌کننده نرخ تولید ساعتی استاندارد است.',
    formula: 'نرخ تولید ساعتی تئوری (PPH) = SPM × ۶۰ دقیقه × راندمان تغذیه اپراتور/فیدر',
    example: 'پرس با سرعت ۲۵ ضربه در دقیقه و راندمان تغذیه ۸۰٪، ساعتی ۱,۲۰۰ قطعه تولید می‌کند.',
    healthyBenchmark: 'مطابق سرعت مجاز شناسنامه فنی قالب (بدون ایجاد ارتعاش یا داغی سنبه)',
    warningSign: 'کاهش SPM نسبت به استاندارد باعث افزایش زمان اجرای دستور کار و عقب‌ماندگی شیفت می‌شود'
  },
  MTBF: {
    id: 'MTBF',
    abbr: 'MTBF',
    persianTitle: 'میانگین زمان بین دو خرابی متوالی',
    englishTitle: 'Mean Time Between Failures',
    simpleSummary: 'شاخص قابلیت اطمینان دستگاه یا قالب؛ نشان می‌دهد یک پرس یا قالب به طور متوسط چند ساعت کاری بدون هیچ‌گونه خرابی اضطراری کار می‌کند.',
    formula: 'MTBF = کل ساعات کارکرد واقعی تجهیز ÷ تعداد دفعات وقوع خرابی اضطراری (EM)',
    example: 'اگر پرس ۴۰۰ تن در ۳۰۰ ساعت کارکرد ۲ بار دچار خرابی کلاچ شده باشد، MTBF آن ۱۵۰ ساعت است.',
    healthyBenchmark: 'بالای ۲۰۰ ساعت برای خطوط پرس هیدرولیک و ضربه‌ای',
    warningSign: 'کاهش روند MTBF هشدار می‌دهد که سرویس‌های پیشگیرانه (PM) به‌موقع یا دقیق انجام نشده‌اند'
  },
  MTTR: {
    id: 'MTTR',
    abbr: 'MTTR',
    persianTitle: 'میانگین زمان تعمیر و رفع خرابی',
    englishTitle: 'Mean Time To Repair',
    simpleSummary: 'شاخص سرعت واکنش تیم نت و قالب‌سازی؛ نشان می‌دهد از لحظه اعلام خرابی تا بازگشت دستگاه به چرخه تولید سالم به طور متوسط چقدر زمان صرف می‌شود.',
    formula: 'MTTR = مجموع زمان‌های توقف تعمیرات اضطراری ÷ تعداد کل تعمیرات انجام‌شده',
    example: 'اگر ۳ خرابی در ماه مجموعاً ۶ ساعت خط را متوقف کرده باشند، MTTR برابر ۲ ساعت است.',
    healthyBenchmark: 'زیر ۱.۵ ساعت برای تعمیرات مکانیکی/برقی معمول سالن',
    warningSign: 'MTTR بالا نشانه کمبود قطعات یدکی بحرانی در انبار نت یا تاخیر حضور تکنسین است'
  },
  ATP: {
    id: 'ATP',
    abbr: 'ATP',
    persianTitle: 'موجودی آزاد قابل تعهد به سفارش جدید',
    englishTitle: 'Available-To-Promise',
    simpleSummary: 'مقداری از موجودی فیزیکی انبار (ورق یا قطعه) که برای هیچ دستور کار یا قرارداد دیگری رزرو (Hard Pegging) نشده و واقعاً قابل مصرف است.',
    formula: 'موجودی آزاد (ATP) = موجودی فیزیکی تاییدشده − موجودی قرنطینه − رزرو قطعی دستورات کار فعال',
    example: 'انبار ۱۰ تن ورق دارد اما ۶ تن آن برای سفارش سایپا رزرو شده؛ پس ATP فقط ۴ تن است.',
    healthyBenchmark: 'مثبت بودن ATP برای تمام اقلام پرمصرف (VIP) طبق نقطه سفارش (ROP)',
    warningSign: 'تخصیص ورق بدون توجه به ATP باعث کسری ناگهانی در زمان شروع شیفت تولید می‌شود'
  },
  SAFETY_STOCK: {
    id: 'SAFETY_STOCK',
    abbr: 'Safety Stock',
    persianTitle: 'موجودی احتیاطی (حداقل موجودی امن)',
    englishTitle: 'Safety Stock Buffer',
    simpleSummary: 'حداقل موجودی استراتژیک در انبار برای مقابله با نوسانات ناگهانی تقاضای خودروساز یا تاخیر در تحویل ورق توسط تامین‌کننده.',
    formula: 'موجودی احتیاطی = مصرف روزانه حداکثر × حداکثر تاخیر مجاز تامین (روز)',
    example: 'نگهداری حداقل ۲,۰۰۰ عدد قطعه VIP در انبار محصول برای پوشش ۳ روز تقاضای اضطراری خط مونتاژ مشتری',
    healthyBenchmark: 'رعایت ۱۰۰٪ خط قرمز موجودی احتیاطی در اقلام کلیدی (VIP)',
    warningSign: 'مصرف شدن موجودی احتیاطی به معنی خطر قریب‌الوقوع توقف خط مشتری (Line-Stop) است'
  }
};

interface MetricTooltipProps {
  metricKey?: keyof typeof METRIC_DEFINITIONS | string;
  metric?: keyof typeof METRIC_DEFINITIONS | string;
  customLabel?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
  showBadgeText?: boolean;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  metricKey,
  metric: metricProp,
  customLabel,
  position = 'bottom',
  size = 'sm',
  showBadgeText = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openAbove: boolean }>({
    top: 0,
    left: 0,
    openAbove: false,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const effectiveKey = metricKey || metricProp || '';
  const metric = METRIC_DEFINITIONS[effectiveKey];

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 340;
    const popupEstimatedHeight = 290;
    const margin = 12;

    const preferTop = position === 'top';
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openAbove =
      (preferTop && spaceAbove > popupEstimatedHeight) ||
      (!preferTop && spaceBelow < popupEstimatedHeight && spaceAbove > spaceBelow);

    const top = openAbove ? Math.max(margin, rect.top - 8) : Math.min(window.innerHeight - margin, rect.bottom + 8);
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    if (left < margin) left = margin;
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }

    setCoords({ top, left, openAbove });
  }, [position]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (!metric) return null;

  return (
    <span className="relative inline-flex items-center align-middle mx-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updatePosition();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => {
          updatePosition();
          setIsOpen(true);
        }}
        onMouseLeave={() => setIsOpen(false)}
        className={`inline-flex items-center gap-1 rounded-md transition-colors focus:outline-none ${
          showBadgeText
            ? 'px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200/80 text-[10px] font-bold'
            : 'p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-full'
        }`}
        title={`راهنمای شاخص ${metric.abbr} (${metric.persianTitle})`}
        aria-label={`راهنمای شاخص ${metric.persianTitle}`}
      >
        <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {showBadgeText && <span>{customLabel || metric.abbr}</span>}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.openAbove ? 'translateY(-100%)' : 'none',
              width: '340px',
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 9999,
            }}
            className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/90 p-3.5 text-right font-sans animate-in fade-in duration-150"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-black font-mono">
                    {metric.abbr}
                  </span>
                  <span className="text-xs font-black text-white">{metric.persianTitle}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{metric.englishTitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Summary */}
            <p className="text-[11px] text-slate-200 leading-relaxed mb-2.5 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>{metric.simpleSummary}</span>
            </p>

            {/* Formula */}
            {metric.formula && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 mb-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 mb-1">
                  <Calculator className="w-3 h-3" />
                  <span>فرمول و منطق محاسبه در سیستم:</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono leading-relaxed">{metric.formula}</div>
              </div>
            )}

            {/* Example */}
            {metric.example && (
              <div className="text-[10px] text-slate-300 bg-slate-800/60 rounded-lg p-2 mb-2 leading-relaxed">
                <span className="font-bold text-amber-300">مثال کاربردی: </span>
                {metric.example}
              </div>
            )}

            {/* Benchmarks */}
            <div className="grid grid-cols-1 gap-1.5 pt-1 text-[10px]">
              {metric.healthyBenchmark && (
                <div className="flex items-start gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    <strong className="text-emerald-200">وضعیت مطلوب: </strong>
                    {metric.healthyBenchmark}
                  </span>
                </div>
              )}
              {metric.warningSign && (
                <div className="flex items-start gap-1.5 text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    <strong className="text-rose-200">هشدار عملیاتی: </strong>
                    {metric.warningSign}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};
