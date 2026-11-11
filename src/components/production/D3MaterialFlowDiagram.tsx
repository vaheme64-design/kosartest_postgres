import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  GitBranch,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  PlusCircle,
  Boxes,
  ArrowLeft,
} from 'lucide-react';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface OpFlowNode {
  success: boolean;
  currentOperation: {
    id: string;
    opNumber: number;
    opCode: string;
    opName: string;
    workCenterCode: string;
    workCenterName: string;
    setupTimeMin: number;
    cycleTimeSec: number;
  };
  previousOperation: {
    id: string;
    opNumber: number;
    opCode: string;
    opName: string;
    workCenterCode: string;
  } | null;
  previousOpApprovedGoodQuantity: number;
  currentOpConsumedQuantity: number;
  currentOpGoodQuantity: number;
  currentOpScrapQuantity: number;
  wipBufferAvailable: number;
  isFirstOperation: boolean;
  isPrecedenceLocked: boolean;
  lockReason: string | null;
  errorMessage?: string;
}

interface WorkOrderFlowData {
  id: string;
  orderNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  status: string;
  itemCode: string;
  itemName: string;
  carModel: string;
}

interface MrpRequirementItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  unit: string;
  level: number;
  quantityPerParent: number;
  grossRequirement: number;
  scrapAllowancePercent: number;
  effectiveGrossRequirement: number;
  parentItemCode?: string;
}

