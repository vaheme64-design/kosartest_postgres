import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Boxes,
  Hammer,
  GitBranch,
  Cpu,
  FileCheck2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wrench,
  CalendarDays,
  BarChart3,
  Printer,
  Compass,
  Layers,
} from 'lucide-react';
import { TabKey, SubModuleNavParams } from '../Sidebar';
import { InventorySubTab } from '../inventory/InventoryModuleView';

export interface ContextualShortcutItem {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface ContextualActionMenuProps {
  activeTab: TabKey;
  onNavigate: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onSubModuleNavigate: (tab: TabKey, navParams?: SubModuleNavParams) => void;
  onOpenNewVoucher: (type: string, partId?: string) => void;
}

const TAB_CONTEXT_LABELS: Record<TabKey, string> = {
  dashboard: 'پیشخوان و دستور کار',
  master_data: 'اطلاعات پایه و BOM',
  contracts: 'قراردادها و سفارشات',
  inventory: 'انبار و رول ورق',
  planning: 'برنامه‌ریزی و MRP',
  production: 'خط تولید و OP',
  wip: 'موجودی پای خط (WIP)',
  machines: 'ماشین‌آلات و نت',
  sapco: 'سهمیه و رول ساپکو',
  reports: 'گزارش‌ها و OEE',
  settings: 'تنظیمات سیستم',
};

export const ContextualActionMenu: React.FC<ContextualActionMenuProps> = ({
  activeTab,
  onNavigate,
  onSubModuleNavigate,
  onOpenNewVoucher,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dispatchContextualEvent = (actionType: string) => {
    window.dispatchEvent(
      new CustomEvent('kpims:contextual-action', { detail: { actionType } })
    );
  };

  const getShortcutsForTab = (): ContextualShortcutItem[] => {
    switch (activeTab) {
      case 'master_data':
        return [
          {
            id: 'md-add-part',
            label: 'تعریف قطعه / کالا جدید (Add Part)',
            subtitle: 'ثبت کد فنی، وزن، گرید ورق و ضخامت در اطلاعات پایه',
            icon: Boxes,
            onClick: () => {
              onNavigate('master_data');
              setTimeout(() => dispatchContextualEvent('OPEN_ADD_PART'), 60);
            },
          },
          {
            id: 'md-add-routing',
            label: 'تعریف مسیر تولید و OP جدید',
            subtitle: 'اتصال توالی ایستگاه‌ها (OP10، OP20...)، پرس و قالب به قطعه',
            icon: GitBranch,
            onClick: () => {
              onNavigate('master_data');
              setTimeout(() => dispatchContextualEvent('OPEN_ADD_ROUTING'), 60);
            },
          },
          {
            id: 'md-add-die',
            label: 'تعریف قالب جدید (متصل به قطعه)',
            subtitle: 'ثبت سنبه/ماتریس و همبستگی مستقیم با قطعه تولیدی',
            icon: Layers,
            onClick: () => {
              onSubModuleNavigate('machines', { machineSubTab: 'dies' });
            },
          },
          {
            id: 'md-issue-mo',
            label: 'صدور دستور تولید از کاتالوگ کالا',
            subtitle: 'ایجاد دستور ساخت (MO) بر اساس BOM و مسیر تولید قطعه',
            icon: Hammer,
            onClick: () => {
              onNavigate('dashboard');
              setTimeout(() => dispatchContextualEvent('OPEN_CREATE_MO'), 80);
            },
          },
        ];

      case 'production':
      case 'wip':
        return [
          {
            id: 'prod-create-voucher',
            label: 'ثبت قبض کارگاه (Create Voucher)',
            subtitle: 'ثبت تولید سالم، ضایعات ایستگاه یا انتقال بین مراحل',
            icon: FileCheck2,
            onClick: () => {
              onSubModuleNavigate('production', { productionViewMode: 'VOUCHERS' });
              onOpenNewVoucher('PRODUCTION_OUTPUT');
            },
          },
          {
            id: 'prod-create-mo',
            label: 'صدور دستور تولید جدید (MO)',
            subtitle: 'انتخاب کالا و بارگذاری خودکار OPها و ورق مصرفی',
            icon: Plus,
            onClick: () => {
              onNavigate('dashboard');
              setTimeout(() => dispatchContextualEvent('OPEN_CREATE_MO'), 80);
            },
          },
          {
            id: 'prod-dispatch-sheet',
            label: 'برگه کار روزانه شیفت (چاپ به خط)',
            subtitle: 'خروجی برنامه ایستگاه‌های OP برای سرپرست سالن',
            icon: Printer,
            onClick: () => {
              onSubModuleNavigate('production', {
                productionViewMode: 'ERP_WORKBENCH',
                productionModuleTab: 'DAILY_DISPATCH_SHEET',
              });
            },
          },
          {
            id: 'prod-wip-tracker',
            label: 'رهگیری موجودی پای خط (WIP)',
            subtitle: 'مشاهده بافر بین ایستگاه‌ها و پیگیری دستورهای فعال',
            icon: Compass,
            onClick: () => {
              onSubModuleNavigate('production', {
                productionViewMode: 'ERP_WORKBENCH',
                productionModuleTab: 'LIVE_WIP_OP_TRACKER',
              });
            },
          },
        ];

      case 'inventory':
      case 'sapco':
        return [
          {
            id: 'inv-receipt',
            label: 'ثبت رسید ورود رول ورق / کالا',
            subtitle: 'ورود کلاف جدید به انبار و تخصیص شماره کویل‌پک',
            icon: ArrowDownLeft,
            onClick: () => onNavigate('inventory', 'DASHBOARD', 'RECEIPT'),
          },
          {
            id: 'inv-issue',
            label: 'صدور حواله ورق به خط تولید',
            subtitle: 'ارسال رول یا ورق برش‌خورده متصل به دستور کار (MO)',
            icon: ArrowUpRight,
            onClick: () => onNavigate('inventory', 'DASHBOARD', 'ISSUE'),
          },
          {
            id: 'inv-return',
            label: 'برگشت ته‌کلاف از خط به انبار',
            subtitle: 'ثبت وزن باقیمانده کلاف و بازگشت به موجودی آزاد',
            icon: RotateCcw,
            onClick: () => onNavigate('inventory', 'DASHBOARD', 'RETURN'),
          },
          {
            id: 'inv-cardex',
            label: 'استعلام موجودی و پیگیری اسناد',
            subtitle: 'مشاهده کاردکس گردش ورود و خروج هر کالا',
            icon: Boxes,
            onClick: () => onNavigate('inventory', 'INQUIRY'),
          },
        ];

      case 'planning':
        return [
          {
            id: 'plan-mrp',
            label: 'انفجار BOM و محاسبه نیاز ورق',
            subtitle: 'محاسبه تناژ ورق مورد نیاز بر اساس سفارشات',
            icon: CalendarDays,
            onClick: () =>
              onSubModuleNavigate('planning', { planningSubTab: 'mrp' }),
          },
          {
            id: 'plan-orders',
            label: 'ثبت و پیگیری سفارشات مشتری',
            subtitle: 'مدیریت برنامه تحویل ساپکو و مشتریان',
            icon: FileCheck2,
            onClick: () =>
              onSubModuleNavigate('planning', { planningSubTab: 'orders' }),
          },
          {
            id: 'plan-issue-mo',
            label: 'صدور دستور ساخت (MO) به خط تولید',
            subtitle: 'ایجاد دستور کار جدید متصل به کالا و OP',
            icon: Hammer,
            onClick: () => {
              onNavigate('dashboard');
              setTimeout(() => dispatchContextualEvent('OPEN_CREATE_MO'), 80);
            },
          },
        ];

      case 'machines':
        return [
          {
            id: 'mch-list',
            label: 'مدیریت پرس‌ها و خطوط تولید',
            subtitle: 'مشاهده ظرفیت، تناژ و وضعیت سرویس دستگاه‌ها',
            icon: Cpu,
            onClick: () =>
              onSubModuleNavigate('machines', { machineSubTab: 'machines' }),
          },
          {
            id: 'mch-pm',
            label: 'ثبت دستور کار تعمیرات و نت (PM)',
            subtitle: 'ثبت توقفات، سرویس دوره‌ای و شاخص MTBF/MTTR',
            icon: Wrench,
            onClick: () =>
              onSubModuleNavigate('machines', { machineSubTab: 'maintenance' }),
          },
          {
            id: 'mch-dies',
            label: 'قالب‌ها و سنبه/ماتریس متصل به قطعه',
            subtitle: 'مدیریت عمر ضرب قالب‌ها و تناژ پرس سازگار',
            icon: Layers,
            onClick: () =>
              onSubModuleNavigate('machines', { machineSubTab: 'dies' }),
          },
        ];

      case 'reports':
        return [
          {
            id: 'rep-oee',
            label: 'تحلیل درختی OEE و انحراف برنامه',
            subtitle: 'مشاهده بهره‌وری خطوط، توقفات و Schedule Adherence',
            icon: BarChart3,
            onClick: () =>
              onSubModuleNavigate('production', {
                productionViewMode: 'ERP_WORKBENCH',
                productionModuleTab: 'TREE_TIMELINE_REPORT',
              }),
          },
          {
            id: 'rep-track',
            label: 'پیگیری دستورهای تولید در جریان',
            subtitle: 'بازگشت به جدول رهگیری لحظه‌ای دستورهای ساخت',
            icon: Compass,
            onClick: () => onNavigate('dashboard'),
          },
        ];

      case 'dashboard':
      default:
        return [
          {
            id: 'dash-create-mo',
            label: 'صدور دستور تولید جدید (متصل به کالا و OP)',
            subtitle: 'انتخاب قطعه از اطلاعات پایه و بارگذاری خودکار OP و ورق',
            icon: Plus,
            onClick: () => {
              dispatchContextualEvent('OPEN_CREATE_MO');
            },
          },
          {
            id: 'dash-track-order',
            label: 'پیگیری آخرین دستور صادرشده',
            subtitle: 'مشاهده زنجیره تامین ورق، ایستگاه‌های OP و رسید انبار',
            icon: Compass,
            onClick: () => {
              dispatchContextualEvent('OPEN_TRACK_FIRST_ORDER');
            },
          },
          {
            id: 'dash-create-voucher',
            label: 'ثبت قبض کارگاه (Create Voucher)',
            subtitle: 'ثبت سریع تولید سالم، ضایعات یا حواله بین ایستگاهی',
            icon: FileCheck2,
            onClick: () => {
              onSubModuleNavigate('production', { productionViewMode: 'VOUCHERS' });
              onOpenNewVoucher('PRODUCTION_OUTPUT');
            },
          },
          {
            id: 'dash-issue-sheet',
            label: 'صدور حواله ورق از انبار به برش',
            subtitle: 'ارسال رول ورق از انبار مرکزی به سالن برشکاری',
            icon: ArrowUpRight,
            onClick: () => onNavigate('inventory', 'DASHBOARD', 'ISSUE'),
          },
        ];
    }
  };

  const shortcuts = getShortcutsForTab();

  return (
    <div
      ref={menuRef}
      className="fixed bottom-5 right-5 z-40 font-sans text-right"
      dir="rtl"
    >
      {isOpen && (
        <div className="mb-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">
                اقدامات سریع: {TAB_CONTEXT_LABELS[activeTab]}
              </div>
              <div className="text-[10px] text-slate-400">
                میان‌برهای هوشمند متناسب با صفحه فعلی
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {shortcuts.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-2.5 text-right cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-slate-950">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-800 text-white border-slate-700'
            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800'
        }`}
        title="منوی اقدامات سریع متناسب با صفحه فعلی (Contextual Actions)"
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4 text-emerald-400" />
        )}
        <span className="text-xs font-bold">
          اقدام سریع ({TAB_CONTEXT_LABELS[activeTab]})
        </span>
      </button>
    </div>
  );
};
