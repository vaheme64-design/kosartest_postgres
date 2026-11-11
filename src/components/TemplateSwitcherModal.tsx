import React, { useState } from 'react';
import {
  Palette,
  LayoutTemplate,
  Check,
  Sparkles,
  X,
  Eye,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  ErpLayoutTemplate,
  ErpColorTheme,
  LAYOUT_TEMPLATES,
  COLOR_THEMES,
} from '../types/theme';

interface TemplateSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTemplate: ErpLayoutTemplate;
  activeColor: ErpColorTheme;
  onSelectTemplate: (tpl: ErpLayoutTemplate) => void;
  onSelectColor: (clr: ErpColorTheme) => void;
  onPreviewMasterData?: (tpl: ErpLayoutTemplate) => void;
}

export const TemplateSwitcherModal: React.FC<TemplateSwitcherModalProps> = ({
  isOpen,
  onClose,
  activeTemplate,
  activeColor,
  onSelectTemplate,
  onSelectColor,
  onPreviewMasterData,
}) => {
  const [modalTab, setModalTab] = useState<'SWITCHER' | 'UX_ANALYSIS'>('SWITCHER');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold">
                تنظیمات قالب کاربردی (UX Layout) و تم رنگی (UI Theme)
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                انتخاب زنده بین ۴ معماری تجربه کاربری (ERPNext Workspace، میزکار تب‌بندی، Odoo Enterprise و مرکز فرماندهی) و ۴ پالت رنگی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs inside Modal */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalTab('SWITCHER')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'SWITCHER'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>انتخاب قالب کاربردی و پالت رنگی</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('UX_ANALYSIS')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'UX_ANALYSIS'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>تحلیل مقایسه‌ای UX و UI (تصاویر ارسالی ۱ و ۲ + Odoo و ERPNext)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {modalTab === 'SWITCHER' ? (
            <>
              {/* SECTION 1: 4 FUNCTIONAL UX TEMPLATES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>۱. انتخاب قالب کاربردی و چیدمان صفحه (UX Layout Template)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      هر قالب علاوه بر ظاهر منو و هدر، نحوه سازماندهی ماژول‌ها (کارت‌های Workspace یا تب‌های افقی یکپارچه) را تغییر می‌دهد.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(LAYOUT_TEMPLATES) as ErpLayoutTemplate[]).map(key => {
                    const tpl = LAYOUT_TEMPLATES[key];
                    const isSelected = activeTemplate === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => onSelectTemplate(tpl.id)}
                        className={`rounded-2xl border-2 p-4 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/30 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 mb-1">
                                {tpl.badge}
                              </span>
                              <h4 className="text-xs md:text-sm font-bold text-slate-900">
                                {tpl.title}
                              </h4>
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-300 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {tpl.subtitle}
                          </p>

                          {/* Mini visual wireframe preview */}
                          {tpl.referenceImage ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-28 relative group">
                              <img
                                src={tpl.referenceImage}
                                alt={tpl.title}
                                className="w-full h-full object-cover object-top"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent flex items-end p-2">
                                <span className="text-[10px] text-white font-semibold">
                                  پیش‌نمایش طرح مرجع ارسالی
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1">
                              {tpl.uiCharacteristics.map((ch, idx) => (
                                <div
                                  key={idx}
                                  className="text-[11px] text-slate-600 flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{ch}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700">
                            {isSelected ? '✓ قالب فعال فعلی' : 'کلیک برای فعال‌سازی این قالب'}
                          </span>

                          {onPreviewMasterData && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onSelectTemplate(tpl.id);
                                onPreviewMasterData(tpl.id);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>اعمال و مشاهده در «اطلاعات پایه»</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: 4 COLOR PALETTES */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-600" />
                    <span>۲. انتخاب پالت رنگی (UI Color Palette)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    رنگ دکمه‌های فعال، منوی کناری، نوار بالای صفحه و حاشیه جداول را مطابق سلیقه سازمانی تنظیم کنید.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(COLOR_THEMES) as ErpColorTheme[]).map(cKey => {
                    const clr = COLOR_THEMES[cKey];
                    const isSelected = activeColor === clr.id;
                    return (
                      <button
                        key={clr.id}
                        type="button"
                        onClick={() => onSelectColor(clr.id)}
                        className={`text-right p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded-full border border-white shadow-xs"
                                style={{ backgroundColor: clr.primaryHex }}
                              />
                              <span
                                className="w-5 h-5 rounded-full border border-white shadow-xs"
                                style={{ backgroundColor: clr.sidebarDarkHex }}
                              />
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                فعال
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-900">{clr.name}</div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {clr.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: DETAILED UX & UI ANALYSIS OF UPLOADED TEMPLATES + ODOO & ERPNEXT */
            <div className="space-y-5 text-xs leading-relaxed">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-emerald-950">
                  تحلیل معماری UX و UI دو تصویر ارسالی در مقایسه با Odoo و ERPNext
                </h3>
                <p className="text-emerald-900">
                  هر دو تصویر ارسالی شما از بهترین الگوهای جهانی ERP الهام گرفته‌اند اما دو رویکرد متفاوت در <strong>معماری اطلاعات (Information Architecture)</strong> دارند که اکنون هر دوی آن‌ها به صورت زنده در این نرم افزار پیاده‌سازی شده‌اند:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Analysis of Image 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold">
                      تحلیل تصویر اول (الگوی Workspace کارتی / ERPNext)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate('HUB_WORKSPACE');
                        onSelectColor('EMERALD_KOSAR');
                        if (onPreviewMasterData) onPreviewMasterData('HUB_WORKSPACE');
                        onClose();
                      }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      فعال‌سازی این قالب ←
                    </button>
                  </div>

                  <img
                    src="/assets/aistudio/1_1da4846f.jpg"
                    alt="Template 1 Analysis"
                    className="w-full h-36 object-cover object-top rounded-xl border border-slate-200"
                  />

                  <div className="space-y-2 text-slate-700">
                    <div>
                      <strong className="text-slate-900">۱. تحلیل UX (تجربه کاربری):</strong>
                      <p className="mt-0.5">
                        درست مانند <strong>ERPNext Workspaces</strong>، وقتی کاربر روی «اطلاعات پایه» کلیک می‌کند، به جای مواجه شدن با یک جدول شلوغ، یک <strong>صفحه فرود کارتی (Hub Grid)</strong> شامل ۱۰ کارت مستقل (قطعات، مواد اولیه و کویل، سرانه مصرف BOM، مسیرهای تولید، عملیات، انبارها، واحدها، شیفت‌ها، مشتریان، ماشین‌آلات) می‌بیند. این الگو از خفه شدن کاربر در انبوه ماژول‌ها جلوگیری می‌کند.
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900">۲. تحلیل UI (رابط بصری):</strong>
                      <p className="mt-0.5">
                        سایدبار سرمه‌ای تیره (`#111c24`) در سمت راست با دکمه فعال سبز زمردی (`#10b981`) و کارت پروفایل در پایین سایدبار، به همراه نوار بالای سفید و مینیمال که فقط نام بخش و ساعت/تاریخ شمسی (`۱۱:۱۳ | ۱۴۰۵/۰۸/۱۱`) را نشان می‌دهد.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analysis of Image 2 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold">
                      تحلیل تصویر دوم (الگوی میزکار تب‌بندی یکپارچه)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate('TABBED_WORKBENCH');
                        onSelectColor('EMERALD_KOSAR');
                        if (onPreviewMasterData) onPreviewMasterData('TABBED_WORKBENCH');
                        onClose();
                      }}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      فعال‌سازی این قالب ←
                    </button>
                  </div>

                  <img
                    src="/assets/aistudio/2_5080a2ed.jpg"
                    alt="Template 2 Analysis"
                    className="w-full h-36 object-cover object-top rounded-xl border border-slate-200"
                  />

                  <div className="space-y-2 text-slate-700">
                    <div>
                      <strong className="text-slate-900">۱. تحلیل UX (تجربه کاربری):</strong>
                      <p className="mt-0.5">
                        این طرح برای <strong>کاربران حرفه‌ای و ورود سریع داده</strong> بهینه شده است. با استفاده از یک <strong>نوار تب کپسولی افقی (Segmented Pill Bar)</strong>، کاربر بدون ترک صفحه بین `قطعات | ماده اولیه | عملیات | ماشین‌آلات | قالب‌ها | مسیر تولید | انبارها | مشتریان | سفارشات` جابجا می‌شود.
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900">۲. تحلیل UI (رابط بصری):</strong>
                      <p className="mt-0.5">
                        نوار هدر سرمه‌ای تیره سراسری در بالا، سایدبار کاملاً سفید و روشن در سمت راست، دکمه سبز `+ ماده اولیه جدید` و جدول تمام‌عرض با حاشیه سبز عمودی در سمت راست که خوانایی کدهای ورق (`SHT-ST12-0.7` تا `SHT-ST13-1.5`) را به حداکثر می‌رساند.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Odoo & ERPNext Key Takeaways Applied */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900">
                  ویژگی‌های برتر اقتباس‌شده از Odoo 18 و ERPNext در این نسخه:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 list-disc pr-4">
                  <li>
                    <strong>سوییچ آنی بین نمای کارتی و تب‌بندی:</strong> در بخش «اطلاعات پایه» می‌توانید با یک کلیک بین نمای کارتی (طرح ۱) و نمای تب‌بندی یکپارچه (طرح ۲) جابجا شوید.
                  </li>
                  <li>
                    <strong>کشوی ماتریسی برنامه‌ها (Odoo App Switcher):</strong> دسترسی فوری به هر ۱۰ ماژول اصلی سیستم از طریق آیکون ۹ نقطه در هدر بالا.
                  </li>
                  <li>
                    <strong>نوار هشدار یک‌خطی کسری نقطه سفارش در بالا:</strong> حذف هشدارهای مزاحم وسط صفحه و تبدیل آن به نوار اعلان بالای صفحه با هدایت مستقیم به جدول کسری‌ها.
                  </li>
                  <li>
                    <strong>جستجوی زنده ماژول‌ها و زیرماژول‌ها (Ctrl+K):</strong> پرش مستقیم به «رول ورق»، «قراردادها»، «کسری نقطه سفارش» یا «MRP» با تایپ چند حرف.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            قالب فعال: <strong className="text-slate-900">{LAYOUT_TEMPLATES[activeTemplate].title}</strong> | تم رنگی:{' '}
            <strong className="text-slate-900">{COLOR_THEMES[activeColor].name}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
