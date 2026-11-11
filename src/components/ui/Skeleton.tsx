import React from 'react';

export type SkeletonVariant =
  | 'block'
  | 'circle'
  | 'text'
  | 'rounded'
  | 'circular'
  | 'rectangular';

export interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
  theme?: 'light' | 'dark';
}

/**
 * Shared Skeleton component using Tailwind CSS.
 * Explicitly supports 'block', 'circle', and 'text' styles (plus legacy aliases).
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'block',
}) => {
  const baseTone = 'bg-slate-200/75 border border-slate-200/60';

  const variantClasses =
    variant === 'circle' || variant === 'circular'
      ? 'rounded-full shrink-0'
      : variant === 'text'
      ? 'rounded-md h-3.5'
      : variant === 'rectangular'
      ? 'rounded-none'
      : 'rounded-lg'; // 'block' or 'rounded'

  return (
    <div
      role="status"
      aria-label="در حال بارگذاری..."
      className={`animate-pulse ${baseTone} ${variantClasses} ${className}`}
    />
  );
};

export interface KpiCardsSkeletonProps {
  count?: number;
  columns?: 4 | 5 | 6;
  theme?: 'light' | 'dark';
}

/**
 * Skeleton placeholder for KPI metric cards row using block, circle, and text styles
 */
