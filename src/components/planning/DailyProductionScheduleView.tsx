import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cpu,
  Building,
  User,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

interface DailyScheduleItem {
  id: string;
  hallId: string;
  hallName: string;
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  shiftName: string;
  machineCode: string;
  machineName: string;
  dieCode: string;
  dieName: string;
  partCode: string;
  partName: string;
  carModel: string;
  plannedQuantity: number;
  actualProducedQuantity: number;
  scrapQuantity: number;
  operatorName: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SCHEDULED' | 'STOPPED';
  stopReason?: string;
}

const INITIAL_SCHEDULE: DailyScheduleItem[] = [
  {
    id: 'SCH-01',
    hallId: 'HALL-HEAVY-PRESS',
    hallName: 'سالن پرس سنگین - خط ۱',
    shift: 'MORNING',
    shiftName: 'شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)',
    machineCode: 'PRS-800-01',
    machineName: 'پرس هیدرولیک کشش ۸۰۰ تن هیدرولیکو',
    dieCode: 'DIE-206-SEC-OP20',
    dieName: 'قالب کشش پوسته رام زیر رادیاتور ۲۰۶',
    partCode: 'SAPCO-ASSY-206-001',
    partName: 'مجموعه براکت رام زیر رادیاتور پژو ۲۰۶',
    carModel: 'پژو ۲۰۶',
    plannedQuantity: 1200,
    actualProducedQuantity: 850,
    scrapQuantity: 6,
    operatorName: 'علی رضایی (کد ۴۱۰۲)',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
  },
  {
    id: 'SCH-02',
    hallId: 'HALL-HEAVY-PRESS',
    hallName: 'سالن پرس سنگین - خط ۲',
    shift: 'MORNING',
    shiftName: 'شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)',
    machineCode: 'PRS-400-01',
    machineName: 'پرس مکانیکی ضربه‌ای ۴۰۰ تن شولر (C-Frame)',
    dieCode: 'DIE-TAR-BUM-OP10',
    dieName: 'قالب فرمینگ دیاق سپر تارا',
    partCode: 'SAPCO-ASSY-TAR-002',
    partName: 'مجموعه دیاق سپر جلو تارا با براکت ضربه‌گیر',
    carModel: 'تارا',
    plannedQuantity: 1400,
    actualProducedQuantity: 1100,
    scrapQuantity: 8,
    operatorName: 'استاد احمدی (کد ۴۰۱۱)',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
  },
  {
    id: 'SCH-03',
    hallId: 'HALL-MED-PRESS',
    hallName: 'سالن پرس متوسط - خط ۳',
    shift: 'MORNING',
    shiftName: 'شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)',
    machineCode: 'PRS-250-01',
    machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن آیدین',
    dieCode: 'DIE-206-PNL-OP30',
    dieName: 'قالب برش و سوراخکاری تقویتی گلگیر ۲۰۶',
    partCode: 'SAPCO-PNL-206-003',
    partName: 'تقویتی گلگیر جلو چپ ۲۰۶',
    carModel: 'پژو ۲۰۶',
    plannedQuantity: 950,
    actualProducedQuantity: 950,
    scrapQuantity: 4,
    operatorName: 'رضا کریمی (کد ۴۲۰۵)',
    priority: 'NORMAL',
    status: 'COMPLETED',
  },
  {
    id: 'SCH-04',
    hallId: 'HALL-HEAVY-PRESS',
    hallName: 'سالن پرس سنگین - خط ۱',
    shift: 'EVENING',
    shiftName: 'شیفت عصر (۱۵:۰۰ - ۲۳:۰۰)',
    machineCode: 'PRS-800-01',
    machineName: 'پرس هیدرولیک کشش ۸۰۰ تن هیدرولیکو',
    dieCode: 'DIE-SHH-UND-OP20',
    dieName: 'قالب فرمینگ سینی زیر موتور شاهین',
    partCode: 'SAPCO-ASSY-SHH-004',
    partName: 'سینی محافظ فلزی زیر موتور شاهین',
    carModel: 'شاهین سایپا',
    plannedQuantity: 1000,
    actualProducedQuantity: 0,
    scrapQuantity: 0,
    operatorName: 'مهندس قنبری (کد ۴۰۸۸)',
    priority: 'HIGH',
    status: 'SCHEDULED',
  },
  {
    id: 'SCH-05',
    hallId: 'HALL-BLANKING',
    hallName: 'سالن بلنکینگ و برشکاری',
    shift: 'MORNING',
    shiftName: 'شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)',
    machineCode: 'SLT-125-01',
    machineName: 'خط نواربری و رول‌بازکن اسلیتر ۱۲۵۰ میلیمتر',
    dieCode: 'BLANK-SHEAR-01',
    dieName: 'تیغه برش طولی کویل DC04',
    partCode: 'SAPCO-COIL-DC04-0.8',
    partName: 'شیت ورق روغنی ۰.۸ میلیمتر ساپکو',
    carModel: 'مشترک',
    plannedQuantity: 4500,
    actualProducedQuantity: 3200,
    scrapQuantity: 12,
    operatorName: 'محسن زمانی (کد ۴۱۰۸)',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
  },
  {
    id: 'SCH-06',
    hallId: 'HALL-WELDING',
    hallName: 'سالن جوشکاری و مجموعه‌سازی',
    shift: 'MORNING',
    shiftName: 'شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)',
    machineCode: 'WLD-SPOT-02',
    machineName: 'دستگاه جوش نقطه‌ای مقاومتی ۶۳ کیلوولت‌آمپر',
    dieCode: 'FX-206-WELD-02',
    dieName: 'فیکسچر مونتاژ براکت رام',
    partCode: 'SAPCO-ASSY-206-001',
    partName: 'مجموعه براکت رام زیر رادیاتور پژو ۲۰۶',
    carModel: 'پژو ۲۰۶',
    plannedQuantity: 1100,
    actualProducedQuantity: 700,
    scrapQuantity: 3,
    operatorName: 'جواد علوی (کد ۴۱۵۰)',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
  },
];

