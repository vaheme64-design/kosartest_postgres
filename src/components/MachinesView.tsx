import React, { useState, useMemo, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Wrench,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Building,
  UserCheck,
  Zap,
  X,
  Layers,
  Users,
  Search,
  Sparkles,
  ShieldCheck,
  Clock,
  Gauge,
  SlidersHorizontal,
  Edit2,
  Trash2,
  FileText,
  Settings,
  Printer,
  Download,
} from 'lucide-react';
import {
  Machine,
  DieMold,
  Operator,
  FactoryHall,
  Part,
  ProcessType,
  MachineStatus,
  PROCESS_DEFINITIONS,
  FACTORY_HALLS,
} from '../types/inventory';
import { toPersianDigits, formatNumber } from '../utils/formatters';
import { OeeModuleView } from './reports/OeeModuleView';
import { MachineUtilizationView } from './reports/MachineUtilizationView';
import { PlantMaintenanceModuleView } from './maintenance/PlantMaintenanceModuleView';
import { MasterDataSkeleton } from './ui/Skeleton';
import { StandardTable, StandardTableHeader, StandardTableRow, StandardTableCell, StandardTableHeadCell } from './common/StandardTable';
import { SearchableSelect } from './common/SearchableSelect';
import { useEnterpriseUx } from '../context/EnterpriseUxContext';