export const KpiCardsSkeleton: React.FC<KpiCardsSkeletonProps> = ({
  count = 4,
  columns = 4,
}) => {
  const gridCols =
    columns === 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : columns === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  const cardSurface = 'bg-white border border-slate-200/90 shadow-2xs';

  return (
    <div className={`grid ${gridCols} gap-3.5`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`${cardSurface} rounded-xl p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="w-28 h-3" />
            <Skeleton variant="circle" className="w-6 h-6" />
          </div>
          <Skeleton variant="block" className="w-24 h-7" />
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <Skeleton variant="text" className="w-24 h-2.5" />
            <Skeleton variant="text" className="w-12 h-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export interface ChartSkeletonProps {
  rows?: number;
  theme?: 'light' | 'dark';
}

/**
 * Skeleton placeholder for horizontal bar / OEE / WIP station charts
 */
export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  rows = 5,
}) => {
  const cardSurface = 'bg-white border border-slate-200/90 shadow-2xs';
  const rowSurface = 'bg-slate-50/70 border border-slate-200/70';

  const widthClasses = ['w-11/12', 'w-4/5', 'w-3/4', 'w-2/3', 'w-5/6', 'w-1/2'];

  return (
    <div className={`${cardSurface} rounded-xl p-5 space-y-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-8 h-8" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-56 h-4" />
            <Skeleton variant="text" className="w-40 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="block" className="w-24 h-7" />
          <Skeleton variant="block" className="w-24 h-7" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className={`${rowSurface} rounded-lg p-3.5 space-y-2.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton variant="circle" className="w-5 h-5" />
                <Skeleton variant="text" className="w-36 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="w-16 h-3.5" />
                <Skeleton variant="block" className="w-12 h-5" />
              </div>
            </div>
            <Skeleton
              variant="block"
              className={`h-2.5 ${widthClasses[idx % widthClasses.length]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  theme?: 'light' | 'dark';
}

/**
 * Skeleton placeholder for Grafana-inspired flat list / data tables
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 6,
  columns = 6,
}) => {
  const containerSurface = 'bg-white border border-slate-200/90 shadow-2xs';
  const headerSurface = 'bg-slate-50/80 border-b border-slate-200/80';

  return (
    <div className={`${containerSurface} rounded-xl overflow-hidden`}>
      {/* Filter / Search Toolbar Skeleton */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1">
          <Skeleton variant="block" className="w-64 h-8" />
          <Skeleton variant="block" className="w-28 h-8" />
          <Skeleton variant="block" className="w-28 h-8" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" className="w-7 h-7" />
          <Skeleton variant="block" className="w-24 h-8" />
        </div>
      </div>

      {/* Header Row */}
      <div
        className={`${headerSurface} px-4 py-3 grid gap-3`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton key={colIdx} variant="text" className="h-3 w-3/4" />
        ))}
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-4 py-3.5 grid gap-3 items-center"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div key={colIdx} className="flex items-center gap-2">
                {colIdx === 0 && (
                  <Skeleton variant="circle" className="w-4 h-4" />
                )}
                <Skeleton
                  variant="text"
                  className={`h-3.5 ${
                    colIdx === 0
                      ? 'w-4/5'
                      : colIdx === 1
                      ? 'w-full'
                      : (rowIdx + colIdx) % 2 === 0
                      ? 'w-2/3'
                      : 'w-1/2'
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Full-page Dashboard Skeleton matching DashboardView layout
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" role="status" aria-label="در حال بارگذاری داشبورد...">
      {/* Page Header Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton variant="block" className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-56 h-5" />
            <Skeleton variant="text" className="w-80 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="block" className="w-28 h-9" />
          <Skeleton variant="block" className="w-32 h-9" />
        </div>
      </div>

      {/* Quick Launchpad Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-64 h-4" />
          <Skeleton variant="text" className="w-80 h-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="block" className="w-8 h-8" />
                <Skeleton variant="circle" className="w-4 h-4" />
              </div>
              <Skeleton variant="text" className="w-32 h-3.5" />
              <Skeleton variant="text" className="w-full h-2.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 4 Main KPI Cards Skeleton */}
      <div className="space-y-2.5">
        <Skeleton variant="text" className="w-72 h-3.5" />
        <KpiCardsSkeleton count={4} columns={4} theme="light" />
      </div>

      {/* Exceptions + WIP Progress Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="circle" className="w-5 h-5" />
            <Skeleton variant="text" className="w-44 h-4" />
          </div>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2"
            >
              <Skeleton variant="text" className="w-40 h-3.5" />
              <Skeleton variant="text" className="w-full h-2.5" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <ChartSkeleton rows={4} theme="light" />
        </div>
      </div>
    </div>
  );
};

/**
 * Full-page Skeleton for ProductionWipModuleView
 */
export const WipModuleSkeleton: React.FC = () => {
  return (
    <div className="space-y-5" role="status" aria-label="در حال بارگذاری ماژول کار در جریان ساخت...">
      {/* Grafana-style Module Header & Flat Filter Bar Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton variant="block" className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-64 h-5" />
              <Skeleton variant="text" className="w-96 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="block" className="w-28 h-9" />
            <Skeleton variant="block" className="w-36 h-9" />
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton variant="block" className="w-72 h-9" />
            <Skeleton variant="block" className="w-36 h-9" />
            <Skeleton variant="block" className="w-36 h-9" />
          </div>
          <Skeleton variant="block" className="w-28 h-9" />
        </div>
      </div>

      {/* 6 WIP Stage KPI Cards */}
      <KpiCardsSkeleton count={6} columns={6} theme="light" />

      {/* Two Column Bottleneck + Active MOs Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartSkeleton rows={4} theme="light" />
        <ChartSkeleton rows={4} theme="light" />
      </div>

      {/* Expandable Orders / Stations Table Skeleton */}
      <TableSkeleton rows={5} columns={6} theme="light" />
    </div>
  );
};

/**
 * Full-page Skeleton for InventoryModuleView & SapcoMaterialsView
 */
export const InventoryModuleSkeleton: React.FC = () => {
  return (
    <div className="space-y-5" role="status" aria-label="در حال بارگذاری ماژول انبار...">
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton variant="block" className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-60 h-5" />
              <Skeleton variant="text" className="w-80 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton variant="block" className="w-32 h-9" />
            <Skeleton variant="block" className="w-32 h-9" />
            <Skeleton variant="block" className="w-28 h-9" />
          </div>
        </div>
      </div>
      <KpiCardsSkeleton count={4} columns={4} theme="light" />
      <TableSkeleton rows={6} columns={7} theme="light" />
    </div>
  );
};

/**
 * Full-page Skeleton for ProductionPlanningModuleView
 */
export const PlanningModuleSkeleton: React.FC = () => {
  return (
    <div className="space-y-5" role="status" aria-label="در حال بارگذاری برنامه‌ریزی تولید...">
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton variant="block" className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-64 h-5" />
            <Skeleton variant="text" className="w-80 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="block" className="w-28 h-9" />
          <Skeleton variant="block" className="w-36 h-9" />
        </div>
      </div>
      <KpiCardsSkeleton count={6} columns={6} theme="light" />
      <TableSkeleton rows={6} columns={7} theme="light" />
    </div>
  );
};

/**
 * Full-page Skeleton for MasterDataHubView & MachinesView
 */
export const MasterDataSkeleton: React.FC = () => {
  return (
    <div className="space-y-5" role="status" aria-label="در حال بارگذاری اطلاعات پایه...">
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Skeleton variant="block" className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-48 h-5" />
              <Skeleton variant="text" className="w-72 h-3" />
            </div>
          </div>
          <Skeleton variant="block" className="w-28 h-9" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={6} theme="light" />
    </div>
  );
};

/**
 * Composite Skeleton for Analytical & Management Report Modules
 */
export const ReportModuleSkeleton: React.FC<{
  kpiCount?: 4 | 5 | 6;
  showChart?: boolean;
  tableRows?: number;
  tableColumns?: number;
  theme?: 'light' | 'dark';
}> = ({
  kpiCount = 6,
  showChart = true,
  tableRows = 6,
  tableColumns = 8,
  theme = 'dark',
}) => {
  return (
    <div className="space-y-5" role="status" aria-label="در حال بارگذاری گزارش...">
      <KpiCardsSkeleton count={kpiCount} columns={kpiCount} theme={theme} />
      {showChart && <ChartSkeleton rows={4} theme={theme} />}
      <TableSkeleton rows={tableRows} columns={tableColumns} theme={theme} />
    </div>
  );
};