export const DailyProductionScheduleView: React.FC = () => {
  const [selectedHall, setSelectedHall] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [scheduleDate, setScheduleDate] = useState<string>(() => formatToJalali(new Date()));
  const [items, setItems] = useState<DailyScheduleItem[]>(INITIAL_SCHEDULE);

  const filteredItems = items.filter(item => {
    if (selectedHall !== 'ALL' && item.hallId !== selectedHall) return false;
    if (selectedShift !== 'ALL' && item.shift !== selectedShift) return false;
    return true;
  });

  const totalPlanned = filteredItems.reduce((acc, i) => acc + i.plannedQuantity, 0);
  const totalProduced = filteredItems.reduce((acc, i) => acc + i.actualProducedQuantity, 0);
  const achievementRate = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Banner (Screen Only) */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                برنامه روزانه شرکت و دیسپچ سالن‌های تولید (Daily Factory Dispatch Schedule)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توزیع متوازن دستور کارهای مصوب به تفکیک سالن، خطوط پرس، شیفت‌های کاری، قالب‌های مستقر و اپراتورهای مسئول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>چاپ رسمی برنامه روزانه سالن</span>
            </button>
          </div>
        </div>

        {/* Filter and Date Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hall Selector */}
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Building className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-slate-500 font-medium">تفکیک سالن:</span>
              <select
                value={selectedHall}
                onChange={e => setSelectedHall(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه سالن‌های کارخانه ({toPersianDigits(items.length)} دستور)</option>
                <option value="HALL-HEAVY-PRESS">سالن پرس سنگین (۸۰۰ و ۴۰۰ تن)</option>
                <option value="HALL-MED-PRESS">سالن پرس متوسط (۲۵۰ تن)</option>
                <option value="HALL-BLANKING">سالن بلنکینگ و برشکاری</option>
                <option value="HALL-WELDING">سالن جوشکاری و مجموعه‌سازی</option>
              </select>
            </div>

            {/* Shift Selector */}
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">شیفت:</span>
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه شیفت‌ها</option>
                <option value="MORNING">شیفت صبح (۰۷:۰۰ - ۱۵:۰۰)</option>
                <option value="EVENING">شیفت عصر (۱۵:۰۰ - ۲۳:۰۰)</option>
                <option value="NIGHT">شیفت شب (۲۳:۰۰ - ۰۷:۰۰)</option>
              </select>
            </div>

            {/* Quick Hall Chips */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'ALL', label: 'همه سالن‌ها' },
                { id: 'HALL-HEAVY-PRESS', label: 'پرس سنگین' },
                { id: 'HALL-MED-PRESS', label: 'پرس متوسط' },
                { id: 'HALL-BLANKING', label: 'برشکاری' },
                { id: 'HALL-WELDING', label: 'جوشکاری' },
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHall(h.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                    selectedHall === h.id
                      ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Date Display via JalaliDatePicker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 shrink-0">تاریخ برنامه:</span>
            <JalaliDatePicker
              value={scheduleDate}
              onChange={val => setScheduleDate(val)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Main KPI Summary (Screen Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs no-print">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">کل تیراژ مصوب برنامه:</span>
          <span className="text-lg font-extrabold text-slate-900 font-mono mt-0.5 block">
            {formatNumber(totalPlanned)} عدد
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 shadow-2xs text-emerald-900">
          <span className="text-[11px] text-emerald-700 block">تولید واقعی تا این لحظه:</span>
          <span className="text-lg font-extrabold text-emerald-800 font-mono mt-0.5 block">
            {formatNumber(totalProduced)} عدد
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200/90 shadow-2xs text-indigo-900">
          <span className="text-[11px] text-indigo-700 block">درصد تحقق برنامه شیفت:</span>
          <span className="text-lg font-extrabold text-indigo-900 font-mono mt-0.5 block">
            {toPersianDigits(achievementRate)}%
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 shadow-2xs text-amber-900">
          <span className="text-[11px] text-amber-700 block">پرس‌ها و خطوط درگیر:</span>
          <span className="text-lg font-extrabold text-amber-800 font-mono mt-0.5 block">
            {toPersianDigits(filteredItems.length)} خط تولید
          </span>
        </div>
      </div>

      {/* Isolated Official Printable Sheet Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden printable-area">
        {/* Printable Letterhead (Shown in Print and on Screen) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block">
              شرکت تولیدی و صنعتی قطعات پرسی خودرو - زنجیره ساپکو (KPIMS)
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-950 mt-0.5">
              برنامه روزانه تولید و دستور کار شیفت سالن
            </h1>
            <span className="text-xs font-semibold text-orange-700">
              سالن: {selectedHall === 'ALL' ? 'تمامی سالن‌های تولید کارخانه' : items.find(i => i.hallId === selectedHall)?.hallName}
            </span>
          </div>

          <div className="text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono space-y-0.5">
            <div><span className="text-slate-500 font-sans">تاریخ اجرا:</span> <strong className="text-slate-900">{scheduleDate}</strong></div>
            <div><span className="text-slate-500 font-sans">شیفت کاری:</span> <strong className="text-slate-900">{selectedShift === 'ALL' ? 'کل شبانه‌روز (۳ شیفت)' : selectedShift}</strong></div>
            <div><span className="text-slate-500 font-sans">کد سند:</span> <strong>PLN-DISP-1403-24</strong></div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-3">ردیف</th>
                <th className="py-3 px-3">سالن / خط</th>
                <th className="py-3 px-3">دستگاه پرس</th>
                <th className="py-3 px-3">قالب مستقر</th>
                <th className="py-3 px-3">کد و نام قطعه</th>
                <th className="py-3 px-3">خودرو</th>
                <th className="py-3 px-3 text-center">تیراژ برنامه</th>
                <th className="py-3 px-3 text-center">تولید واقعی</th>
                <th className="py-3 px-3 text-center">ضایعات</th>
                <th className="py-3 px-3">اپراتور مسئول</th>
                <th className="py-3 px-3 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {filteredItems.map((item, idx) => {
                const percent = Math.min(100, Math.round((item.actualProducedQuantity / item.plannedQuantity) * 100));
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-bold text-slate-400">{toPersianDigits(idx + 1)}</td>
                    <td className="py-3 px-3 font-sans text-slate-800 font-medium">
                      {item.hallName}
                      <span className="text-[10px] text-slate-400 block font-mono">{item.shiftName}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.machineCode}
                      <span className="text-[10px] text-slate-500 block font-sans truncate max-w-[140px]">{item.machineName}</span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-slate-800">{item.dieCode}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{item.dieName}</span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-slate-900 block">{item.partName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{item.partCode}</span>
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-700">{item.carModel}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                      {formatNumber(item.plannedQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-emerald-700 font-mono">
                      {formatNumber(item.actualProducedQuantity)}
                      <span className="text-[10px] text-slate-400 block">({toPersianDigits(percent)}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center text-rose-600 font-mono font-semibold">
                      {toPersianDigits(item.scrapQuantity)}
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-800">
                      {item.operatorName}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {item.status === 'COMPLETED' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          تکمیل شده ✓
                        </span>
                      ) : item.status === 'IN_PROGRESS' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200 font-bold">
                          در حال تولید
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          برنامه‌ریزی شیفت
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Row for Official Paper Printout */}
        <div className="p-5 border-t border-slate-300 mt-4 grid grid-cols-3 gap-6 text-center text-xs font-sans">
          <div className="space-y-8">
            <span className="text-slate-600 font-semibold block">سرپرست سالن / خط تولید:</span>
            <span className="border-b border-dashed border-slate-400 block w-32 mx-auto"></span>
            <span className="text-[10px] text-slate-400 block">امضاء و تایید شیفت</span>
          </div>
          <div className="space-y-8">
            <span className="text-slate-600 font-semibold block">رئیس برنامه‌ریزی و کنترل تولید:</span>
            <span className="border-b border-dashed border-slate-400 block w-32 mx-auto"></span>
            <span className="text-[10px] text-slate-400 block">مهندس حسینی</span>
          </div>
          <div className="space-y-8">
            <span className="text-slate-600 font-semibold block">مدیر کارخانه و تولید:</span>
            <span className="border-b border-dashed border-slate-400 block w-32 mx-auto"></span>
            <span className="text-[10px] text-slate-400 block">تصویب نهایی دیسپچ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
