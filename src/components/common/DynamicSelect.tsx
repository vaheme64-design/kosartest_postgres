import React, { useState } from 'react';
import { Loader2, AlertCircle, RotateCw, Plus, Check } from 'lucide-react';
import { useMasterData, MasterItemOption } from '../../hooks/useMasterData';

export interface DynamicSelectProps {
  categoryCode: string;
  value: string;
  onChange: (value: string, selectedItem?: MasterItemOption) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showCodeBadge?: boolean;
  allowAddOption?: boolean;
  /**
   * Whether the select value matches the item code (e.g. 'DIE_BREAKDOWN')
   * or the item value string (e.g. 'شکستگی سنبه'). Default is true (uses code).
   */
  valueField?: 'code' | 'value';
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  categoryCode,
  value,
  onChange,
  label,
  placeholder = '-- انتخاب گزینه از اطلاعات پایه --',
  className = '',
  selectClassName = '',
  disabled = false,
  required = false,
  error,
  showCodeBadge = false,
  allowAddOption = true,
  valueField = 'code',
}) => {
  const { data, loading, error: fetchError, refetch, addItem, categoryInfo } = useMasterData(categoryCode);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    const foundItem = data.find(it => (valueField === 'code' ? it.code : it.value) === selectedVal);
    onChange(selectedVal, foundItem);
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmittingNew) return;

    try {
      setIsSubmittingNew(true);
      const generatedCode = `${categoryCode}_${Date.now().toString().slice(-4)}`;
      const success = await addItem(generatedCode, newTitle.trim(), data.length + 1);
      if (success) {
        const valToSelect = valueField === 'code' ? generatedCode : newTitle.trim();
        onChange(valToSelect, { id: 'temp', code: generatedCode, value: newTitle.trim() });
        setNewTitle('');
        setIsAddingNew(false);
      }
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Find currently selected item to show code badge if requested
  const selectedItem = data.find(it => (valueField === 'code' ? it.code : it.value) === value);

  return (
    <div className={`space-y-1 text-right ${className}`} dir="rtl">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            {label}
            {required && <span className="text-rose-500 mr-0.5">*</span>}
          </label>
          <div className="flex items-center gap-1.5 text-[10px]">
            {loading && (
              <span className="text-slate-400 flex items-center gap-1 font-mono">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-500" />
                <span>دیتابیس...</span>
              </span>
            )}
            {categoryInfo?.name && !loading && (
              <span className="text-slate-400 font-normal">({categoryInfo.name})</span>
            )}
            {fetchError && (
              <button
                type="button"
                onClick={() => refetch()}
                className="text-amber-600 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                title="تلاش مجدد جهت بارگذاری از دیتابیس"
              >
                <RotateCw className="w-2.5 h-2.5" />
                <span>تلاش مجدد</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Select Input or Inline Add Form */}
      {isAddingNew ? (
        <form onSubmit={handleSaveNewItem} className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="عنوان گزینه جدید را بنویسید..."
            autoFocus
            disabled={isSubmittingNew}
            className="flex-1 bg-white border border-indigo-400 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmittingNew}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            {isSubmittingNew ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>ثبت</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNew(false)}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs cursor-pointer"
          >
            انصراف
          </button>
        </form>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={handleSelectChange}
            disabled={disabled || loading}
            required={required}
            className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-1 transition cursor-pointer appearance-none ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500'
            } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''} ${selectClassName}`}
          >
            <option value="">{placeholder}</option>
            {data.map(item => {
              const optionValue = valueField === 'code' ? item.code : item.value;
              return (
                <option key={item.id || item.code} value={optionValue}>
                  {item.value} {showCodeBadge ? `(${item.code})` : ''}
                </option>
              );
            })}
          </select>

          {/* Quick Add Button on the Left */}
          {allowAddOption && !disabled && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                title="افزودن گزینه جدید به دیتابیس پایه"
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Item Code Detail or Error feedback */}
      <div className="flex items-center justify-between text-[10px]">
        {error ? (
          <span className="text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </span>
        ) : selectedItem && showCodeBadge ? (
          <span className="font-mono text-slate-400">
            کد سیستمی: <strong className="text-slate-600">{selectedItem.code}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
};
