import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Bot,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ArrowRight,
  FileCheck,
  Package,
  RefreshCw,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { AiSettings, AiActionPayload } from '../types/ai';
import { Part, SapcoCoilReceipt } from '../types/inventory';
import { TabKey } from './Sidebar';
import { formatNumber, toPersianDigits } from '../utils/formatters';
import { loadQcHoldMap, loadVipPartsMap, isPartVip } from '../utils/qcHoldStore';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  currentPageTab?: TabKey;
  coils?: SapcoCoilReceipt[];
  summary?: any;
  onExecuteAction: (action: AiActionPayload) => void;
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'LOCAL_NLP',
  geminiModel: 'gemini-2.5-flash',
};

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  parts,
  currentPageTab = 'dashboard',
  coils = [],
  onExecuteAction,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AiActionPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mrpSnapshot, setMrpSnapshot] = useState<any>(null);
  const [qcHoldMap, setQcHoldMap] = useState<Record<string, any>>(() => loadQcHoldMap());
  const [vipMap, setVipMap] = useState<Record<string, boolean>>(() => loadVipPartsMap());

  useEffect(() => {
    if (!isOpen) return;
    setQcHoldMap(loadQcHoldMap());
    setVipMap(loadVipPartsMap());
    fetch('/api/mrp/run')
      .then(r => r.json())
      .then(json => {
        if (json.success) setMrpSnapshot(json.data);
      })
      .catch(() => {});
  }, [isOpen]);

  const [settings] = useState<AiSettings>(DEFAULT_SETTINGS);

  // Voice speech-to-text recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fa-IR';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setErrorMsg('مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند یا دسترسی میکروفن داده نشده است.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Speech recognition start failed', e);
      }
    }
  };

  const handleSubmitCommand = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend) return;

    setLoading(true);
    setErrorMsg(null);
    setLastResult(null);

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در پردازش دستور');
      }

      setLastResult(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = () => {
    if (!lastResult) return;
    onExecuteAction(lastResult);
    onClose();
  };

  const samplePrompts = [
    'صدور دستور تولید جدید (MO) برای مجموعه براکت ضدسرقت رایانه موتور با تیراژ ۱,۵۰۰ عدد',
    'پیگیری و ردیابی زنجیره دستور تولید براکت ضدسرقت در خط پرس',
    'ردیابی شماره ذوب HT-1404-ECU01 و شجره‌نامه کلاف‌های ساپکو',
    'رسید ۳,۲۰۰ کیلوگرم ورق DC01A با شماره ذوب HT-1404-ECU01 به انبار ساپکو',
    'حواله خروج ۸۰۰ کیلوگرم ورق DC01A برای سالن پرس و خط تولید',
    'بررسی کسری موجودی و اقلام زیر نقطه سفارش (آلارم کسری)',
    'انتقال به بخش ماشین‌آلات، پرس‌ها و تعمیرات PM',
  ];

  const hardShortageMaterials: any[] = (mrpSnapshot?.materialRows || []).filter(
    (m: any) => (m.hardShortage || m.hardShortageQuantity || 0) > 0
  );
  const vipPartsList = parts.filter(p => isPartVip(p.id, p.code, parts, vipMap));
  const activeQcHoldEntries = Object.values(qcHoldMap).filter((e: any) => e?.isHeld && e?.heldQty > 0);
  const quarantinedCoils = coils.filter(
    c =>
      (c.status as string) === 'QUARANTINE' ||
      qcHoldMap[c.id]?.isHeld ||
      qcHoldMap[c.coilNumber]?.isHeld
  );

  const pageContextMeta: Record<
    string,
    { badge: string; title: string; subtitle: string; quickPrompts: string[] }
  > = {
    planning: {
      badge: 'حساس به صفحه: برنامه‌ریزی و MRP',
      title: 'تحلیل زنده کسری قطعی مواد اولیه (Hard Shortages) و ظرفیت خطوط',
      subtitle:
        hardShortageMaterials.length > 0
          ? `${toPersianDigits(hardShortageMaterials.length)} قلم مواد اولیه دارای کسری قطعی (Hard Shortage) هستند.`
          : 'تمامی نیازمندی‌های ورق و اتصالات توسط موجودی آزاد (ATP) پوشش داده شده‌اند.',
      quickPrompts: [
        'لیست مواد دارای کسری قطعی در MRP و صدور رسید فوری',
        'بررسی وضعیت تامین مجموعه براکت ضدسرقت رایانه موتور در برنامه تولید',
        'انتقال به تقویم ظرفیت ماشین‌آلات جهت بررسی تداخل پرس‌ها',
      ],
    },
    inventory: {
      badge: 'حساس به صفحه: مدیریت انبار و قرنطینه (QC Hold)',
      title: 'پایش موجودی آزاد (ATP)، محموله‌های قرنطینه کیفی و اقلام کلیدی',
      subtitle: `در حال حاضر ${toPersianDigits(activeQcHoldEntries.length + quarantinedCoils.length)} محموله/کلاف در قرنطینه کیفی (QC Hold) قرار دارد.`,
      quickPrompts: [
        'بررسی کسری موجودی و اقلام زیر نقطه سفارش (آلارم کسری)',
        'رسید ۳,۲۰۰ کیلوگرم ورق DC01A با شماره ذوب HT-1404-ECU01 به انبار ساپکو',
        'حواله خروج ۸۰۰ کیلوگرم ورق DC01A برای سالن پرس و خط تولید',
      ],
    },
    dashboard: {
      badge: 'حساس به صفحه: پیشخوان کارخانه و دستورات تولید (MO)',
      title: 'خلاصه هوشمند وضعیت دستورات کار (MO)، براکت ضدسرقت و ردیابی ذوب',
      subtitle: `${toPersianDigits(vipPartsList.length)} قطعه استراتژیک در صدر پایش کارخانه قرار دارد.`,
      quickPrompts: [
        'صدور دستور تولید جدید (MO) برای مجموعه براکت ضدسرقت رایانه موتور با تیراژ ۱,۵۰۰ عدد',
        'پیگیری و ردیابی زنجیره دستور تولید براکت ضدسرقت در خط پرس',
        'ردیابی شماره ذوب HT-1404-ECU01 و شجره‌نامه کلاف‌های ساپکو',
      ],
    },
  };

  const activePageContext = pageContextMeta[currentPageTab] || {
    badge: `حساس به ماژول: ${currentPageTab.toUpperCase()}`,
    title: 'پایش هوشمند زنجیره تامین، تولید و انبار (ERP Command Assistant)',
    subtitle: `${toPersianDigits(vipPartsList.length)} قطعه کلیدی و ${toPersianDigits(hardShortageMaterials.length)} کسری قطعی مواد در MRP شناسایی شد.`,
    quickPrompts: samplePrompts.slice(0, 3),
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm lg:text-base">دستیار فرمان صوتی و متنی کارخانه (KPIMS ERP)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {activePageContext.badge}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  موتور پردازشگر فارسی کارخانه
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                صدور سریع اسناد انبار، دستورات تولید (MO) و ناوبری هوشمند با میانبر Ctrl + Space
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          <div className="space-y-4">
            {/* CONTEXT-AWARE INTELLIGENCE PANEL */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs text-white">{activePageContext.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  اتصال زنده به ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {activePageContext.subtitle}
              </p>

              {hardShortageMaterials.length > 0 && (
                <div className="bg-slate-800/90 border border-rose-500/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>کسری‌های قطعی مواد اولیه در MRP:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onExecuteAction({
                          actionType: 'NAVIGATE',
                          targetTab: 'planning',
                          targetSubTab: 'mrp',
                          message: 'هدایت به جدول نیازمندی‌های مواد (MRP)',
                        });
                        onClose();
                      }}
                      className="text-emerald-300 hover:underline font-semibold cursor-pointer"
                    >
                      مشاهده در MRP ←
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {hardShortageMaterials.slice(0, 4).map((m: any) => {
                      const shortageVal = m.hardShortage || m.hardShortageQuantity || 0;
                      return (
                        <div
                          key={m.materialCode}
                          className="p-2 rounded bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="truncate">
                            <div className="font-bold text-slate-100 truncate">{m.materialName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ATP: {formatNumber(m.netAvailable)} | کسری:{' '}
                              <span className="text-rose-400 font-bold">{formatNumber(shortageVal)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onExecuteAction({
                                actionType: 'OPEN_RECEIPT',
                                message: `آماده‌سازی فرم رسید فوری برای جبران کسری ${m.materialName}`,
                                prefillReceipt: {
                                  partCode: m.materialCode,
                                  partName: m.materialName,
                                  quantity: shortageVal,
                                  unit: m.unitCode || 'KG',
                                  ownership: 'SAPCO_SUPPLIER_OWNED',
                                },
                              });
                              onClose();
                            }}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            رسید فوری
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold">پیشنهادهای صفحه فعلی:</span>
                {activePageContext.quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPrompt(qp);
                      handleSubmitCommand(qp);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-[10px] border border-slate-700 transition-colors cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box with Voice */}
            <div className="relative">
              <textarea
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitCommand();
                  }
                }}
                placeholder="دستور خود را بنویسید یا دکمه میکروفن را بزنید... مثلاً: «ورق روغنی DC01A با وزن ۳۲۰۰ کیلو و کویل‌پک CP-101 رسید انبار ساپکو شد»"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 pr-4 pl-24 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 transition-all shadow-inner resize-none leading-relaxed"
              />

              <div className="absolute left-2.5 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title="گفتار به متن صوتی فارسی"
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  disabled={loading || !prompt.trim()}
                  onClick={() => handleSubmitCommand()}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isListening && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-semibold">در حال شنیدن گفتار شما به زبان فارسی... لطفاً صحبت کنید.</span>
              </div>
            )}

            {/* Sample Quick Commands */}
            <div>
              <p className="text-[11px] text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                فرمان‌های نمونه کارخانه (کلیک برای اجرای فوری):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(s);
                      handleSubmitCommand(s);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] border border-slate-200 transition-all text-right cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {lastResult && (
              <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>دستور با موفقیت تحلیل شد</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                    {lastResult.actionType}
                  </span>
                </div>

                <p className="text-slate-800 text-xs font-medium leading-relaxed">
                  {lastResult.message}
                </p>

                {lastResult.prefillReceipt && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-indigo-700">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>اقلام شناسایی‌شده برای فرم رسید کالا:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="text-slate-400">کالا / ورق:</span>{' '}
                        <strong className="text-slate-900">
                          {lastResult.prefillReceipt.partName || lastResult.prefillReceipt.partCode || 'انتخابی'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">مقدار / وزن:</span>{' '}
                        <strong className="text-emerald-700">
                          {lastResult.prefillReceipt.quantity
                            ? `${lastResult.prefillReceipt.quantity.toLocaleString('fa-IR')} ${lastResult.prefillReceipt.unit || 'کیلوگرم'}`
                            : 'مشخص‌نشده'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">شماره کویل‌پک:</span>{' '}
                        <strong className="font-mono text-indigo-700">
                          {lastResult.prefillReceipt.coilPackNumber || 'ندارد'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">شماره ذوب (Heat):</span>{' '}
                        <strong className="font-mono">{lastResult.prefillReceipt.heatNumber || 'ندارد'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">مالکیت:</span>{' '}
                        <strong>
                          {lastResult.prefillReceipt.ownership === 'SAPCO_SUPPLIER_OWNED'
                            ? 'امانی ساپکو'
                            : 'ملکی شرکت'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">انبار مقصد:</span>{' '}
                        <strong>انبار ورق و مواد اولیه (WH-RAW)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {lastResult.prefillIssue && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-amber-700">
                      <Package className="w-3.5 h-3.5" />
                      <span>اقلام شناسایی‌شده برای فرم حواله خروج:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="text-slate-400">کالا:</span>{' '}
                        <strong className="text-slate-900">
                          {lastResult.prefillIssue.partName || lastResult.prefillIssue.partCode || 'انتخابی'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">مقدار خروج:</span>{' '}
                        <strong className="text-amber-700">
                          {lastResult.prefillIssue.quantity
                            ? `${lastResult.prefillIssue.quantity.toLocaleString('fa-IR')} ${lastResult.prefillIssue.unit || 'کیلوگرم'}`
                            : 'مشخص‌نشده'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">انبار مقصد:</span>{' '}
                        <strong>سالن پرس و خط تولید (WH-WIP-STAMP)</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLastResult(null)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAction}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <span>تایید و انتقال به فرم مربوطه جهت ثبت نهایی</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>کلید میانبر باز کردن دستیار:</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px] font-bold">
              Ctrl + Space
            </kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
