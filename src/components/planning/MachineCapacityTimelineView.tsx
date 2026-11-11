import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowLeftRight,
  Sparkles,
  Filter,
  Edit3,
  Trash2,
  Sliders,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { ProductionPlanSuggestion } from '../../types/productionPlanning';
import { Part, Machine } from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { getDynamicWorkDays } from '../../utils/jalali';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';

interface MachineCapacityTimelineViewProps {
  suggestions: ProductionPlanSuggestion[];
  parts: Part[];
  machines: Machine[];
  initialMachineCode?: string | null;
}

export interface ScheduledMoBlock {
  id: string;
  moNumber: string;
  partCode: string;
  partName: string;
  operationCode: string;
  operationTitle: string;
  machineCode: string;
  machineName: string;
  hall: string;
  tonnageLabel: string;
  quantity: number;
  startHour: number;
  endHour: number;
  dayIndex?: number; // 0 = Today, 1 = Tomorrow, etc.
  status: 'IN_PROGRESS' | 'SCHEDULED' | 'SETUP' | 'COMPLETED';
  contractNumber: string;
  dieCode: string;
  setupMinutes: number;
  isDeleted?: boolean;
}

const INITIAL_CAPACITY_BLOCKS: ScheduledMoBlock[] = [
  {
    id: 'CAP-01',
    moNumber: 'MO-ECU-MAIN-01',
    partCode: 'WIP-ECU-MAIN-BRK',
    partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
    operationCode: 'OP-10',
    operationTitle: 'برش رول و نواربری ورق DC01A',
    machineCode: 'SLT-1250-01',
    machineName: 'خط رول‌بازکن و برش کویل ۱۲۵۰ میلیمتر',
    hall: 'سالن بلنکینگ و برش',
    tonnageLabel: 'برش رول',
    quantity: 1500,
    startHour: 7.0,
    endHour: 9.5,
    dayIndex: 0,
    status: 'COMPLETED',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'DIE-ECU-BLK-01',
    setupMinutes: 20,
  },
  {
    id: 'CAP-02',
    moNumber: 'MO-ECU-MAIN-01',
    partCode: 'WIP-ECU-MAIN-BRK',
    partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
    operationCode: 'OP-20',
    operationTitle: 'پرس بلنک‌زنی اولیه صفحه اصلی',
    machineCode: 'PRS-250-01',
    machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن آیدین',
    hall: 'سالن پرس متوسط',
    tonnageLabel: '250T',
    quantity: 1500,
    startHour: 9.5,
    endHour: 13.5,
    dayIndex: 0,
    status: 'IN_PROGRESS',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'DIE-ECU-BLK-01',
    setupMinutes: 30,
  },
  {
    id: 'CAP-03',
    moNumber: 'MO-ECU-MAIN-01',
    partCode: 'WIP-ECU-MAIN-BRK',
    partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
    operationCode: 'OP-30',
    operationTitle: 'پرس خم لبه استاندارد صفحه اصلی',
    machineCode: 'PRS-250-01',
    machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن آیدین',
    hall: 'سالن پرس متوسط',
    tonnageLabel: '250T',
    quantity: 1500,
    startHour: 14.0,
    endHour: 18.0,
    dayIndex: 0,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'DIE-ECU-BND-02',
    setupMinutes: 25,
  },
  {
    id: 'CAP-04',
    moNumber: 'MO-ECU-COMP-01',
    partCode: 'WIP-ECU-COMP-BRK',
    partName: 'قطعه مکمل براکت ضدسرقت رایانه موتور',
    operationCode: 'OP-20',
    operationTitle: 'پرس بلنک‌زنی قطعه مکمل',
    machineCode: 'PRS-250-01',
    machineName: 'پرس مکانیکی کلاچ پنوماتیک ۲۵۰ تن آیدین',
    hall: 'سالن پرس متوسط',
    tonnageLabel: '250T',
    quantity: 1500,
    startHour: 18.0,
    endHour: 22.0,
    dayIndex: 0,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'DIE-CMP-BLK-01',
    setupMinutes: 30,
  },
  {
    id: 'CAP-05',
    moNumber: 'MO-ECU-MAIN-01',
    partCode: 'WIP-ECU-MAIN-BRK',
    partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
    operationCode: 'OP-50',
    operationTitle: 'پرس‌جوش ۱۵ عدد مهره جوشی M6 روی صفحه اصلی',
    machineCode: 'WLD-SPOT-01',
    machineName: 'دستگاه پرس‌جوش نقطه‌ای مقاومتی ۱۰۰KVA',
    hall: 'سالن جوش و مونتاژ',
    tonnageLabel: 'Spot Weld',
    quantity: 1500,
    startHour: 8.0,
    endHour: 15.0,
    dayIndex: 0,
    status: 'IN_PROGRESS',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'JIG-ECU-NUT15',
    setupMinutes: 25,
  },
  {
    id: 'CAP-06',
    moNumber: 'MO-ECU-ASY-01',
    partCode: 'SAPCO-ASY-ECU-BRK-01',
    partName: 'مجموعه براکت ضدسرقت رایانه موتور با پوشش کاتافورز ED',
    operationCode: 'OP-10',
    operationTitle: 'مونتاژ و جوش CO2 اتصال صفحه اصلی و مکمل',
    machineCode: 'WLD-SPOT-01',
    machineName: 'دستگاه پرس‌جوش نقطه‌ای و کابین جوش ۱',
    hall: 'سالن جوش و مونتاژ',
    tonnageLabel: 'CO2 Weld',
    quantity: 1500,
    startHour: 15.5,
    endHour: 22.5,
    dayIndex: 0,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-ECU-BRK',
    dieCode: 'JIG-ECU-CO2-ASY',
    setupMinutes: 30,
  },
];

