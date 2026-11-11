import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, HelpCircle } from 'lucide-react';

interface FormulaTooltipProps {
  title: string;
  formula: string;
  description?: string;
  badgeColor?: string;
  variables?: {
    name?: string;
    symbol?: string;
    meaning?: string;
    description?: string;
    value?: string | number;
  }[];
  interpretation?: string;
  note?: string;
  variant?: 'light' | 'dark';
}

export const FormulaTooltip: React.FC<FormulaTooltipProps> = ({
  title,
  formula,
  description,
  variables,
  interpretation,
  note,
  variant = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openAbove: boolean }>({
    top: 0,
    left: 0,
    openAbove: false,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 320;
    const popupEstimatedHeight = 250;
    const margin = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < popupEstimatedHeight && spaceAbove > spaceBelow;

    const top = openAbove ? Math.max(margin, rect.top - 8) : Math.min(window.innerHeight - margin, rect.bottom + 8);
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    if (left < margin) left = margin;
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }

    setCoords({ top, left, openAbove });
  }, []);

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

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => {
          updatePosition();
          setIsOpen(true);
        }}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-md transition-colors focus:outline-none ${
          variant === 'dark'
            ? 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800'
            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
        aria-label={`فرمول محاسبه: ${title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
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
              width: '320px',
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 9999,
            }}
            className="p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-right animate-in fade-in duration-150 font-sans"
            dir="rtl"
          >
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs mb-2 pb-1.5 border-b border-slate-800">
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>منطق محاسبه: {title}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 mb-2.5 font-mono text-[11px] text-amber-300 text-center leading-relaxed" dir="ltr">
              {formula}
            </div>

            {description && (
              <div className="text-[11px] text-slate-300 leading-relaxed mb-2">
                {description}
              </div>
            )}

            {variables && variables.length > 0 && (
              <div className="space-y-1.5 mb-2">
                <div className="text-[10px] font-bold text-slate-400">اجزای فرمول:</div>
                {variables.map((v, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-[11px] bg-slate-800/60 px-2 py-1 rounded">
                    <div>
                      <span className="font-mono font-bold text-indigo-300 ml-1">
                        {v.name || v.symbol}:
                      </span>
                      <span className="text-slate-300">{v.description || v.meaning}</span>
                    </div>
                    {v.value !== undefined && (
                      <span className="font-mono font-bold text-emerald-400 shrink-0">{v.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(interpretation || note) && (
              <div className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-800">
                {interpretation || note}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
