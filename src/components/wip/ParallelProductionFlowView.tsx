import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeft,
  Disc,
  Boxes,
  Layers,
  Wrench,
  CheckCircle2,
  Cpu,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Tag,
  Split,
  Merge,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Info,
} from 'lucide-react';
import {
  ParallelProductionFlow,
  ParallelFlowNode,
  FlowPatternType,
} from '../../types/bomAndParallelFlow';
import { toPersianDigits, formatNumber } from '../../utils/formatters';
import { MasterDataDifferenceGuideModal } from '../common/MasterDataDifferenceGuideModal';

interface ParallelProductionFlowViewProps {
  onOpenTraceabilityModal?: (partCode: string) => void;
  onNavigateToBom?: () => void;
}

export const ParallelProductionFlowView: React.FC<ParallelProductionFlowViewProps> = ({
  onOpenTraceabilityModal,
  onNavigateToBom,
}) => {
  const [flows, setFlows] = useState<ParallelProductionFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // New Flow Modal
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowCarModel, setNewFlowCarModel] = useState('');
  const [newFlowPattern, setNewFlowPattern] = useState<FlowPatternType>('CO_PRODUCTION_LR');
  const [newRawMaterialCode, setNewRawMaterialCode] = useState('COIL-ST14-1.2');
  const [newRawMaterialName, setNewRawMaterialName] = useState('کویل فولاد ST14 ضخامت ۱.۲ میلی‌متر');
  const [newLeftPartCode, setNewLeftPartCode] = useState('IKCO-206-BRK-LH');
  const [newLeftPartName, setNewLeftPartName] = useState('براکت نگهدارنده چپ');
  const [newRightPartCode, setNewRightPartCode] = useState('IKCO-206-BRK-RH');
  const [newRightPartName, setNewRightPartName] = useState('براکت نگهدارنده راست');
  const [newDieCode, setNewDieCode] = useState('DIE-206-BRK-LR');

  // Simulation state
  const [simStrokes, setSimStrokes] = useState<number>(500);
  const [simResult, setSimResult] = useState<{
    strokes: number;
    leftQty: number;
    rightQty: number;
    rawCoilConsumedKg: number;
    leftPartCode: string;
    rightPartCode: string;
  } | null>(null);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/parallel-flows');
      const data = await res.json();
      if (data.success && data.data) {
        setFlows(data.data);
        if (!selectedFlowId && data.data.length > 0) {
          setSelectedFlowId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const activeFlow = flows.find(f => f.id === selectedFlowId) || flows[0];

  const handleRunSimulation = () => {
    if (!activeFlow) return;
    const strokes = Number(simStrokes) || 100;
    const leftOutput = activeFlow.linkedOutputs.find(o => o.role === 'LEFT_HAND');
    const rightOutput = activeFlow.linkedOutputs.find(o => o.role === 'RIGHT_HAND');

    setSimResult({
      strokes,
      leftQty: strokes,
      rightQty: strokes,
      rawCoilConsumedKg: Math.round(strokes * 0.95 * 10) / 10,
      leftPartCode: leftOutput?.partCode || 'IKCO-206-BRK-LH',
      rightPartCode: rightOutput?.partCode || 'IKCO-206-BRK-RH',
    });
  };

  const handleCreateNewFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) return;

    const payload: Partial<ParallelProductionFlow> = {
      flowCode: `FLOW-${Date.now().toString().slice(-4)}`,
      flowName: newFlowName,
      patternType: newFlowPattern,
      carModel: newFlowCarModel || 'مشترک',
      inputRawMaterialCode: newRawMaterialCode,
      inputRawMaterialName: newRawMaterialName,
      linkedOutputs: [
        {
          partCode: newLeftPartCode,
          partName: newLeftPartName,
          role: 'LEFT_HAND',
        },
        {
          partCode: newRightPartCode,
          partName: newRightPartName,
          role: 'RIGHT_HAND',
        },
      ],
      nodes: [
        {
          id: 'N-1',
          stepCode: 'OP-10',
          stepName: 'برش و تغذیه رول ورق',
          branch: 'MAIN',
          machineName: 'خط رول‌بازکن و گیوتین',
          nodeType: 'COMMON_PROCESS',
          description: 'برش شیت اولیه از رول',
        },
        {
          id: 'N-2',
          stepCode: 'OP-20',
          stepName: `کشش و فرم‌دهی دوگانه با قالب مشترک (${newDieCode})`,
          branch: 'MAIN',
          machineName: 'پرس هیدرولیک ۸۰۰ تن',
          dieMoldName: newDieCode,
          nodeType: 'SPLIT_POINT',
          isDualCavityDie: true,
          yieldPerStroke: { left: 1, right: 1 },
          description: 'تولید همزمان ۱ قطعه چپ و ۱ قطعه راست در هر کورس ضرب پرس',
        },
        {
          id: 'N-3L',
          stepCode: 'OP-30-LH',
          stepName: 'دوربری و پانچ شاخک قطعه چپ',
          machineName: 'پرس مکانیکی ۲۵۰ تن (خط ۱)',
          branch: 'LEFT',
          nodeType: 'BRANCH_L',
          description: 'عملیات دوربری نهایی سمت چپ',
        },
        {
          id: 'N-3R',
          stepCode: 'OP-30-RH',
          stepName: 'دوربری و پانچ شاخک قطعه راست',
          machineName: 'پرس مکانیکی ۲۵۰ تن (خط ۲)',
          branch: 'RIGHT',
          nodeType: 'BRANCH_R',
          description: 'عملیات دوربری نهایی سمت راست',
        },
      ],
    };

    try {
      const res = await fetch('/api/production/parallel-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await loadFlows();
        setSelectedFlowId(data.data.id);
        setIsNewFlowModalOpen(false);
        setNewFlowName('');
      } else {
        alert(data.error || 'خطا در ثبت جریان تولید');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleDeleteFlow = async () => {
    if (!activeFlow) return;
    if (!confirm(`آیا از حذف جریان تولید «${activeFlow.flowName}» اطمینان دارید؟`)) return;

    try {
      const res = await fetch(`/api/production/parallel-flows/${activeFlow.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const remaining = flows.filter(f => f.id !== activeFlow.id);
        setFlows(remaining);
        if (remaining.length > 0) setSelectedFlowId(remaining[0].id);
        else setSelectedFlowId('');
      } else {
        alert(data.error || 'خطا در حذف جریان');
      }
    } catch {
      alert('خطا در حذف جریان');
    }
  };

  return (
    <div className="space-y-5 font-sans text-right">
      {/* Educational Banner Explaining Stamping Co-Production */}
      <div className="bg-purple-50 border border-purple-200/90 rounded-2xl p-4 text-xs text-purple-900 flex items-start gap-3 shadow-2xs leading-relaxed">
        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-purple-950 text-sm mb-1">
            کارکرد و منطق مهندسی ماژول قالب‌های مشترک و تولید موازی (Co-Production / LH-RH):
          </strong>
          در پرس‌کاری صنعتی قطعات خودرویی، برای صرفه‌جویی در هزینه قالب‌سازی و افزایش راندمان پرس، بسیاری از قطعات قرینه مانند براکت‌های چپ و راست (LH/RH)، لچکی‌های ستون، و زوارها با یک <strong>قالب مشترک ۲ کویته</strong> روی یک پرس بسته می‌شوند.
          با هر ضربه پرس، <strong>۱ عدد قطعه چپ و ۱ عدد قطعه راست</strong> به طور همزمان از یک ورق تولید می‌شود. این ماژول این همزمانی تولید، بالانس موجودی انبار و مصرف کویل را مدل‌سازی و پایش می‌کند.
        </div>
      </div>

      {/* Grafana-Inspired Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/70 text-purple-600 flex items-center justify-center shrink-0">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base lg:text-lg font-bold text-slate-900">
                  منطق تولید قطعات موازی و قالب‌های مشترک چپ و راست (Co-Production)
                </h2>
                <span className="text-[11px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  تولید متقارن LH / RH
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تولید همزمان دو قطعه در یک قالب، انشعاب یک ورق به دو قطعه نیمه‌کاره، و ادغام مجدد در ایستگاه جوشکاری
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={() => setIsNewFlowModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>+ تعریف الگوی قالب مشترک جدید</span>
            </button>

            {onNavigateToBom && (
              <button
                type="button"
                onClick={onNavigateToBom}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>مشاهده درخت محصول (BOM)</span>
              </button>
            )}
          </div>
        </div>

        {/* Flow Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">انتخاب الگوی تولید جاری:</span>
            <select
              value={selectedFlowId}
              onChange={e => setSelectedFlowId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {flows.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flowName} ({f.carModel})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteFlow}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-rose-200"
              title="حذف این الگو"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">
              الگوهای ثبت‌شده: <strong>{toPersianDigits(flows.length)}</strong>
            </span>
          </div>
        </div>
      </div>

      {activeFlow && (
        <div className="space-y-5">
          {/* Flow Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold">
                    {activeFlow.flowCode}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                    {activeFlow.patternType === 'CO_PRODUCTION_LR' && 'قالب دوگانه چپ و راست (Co-Production)'}
                    {activeFlow.patternType === 'PARALLEL_JOIN_WELD' && 'خطوط موازی و ادغام در جوشکاری (Merge)'}
                    {activeFlow.patternType === 'SPLIT_AND_MERGE' && 'انشعاب وسط فرآیند و مونتاژ نهایی'}
                  </span>
                  <span className="text-xs text-slate-500">
                    مدل خودرو: <strong>{activeFlow.carModel}</strong>
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                  {activeFlow.flowName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  کلاف ورودی مبدأ: <strong className="text-slate-800 font-mono">{activeFlow.inputRawMaterialCode}</strong> ({activeFlow.inputRawMaterialName})
                </p>
              </div>

              {/* Linked Outputs Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {activeFlow.linkedOutputs.map((out, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-right">
                    <span className="text-[10px] text-slate-500 block">
                      {out.role === 'LEFT_HAND' ? 'خروجی سمت چپ (LH)' : out.role === 'RIGHT_HAND' ? 'خروجی سمت راست (RH)' : 'مجموعه نهایی'}
                    </span>
                    <span className="font-bold text-slate-900 font-mono block text-xs">{out.partCode}</span>
                    <span className="text-[11px] text-slate-600 block">{out.partName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Process Flow Diagram */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-purple-600" />
                <span>نمودار تعاملی جریان ایستگاه‌ها و نقطه تفکیک چپ / راست:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeFlow.nodes.map((node, idx) => (
                  <div
                    key={node.id || idx}
                    className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${
                      node.nodeType === 'SPLIT_POINT'
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                        : node.nodeType === 'MERGE_POINT'
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
                        : node.branch === 'LEFT'
                        ? 'bg-indigo-50/60 border-indigo-200'
                        : node.branch === 'RIGHT'
                        ? 'bg-teal-50/60 border-teal-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 font-bold">
                          {node.stepCode || 'گام'}
                        </span>
                        {node.nodeType === 'SPLIT_POINT' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Split className="w-3 h-3" /> نقطه انشعاب (قالب مشترک)
                          </span>
                        )}
                        {node.nodeType === 'MERGE_POINT' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Merge className="w-3 h-3" /> ادغام در جوش
                          </span>
                        )}
                        {node.branch && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            node.branch === 'LEFT' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            شاخه {node.branch === 'LEFT' ? 'چپ (LH)' : 'راست (RH)'}
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-xs text-slate-900 leading-snug">
                        {node.stepName || node.description}
                      </h5>

                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        <div>دستگاه: <strong>{node.machineName}</strong></div>
                        {node.dieMoldName && (
                          <div className="text-purple-700 font-mono text-[10px]">
                            قالب: {node.dieMoldName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Stroke Balance Simulator */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    شبیه‌ساز همزمانی ضرب پرس و موازنه خروجی چپ/راست:
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-medium">تعداد ضرب پرس:</label>
                  <input
                    type="number"
                    value={simStrokes}
                    onChange={e => setSimStrokes(Number(e.target.value))}
                    step={100}
                    min={10}
                    className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 text-center"
                  />
                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-orange-400" />
                    <span>محاسبه تولید</span>
                  </button>
                </div>
              </div>

              {simResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-500 block">ضربه پرس اجرا شده:</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {toPersianDigits(simResult.strokes)} ضرب
                    </span>
                    <span className="text-[10px] text-slate-500 block">مصرف ورق: ~{toPersianDigits(simResult.rawCoilConsumedKg)} kg</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-emerald-700 block">تولید قطعه سمت چپ (LH):</span>
                    <span className="text-base font-bold font-mono text-emerald-800">
                      {toPersianDigits(simResult.leftQty)} عدد
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-mono">[{simResult.leftPartCode}]</span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-blue-700 block">تولید قطعه سمت راست (RH):</span>
                    <span className="text-base font-bold font-mono text-blue-800">
                      {toPersianDigits(simResult.rightQty)} عدد
                    </span>
                    <span className="text-[10px] text-blue-600 block font-mono">[{simResult.rightPartCode}]</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Co-Production Flow */}
      {isNewFlowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-purple-600" />
                <span>تعریف الگوی جدید قالب مشترک و تولید متقارن</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewFlowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFlow} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">عنوان فرآیند تولید مشترک *</label>
                <input
                  type="text"
                  required
                  value={newFlowName}
                  onChange={e => setNewFlowName(e.target.value)}
                  placeholder="مثال: تولید متقارن براکت‌های دیاق چپ و راست تارا با قالب دوکویته"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">مدل خودرو</label>
                  <input
                    type="text"
                    value={newFlowCarModel}
                    onChange={e => setNewFlowCarModel(e.target.value)}
                    placeholder="تارا، پژو ۲۰۶، دنا"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">کد قالب مشترک (سنبه دوگانه)</label>
                  <input
                    type="text"
                    value={newDieCode}
                    onChange={e => setNewDieCode(e.target.value)}
                    placeholder="DIE-TARA-BRK-LR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">کد ورق یا کویل ورودی</label>
                  <input
                    type="text"
                    value={newRawMaterialCode}
                    onChange={e => setNewRawMaterialCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">عنوان ورق خام</label>
                  <input
                    type="text"
                    value={newRawMaterialName}
                    onChange={e => setNewRawMaterialName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <span className="font-bold text-purple-900 block text-[11px]">تعریف دو قطعه متقارن حاصل از هر ضرب:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[10px] mb-0.5">کد قطعه چپ (LH)</label>
                    <input
                      type="text"
                      value={newLeftPartCode}
                      onChange={e => setNewLeftPartCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] mb-0.5">کد قطعه راست (RH)</label>
                    <input
                      type="text"
                      value={newRightPartCode}
                      onChange={e => setNewRightPartCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFlowModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  ثبت الگوی مشترک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      <MasterDataDifferenceGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
