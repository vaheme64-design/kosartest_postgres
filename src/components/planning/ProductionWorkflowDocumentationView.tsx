import React, { useState } from 'react';
import {
  FileText,
  GitBranch,
  Layers,
  ArrowRight,
  CheckCircle2,
  Package,
  Calendar,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  RotateCcw,
  Zap,
  Cpu,
  Boxes,
  Truck,
  Database,
  Search,
  ExternalLink,
} from 'lucide-react';
import { exportToCsv } from '../../utils/csvExport';

export const ProductionWorkflowDocumentationView: React.FC = () => {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('PHASE-BOM');
  const [activeStandardTab, setActiveStandardTab] = useState<'WORKFLOW' | 'SAP_PP_COMPARISON' | 'DOCUMENTATION_SPEC'>('WORKFLOW');

  // -------------------------------------------------------------
  // Workflow Steps (Global Standard: SAP PP / APICS CPIM / IATF 16949)
  // -------------------------------------------------------------
  const workflowPhases = [
    {
      id: 'PHASE-ORDER',
      stepNumber: '۰۱',
      code: 'SO / FORECAST',
      title: '۱. دریافت سفارش، پیش‌بینی تقاضا و قراردادها',
      sapEquivalent: 'Sales & Operations Planning (S&OP) / VA01 Customer Order',
      actor: 'واحد فروش و امور قراردادهای ساپکو / ایران‌خودرو',
      inputs: 'برنامه ماهانه ارسالی ساپکو (EDI/SAPCO Web)، قراردادهای باز، سفارشات متفرقه قطعات یدکی (ایساکو)',
      processDescription:
        'ثبت و صحه‌گذاری تقاضای قطعات خودرویی در بازه‌های هفتگی و روزانه. بررسی اعتبارات مالی، شماره قرارداد مرتبط و تعیین تاریخ تحویل تعهدشده (Confirmed Due Date).',
      outputs: 'سفارش مشتری تاییدشده (Customer Order / Demand Schedule)',
      kpi: 'دقت پیش‌بینی تقاضا (Forecast Accuracy > 95%)، درصد سفارشات ثبت‌شده به موقع',
      color: 'blue',
    },
    {
      id: 'PHASE-BOM',
      stepNumber: '۰۲',
      code: 'BOM EXPLOSION & MRP',
      title: '۲. انفجار مواد درختی (BOM Explosion) و نیازسنجی خالص (MRP)',
      sapEquivalent: 'CS01 Bill of Material / MD01 MRP Run (Gross-to-Net Explosion)',
      actor: 'واحد مهندسی صنایع، برنامه‌ریزی تولید (PPC) و کنترل موجودی',
      inputs: 'درخت سلسله‌مراتبی محصول (BOM)، ضرایب مصرف ورق به کیلوگرم، پرتی مجاز، موجودی فیزیکی و امانی انبار',
      processDescription:
        'شکستن قطعات نهایی (مانند براکت ضدسرقت موتور) به زیرمجموعه‌ها (صفحه اصلی و مکمل) و محاسبه نیاز خالص رول ورق (DC01A ضخامت ۲ عرض ۱۱۴۰) با کسر موجودی آزاد انبار و کلاف‌های در راه (Scheduled Receipts).',
      outputs: 'پیشنهادات برنامه تولید (Planned Orders) و درخواست خرید/تخصیص ورق (Purchase Requisition)',
      kpi: 'نرخ پرتی مجاز مهندسی (Scrap Allowance < 2%)، تراز دقیق متریال بدون کسری خط',
      color: 'indigo',
    },
    {
      id: 'PHASE-ROUTING',
      stepNumber: '۰۳',
      code: 'CRP & SCHEDULING',
      title: '۳. زمان‌بندی پله‌ای عملیات (Routing) و سنجش ظرفیت ماشین‌آلات (CRP)',
      sapEquivalent: 'CA01 Routing / CM01 Capacity Requirements Planning / Opcenter APS',
      actor: 'کارشناس ارشد برنامه‌ریزی و سرپرستان سالن‌های تولید',
      inputs: 'مسیر ساخت قطعه (Routing OPs: برش، بلنک، خم، پانچ، جوشکاری، رنگ کاتافورز ED)، نرخ استاندارد ضرب در ساعت، ماتریس تعویض قالب',
      processDescription:
        'زمان‌بندی دقیق هر مرحله کاری (OP10 تا OP50) روی پرس‌های ۱۶۰، ۲۵۰ و ۴۰۰ تن. امکان اجرای چند مرحله امروز و مراحل تکمیلی در روزهای آتی. تولید همزمان قالب‌های مشترک چپ و راست (Seat Back LH/RH).',
      outputs: 'دستور کار کارگاهی مصوب (Manufacturing Order - MO) و برگه توزیع کار روزانه خط (Dispatch Sheet)',
      kpi: 'نرخ بهره‌برداری ظرفیت (Capacity Utilization > 85%)، انطباق با برنامه (Adherence)',
      color: 'amber',
    },
    {
      id: 'PHASE-DISPATCH',
      stepNumber: '۰۴',
      code: 'MATERIAL ISSUE & START',
      title: '۴. حواله مواد اولیه از انبار و شروع فرآیند برش و پرسکاری',
      sapEquivalent: 'MIGO 261 (Goods Issue for Order) / CO02 MO Release',
      actor: 'انباردار مواد اولیه، راننده لیفتراک و اپراتور ایستگاه اول (OP10)',
      inputs: 'دستور کار کارگاهی (MO)، رول کلاف تخصیص‌یافته با پلاک شناسایی و لات‌نامبر ساپکو',
      processDescription:
        'تحویل رول ورق استاندارد از انبار مواد به پای قیچی گیوتین ۶ متری (OP10). ثبت اتوماتیک سند خروج ورق (`ISSUE_RAW_MATERIAL`) و اختصاص متریال به بچ تولید جهت ردیابی کامل کیفیت (Traceability).',
      outputs: 'نوارها و شیت‌های برش‌خورده اولیه آماده ورود به ایستگاه بلنک‌زنی',
      kpi: 'زمان تحویل کلاف به خط (Lead Time < 15 min)، مغایرت صفر در وزن تحویلی',
      color: 'orange',
    },
    {
      id: 'PHASE-WIP',
      stepNumber: '۰۵',
      code: 'SHOP-FLOOR MES & WIP',
      title: '۵. رهگیری کار در جریان (WIP per OP)، ثبت تولید و انتقال مانده (Roll-Forward)',
      sapEquivalent: 'CO11N Production Order Confirmation / MES Execution',
      actor: 'اپراتورهای دستگاه، بازرسان کنترل کیفیت حین تولید (QC IPQC) و سرپرست شیفت',
      inputs: 'قطعات نیمه‌ساخته بین ایستگاهی، لاگ تولید ضربی، فرم‌های توقفات اضطراری و ستاپ قالب',
      processDescription:
        'ردیابی برخط تعداد قطعات سالم، ضایعات و موجودی نیمه‌ساخته در هر عملیات (WIP Buffer After OP). در صورت عدم تحقق تیراژ روزانه، محاسبه مانده کار و انتقال اتوماتیک آن به برنامه روز بعد (Roll-Forward).',
      outputs: 'کارت‌های ردیابی نیمه‌ساخته (WIP Cards)، داده‌های محاسبه OEE و لاگ تعمیرات اضطراری PM',
      kpi: 'شاخص OEE بالای ۷۰٪، نرخ ضایعات زیر ۱.۸٪، میانگین زمان توقف تعویض قالب زیر ۳۵ دقیقه',
      color: 'rose',
    },
    {
      id: 'PHASE-FINAL',
      stepNumber: '۰۶',
      code: 'FINAL QC & WAREHOUSE RECEIPT',
      title: '۶. کنترل کیفیت نهایی، صدور خودکار رسید انبار محصول و بسته‌بندی',
      sapEquivalent: 'MIGO 101 (Goods Receipt for Order) / QA32 Inspection Lot Completion',
      actor: 'مهندس کنترل کیفیت نهایی (OQC)، انباردار محصولات نهایی و ترابری',
      inputs: 'قطعات خروجی از مرحله آخر مسیر تولید (Final OP: پوشش رنگ ED یا بسته‌بندی پالت ساپکو)',
      processDescription:
        'با تایید تکمیل مرحله آخر، سیستم به صورت خودکار سند رسمی رسید انبار محصول (`RECEIPT_FINISHED_GOODS`) را با شماره پیگیری یکتا صادر، بارکد پالت را چاپ و موجودی انبار محصول نهایی (`WH-FINISHED`) را افزایش می‌دهد.',
      outputs: 'محصول نهایی آماده تحویل، پالت لیبل‌خورده ساپکو و سند قطعی رسید انبار',
      kpi: 'تحویل به موقع به خودروساز (OTIF > 98%)، رسید ۱۰۰٪ اتوماتیک بدون نیاز به ثبت دستی مجدد',
      color: 'emerald',
    },
  ];

  const selectedPhase = workflowPhases.find(p => p.id === selectedPhaseId) || workflowPhases[1];

  // Print Isolated Architecture Documentation (A4 Landscape)
  const handlePrintDoc = () => {
    const existing = document.getElementById('workflow-doc-print-frame') as HTMLIFrameElement | null;
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'workflow-doc-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const phasesHtml = workflowPhases
      .map(
        p => `
      <div style="border: 1px solid #333; border-radius: 6px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px;">
          <strong style="font-size: 13px;">${p.title}</strong>
          <span style="font-family: monospace; font-size: 11px; color: #1e3a8a;">[${p.sapEquivalent}]</span>
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;"><strong>مسئول و متولی:</strong> ${p.actor}</div>
        <div style="font-size: 11px; margin-bottom: 4px;"><strong>ورودی‌ها (Inputs):</strong> ${p.inputs}</div>
        <div style="font-size: 11px; margin-bottom: 4px;"><strong>شرح فرآیند استاندارد:</strong> ${p.processDescription}</div>
        <div style="font-size: 11px; margin-bottom: 4px;"><strong>خروجی‌ها (Outputs):</strong> ${p.outputs}</div>
        <div style="font-size: 11px; color: #047857;"><strong>شاخص‌های کلیدی عملکرد (KPIs):</strong> ${p.kpi}</div>
      </div>
    `
      )
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>مستند فنی و نمودار جریان کار سیستم برنامه‌ریزی تولید (استاندارد SAP PP)</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 16px; color: #111; direction: rtl; }
          .header { border: 2px solid #111; padding: 12px; border-radius: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          h1 { margin: 0 0 6px 0; font-size: 15px; }
          @media print { @page { size: A4 portrait; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>مستند معماری و جریان فرآیندی برنامه‌ریزی و کنترل تولید قطعات خودرویی (استاندارد SAP PP / MES)</h1>
            <div>شرکت قطعات محوری کوثر — مدیریت سیستم‌ها، برنامه‌ریزی تولید و مهندسی صنایع</div>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <div><strong>کد سند:</strong> SOP-PPC-SAP-001</div>
            <div><strong>استاندارد انطباق:</strong> IATF 16949 / SAP PP-MRP</div>
            <div><strong>ویرایش:</strong> بهار ۱۴۰۴</div>
          </div>
        </div>
        ${phasesHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* ==================================================================== */}
      {/* HEADER                                                               */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  مستند فنی و نمودار جریان کار (Workflow) سیستم برنامه‌ریزی تولید بر اساس استانداردهای جهانی (SAP PP / MES)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                  انطباق کامل با الگوهای SAP PP، Odoo MRP و IATF 16949
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                توصیف چرخه کامل بسته تولید در صنایع قطعه‌سازی خودرو: از دریافت سفارش مشتری $\leftarrow$ انفجار مواد درختی (BOM) $\leftarrow$ زمان‌بندی پله‌ای عملیات (Routing) $\leftarrow$ رهگیری برخط موجودی نیمه‌ساخته (WIP) $\leftarrow$ صدور خودکار رسید محصول نهایی در انبار.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDoc}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>چاپ رسمی مستند فنی (A4)</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { id: 'WORKFLOW' as const, label: '۱. دیاگرام تعاملی ۶ مرحله‌ای جریان کار (Interactive Flow)' },
            { id: 'SAP_PP_COMPARISON' as const, label: '۲. جدول تطبیقی با استاندارد و کدهای ترانزکشن SAP PP' },
            { id: 'DOCUMENTATION_SPEC' as const, label: '۳. شرح استاندارد عملیاتی (SOP) و چک‌لیست فرآیندی' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStandardTab(tab.id)}
              className={`p-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                activeStandardTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: INTERACTIVE 6-STEP WORKFLOW DIAGRAM                            */}
      {/* ==================================================================== */}
      {activeStandardTab === 'WORKFLOW' && (
        <div className="space-y-6">
          {/* Visual Step-by-Step Pipeline (Horizontal cards with arrows) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>دیاگرام جریان داده و اسناد در زنجیره بسته برنامه‌ریزی و اجرای تولید</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-stretch">
              {workflowPhases.map((phase, idx) => {
                const isSelected = selectedPhaseId === phase.id;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setSelectedPhaseId(phase.id)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          گام {phase.stepNumber}
                        </span>
                        <span className="text-[10px] font-mono opacity-80">{phase.code}</span>
                      </div>
                      <div className="font-bold text-xs leading-snug">{phase.title}</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/50 text-[10px] opacity-80 font-mono">
                      {phase.sapEquivalent.split('/')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deep-Dive Inspection Card for the Selected Phase */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-900 text-amber-400 ml-2">
                  گام {selectedPhase.stepNumber} • {selectedPhase.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 inline-block mt-1">{selectedPhase.title}</h3>
                <div className="text-xs font-mono text-indigo-700 font-bold mt-1">
                  معادل استاندارد در SAP: {selectedPhase.sapEquivalent}
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                <strong>واحد سازمانی مجری:</strong> {selectedPhase.actor}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Inputs */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-700" />
                  <span>ورودی‌های فرآیند (Process Inputs):</span>
                </span>
                <p className="text-blue-950 leading-relaxed">{selectedPhase.inputs}</p>
              </div>

              {/* Outputs */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>خروجی‌های فرآیند (Process Deliverables / Outputs):</span>
                </span>
                <p className="text-emerald-950 leading-relaxed">{selectedPhase.outputs}</p>
              </div>
            </div>

            {/* Core Description */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block">شرح تفصیلی عملیات و منطق محاسباتی:</span>
              <p className="text-slate-700 leading-relaxed text-sm">{selectedPhase.processDescription}</p>
            </div>

            {/* KPIs */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between text-xs text-amber-950 flex-wrap gap-2">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>شاخص‌های کلیدی عملکرد این گام (KPIs):</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{selectedPhase.kpi}</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SAP PP / ERP TRANSFORMATION COMPARISON TABLE                  */}
      {/* ==================================================================== */}
      {activeStandardTab === 'SAP_PP_COMPARISON' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              جدول تطبیقی فرآیندهای برنامه‌ریزی تولید کوثر با کدهای ترانزکشن و استانداردهای SAP S/4HANA PP
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              نگاشت دقیق اجزای نرم‌افزار به ماژول‌های Production Planning (PP)، Material Requirements Planning (MRP) و Shop Floor Control (SFC)
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-3">گام فرآیند</th>
                  <th className="py-3 px-3">عنوان عملیات در صنعت</th>
                  <th className="py-3 px-3 font-mono">کد ترانزکشن در SAP PP</th>
                  <th className="py-3 px-3">عملکرد معادل در سیستم کوثر</th>
                  <th className="py-3 px-3">اسناد و کدهای پایگاه داده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۱</td>
                  <td className="py-3 px-3 font-bold text-slate-900">دریافت و تحلیل تقاضای ساپکو</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">VA01 / MD61 (PIR)</td>
                  <td className="py-3 px-3 text-slate-700">ماژول ثبت سفارش مشتری و پیش‌بینی تقاضای ساپکو بر اساس کد قرارداد</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">CustomerOrder (SO-1404-...)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۲</td>
                  <td className="py-3 px-3 font-bold text-slate-900">انفجار درخت محصول (BOM)</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">CS01 / CS03 (BOM Explosion)</td>
                  <td className="py-3 px-3 text-slate-700">ساختار سلسله‌مراتبی بازگشتی (Recursive Tree) قطعات اصلی و زیرمجموعه‌ها</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">ProductStructure / BOM Nodes</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۳</td>
                  <td className="py-3 px-3 font-bold text-slate-900">محاسبه نیاز خالص مواد (MRP)</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">MD01N / MD04 (Stock/Req)</td>
                  <td className="py-3 px-3 text-slate-700">موازنه موجودی فیزیکی و امانی رول ورق و پیش‌بینی کسری بر حسب کیلوگرم</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">NetRequirements / PlannedOrder</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۴</td>
                  <td className="py-3 px-3 font-bold text-slate-900">زمان‌بندی پله‌ای عملیات (Routing)</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">CA01 / CM01 (Capacity CRP)</td>
                  <td className="py-3 px-3 text-slate-700">ماتریس زمان‌بندی روزهای مختلف هر OP (برش، بلنک، خم، جوش) و قالب‌های مشترک</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">ScheduledOpStep (OP10..OP50)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۵</td>
                  <td className="py-3 px-3 font-bold text-slate-900">صدور حواله ورق به خط تولید</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">MIGO 261 (Goods Issue)</td>
                  <td className="py-3 px-3 text-slate-700">تخصیص کلاف ورق از انبار به مرحله اول (OP10) همراه با ثبت وزن و لات‌نامبر</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">ISSUE_RAW_MATERIAL</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۶</td>
                  <td className="py-3 px-3 font-bold text-slate-900">ثبت کارکرد خط و رهگیری WIP</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">CO11N (Order Confirmation)</td>
                  <td className="py-3 px-3 text-slate-700">محاسبه برخط بافر بین مراحل، انتقال مانده کار روزانه به روز بعد (Roll-Forward)</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">wipBufferAfterOp / ROLLED_FORWARD</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold">۰۷</td>
                  <td className="py-3 px-3 font-bold text-slate-900">رسید خودکار انبار محصول نهایی</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">MIGO 101 (Auto Goods Receipt)</td>
                  <td className="py-3 px-3 text-slate-700">با تکمیل آخرین مرحله (Final OP)، سند رسید انبار به صورت اتوماتیک صادر می‌شود</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">RECEIPT_FINISHED_GOODS (RCV-FG-...)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: STANDARD OPERATING PROCEDURE (SOP) & CHECKLIST                */}
      {/* ==================================================================== */}
      {activeStandardTab === 'DOCUMENTATION_SPEC' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              دستورالعمل استاندارد کاری (Standard Operating Procedure - SOP): مدیریت فرآیند برنامه‌ریزی و اجرای تولید
            </h3>
            <p className="text-slate-500 mt-0.5">
              چک‌لیست الزامی تضمین کیفیت IATF 16949 جهت جلوگیری از ایجاد گلوگاه‌های خط و کاهش پرتی مواد اولیه
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-slate-700">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <span className="font-bold text-slate-900 block text-sm">
                ۱. قوانین انفجار مواد (BOM) و موازنه کلاف ساپکو:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>ثبت ضریب مصرف استاندارد قطعه بر حسب کیلوگرم به ازای هر ضرب با در نظر گرفتن پرتی اسکلت بلنک.</li>
                <li>تطابق گرید متریال (DC01A, DC04, ST12, ST37) با شناسنامه فنی نقشه ساپکو.</li>
                <li>اولویت تخصیص کلاف‌های امانی با موعد سررسید قرارداد نزدیک‌تر جهت جلوگیری از دیرکرد سهمیه.</li>
                <li>بررسی ضخامت و عرض استاندارد ورق قبل از صدور دستور برش در گیوتین.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <span className="font-bold text-slate-900 block text-sm">
                ۲. قوانین زمان‌بندی عملیات و مانده کار (Roll-Forward):
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>عدم زمان‌بندی مرحله بعدی قبل از تکمیل تیراژ بافر حداقل در مرحله قبلی (Buffer Min Limit).</li>
                <li>در صورت توقف اضطراری بیش از ۶۰ دقیقه، انتقال خودکار باقیمانده کار به شیفت یا روز بعدی.</li>
                <li>تطابق برنامه روزانه خط با تقویم سرویس و نگهداری پیشگیرانه (PM) ماشین‌آلات.</li>
                <li>ثبت همزمان تولید قطعات چپ و راست در قالب‌های مشترک دوتایی (Dual-Cavity Molds).</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
