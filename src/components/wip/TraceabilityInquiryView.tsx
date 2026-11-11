import React, { useState } from 'react';
import {
  Search,
  Tag,
  QrCode,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  User,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Calendar,
  Box,
} from 'lucide-react';
import { Part, Machine, DieMold, Operator } from '../../types/inventory';
import { toPersianDigits, formatNumber } from '../../utils/formatters';
import { TraceabilityTagModal } from './TraceabilityTagModal';

interface TraceabilityInquiryViewProps {
  parts: Part[];
  machines: Machine[];
  dies?: DieMold[];
  operators?: Operator[];
}

export const TraceabilityInquiryView: React.FC<TraceabilityInquiryViewProps> = ({
  parts,
  machines,
  dies = [],
  operators = [],
}) => {
  const [trackingQuery, setTrackingQuery] = useState('TRC-206-OP20-9841');
  const [searchedRecord, setSearchedRecord] = useState<any>({
    tagNumber: 'TRC-206-OP20-9841',
    lotNumber: 'LOT-1403-11-206B',
    barcodeValue: '206-OP20-9841-800T',
    partCode: 'SAPCO-ASSY-206-001',
    partName: 'مجموعه کامل براکت رام زیر رادیاتور پژو ۲۰۶ با پوشش ED',
    carModel: 'پژو ۲۰۶ و ۲۰۷',
    manufacturingOrderNumber: 'MO-1403-1082',
    customerName: 'ایران خودرو (ساپکو)',
    contractNumber: 'SAP-CNT-1403-991',
    rawMaterial: {
      coilNumber: 'MOB-2024-DC04-891',
      receiptNumber: 'SAP-RC-98421',
      materialGrade: 'DC04 (کشش عمیق)',
      thicknessMm: 0.8,
      heatNumber: 'HT-99812-MOB',
    },
    currentStage: {
      stepCode: 'OP20_FORM',
      stepName: 'کشش عمیق و فرم‌دهی پوسته',
      machineCode: 'PRS-800-01',
      machineName: 'پرس هیدرولیک کشش سنگین ۸۰۰ تن هیدرولیکو',
      dieMoldCode: 'DIE-206-SEC-OP20',
      operatorName: 'علی رضایی (کد ۴۱۰۲)',
      shift: 'صبح (۰۷:۰۰ - ۱۵:۰۰)',
      productionDate: '۱۴۰۳/۰۸/۲۴',
      quantityInContainer: 250,
      unit: 'عدد',
      qcStatus: 'APPROVED',
      qcInspector: 'مهندس رضوی (کنترل کیفیت پای خط)',
      qcTimestamp: '۱۴۰۳/۰۸/۲۴ - ۱۱:۳۰',
    },
    stagesHistory: [
      {
        stepCode: 'OP10_BLANK',
        stepName: 'برشکاری رول و شیت‌کن اتوماتیک',
        machine: 'SLT-125-01',
        die: 'DIE-206-BLANK-01',
        operator: 'استاد احمدی',
        date: '۱۴۰۳/۰۸/۲۳',
        quantity: 260,
        scrap: 2,
        status: 'PASSED',
      },
      {
        stepCode: 'OP20_FORM',
        stepName: 'کشش عمیق پوسته براکت',
        machine: 'PRS-800-01',
        die: 'DIE-206-SEC-OP20',
        operator: 'علی رضایی',
        date: '۱۴۰۳/۰۸/۲۴',
        quantity: 250,
        scrap: 4,
        status: 'CURRENT',
      },
      {
        stepCode: 'OP30_PIERCE',
        stepName: 'پانچ، سوراخکاری و دوربری دقیق',
        machine: 'PRS-400-01',
        die: 'DIE-206-TRIM-OP30',
        operator: 'در انتظار نوبت در سالن',
        date: 'برنامه‌ریزی‌شده فردا',
        quantity: 250,
        scrap: 0,
        status: 'PENDING',
      },
      {
        stepCode: 'OP40_WELD',
        stepName: 'جوش مقاومتی نقطه‌ای و اتصال مهره',
        machine: 'WLD-SPOT-02',
        die: 'فیکسچر جوش FX-206-W',
        operator: 'سالن مجموعه‌سازی',
        date: 'برنامه‌ریزی‌شده',
        quantity: 250,
        scrap: 0,
        status: 'PENDING',
      },
      {
        stepCode: 'OP50_ED_COAT',
        stepName: 'فسفاته، شستشو و رنگ الکتروفورز ED',
        machine: 'LINE-ED-AUTO',
        die: 'هنگر خط رنگ',
        operator: 'سالن رنگ و پوشش',
        date: 'برنامه‌ریزی‌شده',
        quantity: 250,
        scrap: 0,
        status: 'PENDING',
      },
    ],
  });

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingQuery.trim()) return;
    // In mock/engine, updates with query
    setSearchedRecord((prev: any) => ({
      ...prev,
      tagNumber: trackingQuery.toUpperCase().trim(),
      barcodeValue: trackingQuery.toUpperCase().trim(),
    }));
  };

  return (
    <div className="space-y-5">
      {/* Search Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                سامانه شناسایی، ردیابی و استعلام شماره رهگیری قطعات (Traceability & Genealogy)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ردیابی شجره‌نامه کامل قطعه از کلاف فولاد مبارکه ورودی تا آخرین ایستگاه پرسکاری، جوش، رنگ و بسته‌بندی پالت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTagModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              <span>+ صدور کارت شناسایی و ردیابی جدید</span>
            </button>
          </div>
        </div>

        {/* Live Tracking Query Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={trackingQuery}
              onChange={e => setTrackingQuery(e.target.value)}
              placeholder="شماره رهگیری، بارکد لیبل، شماره پالت یا شماره دستور کار (MO) را وارد کنید..."
              className="w-full pr-9 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            استعلام و ردیابی
          </button>
        </form>
      </div>

      {/* Searched Record Details */}
      {searchedRecord && (
        <div className="space-y-4">
          {/* Main Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1 rounded-lg">
                  شناسه رهگیری: {searchedRecord.tagNumber}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {searchedRecord.partName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ مجدد کارت شناسایی (لیبل)</span>
                </button>
              </div>
            </div>

            {/* High-Level Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">کد فنی قطعه و خودرو:</span>
                <span className="font-bold text-slate-900 font-mono">{searchedRecord.partCode}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{searchedRecord.carModel}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">دستور ساخت / مشتری:</span>
                <span className="font-bold text-slate-900 font-mono">{searchedRecord.manufacturingOrderNumber}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{searchedRecord.customerName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">منبع کلاف ورق (Steel Coil):</span>
                <span className="font-bold text-slate-900 font-mono">{searchedRecord.rawMaterial.coilNumber}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  گرید {searchedRecord.rawMaterial.materialGrade} • ذوب {searchedRecord.rawMaterial.heatNumber}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[10px] text-emerald-700 block">تعداد در پالت / وضعیت کیفی:</span>
                <span className="font-extrabold text-base font-mono">
                  {toPersianDigits(searchedRecord.currentStage.quantityInContainer)} {searchedRecord.currentStage.unit}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تایید کیفیت ۱۰۰٪ بازرسی خط
                </span>
              </div>
            </div>

            {/* Stages History Roadmap */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-600" />
                <span>شجره‌نامه و سوابق عبور قطعه از مراحل تولید:</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">کد مرحله</th>
                      <th className="py-2.5 px-3">عنوان اوپراسیون فرآیند</th>
                      <th className="py-2.5 px-3">دستگاه پرس / تجهیز</th>
                      <th className="py-2.5 px-3">قالب / فیکسچر</th>
                      <th className="py-2.5 px-3">اپراتور مسئول</th>
                      <th className="py-2.5 px-3 text-center">تیراژ سالم</th>
                      <th className="py-2.5 px-3 text-center">ضایعات</th>
                      <th className="py-2.5 px-3 text-center">وضعیت مرحله</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {searchedRecord.stagesHistory.map((st: any) => (
                      <tr
                        key={st.stepCode}
                        className={
                          st.status === 'CURRENT'
                            ? 'bg-amber-50/50 font-bold'
                            : st.status === 'PASSED'
                            ? 'hover:bg-slate-50/70'
                            : 'opacity-60 bg-slate-50/30'
                        }
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900">{st.stepCode}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{st.stepName}</td>
                        <td className="py-2.5 px-3 text-slate-800">{st.machine}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans">{st.die}</td>
                        <td className="py-2.5 px-3 font-sans">{st.operator}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                          {st.quantity ? formatNumber(st.quantity) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">
                          {toPersianDigits(st.scrap)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {st.status === 'PASSED' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              انجام شد ✓
                            </span>
                          ) : st.status === 'CURRENT' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200 font-bold animate-pulse">
                              ایستگاه فعال پای خط
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              در صف انتظار
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for generating a new or reprint tag */}
      <TraceabilityTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        parts={parts}
        machines={machines}
        dies={dies}
        operators={operators}
      />
    </div>
  );
};
