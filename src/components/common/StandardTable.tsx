import React from 'react';
import { UNIFIED_COLOR_CONFIG } from '../../types/theme';

interface StandardTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  containerClassName?: string;
}

export const StandardTable: React.FC<StandardTableProps> = ({
  children,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div
      className={`overflow-x-auto rounded-xl border ${UNIFIED_COLOR_CONFIG.borderDefault} ${UNIFIED_COLOR_CONFIG.surface} ${UNIFIED_COLOR_CONFIG.cardBorder} ${containerClassName}`}
    >
      <table className={`w-full text-right text-xs border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

interface StandardTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const StandardTableHeader: React.FC<StandardTableHeaderProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <thead
      className={`${UNIFIED_COLOR_CONFIG.tableHeaderBg} ${UNIFIED_COLOR_CONFIG.tableHeaderText} ${UNIFIED_COLOR_CONFIG.tableHeaderBorder} text-xs ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

interface StandardTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  striped?: boolean;
  isClickable?: boolean;
}

export const StandardTableRow: React.FC<StandardTableRowProps> = ({
  children,
  className = '',
  striped = true,
  isClickable = false,
  ...props
}) => {
  return (
    <tr
      className={`
        ${UNIFIED_COLOR_CONFIG.tableRowBase}
        ${striped ? UNIFIED_COLOR_CONFIG.tableRowStripe : ''}
        ${UNIFIED_COLOR_CONFIG.tableRowHover}
        ${UNIFIED_COLOR_CONFIG.tableRowText}
        border-b ${UNIFIED_COLOR_CONFIG.borderSubtle}
        ${isClickable ? 'cursor-pointer active:bg-slate-100' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
};

interface StandardTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  isMono?: boolean;
  align?: 'right' | 'center' | 'left';
}

export const StandardTableCell: React.FC<StandardTableCellProps> = ({
  children,
  className = '',
  isMono = false,
  align = 'right',
  ...props
}) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
  return (
    <td
      className={`py-3 px-3.5 text-slate-800 ${alignClass} ${isMono ? 'font-mono text-slate-900 font-medium' : ''} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

interface StandardTableHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  align?: 'right' | 'center' | 'left';
}

export const StandardTableHeadCell: React.FC<StandardTableHeadCellProps> = ({
  children,
  className = '',
  align = 'right',
  ...props
}) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
  return (
    <th
      className={`py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};