const HOURS_AXIS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const formatHourLabel = (hr: number): string => {
  const whole = Math.floor(hr);
  const mins = Math.round((hr - whole) * 60);
  const hh = String(whole).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return toPersianDigits(`${hh}:${mm}`);
};

export const hourToTimeString = (hr: number): string => {
  const whole = Math.floor(hr);
  const mins = Math.round((hr - whole) * 60);
  const hh = String(Math.min(23, Math.max(0, whole))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, mins))).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const timeStringToHour = (timeStr: string): number => {
  if (!timeStr) return 7;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 7;
  const hh = parseInt(parts[0], 10) || 0;
  const mm = parseInt(parts[1], 10) || 0;
  return Number((hh + mm / 60).toFixed(2));
};

export const MachineCapacityTimelineView: React.FC<MachineCapacityTimelineViewProps> = ({
  suggestions,
  initialMachineCode,
}) => {
  const { openQuickEditDrawer, requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const workDays = useMemo(() => getDynamicWorkDays(), []);

  const [blocks, setBlocks] = useState<ScheduledMoBlock[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_capacity_blocks_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_CAPACITY_BLOCKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kpims_capacity_blocks_v3', JSON.stringify(blocks));
    } catch {
      // ignore
    }
  }, [blocks]);

  const [selectedHall, setSelectedHall] = useState<string>('ALL');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');
  const [onlyConflicts, setOnlyConflicts] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('CAP-02');
  const [highlightedMachineCode, setHighlightedMachineCode] = useState<string | null>(null);

  // Manual Leveling Modal state for side-by-side conflict resolution
  const [manualLevelingConflict, setManualLevelingConflict] = useState<{
    machineCode: string;
    machineName: string;
    blockAId: string;
    blockBId: string;
  } | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  // Focus machine if initialMachineCode is passed from Dashboard / Utilization
  useEffect(() => {
    if (initialMachineCode) {
      setSelectedHall('ALL');
      setOnlyConflicts(false);
      setHighlightedMachineCode(initialMachineCode);
      const matchingBlock = blocks.find(b => !b.isDeleted && b.machineCode.includes(initialMachineCode.slice(0, 7)));
      if (matchingBlock) {
        setSelectedBlockId(matchingBlock.id);
        setTimeout(() => {
          rowRefs.current[matchingBlock.machineCode]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [initialMachineCode, blocks]);

  const activeBlocks = useMemo(() => blocks.filter(b => !b.isDeleted), [blocks]);

  const dynamicHallList = useMemo(
    () => Array.from(new Set(activeBlocks.map(b => b.hall))),
    [activeBlocks]
  );

  // Group blocks by machine and detect overlaps
  const machineRows = useMemo(() => {
    const map = new Map<
      string,
      {
        machineCode: string;
        machineName: string;
        hall: string;
        tonnageLabel: string;
        items: ScheduledMoBlock[];
        conflicts: Array<{ blockA: ScheduledMoBlock; blockB: ScheduledMoBlock; overlapHours: number }>;
        utilizationPercent: number;
      }
    >();

    activeBlocks.forEach(b => {
      if (selectedHall !== 'ALL' && b.hall !== selectedHall) return;
      if (selectedMachineFilter !== 'ALL' && b.machineCode !== selectedMachineFilter) return;
      const existing = map.get(b.machineCode) || {
        machineCode: b.machineCode,
        machineName: b.machineName,
        hall: b.hall,
        tonnageLabel: b.tonnageLabel,
        items: [],
        conflicts: [],
        utilizationPercent: 0,
      };
      existing.items.push(b);
      map.set(b.machineCode, existing);
    });

    const totalHorizonHours = 16;
    Array.from(map.values()).forEach(row => {
      row.items.sort((a, b) => a.startHour - b.startHour);
      let bookedHours = 0;

      for (let i = 0; i < row.items.length; i++) {
        const a = row.items[i];
        bookedHours += Math.max(0, a.endHour - a.startHour);
        for (let j = i + 1; j < row.items.length; j++) {
          const b = row.items[j];
          const overlapStart = Math.max(a.startHour, b.startHour);
          const overlapEnd = Math.min(a.endHour, b.endHour);
          if (overlapEnd > overlapStart) {
            row.conflicts.push({
              blockA: a,
              blockB: b,
              overlapHours: Number((overlapEnd - overlapStart).toFixed(1)),
            });
          }
        }
      }

      row.utilizationPercent = Math.min(100, Math.round((bookedHours / totalHorizonHours) * 100));
    });

    const allRows = Array.from(map.values());
    return onlyConflicts ? allRows.filter(r => r.conflicts.length > 0) : allRows;
  }, [activeBlocks, selectedHall, selectedMachineFilter, onlyConflicts]);

  const allConflictsList = useMemo(() => {
    const list: Array<{
      machineCode: string;
      machineName: string;
      blockA: ScheduledMoBlock;
      blockB: ScheduledMoBlock;
      overlapHours: number;
      dayLabel: string;
    }> = [];
    machineRows.forEach(r => {
      r.conflicts.forEach(c => {
        const dIdx = c.blockB.dayIndex;
        const dayObj =
          (typeof dIdx === 'number' && dIdx >= 1
            ? workDays.find(d => d.index === dIdx)
            : workDays.find(d => d.isToday)) || workDays[0];
        list.push({
          machineCode: r.machineCode,
          machineName: r.machineName,
          blockA: c.blockA,
          blockB: c.blockB,
          overlapHours: c.overlapHours,
          dayLabel: dayObj ? `${dayObj.name} (${dayObj.date})` : 'امروز',
        });
      });
    });
    return list;
  }, [machineRows, workDays]);

  const totalConflictsCount = allConflictsList.length;

  const conflictingBlockIds = useMemo(() => {
    const ids = new Set<string>();
    machineRows.forEach(r => {
      r.conflicts.forEach(c => {
        ids.add(c.blockA.id);
        ids.add(c.blockB.id);
      });
    });
    return ids;
  }, [machineRows]);

  const selectedBlock = useMemo(
    () => activeBlocks.find(b => b.id === selectedBlockId) || activeBlocks[0] || null,
    [activeBlocks, selectedBlockId]
  );

  // Live conflict detection for selected block on the same machine
  const selectedBlockConflict = useMemo(() => {
    if (!selectedBlock) return null;
    return (
      activeBlocks.find(
        b =>
          b.id !== selectedBlock.id &&
          b.machineCode === selectedBlock.machineCode &&
          Math.max(b.startHour, selectedBlock.startHour) < Math.min(b.endHour, selectedBlock.endHour)
      ) || null
    );
  }, [selectedBlock, activeBlocks]);

  const handleManualTimeChange = (blockId: string, newStartStr: string, newEndStr: string) => {
    const start = timeStringToHour(newStartStr);
    const end = timeStringToHour(newEndStr);
    if (end <= start) return;
    setBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, startHour: start, endHour: end } : b))
    );
  };

  // Focus and jump to a specific machine conflict row
  const handleFocusConflictOnTimeline = (
    machineCode: string,
    blockA: ScheduledMoBlock,
    blockB: ScheduledMoBlock,
    openManualModal = false
  ) => {
    setSelectedHall('ALL');
    setSelectedMachineFilter('ALL');
    setHighlightedMachineCode(machineCode);
    setSelectedBlockId(blockB.id);

    setTimeout(() => {
      rowRefs.current[machineCode]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    if (openManualModal) {
      setManualLevelingConflict({
        machineCode,
        machineName: blockA.machineName,
        blockAId: blockA.id,
        blockBId: blockB.id,
      });
    }
  };

  // Per-machine 1-click Auto-Resolve (تسطیح خودکار تداخل ماشین با احتساب زمان تعویض قالب SMED)
  const handleAutoResolveMachineConflict = (conflict: {
    blockA: ScheduledMoBlock;
    blockB: ScheduledMoBlock;
    overlapHours: number;
  }) => {
    const smedMinutes = conflict.blockB.setupMinutes || 30;
    const smedHours = Number((smedMinutes / 60).toFixed(2));
    const duration = conflict.blockB.endHour - conflict.blockB.startHour;
    const targetStart = Number(Math.min(22 - duration, conflict.blockA.endHour + smedHours).toFixed(2));
    const targetEnd = Number(Math.min(23, targetStart + duration).toFixed(2));

    requestConfirm({
      title: `تسطیح خودکار (Auto-Resolve) — ${conflict.blockA.machineName}`,
      message: `آیا از انتقال خودکار دستور تولید دوم (${conflict.blockB.moNumber} — ${conflict.blockB.partName}) به پس از اتمام دستور اول (${conflict.blockA.moNumber}) به همراه زمان تعویض قالب اطمینان دارید؟`,
      consequences: [
        `پایان دستور اول (${conflict.blockA.moNumber}): ساعت ${formatHourLabel(conflict.blockA.endHour)}`,
        `اعمال زمان تعویض قالب استاندارد (SMED): ${toPersianDigits(smedMinutes)} دقیقه (${conflict.blockB.dieCode})`,
        `بازه جدید دستور دوم (${conflict.blockB.moNumber}): ${formatHourLabel(targetStart)} الی ${formatHourLabel(targetEnd)}`,
      ],
      confirmLabel: 'تأیید و تسطیح خودکار (Auto-Resolve)',
      variant: 'indigo',
      onConfirm: () => {
        const prevSnap = [...blocks];
        setBlocks(prev =>
          prev.map(b =>
            b.id === conflict.blockB.id
              ? {
                  ...b,
                  startHour: targetStart,
                  endHour: targetEnd,
                }
              : b
          )
        );

        recordAudit({
          entityId: conflict.blockB.id,
          entityCode: conflict.blockB.moNumber,
          moduleName: 'تقویم ظرفیت ماشین‌آلات (Auto-Leveling)',
          actionType: 'UPDATE',
          title: `تسطیح خودکار (Auto-Resolve) دستور ${conflict.blockB.moNumber} روی ${conflict.blockB.machineName}`,
          details: `انتقال به ساعت ${formatHourLabel(targetStart)} تا ${formatHourLabel(targetEnd)} (پایان ${conflict.blockA.moNumber} + ${smedMinutes} دقیقه تعویض قالب SMED)`,
        });

        showUndoToast({
          title: `تداخل ماشین «${conflict.blockA.machineName}» به صورت خودکار تسطیح شد`,
          detail: `دستور ${conflict.blockB.moNumber} با احتساب ${toPersianDigits(smedMinutes)} دقیقه تعویض قالب به ساعت ${formatHourLabel(targetStart)} منتقل گردید.`,
          variant: 'success',
          onUndo: () => setBlocks(prevSnap),
        });
      },
    });
  };

  const handleResolveAllConflicts = () => {
    requestConfirm({
      title: 'تایید تسطیح خودکار تداخل‌های زمانی (Auto-Resolve / Auto-Leveling)',
      message: `آیا از جابجایی خودکار ${toPersianDigits(totalConflictsCount)} دستور تولید دارای تداخل زمانی روی پرس‌ها اطمینان دارید؟`,
      consequences: [
        'انتقال دستورهای همپوشان به بلافاصله پس از اتمام دستور اول روی همان ماشین',
        'اضافه شدن دقیق زمان تعویض قالب (SMED Setup Minutes) هر قطعه بین دو دستور کار',
        'ثبت در لاگ حسابرسی (Audit Trail) و امکان بازگردانی کامل برنامه با دکمه لغو (Undo)',
      ],
      confirmLabel: 'تایید و تسطیح خودکار تداخل‌ها',
      variant: 'indigo',
      onConfirm: () => {
        const prevSnap = [...blocks];
        setBlocks(prev => {
          const next = [...prev];
          const byMachine = new Map<string, ScheduledMoBlock[]>();
          next.forEach(b => {
            const list = byMachine.get(b.machineCode) || [];
            list.push({ ...b });
            byMachine.set(b.machineCode, list);
          });

          const resolved: ScheduledMoBlock[] = [];
          byMachine.forEach(list => {
            list.sort((a, b) => a.startHour - b.startHour);
            for (let i = 1; i < list.length; i++) {
              const prevBlock = list[i - 1];
              const currBlock = list[i];
              if (!currBlock.isDeleted && !prevBlock.isDeleted && currBlock.startHour < prevBlock.endHour) {
                const duration = currBlock.endHour - currBlock.startHour;
                const smedHours = Number(((currBlock.setupMinutes || 30) / 60).toFixed(2));
                currBlock.startHour = Number(Math.min(22 - duration, prevBlock.endHour + smedHours).toFixed(2));
                currBlock.endHour = Number(Math.min(23, currBlock.startHour + duration).toFixed(2));
              }
            }
            resolved.push(...list);
          });
          return resolved;
        });

        recordAudit({
          moduleName: 'تقویم ظرفیت ماشین‌آلات (Auto-Leveling)',
          actionType: 'UPDATE',
          title: 'تسطیح خودکار تداخل‌های زمانی ماشین‌آلات (Auto-Resolve)',
          details: 'انتقال دستورات تولید دوم به پایان دستور اول + زمان تعویض قالب (SMED)',
        });

        showUndoToast({
          title: 'تداخل‌های زمانی ماشین‌آلات با احتساب زمان تعویض قالب تسطیح شدند',
          detail: 'تا ۸ ثانیه امکان لغو تسطیح (Undo) وجود دارد.',
          variant: 'success',
          onUndo: () => setBlocks(prevSnap),
        });
      },
    });
  };

  // Slide-over Drawer Edit for any Scheduled MO Block
  const handleEditBlockInDrawer = (block: ScheduledMoBlock) => {
    openQuickEditDrawer({
      title: `ویرایش زمان‌بندی ظرفیت: ${block.moNumber} (${block.operationCode})`,
      subtitle: `قطعه: ${block.partName} — ماشین فعلی: ${block.machineName}`,
      entityId: block.id,
      entityCode: block.moNumber,
      moduleName: 'تقویم ظرفیت ماشین‌آلات',
      fields: [
        { key: 'moNumber', label: 'شماره دستور تولید (MO)', type: 'text' },
        { key: 'partName', label: 'نام قطعه', type: 'text' },
        { key: 'operationCode', label: 'کد ایستگاه (OP)', type: 'text' },
        { key: 'machineName', label: 'نام ماشین / پرس', type: 'text' },
        { key: 'startHour', label: 'ساعت شروع شیفت (۷ تا ۲۲)', type: 'number' },
        { key: 'endHour', label: 'ساعت پایان شیفت (۸ تا ۲۳)', type: 'number' },
        { key: 'quantity', label: 'تیراژ برنامه‌ریزی‌شده (عدد)', type: 'number' },
        { key: 'dieCode', label: 'کد قالب (Die Code)', type: 'text' },
      ],
      initialValues: {
        moNumber: block.moNumber,
        partName: block.partName,
        operationCode: block.operationCode,
        machineName: block.machineName,
        startHour: block.startHour,
        endHour: block.endHour,
        quantity: block.quantity,
        dieCode: block.dieCode,
      },
      onSave: updated => {
        setBlocks(prev =>
          prev.map(b =>
            b.id === block.id
              ? {
                  ...b,
                  moNumber: String(updated.moNumber || b.moNumber),
                  partName: String(updated.partName || b.partName),
                  operationCode: String(updated.operationCode || b.operationCode),
                  machineName: String(updated.machineName || b.machineName),
                  startHour: Math.max(7, Math.min(22, Number(updated.startHour) || b.startHour)),
                  endHour: Math.max(8, Math.min(23, Number(updated.endHour) || b.endHour)),
                  quantity: Math.max(1, Number(updated.quantity) || b.quantity),
                  dieCode: String(updated.dieCode || b.dieCode),
                }
              : b
          )
        );
      },
    });
  };

  // Soft Delete Scheduled Block
  const handleDeleteBlock = (block: ScheduledMoBlock) => {
    requestConfirm({
      title: `حذف منطقی دستور کار از تقویم ظرفیت (${block.moNumber})`,
      message: `آیا از حذف منطقی عملیات «${block.operationCode} — ${block.partName}» از روی ماشین «${block.machineName}» اطمینان دارید؟`,
      consequences: [
        `آزادسازی ظرفیت ماشین ${block.machineName} در بازه ${formatHourLabel(block.startHour)} الی ${formatHourLabel(block.endHour)}`,
        'امکان بازگردانی فوری (Undo) تا ۸ ثانیه پس از حذف',
      ],
      confirmLabel: 'حذف منطقی از گانت',
      variant: 'danger',
      onConfirm: () => {
        const prevSnap = [...blocks];
        setBlocks(prev => prev.map(b => (b.id === block.id ? { ...b, isDeleted: true } : b)));
        recordAudit({
          entityId: block.id,
          entityCode: block.moNumber,
          moduleName: 'تقویم ظرفیت ماشین‌آلات',
          actionType: 'SOFT_DELETE',
          title: `حذف منطقی عملیات ${block.operationCode} (${block.moNumber}) از تقویم ظرفیت`,
          details: `ماشین: ${block.machineName} | قطعه: ${block.partName}`,
        });
        showUndoToast({
          title: `عملیات ${block.moNumber} از گانت ظرفیت حذف منطقی شد`,
          detail: 'برای بازگردانی روی لغو (Undo) کلیک کنید.',
          variant: 'danger',
          onUndo: () => setBlocks(prevSnap),
        });
      },
    });
  };

  const resetDemoConflicts = () => {
    setBlocks(INITIAL_CAPACITY_BLOCKS);
  };

  // Active blocks inside the Manual Leveling Modal
  const manualModalBlockA = manualLevelingConflict
    ? activeBlocks.find(b => b.id === manualLevelingConflict.blockAId) || null
    : null;
  const manualModalBlockB = manualLevelingConflict
    ? activeBlocks.find(b => b.id === manualLevelingConflict.blockBId) || null
    : null;
  const manualModalOverlapHours = useMemo(() => {
    if (!manualModalBlockA || !manualModalBlockB) return 0;
    const start = Math.max(manualModalBlockA.startHour, manualModalBlockB.startHour);
    const end = Math.min(manualModalBlockA.endHour, manualModalBlockB.endHour);
    return end > start ? Number((end - start).toFixed(2)) : 0;
  }, [manualModalBlockA, manualModalBlockB]);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                تقویم ظرفیت ماشین‌آلات و گانت چارت دستورات تولید (Finite Capacity Planning)
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                تسطیح خودکار و دستی (Auto & Manual Leveling)
              </span>
              {totalConflictsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {toPersianDigits(totalConflictsCount)} تداخل زمانی ماشین‌آلات شناسایی شد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  بدون تداخل زمانی (برنامه تسطیح‌شده)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              نمای بصری تخصیص دستورات تولید روی پرس‌ها به همراه <strong>تسطیح خودکار (با احتساب SMED)</strong> و <strong>تسطیح دستی دقیق (انتخابگر ساعت HH:mm)</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalConflictsCount > 0 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const first = allConflictsList[0];
                  if (first) {
                    handleFocusConflictOnTimeline(first.machineCode, first.blockA, first.blockB, true);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تسطیح دستی تداخل‌ها (Manual Leveling)</span>
              </button>
              <button
                type="button"
                onClick={handleResolveAllConflicts}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تسطیح خودکار همه (Auto-Leveling)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={resetDemoConflicts}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              بازنشانی سناریوی تداخل نمونه
            </button>
          )}
        </div>
      </div>

      {/* Interactive Conflict Navigator Strip: Click to jump directly to the conflicting machine/day */}
      {allConflictsList.length > 0 && (
        <div className="bg-rose-50/90 border border-rose-300 rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                فهرست تداخل‌های شناسایی‌شده در تقویم کاری (روی هر تداخل کلیک کنید تا مستقیم روی همان ماشین و ساعت برود):
              </span>
            </div>
            <span className="text-[11px] text-rose-700 font-bold">
              امکان انتخاب بین «تسطیح دستی (ساعت دلخواه)» و «تسطیح خودکار (پایان دستور اول + SMED)»
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allConflictsList.map((conf, idx) => (
              <div
                key={idx}
                onClick={() => handleFocusConflictOnTimeline(conf.machineCode, conf.blockA, conf.blockB, false)}
                className="bg-white border border-rose-200 hover:border-rose-400 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                      {conf.machineCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{conf.machineName}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {conf.dayLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    تداخل <strong>{toPersianDigits(conf.overlapHours)} ساعت</strong> بین{' '}
                    <span className="font-mono font-bold text-slate-800">{conf.blockA.moNumber}</span> (تا{' '}
                    {formatHourLabel(conf.blockA.endHour)}) و{' '}
                    <span className="font-mono font-bold text-rose-700">{conf.blockB.moNumber}</span> (از{' '}
                    {formatHourLabel(conf.blockB.startHour)})
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() =>
                      handleFocusConflictOnTimeline(conf.machineCode, conf.blockA, conf.blockB, true)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>تسطیح دستی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoResolveMachineConflict(conf)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>تسطیح خودکار</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Strip & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>دستورات تولید زمان‌بندی‌شده</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {toPersianDigits(activeBlocks.length)} <span className="text-xs font-sans font-normal text-slate-500">عملیات MO</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>تداخل‌های زمانی (Overlaps)</span>
            <AlertTriangle className={`w-4 h-4 ${totalConflictsCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${totalConflictsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {toPersianDigits(totalConflictsCount)}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              {totalConflictsCount > 0 ? 'مورد نیازمند تصمیم‌گیری' : 'تداخل صفر'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>متوسط ضریب اشغال پرس‌ها</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">
            {toPersianDigits(
              machineRows.length > 0
                ? Math.round(machineRows.reduce((s, r) => s + r.utilizationPercent, 0) / machineRows.length)
                : 0
            )}
            ٪ <span className="text-xs font-sans font-normal text-slate-500">در ۲ شیفت کاری</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>فیلتر سالن:</span>
            </div>
            <select
              value={selectedHall}
              onChange={e => setSelectedHall(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">همه سالن‌ها</option>
              {dynamicHallList.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-700 font-medium cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={onlyConflicts}
              onChange={e => setOnlyConflicts(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span>فقط نمایش ماشین‌آلات دارای تداخل زمانی</span>
          </label>
        </div>
      </div>

      {/* Main Minimal Visual Gantt / Timeline Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Legend & Shift Indicators */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700">راهنمای وضعیت دستور کار روی گانت:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
              <span className="text-slate-700">در حال تولید (In Progress)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
              <span className="text-slate-700">برنامه‌ریزی شده (Scheduled)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-500 inline-block" />
              <span className="text-slate-700">تکمیل شده (Completed)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-600 ring-2 ring-rose-300 inline-block" />
              <span className="font-bold text-rose-700">تداخل زمانی ماشین (Time Conflict)</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-sans">
              شیفت صبح (A): ۰۷:۰۰ تا ۱۵:۰۰
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-sans">
              شیفت عصر (B): ۱۵:۰۰ تا ۲۳:۰۰
            </span>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            {/* Time Axis Header */}
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600">
              <div className="col-span-3 py-2.5 px-4 border-l border-slate-200 flex items-center justify-between">
                <span>ماشین / خط تولید (Work Center)</span>
                <span className="text-[10px] text-slate-400">بارگذاری</span>
              </div>
              <div className="col-span-9 relative py-2.5 px-2">
                <div className="grid grid-cols-16 text-center font-mono text-[10px] text-slate-500">
                  {HOURS_AXIS.slice(0, 16).map(hr => (
                    <div key={hr} className="border-r border-slate-200/70 first:border-r-0">
                      {toPersianDigits(String(hr).padStart(2, '0'))}:۰۰
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Machine Rows */}
            <div className="divide-y divide-slate-200">
              {machineRows.map(row => {
                const hasConflict = row.conflicts.length > 0;
                const isHighlighted = highlightedMachineCode === row.machineCode;
                return (
                  <div
                    key={row.machineCode}
                    ref={el => {
                      rowRefs.current[row.machineCode] = el;
                    }}
                    className={`grid grid-cols-12 transition-all ${
                      isHighlighted
                        ? 'bg-amber-50/70 ring-2 ring-inset ring-amber-400'
                        : hasConflict
                        ? 'bg-rose-50/20'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Right Column: Machine Info */}
                    <div className="col-span-3 p-3.5 border-l border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {row.machineCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                            {row.tonnageLabel}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1.5">{row.machineName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{row.hall}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">ضریب اشغال شیفت:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                hasConflict
                                  ? 'bg-rose-600'
                                  : row.utilizationPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${row.utilizationPercent}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {toPersianDigits(row.utilizationPercent)}٪
                          </span>
                        </div>
                      </div>

                      {hasConflict && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[10px] space-y-2">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              تداخل: {toPersianDigits(row.conflicts[0].overlapHours)} ساعت همپوشانی
                            </span>
                            <span className="font-mono text-[9px] text-rose-700">
                              SMED: +{toPersianDigits(row.conflicts[0].blockB.setupMinutes || 30)}m
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleFocusConflictOnTimeline(
                                  row.machineCode,
                                  row.conflicts[0].blockA,
                                  row.conflicts[0].blockB,
                                  true
                                )
                              }
                              className="py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>تسطیح دستی</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutoResolveMachineConflict(row.conflicts[0])}
                              className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>تسطیح خودکار</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Left Column: 16-Hour Visual Gantt Track (07:00 to 23:00) */}
                    <div className="col-span-9 relative min-h-[96px] p-2 flex items-center">
                      <div className="absolute inset-0 grid grid-cols-16 pointer-events-none">
                        {HOURS_AXIS.slice(0, 16).map(hr => (
                          <div
                            key={hr}
                            className={`border-r h-full ${
                              hr === 15
                                ? 'border-r-2 border-dashed border-amber-400/70 bg-blue-50/10'
                                : 'border-slate-100'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="relative w-full h-20">
                        {row.items.map((item, idx) => {
                          const totalSpan = 16;
                          const startOffset = Math.max(0, item.startHour - 7);
                          const duration = Math.max(0.8, item.endHour - item.startHour);
                          const rightPercent = Math.min(95, (startOffset / totalSpan) * 100);
                          const widthPercent = Math.min(100 - rightPercent, (duration / totalSpan) * 100);
                          const isConflicting = conflictingBlockIds.has(item.id);
                          const isSelected = selectedBlock?.id === item.id;

                          const topClass = isConflicting
                            ? idx % 2 === 0
                              ? 'top-0.5 h-10'
                              : 'bottom-0.5 h-10'
                            : 'top-2 bottom-2';

                          const colorClass = isConflicting
                            ? 'bg-rose-600/95 hover:bg-rose-600 text-white border-rose-800 ring-2 ring-rose-300'
                            : item.status === 'IN_PROGRESS'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                            : item.status === 'COMPLETED'
                            ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700';

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedBlockId(item.id);
                                setHighlightedMachineCode(row.machineCode);
                              }}
                              style={{
                                right: `${rightPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              className={`absolute ${topClass} rounded-xl border px-2.5 py-1 text-right shadow-xs transition-all cursor-pointer flex flex-col justify-center overflow-hidden ${colorClass} ${
                                isSelected ? 'ring-2 ring-amber-400 z-20 scale-[1.01]' : 'z-10'
                              }`}
                              title={`${item.moNumber} | ${item.partName} (${formatHourLabel(item.startHour)} - ${formatHourLabel(item.endHour)})`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold leading-tight">
                                <span className="truncate">{item.moNumber}</span>
                                <span className="px-1 py-0.2 rounded bg-black/20 text-[9px] shrink-0">
                                  {item.operationCode}
                                </span>
                              </div>
                              <div className="text-[10px] font-sans truncate opacity-95 leading-tight mt-0.5">
                                {item.partName}
                              </div>
                              <div className="flex items-center justify-between text-[9px] opacity-85 font-mono mt-0.5">
                                <span>
                                  {formatHourLabel(item.startHour)} تا {formatHourLabel(item.endHour)}
                                </span>
                                <span>{formatNumber(item.quantity)} عدد</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected MO Operation Inspector, Pencil Drawer Edit & Conflict Resolution Panel */}
      {selectedBlock && (
        <div
          ref={inspectorRef}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
        >
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-mono text-xs font-bold">
                  {selectedBlock.moNumber}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                  {selectedBlock.operationCode}: {selectedBlock.operationTitle}
                </span>
                <span className="text-sm font-bold text-slate-900">{selectedBlock.partName}</span>
                {conflictingBlockIds.has(selectedBlock.id) && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    دارای تداخل زمانی روی {selectedBlock.machineName}
                  </span>
                )}
              </div>

              {/* Pencil Drawer Edit & Soft Delete Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEditBlockInDrawer(selectedBlock)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ویرایش در کشو</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(selectedBlock)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition cursor-pointer"
                  title="حذف منطقی از گانت"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">ماشین تخصیص‌یافته</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedBlock.machineName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">بازه زمانی شیفت</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {formatHourLabel(selectedBlock.startHour)} الی {formatHourLabel(selectedBlock.endHour)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">تیراژ دستور تولید</span>
                <span className="font-mono font-bold text-emerald-700 mt-0.5 block">
                  {formatNumber(selectedBlock.quantity)} قطعه
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">کد قالب و زمان ستاپ (SMED)</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {selectedBlock.dieCode} ({toPersianDigits(selectedBlock.setupMinutes)}m)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">قرارداد پشتوانه</span>
                <span className="font-mono font-bold text-indigo-700 mt-0.5 block">
                  {selectedBlock.contractNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Time Shift Controls for Selected MO (HH:mm Time Pickers & Conflict Detection) */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                تسطیح دستی زمان‌بندی (Time Picker HH:mm):
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">{selectedBlock.machineCode}</span>
            </div>

            {/* Manual Start & End Time Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>ساعت شروع</span>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">
                    {formatHourLabel(selectedBlock.startHour)}
                  </span>
                </label>
                <input
                  type="time"
                  step="300"
                  value={hourToTimeString(selectedBlock.startHour)}
                  onChange={e => {
                    const startStr = e.target.value;
                    const curDuration = selectedBlock.endHour - selectedBlock.startHour;
                    const newStartHr = timeStringToHour(startStr);
                    const newEndHr = Number((newStartHr + curDuration).toFixed(2));
                    handleManualTimeChange(selectedBlock.id, startStr, hourToTimeString(newEndHr));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>ساعت پایان</span>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">
                    {formatHourLabel(selectedBlock.endHour)}
                  </span>
                </label>
                <input
                  type="time"
                  step="300"
                  value={hourToTimeString(selectedBlock.endHour)}
                  onChange={e => {
                    const endStr = e.target.value;
                    handleManualTimeChange(selectedBlock.id, hourToTimeString(selectedBlock.startHour), endStr);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer text-center"
                />
              </div>
            </div>

            {/* Duration Display */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs">
              <span className="text-[11px] text-indigo-800">طول مدت زمان‌بندی:</span>
              <span className="font-mono font-bold text-indigo-950">
                {toPersianDigits(Math.floor(selectedBlock.endHour - selectedBlock.startHour))} ساعت و{' '}
                {toPersianDigits(Math.round(((selectedBlock.endHour - selectedBlock.startHour) % 1) * 60))} دقیقه
              </span>
            </div>

            {/* Live Conflict Warning Banner */}
            {selectedBlockConflict ? (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تداخل با دستور {selectedBlockConflict.moNumber}</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  تداخل در بازه {formatHourLabel(Math.max(selectedBlock.startHour, selectedBlockConflict.startHour))} تا{' '}
                  {formatHourLabel(Math.min(selectedBlock.endHour, selectedBlockConflict.endHour))} روی{' '}
                  {selectedBlock.machineName}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setManualLevelingConflict({
                        machineCode: selectedBlock.machineCode,
                        machineName: selectedBlock.machineName,
                        blockAId:
                          selectedBlock.startHour <= selectedBlockConflict.startHour
                            ? selectedBlock.id
                            : selectedBlockConflict.id,
                        blockBId:
                          selectedBlock.startHour <= selectedBlockConflict.startHour
                            ? selectedBlockConflict.id
                            : selectedBlock.id,
                      })
                    }
                    className="py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    پنل تسطیح دستی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const smedHours = Number(((selectedBlock.setupMinutes || 30) / 60).toFixed(2));
                      const duration = selectedBlock.endHour - selectedBlock.startHour;
                      const nextStart = Number((selectedBlockConflict.endHour + smedHours).toFixed(2));
                      const nextEnd = Number(Math.min(23.5, nextStart + duration).toFixed(2));
                      handleManualTimeChange(
                        selectedBlock.id,
                        hourToTimeString(nextStart),
                        hourToTimeString(nextEnd)
                      );
                      showUndoToast({
                        title: `دستور ${selectedBlock.moNumber} به ساعت آزاد بعدی (${formatHourLabel(nextStart)}) منتقل شد`,
                        onUndo: () => {
                          handleManualTimeChange(
                            selectedBlock.id,
                            hourToTimeString(selectedBlock.startHour),
                            hourToTimeString(selectedBlock.endHour)
                          );
                        },
                      });
                    }}
                    className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs"
                  >
                    تسطیح خودکار
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium">زمان‌بندی فاقد تداخل روی {selectedBlock.machineCode} است.</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/80">
                <span>پیشنهادهای MRP آماده زمان‌بندی:</span>
                <span className="font-mono font-bold text-slate-800">{toPersianDigits(suggestions.length)} دستور</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Manual Leveling Modal (تسطیح دستی تداخل زمانی روی ماشین) */}
      {manualLevelingConflict && manualModalBlockA && manualModalBlockB && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setManualLevelingConflict(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-300">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    میز تسطیح دستی تداخل زمانی (Manual Capacity Leveling)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دستگاه: <strong>{manualLevelingConflict.machineName}</strong> ({manualLevelingConflict.machineCode}) • تنظیم دستی ساعت شروع و پایان هر دو دستور تولید
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualLevelingConflict(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Overlap Status Indicator */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                manualModalOverlapHours > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {manualModalOverlapHours > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      در حال حاضر {toPersianDigits(manualModalOverlapHours)} ساعت همپوشانی زمانی بین دو دستور وجود دارد.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      تداخل زمانی به طور کامل برطرف شد! (همپوشانی: ۰ ساعت)
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono text-[11px] font-bold">
                زمان تعویض قالب دوم (SMED): {toPersianDigits(manualModalBlockB.setupMinutes || 30)} دقیقه
              </span>
            </div>

            {/* Side-by-Side Order Time Editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Block A Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-xs font-bold">
                    ۱. {manualModalBlockA.moNumber}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    {manualModalBlockA.operationCode} • {formatNumber(manualModalBlockA.quantity)} عدد
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">{manualModalBlockA.partName}</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">
                      ساعت شروع ({formatHourLabel(manualModalBlockA.startHour)})
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={hourToTimeString(manualModalBlockA.startHour)}
                      onChange={e =>
                        handleManualTimeChange(
                          manualModalBlockA.id,
                          e.target.value,
                          hourToTimeString(manualModalBlockA.endHour)
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">
                      ساعت پایان ({formatHourLabel(manualModalBlockA.endHour)})
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={hourToTimeString(manualModalBlockA.endHour)}
                      onChange={e =>
                        handleManualTimeChange(
                          manualModalBlockA.id,
                          hourToTimeString(manualModalBlockA.startHour),
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Block B Card */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-xs font-bold">
                    ۲. {manualModalBlockB.moNumber}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    {manualModalBlockB.operationCode} • {formatNumber(manualModalBlockB.quantity)} عدد
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">{manualModalBlockB.partName}</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">
                      ساعت شروع ({formatHourLabel(manualModalBlockB.startHour)})
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={hourToTimeString(manualModalBlockB.startHour)}
                      onChange={e => {
                        const newStart = timeStringToHour(e.target.value);
                        const dur = manualModalBlockB.endHour - manualModalBlockB.startHour;
                        handleManualTimeChange(
                          manualModalBlockB.id,
                          e.target.value,
                          hourToTimeString(Math.min(23, newStart + dur))
                        );
                      }}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">
                      ساعت پایان ({formatHourLabel(manualModalBlockB.endHour)})
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={hourToTimeString(manualModalBlockB.endHour)}
                      onChange={e =>
                        handleManualTimeChange(
                          manualModalBlockB.id,
                          hourToTimeString(manualModalBlockB.startHour),
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>

                {/* Quick Preset Shifts for Manual Convenience */}
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const smedHr = Number(((manualModalBlockB.setupMinutes || 30) / 60).toFixed(2));
                      const dur = manualModalBlockB.endHour - manualModalBlockB.startHour;
                      const start = Number((manualModalBlockA.endHour + smedHr).toFixed(2));
                      const end = Number(Math.min(23, start + dur).toFixed(2));
                      handleManualTimeChange(
                        manualModalBlockB.id,
                        hourToTimeString(start),
                        hourToTimeString(end)
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold cursor-pointer"
                  >
                    چسباندن به پایان دستور اول + {toPersianDigits(manualModalBlockB.setupMinutes || 30)}m ستاپ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dur = manualModalBlockB.endHour - manualModalBlockB.startHour;
                      handleManualTimeChange(
                        manualModalBlockB.id,
                        '15:00',
                        hourToTimeString(Math.min(23, 15 + dur))
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer"
                  >
                    انتقال به ابتدای شیفت عصر (۱۵:۰۰)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setManualLevelingConflict(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                تایید و بستن میز تسطیح دستی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
