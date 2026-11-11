import React from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, Layers, Calendar, User, Cpu } from 'lucide-react';
import { toPersianDigits, formatNumber } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';

export interface DrillDownData {
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string };
  fields: { label: string; value: string | number | React.ReactNode; isMono?: boolean; isHighlight?: boolean }[];
  detailsList?: { title: string; lines: { label: string; value: string | number }[] }[];
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData | null;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{data.title}</h3>
                {data.badge && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${data.badge.color}`}>
                    {data.badge.text}
                  </span>
                )}
              </div>
              {data.subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{data.subtitle}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.fields.map((f, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs ${
                f.isHighlight
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="text-[11px] text-slate-400 mb-1">{f.label}</div>
              <div
                className={`font-bold ${
                  f.isMono ? 'font-mono' : ''
                } ${f.isHighlight ? 'text-amber-400 text-sm' : 'text-slate-900'}`}
              >
                {typeof f.value === 'number' ? formatNumber(f.value) : f.value}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Details List if present */}
        {data.detailsList && data.detailsList.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700">اقلام و مراحل سند مبدأ:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {data.detailsList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1"
                >
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-[11px]">
                    {item.lines.map((l, li) => (
                      <span key={li}>
                        {l.label}:{' '}
                        <strong className="text-slate-900 font-mono">
                          {typeof l.value === 'number' ? formatNumber(l.value) : l.value}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-bold transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
