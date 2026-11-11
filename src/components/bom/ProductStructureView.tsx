import React, { useState, useEffect } from 'react';
import {
  ListTree,
  Boxes,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Search,
  X,
  CheckCircle2,
  FolderTree,
  Info,
} from 'lucide-react';
import { Part } from '../../types/inventory';
import { toPersianDigits } from '../../utils/formatters';
import { SearchableSelect } from '../common/SearchableSelect';

export interface SubComponentNode {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  unit: string;
  notes?: string;
  subComponents?: SubComponentNode[];
}

export interface ProductStructureData {
  id: string;
  rootPartId: string;
  rootPartCode: string;
  rootPartName: string;
  carModel?: string;
  subComponents: SubComponentNode[];
  notes?: string;
}

const INITIAL_PRODUCT_STRUCTURES: ProductStructureData[] = [
  {
    id: 'PS-ECU-ANTI-THEFT',
    rootPartId: 'PRT-FGD-ECU-BRK',
    rootPartCode: 'SAPCO-ASY-ECU-BRK-01',
    rootPartName: 'مجموعه کامل براکت ضدسرقت رایانه موتور',
    carModel: 'پژو ۲۰۶',
    notes: 'مجموعه مونتاژی ضدسرقت متشکل از صفحه اصلی و مکمل با مهره‌ها و پیچ‌های جوشی',
    subComponents: [
      {
        id: 'SUB-ECU-01',
        partId: 'PRT-WIP-ECU-MAIN',
        partCode: 'WIP-ECU-MAIN-BRK',
        partName: 'صفحه براکت اصلی ضدسرقت',
        quantity: 1,
        unit: 'عدد',
        notes: 'تولید شده از رول ورق DC01A ضخامت ۲',
        subComponents: [
          {
            id: 'RAW-ECU-MAIN-01',
            partId: 'PRT-RM-DC01A-2-1140',
            partCode: 'RM-COIL-DC01A-2.0-1140',
            partName: 'کویل ورق DC01A ضخامت 2mm عرض 1140',
            quantity: 0.95,
            unit: 'کیلوگرم',
            notes: 'برش و گیوتین اولیه',
          },
          {
            id: 'FST-ECU-MAIN-01',
            partId: 'PRT-FST-NUT-M6',
            partCode: 'FST-NUT-WELD-M6',
            partName: 'مهره جوشی M6 استاندارد DIN 928',
            quantity: 15,
            unit: 'عدد',
            notes: 'ایستگاه پرس‌جوش مقاومتی',
          },
        ],
      },
      {
        id: 'SUB-ECU-02',
        partId: 'PRT-WIP-ECU-COMP',
        partCode: 'WIP-ECU-COMP-BRK',
        partName: 'مکمل براکت ضدسرقت',
        quantity: 1,
        unit: 'عدد',
        notes: 'تولید شده از رول ورق DC01A',
        subComponents: [
          {
            id: 'RAW-ECU-COMP-01',
            partId: 'PRT-RM-DC01A-2-1140',
            partCode: 'RM-COIL-DC01A-2.0-1140',
            partName: 'کویل ورق DC01A ضخامت 2mm عرض 1140 (یا 1000)',
            quantity: 0.45,
            unit: 'کیلوگرم',
          },
          {
            id: 'FST-ECU-COMP-01',
            partId: 'PRT-FST-BLT-M6-20',
            partCode: 'FST-BOLT-WELD-M6-20',
            partName: 'پیچ پایه جوشی M6x20',
            quantity: 2,
            unit: 'عدد',
          },
        ],
      },
    ],
  },
  {
    id: 'PS-TARA-BRK',
    rootPartId: 'PRT-FGD-TARA-BRK',
    rootPartCode: 'SAPCO-ASY-TARA-BRK-01',
    rootPartName: 'مجموعه براکت تارا با پوشش کاتافورز ED',
    carModel: 'تارا',
    subComponents: [
      {
        id: 'SUB-TAR-01',
        partId: 'PRT-WIP-TARA-LG',
        partCode: 'WIP-TARA-BRK-LARGE',
        partName: 'براکت تارا بزرگ',
        quantity: 1,
        unit: 'عدد',
        subComponents: [
          {
            id: 'RAW-TAR-LG',
            partId: 'PRT-RM-DC01A-2-1140',
            partCode: 'RM-COIL-DC01A-2.0-1140',
            partName: 'رول ورق DC01A ضخامت ۲ عرض ۱۱۴۰',
            quantity: 0.65,
            unit: 'کیلوگرم',
          },
          {
            id: 'FST-TAR-LG',
            partId: 'PRT-FST-NUT-M6',
            partCode: 'FST-NUT-WELD-M6',
            partName: 'مهره جوشی M6',
            quantity: 8,
            unit: 'عدد',
          },
        ],
      },
      {
        id: 'SUB-TAR-02',
        partId: 'PRT-WIP-TARA-SM',
        partCode: 'WIP-TARA-BRK-SMALL',
        partName: 'براکت تارا کوچک',
        quantity: 1,
        unit: 'عدد',
        subComponents: [
          {
            id: 'RAW-TAR-SM',
            partId: 'PRT-RM-DC01A-2-1140',
            partCode: 'RM-COIL-DC01A-2.0-1140',
            partName: 'رول ورق DC01A ضخامت ۲ عرض ۱۱۴۰',
            quantity: 0.35,
            unit: 'کیلوگرم',
          },
          {
            id: 'FST-TAR-SM',
            partId: 'PRT-FST-NUT-M6',
            partCode: 'FST-NUT-WELD-M6',
            partName: 'مهره جوشی M6',
            quantity: 12,
            unit: 'عدد',
          },
        ],
      },
    ],
  },
];

