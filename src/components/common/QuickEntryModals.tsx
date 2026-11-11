import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Truck,
  Building2,
  FileSignature,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export type QuickCreateEntityType = 'CUSTOMER' | 'PART' | 'WAREHOUSE' | 'CONTRACT';

interface QuickEntryModalsProps {
  activeModal: QuickCreateEntityType | null;
  onClose: () => void;
  onCreated: (type: QuickCreateEntityType, createdItem: any) => void;
  defaultPartCategory?: 'RAW_MATERIAL' | 'WIP_PART' | 'FINISHED_GOOD';
  defaultWarehouseType?: 'RAW_MATERIALS' | 'WIP' | 'FINISHED_GOODS' | 'SCRAP';
  defaultCustomerName?: string;
}

export const QuickEntryModals: React.FC<QuickEntryModalsProps> = ({
  activeModal,
  onClose,
  onCreated,
  defaultPartCategory = 'FINISHED_GOOD',
  defaultWarehouseType = 'FINISHED_GOODS',
  defaultCustomerName = 'شرکت ساپکو',
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer fields
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custContractType, setCustContractType] = useState('خرید قطعات پرسکاری و مونتاژی');
  const [custPhone, setCustPhone] = useState('');

  // Part fields
  const [partCode, setPartCode] = useState('');
  const [partName, setPartName] = useState('');
  const [partCategory, setPartCategory] = useState<'RAW_MATERIAL' | 'WIP_PART' | 'FINISHED_GOOD'>(defaultPartCategory);
  const [partUnit, setPartUnit] = useState<'PCS' | 'KG'>(defaultPartCategory === 'RAW_MATERIAL' ? 'KG' : 'PCS');
  const [partWeight, setPartWeight] = useState('1.2');
  const [partGrade, setPartGrade] = useState('DC04');
  const [partThickness, setPartThickness] = useState('0.8');
  const [partCarModel, setPartCarModel] = useState('پژو ۲۰۶ / تارا');

  // Warehouse fields
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whType, setWhType] = useState<'RAW_MATERIALS' | 'WIP' | 'FINISHED_GOODS' | 'SCRAP'>(defaultWarehouseType);
  const [whManager, setWhManager] = useState('');
  const [whLocations, setWhLocations] = useState('LOC-01, LOC-02');

  // Contract fields
  const [cntNumber, setCntNumber] = useState('');
  const [cntTitle, setCntTitle] = useState('');
  const [cntCustomer, setCntCustomer] = useState(defaultCustomerName);
  const [cntWeight, setCntWeight] = useState('50000');
  const [cntGrade, setCntGrade] = useState('DC04');
  const [cntOwnership, setCntOwnership] = useState<'SAPCO_SUPPLIER_OWNED' | 'CUSTOMER_SUPPLIED' | 'COMPANY_OWNED'>('SAPCO_SUPPLIER_OWNED');

  if (!activeModal) return null;

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custCode.trim() || !custName.trim()) {
      setErrorMsg('کد و نام مشتری الزامی است.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: custCode.trim(),
          name: custName.trim(),
          contractType: custContractType.trim() || 'تأمین قطعات خودرویی',
          phone: custPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onCreated('CUSTOMER', data.data);
        setCustCode('');
        setCustName('');
        onClose();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت مشتری جدید');
      }
    } catch {
      setErrorMsg('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partCode.trim() || !partName.trim()) {
      setErrorMsg('کد کالا و نام کالا الزامی است.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: partCode.trim(),
          name: partName.trim(),
          category: partCategory,
          unit: partUnit,
          weightPerUnitKg: partUnit === 'KG' ? 1 : Number(partWeight) || 1,
          materialGrade: partGrade.trim() || undefined,
          thicknessMm: Number(partThickness) || undefined,
          carModel: partCarModel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onCreated('PART', data.data);
        setPartCode('');
        setPartName('');
        onClose();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت کالا / قطعه جدید');
      }
    } catch {
      setErrorMsg('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whCode.trim() || !whName.trim()) {
      setErrorMsg('کد انبار و نام انبار الزامی است.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const locs = whLocations
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: whCode.trim(),
          name: whName.trim(),
          type: whType,
          managerName: whManager.trim() || 'انباردار',
          locations: locs.length > 0 ? locs : ['LOC-01'],
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onCreated('WAREHOUSE', data.data);
        setWhCode('');
        setWhName('');
        onClose();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت انبار جدید');
      }
    } catch {
      setErrorMsg('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cntNumber.trim()) {
      setErrorMsg('شماره قرارداد الزامی است.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/inventory/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: cntNumber.trim(),
          title: cntTitle.trim() || `قرارداد تامین و تحویل قطعات - ${cntCustomer}`,
          customerName: cntCustomer.trim() || 'شرکت ساپکو',
          allocatedWeightKg: Number(cntWeight) || 50000,
          materialGrade: cntGrade.trim() || 'DC04',
          ownership: cntOwnership,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      const createdContract = data.contract || data.data;
      if (data.success && createdContract) {
        onCreated('CONTRACT', createdContract);
        setCntNumber('');
        setCntTitle('');
        onClose();
      } else {
        setErrorMsg(data.error || 'خطا در ثبت قرارداد جدید');
      }
    } catch {
      setErrorMsg('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            {activeModal === 'CUSTOMER' && (
              <>
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع مشتری / خودروساز جدید (درجا)</span>
              </>
            )}
            {activeModal === 'PART' && (
              <>
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع کالا / قطعه / ورق جدید (درجا)</span>
              </>
            )}
            {activeModal === 'WAREHOUSE' && (
              <>
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع انبار جدید (درجا)</span>
              </>
            )}
            {activeModal === 'CONTRACT' && (
              <>
                <FileSignature className="w-4 h-4 text-emerald-600" />
                <span>تعریف سریع قرارداد جدید (درجا)</span>
              </>
            )}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CUSTOMER FORM */}
        {activeModal === 'CUSTOMER' && (
          <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">کد مشتری / کارفرما *</label>
              <input
                type="text"
                required
                placeholder="مثلاً CUST-SAIPA یا CUST-SAPCO"
                value={custCode}
                onChange={e => setCustCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">نام مشتری / خودروساز *</label>
              <input
                type="text"
                required
                placeholder="مثلاً شرکت ساپکو / سازه‌گستر سایپا / بهمن موتور"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">نوع همکاری / قرارداد</label>
              <input
                type="text"
                placeholder="خرید قطعات پرسکاری و مونتاژی"
                value={custContractType}
                onChange={e => setCustContractType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">تلفن / رابط بازرگانی</label>
              <input
                type="text"
                placeholder="۰۲۱-۴۴۹۰..."
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'در حال ثبت...' : 'ثبت و انتخاب مشتری'}</span>
              </button>
            </div>
          </form>
        )}

        {/* PART FORM */}
        {activeModal === 'PART' && (
          <form onSubmit={handleCreatePart} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">کد فنی کالا *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً IKCO-206-BRK09"
                  value={partCode}
                  onChange={e => setPartCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">گروه کالا *</label>
                <select
                  value={partCategory}
                  onChange={e => {
                    const cat = e.target.value as any;
                    setPartCategory(cat);
                    if (cat === 'RAW_MATERIAL') setPartUnit('KG');
                    else setPartUnit('PCS');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  <option value="FINISHED_GOOD">محصول نهایی تحویلی</option>
                  <option value="WIP_PART">نیمه‌ساخته (WIP)</option>
                  <option value="RAW_MATERIAL">ماده اولیه (ورق / پیچ و مهره / لاستیک)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">نام کالا / شرح قطعه یا ورق *</label>
              <input
                type="text"
                required
                placeholder="مثلاً مجموعه رام زیر موتور پژو ۲۰۶ یا ورق رول DC04"
                value={partName}
                onChange={e => setPartName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">واحد سنجش</label>
                <select
                  value={partUnit}
                  onChange={e => setPartUnit(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  <option value="PCS">عدد (PCS)</option>
                  <option value="KG">کیلوگرم (KG)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">وزن واحد (kg)</label>
                <input
                  type="number"
                  step="any"
                  value={partWeight}
                  onChange={e => setPartWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">گرید / ضخامت</label>
                <input
                  type="text"
                  placeholder="ST14 / 1.0"
                  value={partGrade}
                  onChange={e => setPartGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">خودرو / پروژه مرتبط</label>
              <input
                type="text"
                placeholder="مثلاً پژو ۲۰۶، تارا، شاهین، کوییک"
                value={partCarModel}
                onChange={e => setPartCarModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'در حال ثبت...' : 'ثبت و انتخاب کالا'}</span>
              </button>
            </div>
          </form>
        )}

        {/* WAREHOUSE FORM */}
        {activeModal === 'WAREHOUSE' && (
          <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">کد انبار *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً WH-FG-02"
                  value={whCode}
                  onChange={e => setWhCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">نوع انبار *</label>
                <select
                  value={whType}
                  onChange={e => setWhType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  <option value="FINISHED_GOODS">انبار محصول نهایی</option>
                  <option value="RAW_MATERIALS">انبار مواد اولیه و ورق</option>
                  <option value="WIP">انبار پای کار سالن (WIP)</option>
                  <option value="SCRAP">انبار ضایعات</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">نام انبار *</label>
              <input
                type="text"
                required
                placeholder="مثلاً انبار محصولات نهایی تحویلی به ساپکو و سایپا"
                value={whName}
                onChange={e => setWhName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">مسئول انبار</label>
                <input
                  type="text"
                  placeholder="نام سرپرست انبار"
                  value={whManager}
                  onChange={e => setWhManager(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">جایگاه‌ها (با کاما)</label>
                <input
                  type="text"
                  placeholder="LOC-01, LOC-02"
                  value={whLocations}
                  onChange={e => setWhLocations(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'در حال ثبت...' : 'ثبت و انتخاب انبار'}</span>
              </button>
            </div>
          </form>
        )}

        {/* CONTRACT FORM */}
        {activeModal === 'CONTRACT' && (
          <form onSubmit={handleCreateContract} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">شماره قرارداد *</label>
              <input
                type="text"
                required
                placeholder="مثلاً CNT-SAPCO-1404-01 یا CNT-SAIPA-202"
                value={cntNumber}
                onChange={e => setCntNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">نام مشتری / طرف قرارداد *</label>
              <input
                type="text"
                required
                placeholder="شرکت ساپکو / سازه‌گستر سایپا"
                value={cntCustomer}
                onChange={e => setCntCustomer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">عنوان قرارداد</label>
              <input
                type="text"
                placeholder="تأمین ورق و تحویل قطعات پرسی بدنه"
                value={cntTitle}
                onChange={e => setCntTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">سهمیه وزنی (کیلوگرم)</label>
                <input
                  type="number"
                  value={cntWeight}
                  onChange={e => setCntWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">گرید ورق</label>
                <input
                  type="text"
                  value={cntGrade}
                  onChange={e => setCntGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'در حال ثبت...' : 'ثبت و انتخاب قرارداد'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