interface MachinesViewProps {
  machines: Machine[];
  dies?: DieMold[];
  operators?: Operator[];
  halls?: FactoryHall[];
  parts?: Part[];
  onSaveMachine: (machine: Partial<Machine>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveDie?: (die: Partial<DieMold>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteDie?: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveOperator?: (op: Partial<Operator>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteOperator?: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveHall?: (hall: Partial<FactoryHall>) => Promise<{ success: boolean; message?: string; error?: string }>;
  initialSubTab?: 'machines' | 'maintenance' | 'oee' | 'utilization' | 'dies' | 'halls' | 'operators';
  onSubTabChange?: (tab: 'machines' | 'maintenance' | 'oee' | 'utilization' | 'dies' | 'halls' | 'operators') => void;
}

export const MachinesView: React.FC<MachinesViewProps> = ({
  machines,
  dies = [],
  operators = [],
  halls = FACTORY_HALLS,
  parts = [],
  onSaveMachine,
  onSaveDie,
  onDeleteDie,
  onSaveOperator,
  onDeleteOperator,
  onSaveHall,
  initialSubTab = 'machines',
  onSubTabChange,
}) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  type SubTab = 'machines' | 'maintenance' | 'oee' | 'utilization' | 'dies' | 'halls' | 'operators';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSelectSubTab = (tab: SubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Partial<Machine> | null>(null);
  const [machineFormData, setMachineFormData] = useState<Partial<Machine>>({
    code: '',
    name: '',
    capabilities: ['BLANKING', 'PUNCH_FORM'],
    processType: 'BLANKING',
    tonnage: 250,
    bolsterSize: '1800x1200 mm',
    strokeLengthMm: 250,
    strokesPerMinute: 30,
    hallId: 'HALL-HEAVY-PRESS',
    location: 'سالن پرس سنگین',
    status: 'ACTIVE',
    operatorName: '',
  });

  // Die Modal
  const [isDieModalOpen, setIsDieModalOpen] = useState(false);
  const [editingDie, setEditingDie] = useState<Partial<DieMold> | null>(null);
  const [dieFormData, setDieFormData] = useState<Partial<DieMold>>({
    code: '',
    name: '',
    partId: '',
    processType: 'BLANKING',
    requiredTonnage: 250,
    compatibleMachineCodes: ['PRS-250-01'],
    strokeLifeTarget: 250000,
    currentStrokes: 0,
    status: 'READY',
    location: 'قفسه A-01 انبار قالب',
    notes: '',
  });

  // Operator State & Modals
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Partial<Operator> | null>(null);
  const [opFormData, setOpFormData] = useState<Partial<Operator>>({
    personnelCode: '',
    fullName: '',
    skillProcessTypes: ['BLANKING', 'DRAWING'],
    defaultShift: 'MORNING',
    hallId: 'HALL-HEAVY-PRESS',
    phone: '',
    active: true,
  });
  const [operatorSearch, setOperatorSearch] = useState('');
  const [selectedOpForReport, setSelectedOpForReport] = useState<Operator | null>(null);
  const [opTimesheetData, setOpTimesheetData] = useState<any>(null);
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);

  // Dynamic Machine Process Capabilities
  const [availableProcesses, setAvailableProcesses] = useState<Array<{ code: string; name: string; category?: string; description?: string }>>([
    ...PROCESS_DEFINITIONS,
  ]);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false);
  const [newProcCode, setNewProcCode] = useState('');
  const [newProcName, setNewProcName] = useState('');

  const loadProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      const json = await res.json();
      if (json.success && json.data) {
        setAvailableProcesses(json.data);
      }
    } catch (err) {
      console.warn('Using default processes', err);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcCode.trim() || !newProcName.trim()) return;
    try {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newProcCode.trim(),
          name: newProcName.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMachineFormData(prev => ({
          ...prev,
          capabilities: [...(prev.capabilities || []), newProcCode.trim().toUpperCase() as ProcessType],
        }));
        setNewProcCode('');
        setNewProcName('');
        setIsNewProcessModalOpen(false);
        await loadProcesses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProcess = (code: string) => {
    const procItem = availableProcesses.find(p => p.code === code);
    requestConfirm({
      title: `حذف منطقی قابلیت فرآیندی «${code}»`,
      description: `آیا از حذف قابلیت فرآیندی «${procItem?.name || code}» از کاتالوگ قابلیت‌های پرس اطمینان دارید؟`,
      consequences: [
        'این قابلیت از لیست انتخاب فرآیندهای جدید پرس‌ها حذف می‌شود.',
        'ماشین‌آلاتی که قبلاً این قابلیت را داشته‌اند بدون تغییر باقی می‌مانند.',
        'امکان بازگردانی فوری با دکمه «لغو (Undo)» وجود دارد.',
      ],
      confirmLabel: 'تایید و حذف قابلیت',
      variant: 'danger',
      onConfirm: async () => {
        const prevList = [...availableProcesses];
        setAvailableProcesses(prev => prev.filter(p => p.code !== code));
        try {
          await fetch(`/api/processes/${code}`, { method: 'DELETE' });
        } catch (err) {
          console.error(err);
        }
        recordAudit({
          actionType: 'SOFT_DELETE',
          moduleTitle: 'مدیریت ماشین‌آلات و قابلیت‌های فرآیندی',
          entityId: code,
          entityCode: code,
          summaryFa: `حذف قابلیت فرآیندی «${procItem?.name || code}»`,
        });
        showUndoToast({
          title: `قابلیت فرآیندی «${code}» حذف شد`,
          description: 'برای بازگردانی فوری روی «لغو (Undo)» کلیک کنید.',
          onUndo: () => {
            setAvailableProcesses(prevList);
          },
        });
      },
    });
  };

  const handleOpenTimesheetReport = async (op: Operator) => {
    setSelectedOpForReport(op);
    setLoadingTimesheet(true);
    setOpTimesheetData(null);
    try {
      const res = await fetch(`/api/operators/${op.id}/timesheet`);
      const json = await res.json();
      if (json.success && json.data) {
        setOpTimesheetData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimesheet(false);
    }
  };

  const handleEditOp = (op: Operator) => {
    setEditingOperator(op);
    setOpFormData({
      id: op.id,
      personnelCode: op.personnelCode,
      fullName: op.fullName,
      skillProcessTypes: op.skillProcessTypes || ['BLANKING'],
      defaultShift: op.defaultShift || 'MORNING',
      hallId: op.hallId || 'HALL-HEAVY-PRESS',
      phone: op.phone || '',
      active: op.active !== undefined ? op.active : true,
    });
    setFormError(null);
    setIsOpModalOpen(true);
  };

  const handleDeleteOp = (op: Operator) => {
    requestConfirm({
      title: `حذف منطقی اپراتور «${op.fullName}»`,
      description: `آیا از غیرفعال‌سازی و حذف منطقی اپراتور «${op.fullName}» (کد پرسنلی ${op.personnelCode}) اطمینان دارید؟`,
      consequences: [
        'اپراتور از لیست تخصیص شیفت‌های جدید خط تولید خارج می‌شود.',
        'کارنامه و سوابق تایم‌شیت قبلی اپراتور در سیستم محفوظ می‌ماند.',
        'در صورت نیاز می‌توانید با دکمه «لغو (Undo)» اپراتور را بازگردانید.',
      ],
      confirmLabel: 'تایید و حذف منطقی اپراتور',
      variant: 'danger',
      onConfirm: async () => {
        if (onDeleteOperator) {
          await onDeleteOperator(op.id);
        } else {
          await fetch(`/api/operators/${op.id}`, { method: 'DELETE' });
        }
        recordAudit({
          actionType: 'SOFT_DELETE',
          moduleTitle: 'مدیریت اپراتورها و پرسنل تولید',
          entityId: op.id,
          entityCode: op.personnelCode,
          summaryFa: `حذف منطقی اپراتور «${op.fullName}» (${op.personnelCode})`,
        });
        showUndoToast({
          title: `اپراتور «${op.fullName}» به صورت منطقی حذف شد`,
          description: `کد پرسنلی: ${op.personnelCode}`,
          onUndo: async () => {
            if (onSaveOperator) {
              await onSaveOperator(op);
            }
          },
        });
      },
    });
  };

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (machines.length === 0 && parts.length === 0) {
    return <MasterDataSkeleton />;
  }

  // Toggle machine capability checkbox
  const toggleCapability = (proc: string) => {
    const current = (machineFormData.capabilities || []) as string[];
    if (current.includes(proc)) {
      if (current.length === 1) return; // Keep at least one
      setMachineFormData({ ...machineFormData, capabilities: current.filter(c => c !== proc) as ProcessType[] });
    } else {
      setMachineFormData({ ...machineFormData, capabilities: [...current, proc] as ProcessType[] });
    }
  };

  // MACHINE MODAL HANDLERS
  const handleOpenNewMachine = () => {
    setEditingMachine(null);
    setMachineFormData({
      code: '',
      name: '',
      capabilities: ['BLANKING', 'DRAWING', 'PUNCH_FORM'],
      processType: 'DRAWING',
      tonnage: 400,
      bolsterSize: '2200x1400 mm',
      strokeLengthMm: 350,
      strokesPerMinute: 25,
      hallId: 'HALL-HEAVY-PRESS',
      location: 'سالن پرس سنگین',
      status: 'ACTIVE',
      operatorName: '',
    });
    setFormError(null);
    setIsMachineModalOpen(true);
  };

  const handleEditMachine = (m: Machine) => {
    setEditingMachine(m);
    setMachineFormData({
      ...m,
      capabilities: m.capabilities && m.capabilities.length > 0 ? m.capabilities : [m.processType],
    });
    setFormError(null);
    setIsMachineModalOpen(true);
  };

  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!machineFormData.code || !machineFormData.name) {
      setFormError('کد و نام ماشین الزامی است.');
      return;
    }

    setLoading(true);
    try {
      const selectedHall = halls.find(h => h.id === machineFormData.hallId);
      const payload: Partial<Machine> = {
        ...machineFormData,
        location: selectedHall ? selectedHall.name : machineFormData.location,
        processType: machineFormData.capabilities?.[0] || 'BLANKING',
      };

      const res = await onSaveMachine(payload);
      if (res.success) {
        setIsMachineModalOpen(false);
      } else {
        setFormError(res.error || 'خطا در ثبت مشخصات ماشین.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای سرور');
    } finally {
      setLoading(false);
    }
  };

  // DIE MODAL HANDLERS
  const handleOpenNewDie = () => {
    setEditingDie(null);
    setDieFormData({
      code: '',
      name: '',
      partId: parts[0]?.id || '',
      processType: 'BLANKING',
      requiredTonnage: 250,
      compatibleMachineCodes: ['PRS-250-01'],
      strokeLifeTarget: 250000,
      currentStrokes: 0,
      status: 'READY',
      location: 'قفسه A-01 انبار قالب‌ها',
      notes: '',
    });
    setFormError(null);
    setIsDieModalOpen(true);
  };

  const handleEditDie = (die: DieMold) => {
    setEditingDie(die);
    setDieFormData({ ...die });
    setFormError(null);
    setIsDieModalOpen(true);
  };

  const handleDieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!onSaveDie) return;