export const D3MaterialFlowDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [workOrders, setWorkOrders] = useState<Array<{ id: string; orderNumber: string; item: { name: string; code: string } }>>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('WO-1404-1001');
  const [flowData, setFlowData] = useState<WorkOrderFlowData | null>(null);
  const [opsFlow, setOpsFlow] = useState<OpFlowNode[]>([]);
  const [mrpItems, setMrpItems] = useState<MrpRequirementItem[]>([]);
  const [selectedOp, setSelectedOp] = useState<OpFlowNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Production Log form state to test live D3 buffer updates
  const [logGoodQty, setLogGoodQty] = useState<number>(200);
  const [logScrapQty, setLogScrapQty] = useState<number>(2);
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/erp-services/work-orders');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setWorkOrders(json.data);
      }
    } catch (e) {
      console.warn('Failed to load work orders list:', e);
    }
  }, []);

  const loadFlowAndMrp = useCallback(async (orderNo: string) => {
    if (!orderNo) return;
    setLoading(true);
    setError(null);
    try {
      const [flowRes, mrpRes] = await Promise.all([
        fetch(`/api/erp-services/wip-flow/${encodeURIComponent(orderNo)}`).then(r => r.json()),
        fetch(`/api/erp-services/mrp/${encodeURIComponent(orderNo)}`).then(r => r.json()),
      ]);

      if (!flowRes.success) {
        throw new Error(flowRes.error || 'خطا در دریافت جریان مواد دستور کار');
      }

      setFlowData(flowRes.workOrder);
      const operations: OpFlowNode[] = flowRes.operationsFlow || [];
      setOpsFlow(operations);
      if (operations.length > 0) {
        setSelectedOp(prev => {
          if (!prev) return operations[0];
          const match = operations.find(o => o.currentOperation.id === prev.currentOperation.id);
          return match || operations[0];
        });
      }

      if (mrpRes.success && Array.isArray(mrpRes.requirements)) {
        setMrpItems(mrpRes.requirements);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'خطا در واکشی گراف جریان مواد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  useEffect(() => {
    loadFlowAndMrp(selectedOrderNumber);
  }, [selectedOrderNumber, loadFlowAndMrp]);

  // Render D3.js Interactive Material Flow SVG
  useEffect(() => {
    if (!svgRef.current || opsFlow.length === 0 || !flowData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 270;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Definitions for arrowheads and gradients
    const defs = svg.append('defs');

    defs
      .append('marker')
      .attr('id', 'flow-arrow-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#10b981');

    defs
      .append('marker')
      .attr('id', 'flow-arrow-locked')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#f43f5e');

    const nodeCount = opsFlow.length;
    const nodeWidth = 175;
    const nodeHeight = 128;
    const horizontalPadding = 40;
    const availableSpan = width - horizontalPadding * 2 - nodeWidth;
    const stepX = nodeCount > 1 ? availableSpan / (nodeCount - 1) : 0;

    // Layout RTL (Right to Left: OP10 on Right, Final OP on Left)
    const nodesData = opsFlow.map((opNode, idx) => {
      const x = width - horizontalPadding - nodeWidth - idx * stepX;
      const y = 72;
      return {
        ...opNode,
        idx,
        x,
        y,
        centerX: x + nodeWidth / 2,
        centerY: y + nodeHeight / 2,
      };
    });

    // Draw Links & WIP Buffer Pills between nodes (RTL: from node[i] left edge to node[i+1] right edge)
    const linksGroup = svg.append('g').attr('class', 'links-layer');

    for (let i = 0; i < nodesData.length - 1; i++) {
      const source = nodesData[i];
      const target = nodesData[i + 1];

      const startX = source.x;
      const startY = source.centerY;
      const endX = target.x + nodeWidth;
      const endY = target.centerY;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      const isLocked = target.isPrecedenceLocked;
      const bufferQty = target.wipBufferAvailable;

      // Link Path
      linksGroup
        .append('path')
        .attr('d', `M ${startX} ${startY} L ${endX + 6} ${endY}`)
        .attr('stroke', isLocked ? '#f43f5e' : '#10b981')
        .attr('stroke-width', isLocked ? 2.5 : Math.min(6, Math.max(3, bufferQty / 250)))
        .attr('stroke-dasharray', isLocked ? '5,4' : 'none')
        .attr('fill', 'none')
        .attr('marker-end', isLocked ? 'url(#flow-arrow-locked)' : 'url(#flow-arrow-active)');

      // WIP Buffer Badge on the Link
      const badgeG = linksGroup
        .append('g')
        .attr('transform', `translate(${midX}, ${midY - 26})`);

      badgeG
        .append('rect')
        .attr('x', -44)
        .attr('y', -14)
        .attr('width', 88)
        .attr('height', 28)
        .attr('rx', 8)
        .attr('fill', isLocked ? '#fff1f2' : '#ecfdf5')
        .attr('stroke', isLocked ? '#fda4af' : '#6ee7b7')
        .attr('stroke-width', 1.2);

      badgeG
        .append('text')
        .attr('x', 0)
        .attr('y', -2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('fill', isLocked ? '#be123c' : '#047857')
        .text(isLocked ? '🔒 قفل تقدم' : 'بافر WIP آماده');

      badgeG
        .append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '800')
        .attr('fill', isLocked ? '#9f1239' : '#065f46')
        .text(`${toPersianDigits(formatNumber(bufferQty))} عدد`);
    }

    // Draw Operation Nodes
    const nodesGroup = svg.append('g').attr('class', 'nodes-layer');

    const nodeEls = nodesGroup
      .selectAll('g.op-node')
      .data(nodesData)
      .enter()
      .append('g')
      .attr('class', 'op-node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedOp(d);
      });

    // Card Background
    nodeEls
      .append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 14)
      .attr('fill', d => {
        if (selectedOp?.currentOperation.id === d.currentOperation.id) {
          return d.isPrecedenceLocked ? '#fff1f2' : '#f8fafc';
        }
        return '#ffffff';
      })
      .attr('stroke', d => {
        if (selectedOp?.currentOperation.id === d.currentOperation.id) {
          return '#0f172a';
        }
        if (d.isPrecedenceLocked) return '#fda4af';
        if (d.currentOpGoodQuantity > 0) return '#34d399';
        return '#cbd5e1';
      })
      .attr('stroke-width', d =>
        selectedOp?.currentOperation.id === d.currentOperation.id ? 2.5 : 1.5
      );

    // Top Header Bar inside Node
    nodeEls
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', nodeWidth)
      .attr('height', 30)
      .attr('rx', 13)
      .attr('fill', d => {
        if (d.isPrecedenceLocked) return '#be123c';
        if (d.currentOpGoodQuantity >= flowData.plannedQuantity) return '#047857';
        if (d.currentOpGoodQuantity > 0) return '#0f172a';
        return '#475569';
      });

    // OP Code Text (Right-aligned in header)
    nodeEls
      .append('text')
      .attr('x', nodeWidth - 12)
      .attr('y', 19)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .text(d => `${d.currentOperation.opCode} | ${d.currentOperation.workCenterCode}`);

    // Status Tag in Header (Left-aligned)
    nodeEls
      .append('text')
      .attr('x', 10)
      .attr('y', 19)
      .attr('text-anchor', 'start')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', d => (d.isPrecedenceLocked ? '#fecdd3' : '#6ee7b7'))
      .text(d => (d.isPrecedenceLocked ? 'قفل تقدم' : 'فعال'));

    // Operation Name
    nodeEls
      .append('text')
      .attr('x', nodeWidth - 10)
      .attr('y', 48)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e293b')
      .text(d =>
        d.currentOperation.opName.length > 25
          ? d.currentOperation.opName.slice(0, 24) + '…'
          : d.currentOperation.opName
      );

    // Input Buffer Stat
    nodeEls
      .append('text')
      .attr('x', nodeWidth - 10)
      .attr('y', 68)
      .attr('text-anchor', 'end')
      .attr('font-size', '9.5px')
      .attr('fill', '#475569')
      .text(
        d =>
          `بافر ورودی آماده: ${toPersianDigits(formatNumber(d.wipBufferAvailable))} عدد`
      );

    // Good Produced Stat
    nodeEls
      .append('text')
      .attr('x', nodeWidth - 10)
      .attr('y', 86)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#047857')
      .text(
        d =>
          `تولید سالم تاییدشده: ${toPersianDigits(formatNumber(d.currentOpGoodQuantity))} عدد`
      );

    // Scrap Stat
    nodeEls
      .append('text')
      .attr('x', nodeWidth - 10)
      .attr('y', 103)
      .attr('text-anchor', 'end')
      .attr('font-size', '9.5px')
      .attr('fill', d => (d.currentOpScrapQuantity > 0 ? '#e11d48' : '#94a3b8'))
      .text(
        d =>
          `ضایعات مرحله: ${toPersianDigits(formatNumber(d.currentOpScrapQuantity))} عدد`
      );

    // Progress Bar Track
    nodeEls
      .append('rect')
      .attr('x', 12)
      .attr('y', 112)
      .attr('width', nodeWidth - 24)
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', '#e2e8f0');

    // Progress Bar Fill
    nodeEls
      .append('rect')
      .attr('x', 12)
      .attr('y', 112)
      .attr('width', d => {
        const pct = Math.min(1, d.currentOpGoodQuantity / Math.max(1, flowData.plannedQuantity));
        return Math.round((nodeWidth - 24) * pct);
      })
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', d => (d.isPrecedenceLocked ? '#f43f5e' : '#10b981'));
  }, [opsFlow, flowData, selectedOp]);

  const handleRegisterLiveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp || !flowData) return;

    setSubmittingLog(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/erp-services/wip-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: flowData.orderNumber,
          operationId: selectedOp.currentOperation.id,
          goodQuantity: logGoodQty,
          scrapQuantity: logScrapQty,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionFeedback({
          type: 'error',
          text: json.error || 'خطا در ثبت کارکرد مرحله',
        });
      } else {
        setActionFeedback({
          type: 'success',
          text: json.message || 'کارکرد ثبت شد و نمودار D3 به‌روزرسانی گردید.',
        });
        await loadFlowAndMrp(selectedOrderNumber);
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطای ارتباط با سرور',
      });
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-5" dir="rtl">
      {/* Header & Order Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-900 text-amber-400">
              <GitBranch className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                نمودار زنده جریان مواد و بافر بین‌مرحله‌ای (D3.js Live Material Flow & WipService)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                محاسبه بلادرنگ موجودی پای خط (WIP Buffer)، قفل تقدم ایستگاه‌ها و انفجار درختی BOM از پایگاه داده پریزما
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">دستور کار (Work Order):</label>
          <select
            value={selectedOrderNumber}
            onChange={e => {
              setSelectedOrderNumber(e.target.value);
              setActionFeedback(null);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            {workOrders.length > 0 ? (
              workOrders.map(wo => (
                <option key={wo.id} value={wo.orderNumber}>
                  {wo.orderNumber} — {wo.item?.name}
                </option>
              ))
            ) : (
              <>
                <option value="WO-1404-1001">WO-1404-1001 — مجموعه براکت ضدسرقت رایانه موتور (ECU)</option>
                <option value="WO-1404-1002">WO-1404-1002 — مجموعه تقویتی ستون وسط (B-Pillar) تارا</option>
              </>
            )}
          </select>

          <button
            type="button"
            onClick={() => loadFlowAndMrp(selectedOrderNumber)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="بروزرسانی زنده از WipService"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* D3 SVG Diagram Canvas */}
      <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 overflow-x-auto">
        <div className="flex items-center justify-between px-2 mb-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              جریان فعال و دارای بافر ورودی
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              قفل تقدم (بافر ورودی صفر)
            </span>
          </div>
          <span>برای مشاهده جزئیات WipService یا ثبت تولید آزمایشی، روی هر ایستگاه در گراف کلیک کنید</span>
        </div>

        <svg ref={svgRef} className="w-full h-auto min-w-[780px] select-none" />
      </div>

      {/* Selected Operation Inspection & Live WipService Simulator + MrpService BOM Explosion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 6 cols: Selected OP Details & Live Production Log Input */}
        {selectedOp && (
          <div className="lg:col-span-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                  {selectedOp.currentOperation.opCode}
                </span>
                <span className="font-bold text-slate-900">{selectedOp.currentOperation.opName}</span>
              </div>
              {selectedOp.isPrecedenceLocked ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>{selectedOp.errorMessage || 'قفل تقدم: بافر ورودی کافی نیست'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>آماده تولید (بافر کافی)</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">خروجی تاییدشده مرحله قبل:</span>
                <strong className="text-slate-900 text-sm">
                  {formatNumber(selectedOp.previousOpApprovedGoodQuantity)} عدد
                </strong>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">مصرف‌شده در این مرحله:</span>
                <strong className="text-indigo-700 text-sm">
                  {formatNumber(selectedOp.currentOpConsumedQuantity)} عدد
                </strong>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  selectedOp.isPrecedenceLocked
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="text-[10px] font-sans block font-bold">موجودی پای خط (WIP Buffer):</span>
                <strong className="text-sm font-extrabold">
                  {formatNumber(selectedOp.wipBufferAvailable)} عدد
                </strong>
              </div>
            </div>

            {selectedOp.isPrecedenceLocked && selectedOp.lockReason && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{selectedOp.lockReason}</span>
              </div>
            )}

            {/* Quick Live Production Log Form */}
            <form onSubmit={handleRegisterLiveLog} className="pt-2 border-t border-slate-200/80 space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>ثبت کارکرد زنده در جدول ProductionLog برای مرحله {selectedOp.currentOperation.opCode}:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">تعداد سالم تولیدی</label>
                  <input
                    type="number"
                    min={1}
                    value={logGoodQty}
                    onChange={e => setLogGoodQty(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-1">تعداد ضایعات</label>
                  <input
                    type="number"
                    min={0}
                    value={logScrapQty}
                    onChange={e => setLogScrapQty(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-rose-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submittingLog ? 'در حال ثبت...' : 'ثبت و بروزرسانی گراف'}
                </button>
              </div>
              {actionFeedback && (
                <div
                  className={`p-2 rounded-lg text-[11px] font-bold ${
                    actionFeedback.type === 'error'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {actionFeedback.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Right 6 cols: Recursive BOM Explosion Output from MrpService */}
        <div className="lg:col-span-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>خروجی سرویس انفجار بازگشتی درخت محصول (MrpService.calculateMaterialRequirements)</span>
            </div>
            {flowData && (
              <span className="font-mono text-[11px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                تیراژ دستور کار: {formatNumber(flowData.plannedQuantity)} عدد
              </span>
            )}
          </div>

          {mrpItems.length === 0 ? (
            <div className="text-slate-500 py-4 text-center">در حال بارگذاری درخت مواد...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-200/70 text-slate-700 border-b border-slate-300">
                    <th className="py-1.5 px-2">سطح BOM</th>
                    <th className="py-1.5 px-2">کد و نام قطعه / متریال</th>
                    <th className="py-1.5 px-2">نوع</th>
                    <th className="py-1.5 px-2">ضریب</th>
                    <th className="py-1.5 px-2">نیاز ناخالص (Gross)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {mrpItems.map((item, idx) => (
                    <tr key={`${item.itemId}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            item.level === 1
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200 mr-2'
                          }`}
                        >
                          سطح {toPersianDigits(item.level)}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{item.itemCode}</div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.itemType === 'RAW_MATERIAL'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-indigo-50 text-indigo-800'
                          }`}
                        >
                          {item.itemType === 'RAW_MATERIAL' ? 'ماده اولیه' : 'نیمه‌ساخته (WIP)'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold">{item.quantityPerParent}</td>
                      <td className="py-1.5 px-2 font-mono font-extrabold text-slate-900">
                        {formatNumber(item.effectiveGrossRequirement)} {item.unit === 'KG' ? 'kg' : 'عدد'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
