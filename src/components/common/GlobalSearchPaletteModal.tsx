import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  CornerDownLeft,
  ArrowRight,
  Boxes,
  Layers,
  FileSpreadsheet,
  Cpu,
  Calendar,
  Warehouse,
  Disc,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Zap,
  Clock,
  Filter,
} from 'lucide-react';
import { GlobalSearchHit, GlobalSearchResultGroup, SearchItemType } from '../../types/search';
import { TabKey } from '../Sidebar';
import { InventorySubTab } from '../inventory/InventoryModuleView';

interface GlobalSearchPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabKey, subTab?: InventorySubTab, filterParam?: string) => void;
}

export const GlobalSearchPaletteModal: React.FC<GlobalSearchPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<GlobalSearchResultGroup[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setGroups([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Load initial quick navigation modules
      fetch(`/api/search?q=داشبورد&limit=4`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setGroups(data.groups);
          }
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=8`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setGroups(data.groups);
            setSelectedIndex(0);
          }
        })
        .catch(err => {
          console.error('Search error:', err);
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Flattened items for keyboard navigation based on selected category filter
  const flattenedItems = useMemo(() => {
    const list: GlobalSearchHit[] = [];
    groups.forEach(g => {
      if (activeCategory === 'ALL' || activeCategory === g.type) {
        list.push(...g.items);
      }
    });
    return list;
  }, [groups, activeCategory]);

  const activeItem: GlobalSearchHit | undefined = flattenedItems[selectedIndex] || flattenedItems[0];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItem) {
        handleSelectItem(activeItem);
      }
    }
  };

  const handleSelectItem = (item: GlobalSearchHit) => {
    onClose();
    onNavigate(item.targetTab, item.targetSubTab, item.filterParam);
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIconForType = (type: SearchItemType) => {
    switch (type) {
      case 'part':
      case 'material':
        return Boxes;
      case 'coil':
        return Disc;
      case 'mo':
        return Layers;
      case 'customer_order':
        return Calendar;
      case 'contract':
        return FileSpreadsheet;
      case 'document':
        return Tag;
      case 'machine':
      case 'die':
        return Cpu;
      case 'warehouse':
        return Warehouse;
      default:
        return Zap;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="relative flex items-center border-b border-slate-200 px-4 py-3 bg-slate-50/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="جستجو در تمام کالاها، کویل‌ها، قراردادها، سفارشات، دستور ساخت، اسناد و ماشین‌آلات… (Ctrl+K)"
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0 ml-3" />
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs mr-2">
            ESC
          </kbd>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white overflow-x-auto text-xs">
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setSelectedIndex(0);
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeCategory === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            همه موارد
          </button>
          {[
            { id: 'part', label: 'قطعات و کالا' },
            { id: 'coil', label: 'کویل و لوت' },
            { id: 'mo', label: 'دستورهای ساخت' },
            { id: 'customer_order', label: 'سفارشات مشتری' },
            { id: 'contract', label: 'قراردادها' },
            { id: 'document', label: 'اسناد انبار' },
            { id: 'machine', label: 'ماشین‌آلات' },
            { id: 'module', label: 'ماژول‌ها' },
          ].map(cat => {
            const hasMatches = groups.some(g => g.type === cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : hasMatches
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{cat.label}</span>
                {hasMatches && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-full ${
                      activeCategory === cat.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {groups.find(g => g.type === cat.id)?.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Body: 2 Columns on desktop (Results List + Active Item Preview) */}
        <div className="grid grid-cols-1 md:grid-cols-12 overflow-hidden flex-1 min-h-[360px]">
          {/* Results List */}
          <div
            ref={listRef}
            className="md:col-span-7 overflow-y-auto p-2 divide-y divide-slate-100 max-h-[55vh]"
          >
            {flattenedItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-sm font-medium">هیچ رکوردی منطبق با جستجو یافت نشد</p>
                <p className="text-xs text-slate-400 mt-1">
                  می‌توانید کد کالا، شماره کویل، نام خودرو یا شماره دستور کار را جستجو نمایید.
                </p>
              </div>
            ) : (
              flattenedItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = getIconForType(item.type);
                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 shadow-xs'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs truncate">{item.title}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                                item.badgeColor === 'emerald'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.badgeColor === 'blue'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.badgeColor === 'amber'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.badgeColor === 'purple'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mr-2">
                      <button
                        title="کپی شناسه"
                        onClick={e => handleCopy(item.code, e)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                      >
                        {copiedId === item.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <ArrowRight className="w-4 h-4 text-slate-400 rotate-180" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right/Side Item Live Inspector Pane */}
          <div className="hidden md:flex md:col-span-5 bg-slate-50/70 border-r border-slate-200/80 p-4 flex-col justify-between">
            {activeItem ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                      پیش‌نمایش سریع
                    </span>
                    <button
                      onClick={e => handleCopy(activeItem.code, e)}
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {activeItem.code}
                      {copiedId === activeItem.code ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{activeItem.subtitle}</p>
                </div>

                {activeItem.meta && Object.keys(activeItem.meta).length > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2 text-xs">
                    <div className="text-[11px] font-semibold text-slate-700 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span>مشخصات و متاداده ثبت‌شده</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {Object.entries(activeItem.meta).map(([key, val]) => (
                        <div key={key} className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400 block">{key}</span>
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {val !== null && val !== undefined ? String(val) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/80 text-[11px] text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>عملکرد سریع:</span>
                  </div>
                  <p className="text-slate-600">
                    با کلیک روی گزینه یا زدن دکمه <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">Enter</kbd>، مستقیماً به صفحه مربوطه منتقل می‌شوید.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                یک گزینه را انتخاب کنید
              </div>
            )}

            {activeItem && (
              <button
                onClick={() => handleSelectItem(activeItem)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>باز کردن و مدیریت در سیستم</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Shortcut Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100/80 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-slate-400" /> باز کردن: Enter
            </span>
            <span>جابه‌جایی: ↑ / ↓</span>
            <span>بستن: Esc</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            موتور جستجوی یکپارچه صنعتی KPIMS (الهام‌گرفته از Odoo و Kosar)
          </div>
        </div>
      </div>
    </div>
  );
};