    if (!dieFormData.code || !dieFormData.name || !dieFormData.partId) {
      setFormError('کد قالب، عنوان قالب و قطعه مربوطه الزامی هستند.');
      return;
    }

    setLoading(true);
    try {
      const res = await onSaveDie(dieFormData);
      if (res.success) {
        setIsDieModalOpen(false);
      } else {
        setFormError(res.error || 'خطا در ثبت قالب');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای ارتباط');
    } finally {
      setLoading(false);
    }
  };

  // OPERATOR MODAL HANDLERS
  const handleOpenNewOp = () => {
    setOpFormData({
      personnelCode: '',
      fullName: '',
      skillProcessTypes: ['BLANKING', 'PUNCH_FORM'],
      defaultShift: 'MORNING',
      hallId: halls[0]?.id || '',
      phone: '',
      active: true,
    });
    setFormError(null);
    setIsOpModalOpen(true);
  };

  const handleOpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!onSaveOperator) return;

    if (!opFormData.personnelCode || !opFormData.fullName) {
      setFormError('کد پرسنلی و نام اپراتور الزامی است.');
      return;
    }

    setLoading(true);
    try {
      const res = await onSaveOperator(opFormData);
      if (res.success) {
        setIsOpModalOpen(false);
      } else {
        setFormError(res.error || 'خطا در ثبت اپراتور');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (m: Machine) => {
    const nextStatus: MachineStatus =
      m.status === 'ACTIVE' ? 'MAINTENANCE' : m.status === 'MAINTENANCE' ? 'IDLE' : 'ACTIVE';
    await onSaveMachine({ ...m, status: nextStatus });
  };

  const subTabsList: { id: SubTab; label: string; shortLabel: string }[] = [
    {
      id: 'machines',
      label: `۱. پرس‌ها و ماشین‌آلات (${toPersianDigits(machines.length)} دستگاه)`,
      shortLabel: 'پرس‌ها و ماشین‌آلات',
    },
    {
      id: 'maintenance',
      label: '۲. نگهداری و تعمیرات، دستورکارها و TPM (استاندارد Odoo / ERPNext)',
      shortLabel: 'نگهداری و تعمیرات (TPM)',
    },
    {
      id: 'oee',
      label: '۳. ماژول OEE و ۶ ضایعه بزرگ',
      shortLabel: 'داشبورد OEE',
    },
    {
      id: 'utilization',
      label: '۴. گزارش بهره ماشین و کارکرد',
      shortLabel: 'بهره ماشین',
    },
    {
      id: 'dies',
      label: `۵. قالب‌های پرس و فیکسچرها (${toPersianDigits(dies.length)} قالب)`,
      shortLabel: 'قالب‌های پرس',
    },
    {
      id: 'halls',
      label: `۶. سالن‌ها و نواحی کارخانه (${toPersianDigits(halls.length)} سالن)`,
      shortLabel: 'سالن‌های کارخانه',
    },
    {
      id: 'operators',
      label: `۷. اپراتورها و پرسنل خطوط (${toPersianDigits(operators.length)} نفر)`,
      shortLabel: 'اپراتورها و پرسنل',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Grafana-Inspired Light Header & Single Flat Dropdown List Selector Bar */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-bold text-slate-900">
                مرکز تجهیزات، قالب‌های پرس، سالن‌ها و اپراتورهای کارخانه
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                پرس‌های چندمنظوره (کشش، پانچ، خم)، مدیریت قالب‌های سنبه ماتریس، سالن‌های تولیدی، شاخص OEE و پرسنل خطوط
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {activeSubTab === 'machines' && (
              <button
                onClick={handleOpenNewMachine}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-orange-400" />
                <span>ثبت پرس / دستگاه جدید</span>
              </button>
            )}
            {activeSubTab === 'dies' && (
              <button
                onClick={handleOpenNewDie}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-orange-400" />
                <span>تعریف قالب پرس جدید</span>
              </button>
            )}
            {activeSubTab === 'operators' && (
              <button
                onClick={handleOpenNewOp}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-orange-400" />
                <span>افزودن اپراتور جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified Dropdown List Selector + Quick Chips (Replaces Row Tabs) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-slate-500 font-medium">انتخاب بخش ماشین‌آلات و ظرفیت:</span>
              <select
                value={activeSubTab}
                onChange={e => handleSelectSubTab(e.target.value as SubTab)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {subTabsList.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Tag Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {subTabsList.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                    activeSubTab === tab.id
                      ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                  }`}
                >
                  {tab.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            کل پرس‌ها: {toPersianDigits(machines.length)} • قالب‌ها: {toPersianDigits(dies.length)} • پرسنل: {toPersianDigits(operators.length)}
          </div>
        </div>
      </div>

      {/* TAB MAINTENANCE & TPM MODULE (Odoo Maintenance & ERPNext Asset Maintenance) */}
      {activeSubTab === 'maintenance' && (
        <PlantMaintenanceModuleView
          machines={machines}
          dies={dies}
          operators={operators}
        />
      )}

      {/* TAB OEE MODULE */}
      {activeSubTab === 'oee' && <OeeModuleView machines={machines} />}

      {/* TAB MACHINE UTILIZATION MODULE */}
      {activeSubTab === 'utilization' && <MachineUtilizationView machines={machines} />}

      {/* TAB 1: MACHINES & MULTI-CAPABILITY PRESSES */}
      {activeSubTab === 'machines' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2 leading-relaxed">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>پرس‌های چندمنظوره:</strong> یک پرس مکانیکی یا هیدرولیک می‌تواند بسته به قالبی که روی آن بسته می‌شود، عملیات‌های گوناگونی همچون بلنکینگ، کشش، پانچ، خمکاری یا دوربری را اجرا کند.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map(m => {
              const isActive = m.status === 'ACTIVE';
              const isMaintenance = m.status === 'MAINTENANCE';
              const caps = m.capabilities && m.capabilities.length > 0 ? m.capabilities : [m.processType];
              const compatibleDies = dies.filter(d => d.compatibleMachineCodes?.includes(m.code));

              return (
                <div
                  key={m.id}
                  className={`p-5 rounded-xl border transition-all bg-white shadow-2xs ${
                    isActive
                      ? 'border-slate-200 hover:border-orange-300'
                      : isMaintenance
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/80">
                      {m.code}
                    </span>

                    {/* Status Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isMaintenance
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title="کلیک برای تغییر وضعیت فعالیت"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500 animate-ping' : isMaintenance ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>
                        {isActive ? 'فعال در خط' : isMaintenance ? 'تعمیرات (PM)' : 'متوقف'}
                      </span>
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-3 line-clamp-1">{m.name}</h3>

                  {/* Multi-Capabilities Badges */}
                  <div className="mt-3">
                    <span className="text-[10px] text-slate-500 block mb-1">قابلیت‌های فرآیندی پرس:</span>
                    <div className="flex flex-wrap gap-1">
                      {caps.map((c, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500">تناژ اسمی:</span>
                      <span className="font-mono font-bold text-orange-700">
                        {m.tonnage ? `${toPersianDigits(m.tonnage)} تن` : 'فاقد تناژ'}
                      </span>
                    </div>
                    {m.bolsterSize && (
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500">ابعاد میز پرس:</span>
                        <span className="font-mono text-slate-800 font-medium">{m.bolsterSize}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500">سالن استقرار:</span>
                      <span className="text-slate-700 flex items-center gap-1 font-medium">
                        <Building className="w-3 h-3 text-slate-400" />
                        {m.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">قالب‌های سازگار:</span>
                      <span className="text-emerald-700 font-bold">
                        {toPersianDigits(compatibleDies.length)} قالب
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleEditMachine(m)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                    >
                      ویرایش مشخصات
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {m.operatorName ? `مسئول: ${m.operatorName}` : 'مشترک سالن'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DIES & MOLDS MANAGEMENT */}
      {activeSubTab === 'dies' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 flex items-center gap-2 leading-relaxed">
            <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>شناسنامه قالب‌های پرس (Dies & Molds):</strong> هر قطعه بدنه خودرو با قالب‌های تخصصی سنبه ماتریس، کشش عمیق، پانچ یا خم‌کاری شکل می‌گیرد. ردیابی عمر ضرب و نگهداری پیشگیرانه از توقف خط جلوگیری می‌کند.
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">کد قالب</th>
                    <th className="py-3 px-3">عنوان قالب پرس</th>
                    <th className="py-3 px-3">قطعه تولیدی مرتبط</th>
                    <th className="py-3 px-3">عملیات فرآیندی</th>
                    <th className="py-3 px-3">تناژ مورد نیاز</th>
                    <th className="py-3 px-3">پرس‌های سازگار</th>
                    <th className="py-3 px-3">کارکرد ضرب / عمر اسمی</th>
                    <th className="py-3 px-3">محل در انبار</th>
                    <th className="py-3 px-3">وضعیت</th>
                    <th className="py-3 px-3">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dies.map(d => {
                    const healthPct = Math.round((d.currentStrokes / (d.strokeLifeTarget || 1)) * 100);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{d.code}</td>
                        <td className="py-3 px-3 text-slate-900 font-bold max-w-xs">{d.name}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium">{d.partName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{d.partCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200 font-semibold">
                            {d.processType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.requiredTonnage} تن</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {d.compatibleMachineCodes?.join(', ') || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-xs text-slate-800 font-semibold">
                            {formatNumber(d.currentStrokes)} / {formatNumber(d.strokeLifeTarget)}
                          </div>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                healthPct > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, healthPct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{d.location}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              d.status === 'READY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {d.status === 'READY' ? 'آماده تولید' : 'سرویس / تیزکاری'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleEditDie(d)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                          >
                            ویرایش
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACTORY HALLS */}
      {activeSubTab === 'halls' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {halls.map(hall => {
            const machinesInHall = machines.filter(m => m.location?.includes(hall.name) || m.hallId === hall.id);
            return (
              <div key={hall.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    {hall.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    {hall.type}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{hall.name}</h3>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">سرپرست سالن:</span>
                    <span className="text-slate-900 font-bold">{hall.supervisorName || '-'}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">تجهیزات و پرس‌ها:</span>
                    <span className="text-emerald-700 font-bold">{toPersianDigits(machinesInHall.length)} دستگاه</span>
                  </div>
                  {hall.capacityDesc && (
                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      {hall.capacityDesc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: OPERATORS & LINE TECHNICIANS */}
      {activeSubTab === 'operators' && (
        <div className="space-y-3">
          {/* Search bar and counter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در اپراتورها (نام، کد پرسنلی، مهارت)..."
                value={operatorSearch}
                onChange={e => setOperatorSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>تعداد پرسنل فعال: {toPersianDigits(operators.filter(o => o.active).length)} نفر</span>
              <button
                type="button"
                onClick={handleOpenNewOp}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ اپراتور جدید</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">کد پرسنلی</th>
                    <th className="py-3 px-3">نام و نام خانوادگی</th>
                    <th className="py-3 px-3">مهارت‌های تخصصی</th>
                    <th className="py-3 px-3">شیفت پیش‌فرض</th>
                    <th className="py-3 px-3">تماس</th>
                    <th className="py-3 px-3 text-center">وضعیت</th>
                    <th className="py-3 px-3 text-center">عملیات و گزارش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {operators
                    .filter(op => {
                      if (!operatorSearch.trim()) return true;
                      const q = operatorSearch.toLowerCase();
                      return (
                        op.fullName.toLowerCase().includes(q) ||
                        op.personnelCode.toLowerCase().includes(q) ||
                        op.skillProcessTypes?.some(s => s.toLowerCase().includes(q))
                      );
                    })
                    .map(op => (
                      <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-orange-700">{op.personnelCode}</td>
                        <td className="py-3 px-3 text-slate-900 font-bold">{op.fullName}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {op.skillProcessTypes?.map((s, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {op.defaultShift === 'MORNING' ? 'شیفت صبح' : op.defaultShift === 'EVENING' ? 'شیفت عصر' : 'شیفت شب'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{op.phone || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            شاغل
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenTimesheetReport(op)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-[11px] transition cursor-pointer"
                              title="مشاهده کارنامه و ساعات کارکرد"
                            >
                              <FileText className="w-3 h-3" />
                              <span>گزارش کارکرد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditOp(op)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                              title="ویرایش مشخصات اپراتور"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOp(op)}
                              className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                              title="حذف اپراتور"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: ADD / EDIT MACHINE */}
      {isMachineModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex justify-end"
          onClick={() => setIsMachineModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border-r border-slate-200 w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-orange-600" />
                <span>{editingMachine ? 'کشوی ویرایش مشخصات ماشین / پرس' : 'کشوی ثبت پرس یا دستگاه جدید'}</span>
              </h3>
              <button onClick={() => setIsMachineModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleMachineSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">کد شناسایی ماشین *</label>
                  <input
                    type="text"
                    value={machineFormData.code || ''}
                    onChange={e => setMachineFormData({ ...machineFormData, code: e.target.value })}
                    placeholder="PRS-400-02"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">تناژ اسمی پرس (تن) *</label>
                  <input
                    type="number"
                    value={machineFormData.tonnage || 0}
                    onChange={e => setMachineFormData({ ...machineFormData, tonnage: parseFloat(e.target.value) || 0 })}
                    placeholder="400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">عنوان کامل ماشین در کارخانه *</label>
                <input
                  type="text"
                  value={machineFormData.name || ''}
                  onChange={e => setMachineFormData({ ...machineFormData, name: e.target.value })}
                  placeholder="پرس مکانیکی ضربه‌ای شولر ۴۰۰ تن C-Frame"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Multi-Capability Checkboxes */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-800 font-bold">
                    قابلیت‌های فرآیندی این دستگاه (چند انتخابی بر اساس قالب‌های قابل نصب):
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewProcessModalOpen(true)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ قابلیت جدید / ویرایش لیست</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {availableProcesses.map(p => {
                    const isChecked = (machineFormData.capabilities || []).includes(p.code as any);
                    return (
                      <label key={p.code} className="flex items-center justify-between gap-1 cursor-pointer text-[11px] text-slate-700 hover:text-slate-900 bg-white px-2 py-1.5 rounded-lg border border-slate-200/80">
                        <div className="flex items-center gap-1.5 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCapability(p.code)}
                            className="rounded bg-white border-slate-300 text-orange-600 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="font-mono text-[9px] text-slate-400">{p.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">ابعاد میز پرس (Bolster)</label>
                  <input
                    type="text"
                    value={machineFormData.bolsterSize || ''}
                    onChange={e => setMachineFormData({ ...machineFormData, bolsterSize: e.target.value })}
                    placeholder="2200x1400 mm"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">سالن استقرار</label>
                  <select
                    value={machineFormData.hallId || ''}
                    onChange={e => setMachineFormData({ ...machineFormData, hallId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    {halls.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                >
                  {loading ? 'در حال ثبت...' : 'ذخیره مشخصات ماشین'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: ADD / EDIT DIE / MOLD */}
      {isDieModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex justify-end"
          onClick={() => setIsDieModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border-r border-slate-200 w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>{editingDie ? 'کشوی ویرایش شناسنامه قالب پرس' : 'کشوی ثبت و تعریف قالب پرس جدید'}</span>
              </h3>
              <button onClick={() => setIsDieModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleDieSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">کد فنی قالب *</label>
                  <input
                    type="text"
                    value={dieFormData.code || ''}
                    onChange={e => setDieFormData({ ...dieFormData, code: e.target.value })}
                    placeholder="DIE-206-BRK05"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">عملیات فرآیندی *</label>
                  <select
                    value={dieFormData.processType}
                    onChange={e => setDieFormData({ ...dieFormData, processType: e.target.value as ProcessType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {PROCESS_DEFINITIONS.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">عنوان کامل قالب پرس *</label>
                <input
                  type="text"
                  value={dieFormData.name || ''}
                  onChange={e => setDieFormData({ ...dieFormData, name: e.target.value })}
                  placeholder="قالب کشش عمیق و برش پیرسینگ دیاق سپر جلو تارا"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">قطعه تولیدی مرتبط *</label>
                <select
                  value={dieFormData.partId || ''}
                  onChange={e => setDieFormData({ ...dieFormData, partId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- انتخاب قطعه از کاتالوگ --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">تناژ پرس مورد نیاز (تن) *</label>
                  <input
                    type="number"
                    value={dieFormData.requiredTonnage || 250}
                    onChange={e => setDieFormData({ ...dieFormData, requiredTonnage: parseFloat(e.target.value) || 0 })}
                    placeholder="400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">طول عمر اسمی قالب (تعداد ضرب)</label>
                  <input
                    type="number"
                    value={dieFormData.strokeLifeTarget || 250000}
                    onChange={e => setDieFormData({ ...dieFormData, strokeLifeTarget: parseInt(e.target.value, 10) || 250000 })}
                    placeholder="250000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">محل در انبار قالب‌ها</label>
                  <input
                    type="text"
                    value={dieFormData.location || ''}
                    onChange={e => setDieFormData({ ...dieFormData, location: e.target.value })}
                    placeholder="قفسه A-04"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">وضعیت فعلی</label>
                  <select
                    value={dieFormData.status}
                    onChange={e => setDieFormData({ ...dieFormData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="READY">آماده به کار در خط تولید</option>
                    <option value="UNDER_MAINTENANCE">در حال تعمیرات و تیزکاری سنبه ماتریس</option>
                    <option value="CALIBRATION">کالیبراسیون و انطباق ابعادی CMM</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDieModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                >
                  {loading ? 'در حال ثبت...' : 'ذخیره مشخصات قالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: ADD / EDIT OPERATOR */}
      {isOpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex justify-end"
          onClick={() => setIsOpModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border-r border-slate-200 w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>کشوی ثبت و ویرایش اپراتور خط تولید</span>
              </h3>
              <button onClick={() => setIsOpModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpSubmit} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-medium">کد پرسنلی *</label>
                <input
                  type="text"
                  value={opFormData.personnelCode || ''}
                  onChange={e => setOpFormData({ ...opFormData, personnelCode: e.target.value })}
                  placeholder="EMP-115"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  value={opFormData.fullName || ''}
                  onChange={e => setOpFormData({ ...opFormData, fullName: e.target.value })}
                  placeholder="محمد حسینی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">شیفت کاری</label>
                  <select
                    value={opFormData.defaultShift}
                    onChange={e => setOpFormData({ ...opFormData, defaultShift: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MORNING">شیفت صبح</option>
                    <option value="EVENING">شیفت عصر</option>
                    <option value="NIGHT">شیفت شب</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">تلفن تماس</label>
                  <input
                    type="text"
                    value={opFormData.phone || ''}
                    onChange={e => setOpFormData({ ...opFormData, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpModalOpen(false);
                    setEditingOperator(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  {loading ? 'در حال ثبت...' : editingOperator ? 'ذخیره تغییرات اپراتور' : 'ثبت اپراتور جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OPERATOR TIMESHEET & PERFORMANCE REPORT (گزارش کارکرد هر نفر) */}
      {selectedOpForReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    گزارش کارکرد و بازدهی: {selectedOpForReport.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    کد پرسنلی: {selectedOpForReport.personnelCode} • شیفت: {selectedOpForReport.defaultShift === 'MORNING' ? 'صبح' : 'عصر'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpForReport(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTimesheet ? (
              <div className="py-12 text-center text-xs text-slate-500">
                در حال فراخوانی آمار و کارکرد شیفت‌ها...
              </div>
            ) : opTimesheetData ? (
              <div className="space-y-4 text-xs">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-right">
                    <span className="text-[10px] text-slate-500 block">ساعات کارکرد کل:</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {toPersianDigits(opTimesheetData.summary.totalHoursWorked)} ساعت
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 text-right">
                    <span className="text-[10px] text-emerald-700 block">تولید سالم کل:</span>
                    <span className="text-base font-extrabold text-emerald-800 font-mono">
                      {formatNumber(opTimesheetData.summary.totalPiecesProduced)} عدد
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-right">
                    <span className="text-[10px] text-amber-700 block">توقفات ثبت‌شده:</span>
                    <span className="text-base font-extrabold text-amber-900 font-mono">
                      {toPersianDigits(opTimesheetData.summary.downtimeReportedHours)} ساعت
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/90 text-right">
                    <span className="text-[10px] text-indigo-700 block">راندمان عملکرد:</span>
                    <span className="text-base font-extrabold text-indigo-900 font-mono">
                      {toPersianDigits(opTimesheetData.summary.overallEfficiencyPercent)}%
                    </span>
                  </div>
                </div>

                {/* Shift Log Table */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">ریز عملکرد روزانه و شیفت‌های اخیر:</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">تاریخ و شیفت</th>
                          <th className="py-2.5 px-3">دستگاه</th>
                          <th className="py-2.5 px-3">قطعه تولیدی</th>
                          <th className="py-2.5 px-3 text-center">تولید سالم</th>
                          <th className="py-2.5 px-3 text-center">ضایعات</th>
                          <th className="py-2.5 px-3 text-center">توقف (دقیقه)</th>
                          <th className="py-2.5 px-3">علت توقف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        {opTimesheetData.shiftRecords.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                              {r.date} <span className="text-[10px] text-slate-400 block">{r.shift}</span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{r.machineCode}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="font-semibold text-slate-900">{r.partName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{r.partCode}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                              {formatNumber(r.actualProduced)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">
                              {toPersianDigits(r.scrapCount)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-amber-700">
                              {toPersianDigits(r.downtimeMin)}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] max-w-xs truncate">
                              {r.downtimeReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ کارنامه</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOpForReport(null)}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: DYNAMIC PROCESS CAPABILITIES MANAGEMENT (مدیریت قابلیت‌های فرآیندی پرس) */}
      {isNewProcessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">مدیریت قابلیت‌های فرآیندی پرس‌ها</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProcessModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Processes List */}
            <div className="space-y-1 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">قابلیت‌های ثبت‌شده در سیستم:</span>
              {availableProcesses.map(p => (
                <div key={p.code} className="flex items-center justify-between py-1.5 px-1">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{p.code}</span>
                    <span className="text-slate-500 mr-2 text-[11px]">{p.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteProcess(p.code)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                    title="حذف قابلیت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add a new process */}
            <form onSubmit={handleCreateProcess} className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-slate-700 block">افزودن قابلیت فرآیندی جدید:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">شناسه انگلیسی (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: COINING یا FLANGING"
                    value={newProcCode}
                    onChange={e => setNewProcCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">عنوان فارسی فرایند *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: سکه‌زنی یا فلنج‌کاری"
                    value={newProcName}
                    onChange={e => setNewProcName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProcessModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs cursor-pointer"
                >
                  بستن
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  + افزودن قابلیت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
