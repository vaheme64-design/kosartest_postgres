import React, { useState } from 'react';
import { HelpCircle, X, Info, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';

interface ContextualHelpProps {
  title: string;
  description: string;
  whyNeeded?: string;
  example?: string;
  mandatory?: boolean;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  description,
  whyNeeded,
  example,
  mandatory = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center mr-1 align-middle">
      <button
        type="button"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        title={`راهنمای فیلد: ${title}`}
        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5 rounded focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-lg max-w-sm w-full p-4 text-right space-y-2.5 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{title}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">{description}</p>

            {whyNeeded && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">چرا این اطلاعات لازم است؟</span>
                {whyNeeded}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-[11px]">
              {example ? (
                <span className="text-slate-500">
                  نمونه معتبر: <code className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{example}</code>
                </span>
              ) : (
                <span />
              )}
              <span className={`font-semibold ${mandatory ? 'text-rose-600' : 'text-slate-500'}`}>
                {mandatory ? 'الزامی (*)' : 'اختیاری'}
              </span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
};

interface OnboardingBannerProps {
  role: string;
  onQuickAction: (action: string) => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ role, onQuickAction }) => {
  const storageKey = 'kpims_onboarding_dismissed_v2';
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKey) === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
  };

  const roleGuide: Record<string, { title: string; steps: string[] }> = {
    WAREHOUSE_KEEPER: {
      title: 'راهنمای سریع مسئول انبار (شروع به کار در ۳ گام)',
      steps: [
        '۱. برای ورود ورق، پیچ و مهره یا لاستیک از دکمه «ثبت رسید کالا / رول» استفاده کنید (مشخصات ورق خودکار بارگذاری می‌شود).',
        '۲. هنگام ورود رول ورق می‌توانید وزن یک رول فیزیکی را هم‌زمان بین یک یا چند قرارداد تسهیم کنید.',
        '۳. برای تحویل ورق به خط پرس از «حواله خروج» و برای بازگرداندن ته‌کلاف از «برگشت از خط تولید» استفاده نمایید.',
      ],
    },
    PRODUCTION_MANAGER: {
      title: 'راهنمای سریع مدیر تولید و برنامه‌ریزی',
      steps: [
        '۱. در بخش «برنامه‌ریزی و نیازسنجی» تقاضای مشتریان را با موجودی محصول نهایی و WIP مقایسه کنید.',
        '۲. کسری ورق و پیشنهاد هوشمند تخصیص ماشین‌آلات پرس را پیش از صدور دستور کار بررسی نمایید.',
        '۳. در بخش «استعلام موجودی» می‌توانید موجودی رول‌ها را بر اساس ضخامت، گرید یا شماره قرارداد گروه‌بندی کنید.',
      ],
    },
    LINE_SUPERVISOR: {
      title: 'راهنمای سریع سرپرست سالن تولید و پرسکاری',
      steps: [
        '۱. تولید سالم شیفت و ضایعات هر ایستگاه را در بخش «ثبت تولید و ضایعات» ثبت کنید.',
        '۲. انتقال قطعات نیمه‌ساخته بین ایستگاه‌ها (OP10 تا OP80) را در بخش «کار در جریان (WIP)» مدیریت نمایید.',
        '۳. در صورت باقی‌ماندن بخشی از رول ورق در پای خط، از طریق «برگشت از خط تولید» آن را به انبار بازگردانید.',
      ],
    },
    QC_INSPECTOR: {
      title: 'راهنمای سریع بازرس کنترل کیفیت (QC)',
      steps: [
        '۱. وضعیت کیفی رول‌ها و قطعات قرنطینه‌شده را در «استعلام موجودی» بررسی نمایید.',
        '۲. آمار ضایعات ایستگاه‌ها و نرخ تحقق کیفیت را در داشبورد و گزارش‌های تحلیلی پایش کنید.',
      ],
    },
    ADMIN: {
      title: 'خوش آمدید به نسخه ارتقایافته سامانه جامع تولید و انبار کوثر (KPIMS)',
      steps: [
        '۱. منوی سمت راست بر اساس فرآیندهای واقعی کارخانه دسته‌بندی شده و با تغییر نقش کاربر در نوار بالا، میز کار متناسب نمایش داده می‌شود.',
        '۲. فرم‌های انبار (رسید، حواله، برگشت از تولید، انتقال) به‌صورت گام‌به‌گام با راهنمای فارسی (آیکون ؟) و مرحله پیش‌نمایش طراحی شده‌اند.',
        '۳. در بخش «استعلام موجودی» امکان گروه‌بندی پویا بر اساس کالا، ضخامت، جنس، کویل‌پک و شماره قرارداد فراهم شده است.',
      ],
    },
  };

  const currentGuide = roleGuide[role] || roleGuide.ADMIN;

  return (
    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{currentGuide.title}</span>
        </div>
        <div className="space-y-1 text-xs text-slate-700 pr-6">
          {currentGuide.steps.map((s, idx) => (
            <div key={idx}>{s}</div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
        <button
          type="button"
          onClick={() => onQuickAction('inventory_receipt')}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          شروع با ثبت رسید کالا
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          متوجه شدم، دیگر نمایش نده
        </button>
      </div>
    </div>
  );
};