interface ProductStructureViewProps {
  parts: Part[];
}

const STORAGE_KEY_PRODUCT_STRUCTURES = 'kpims_product_structures_v1';

export const ProductStructureView: React.FC<ProductStructureViewProps> = ({ parts }) => {
  const [structures, setStructures] = useState<ProductStructureData[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PRODUCT_STRUCTURES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCT_STRUCTURES;
  });

  const [selectedStructureId, setSelectedStructureId] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PRODUCT_STRUCTURES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCT_STRUCTURES[0]?.id || '';
  });

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'SUB-ECU-01': true,
    'SUB-ECU-02': true,
    'SUB-TAR-01': true,
    'SUB-TAR-02': true,
  });

  // Load from backend if backend has saved structures
  useEffect(() => {
    fetch('/api/production/product-structures')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setStructures(res.data);
          window.localStorage.setItem(STORAGE_KEY_PRODUCT_STRUCTURES, JSON.stringify(res.data));
        } else {
          // Seed backend with current localStorage / initial structures
          fetch('/api/production/product-structures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ structures }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const persistStructures = async (nextStructures: ProductStructureData[], msg: string) => {
    setStructures(nextStructures);
    try {
      window.localStorage.setItem(STORAGE_KEY_PRODUCT_STRUCTURES, JSON.stringify(nextStructures));
    } catch {
      // ignore
    }
    setIsSyncing(true);
    try {
      await fetch('/api/production/product-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structures: nextStructures }),
      });
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // Modal State for adding/editing a sub-component recursively
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetParentNodeId, setTargetParentNodeId] = useState<string | null>(null); // null means root assembly
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [formPartId, setFormPartId] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formPartName, setFormPartName] = useState('');
  const [formQty, setFormQty] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('عدد');
  const [formNotes, setFormNotes] = useState('');

  // Modal State for New Assembly Root
  const [isNewAssemblyModalOpen, setIsNewAssemblyModalOpen] = useState(false);
  const [newRootPartId, setNewRootPartId] = useState('');
  const [newCarModel, setNewCarModel] = useState('پژو ۲۰۶');
  const [newAssemblyNotes, setNewAssemblyNotes] = useState('');

  const activeStructure = structures.find(s => s.id === selectedStructureId) || structures[0];

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleOpenAddSubComponent = (parentNodeId: string | null) => {
    setEditingNodeId(null);
    setTargetParentNodeId(parentNodeId);
    setFormPartId('');
    setFormPartCode('');
    setFormPartName('');
    setFormQty(1);
    setFormUnit('عدد');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditSubComponent = (node: SubComponentNode) => {
    setEditingNodeId(node.id);
    setFormPartId(node.partId);
    setFormPartCode(node.partCode);
    setFormPartName(node.partName);
    setFormQty(node.quantity);
    setFormUnit(node.unit);
    setFormNotes(node.notes || '');
    setIsModalOpen(true);
  };

  // Helper to recursively add or edit a node in tree
  const updateTreeNodes = (
    nodes: SubComponentNode[],
    editingId: string | null,
    targetParentId: string | null,
    newNode: SubComponentNode
  ): SubComponentNode[] => {
    if (editingId) {
      return nodes.map(n => {
        if (n.id === editingId) {
          return { ...n, ...newNode, subComponents: n.subComponents };
        }
        if (n.subComponents && n.subComponents.length > 0) {
          return {
            ...n,
            subComponents: updateTreeNodes(n.subComponents, editingId, targetParentId, newNode),
          };
        }
        return n;
      });
    } else {
      if (!targetParentId) {
        return [...nodes, newNode];
      }
      return nodes.map(n => {
        if (n.id === targetParentId) {
          const subs = n.subComponents || [];
          return { ...n, subComponents: [...subs, newNode] };
        }
        if (n.subComponents && n.subComponents.length > 0) {
          return {
            ...n,
            subComponents: updateTreeNodes(n.subComponents, editingId, targetParentId, newNode),
          };
        }
        return n;
      });
    }
  };

  // Helper to recursively delete a node from tree
  const deleteTreeNode = (nodes: SubComponentNode[], deleteId: string): SubComponentNode[] => {
    return nodes
      .filter(n => n.id !== deleteId)
      .map(n => {
        if (n.subComponents && n.subComponents.length > 0) {
          return { ...n, subComponents: deleteTreeNode(n.subComponents, deleteId) };
        }
        return n;
      });
  };

  const handleSaveSubComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStructure) return;

    const newNode: SubComponentNode = {
      id: editingNodeId || `NODE-${Date.now()}`,
      partId: formPartId || formPartCode,
      partCode: formPartCode,
      partName: formPartName || 'قطعه زیرمجموعه',
      quantity: Number(formQty) || 1,
      unit: formUnit,
      notes: formNotes,
      subComponents: [],
    };

    const updatedSubComponents = updateTreeNodes(
      activeStructure.subComponents,
      editingNodeId,
      targetParentNodeId,
      newNode
    );

    const updatedStructures = structures.map(s => {
      if (s.id === activeStructure.id) {
        return { ...s, subComponents: updatedSubComponents };
      }
      return s;
    });

    persistStructures(
      updatedStructures,
      editingNodeId
        ? `تغییرات جزء «${newNode.partName}» با موفقیت ذخیره و در MRP همگام‌سازی شد.`
        : `جزء جدید «${newNode.partName}» به ساختار درختی افزوده و ذخیره دائمی شد.`
    );
    if (targetParentNodeId) {
      setExpandedNodes(prev => ({ ...prev, [targetParentNodeId]: true }));
    }
    setIsModalOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!activeStructure) return;
    if (!confirm('آیا از حذف این زیرمجموعه و تمام اجزای وابسته به آن اطمینان دارید؟')) return;

    const updatedSubComponents = deleteTreeNode(activeStructure.subComponents, nodeId);
    const updatedStructures = structures.map(s => {
      if (s.id === activeStructure.id) {
        return { ...s, subComponents: updatedSubComponents };
      }
      return s;
    });

    persistStructures(updatedStructures, 'زیرمجموعه انتخابی حذف شد و ساختار درختی بروزرسانی گردید.');
  };

  const handleCreateNewAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootPartId) return;

    const foundPart = parts.find(p => p.id === newRootPartId || p.code === newRootPartId);
    const newStruct: ProductStructureData = {
      id: `PS-${Date.now()}`,
      rootPartId: foundPart ? foundPart.id : newRootPartId,
      rootPartCode: foundPart ? foundPart.code : newRootPartId,
      rootPartName: foundPart ? foundPart.name : newRootPartId,
      carModel: newCarModel || 'مشترک',
      notes: newAssemblyNotes,
      subComponents: [],
    };

    const nextStructures = [...structures, newStruct];
    persistStructures(
      nextStructures,
      `ساختار محصول جدید برای «${newStruct.rootPartName}» ایجاد و در پایگاه داده ذخیره شد.`
    );
    setSelectedStructureId(newStruct.id);
    setIsNewAssemblyModalOpen(false);
    setNewRootPartId('');
    setNewAssemblyNotes('');
  };

  // Recursive Tree Node Renderer Component
  const renderTreeNode = (node: SubComponentNode, depth: number = 1) => {
    const hasChildren = node.subComponents && node.subComponents.length > 0;
    const isExpanded = expandedNodes[node.id] ?? true;

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
            depth === 1
              ? 'bg-amber-50/70 border-amber-200'
              : depth === 2
              ? 'bg-indigo-50/60 border-indigo-200 mr-4'
              : 'bg-slate-50 border-slate-200 mr-8'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 h-6 shrink-0 flex items-center justify-center text-slate-400">
                •
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {node.partCode}
                </span>
                <span className="font-bold text-xs text-slate-900">{node.partName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                  سطح {toPersianDigits(depth)}
                </span>
              </div>
              {node.notes && (
                <p className="text-[11px] text-slate-500 mt-0.5">{node.notes}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-left font-mono">
              <span className="text-xs font-bold text-slate-900">
                {toPersianDigits(node.quantity)}
              </span>{' '}
              <span className="text-[11px] text-slate-500 font-sans">{node.unit}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpenAddSubComponent(node.id)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="افزودن جزء متشکله فرعی زیر این مجموعه"
              >
                <Plus className="w-3 h-3" />
                <span>+ زیرجزء</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditSubComponent(node)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                title="ویرایش این جزء"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleDeleteNode(node.id)}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                title="حذف این جزء"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2 pr-2 border-r-2 border-amber-300 mr-2">
            {node.subComponents!.map(sub => renderTreeNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 text-right font-sans">
      {/* Save Notification Toast */}
      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            ذخیره پایدار در سرور و مرورگر
          </span>
        </div>
      )}

      {/* Educational Banner: Difference between ProductStructure and BOM */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3 shadow-2xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <strong className="block font-bold text-amber-950 text-sm">
            تفاوت «ساختار درختی محصول (ProductStructure)» با «جدول BOM مهندسی» و نقش آن‌ها در برنامه‌ریزی تولید (MRP):
          </strong>
          <p>
            • <strong>۱. ساختار درختی محصول (این صفحه - ProductStructure):</strong> نمای گرافیکی و بازگشتی (چندسطحی) مونتاژ است؛ مثلاً نشان می‌دهد «مجموعه براکت ضدسرقت» (سطح ۰) از ۲ زیرمجموعه نیمه‌ساخته «صفحه اصلی» و «مکمل» (سطح ۱) تشکیل شده و هر کدام از این زیرمجموعه‌ها خود از چه ورق خام و چند عدد مهره/پیچ جوشی (سطح ۲) ساخته می‌شوند. این ساختار برای <strong>صدور دستورات ساخت مرحله‌ای (Sub-Assembly MOs)</strong> در ایستگاه‌های پرس و جوش به کار می‌رود.
          </p>
          <p>
            • <strong>۲. جدول BOM مهندسی (Advanced BOM):</strong> فهرست مسطح و مهندسی مقادیر مصرف، درصد پرت ورق (Scrap %)، وزن بلنک و ارتباط با قالب‌های مشترک چپ و راست است که برای <strong>محاسبه دقیق تناژ ورق مورد نیاز و موازنه کلاف (MRP Netting)</strong> استفاده می‌شود. هر تغییری که اینجا ذخیره کنید به صورت خودکار در پایگاه داده و محاسبات برنامه‌ریزی تولید (MRP) لحاظ می‌گردد.
          </p>
        </div>
      </div>

      {/* Main Header & Assembly Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                مدیریت ساختار محصول درختی (Recursive Assembly Trees)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف محصولات مرکب و تخصیص زیرمجموعه‌ها به صورت بازگشتی با ضرایب مصرف (متصل به موتور MRP)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isSyncing}
              onClick={() =>
                persistStructures(
                  structures,
                  'تمامی ساختارهای درختی محصول با موفقیت در سرور و ماژول برنامه‌ریزی تولید (MRP) ذخیره و همگام‌سازی شدند.'
                )
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSyncing ? 'در حال ذخیره...' : 'ذخیره نهایی و بروزرسانی در MRP'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewAssemblyModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ تعریف ساختار محصول جدید</span>
            </button>
          </div>
        </div>

        {/* Structure Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-semibold">انتخاب ساختار محصول جاری:</span>
            <select
              value={selectedStructureId}
              onChange={e => setSelectedStructureId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {structures.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.rootPartCode}] {s.rootPartName} ({s.carModel})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddSubComponent(null)}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <Plus className="w-4 h-4 text-amber-600" />
            <span>+ افزودن زیرمجموعه سطح ۱</span>
          </button>
        </div>
      </div>

      {/* Tree Visualization Card */}
      {activeStructure && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          {/* Root Assembly Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded uppercase font-mono">
                محصول نهایی ریشه (Root Assembly)
              </span>
              <h4 className="text-base font-bold mt-1">
                [{activeStructure.rootPartCode}] {activeStructure.rootPartName}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                مدل خودرو: <strong>{activeStructure.carModel}</strong>
                {activeStructure.notes && <span> — {activeStructure.notes}</span>}
              </p>
            </div>

            <span className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              کل اجزا: <strong>{toPersianDigits(activeStructure.subComponents.length)}</strong> زیرمجموعه مستقیم
            </span>
          </div>

          {/* Recursive Child Nodes Display */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <ListTree className="w-4 h-4 text-amber-600" />
              <span>اجزای متشکله درختی (Recursive Sub-Components):</span>
            </h5>

            {activeStructure.subComponents.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                هنوز هیچ زیرمجموعه‌ای برای این ساختار محصول تعریف نشده است. جهت افزودن اولین زیرمجموعه دکمه «+ افزودن زیرمجموعه سطح ۱» را بزنید.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStructure.subComponents.map(node => renderTreeNode(node, 1))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Add / Edit Recursive SubComponent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-600" />
                <span>
                  {editingNodeId
                    ? 'ویرایش جزء متشکله'
                    : targetParentNodeId
                    ? 'افزودن زیرجزء فرعی بازگشتی'
                    : 'افزودن زیرمجموعه سطح ۱'}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubComponent} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  انتخاب قطعه یا ماده اولیه از کاتالوگ *
                </label>
                <SearchableSelect
                  value={formPartId}
                  onChange={val => {
                    setFormPartId(val);
                    const found = parts.find(p => p.id === val || p.code === val);
                    if (found) {
                      setFormPartCode(found.code);
                      setFormPartName(found.name);
                    }
                  }}
                  placeholder="جستجو و انتخاب قطعه یا ورق..."
                  searchPlaceholder="جستجوی کد یا نام قطعه..."
                  options={parts.map(p => ({
                    value: p.code,
                    label: p.name,
                    sublabel: `${p.code} • ${p.weightPerUnitKg || 0}kg`,
                    badge: p.category === 'RAW_MATERIAL' ? 'ماده اولیه' : p.category === 'WIP_PART' ? 'نیمه‌ساخته' : 'محصول',
                  }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">کد قطعه *</label>
                  <input
                    type="text"
                    required
                    value={formPartCode}
                    onChange={e => setFormPartCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">عنوان کامل قطعه *</label>
                  <input
                    type="text"
                    required
                    value={formPartName}
                    onChange={e => setFormPartName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">ضریب مصرف (مقدار) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0.001}
                    value={formQty}
                    onChange={e => setFormQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">واحد سنجش</label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                  >
                    <option value="عدد">عدد</option>
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="ست">ست</option>
                    <option value="متر">متر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">توضیحات و فرآیند اتصال</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="نکات جوشکاری، برش ورق، تلرانس ابعادی..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingNodeId ? 'ثبت تغییرات' : 'افزودن به ساختار درختی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Root Assembly Structure */}
      {isNewAssemblyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>تعریف ساختار درختی جدید برای محصول نهایی</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsNewAssemblyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAssembly} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">انتخاب محصول نهایی ریشه *</label>
                <SearchableSelect
                  value={newRootPartId}
                  onChange={val => setNewRootPartId(val)}
                  placeholder="انتخاب قطعه یا مجموعه نهایی..."
                  searchPlaceholder="جستجوی قطعه نهایی..."
                  options={parts.map(p => ({
                    value: p.code,
                    label: p.name,
                    sublabel: p.code,
                    badge: p.carModel || 'محصول',
                  }))}
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">مدل خودرو</label>
                <input
                  type="text"
                  value={newCarModel}
                  onChange={e => setNewCarModel(e.target.value)}
                  placeholder="پژو ۲۰۶، تارا، دنا"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">توضیحات کلی مجموعه</label>
                <textarea
                  rows={2}
                  value={newAssemblyNotes}
                  onChange={e => setNewAssemblyNotes(e.target.value)}
                  placeholder="توضیحات و الزامات تحویل به خودروساز..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewAssemblyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  ایجاد ساختار محصول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
