import React from 'react';
import { expenseStatusColors, expenseStatusLabel, reimbStatusColors, reimbursementStatusLabel } from '../../utils';
import type { ExpenseStatus, ReimbursementStatus } from '../../types';

interface StatusBadgeProps {
  status: string;
  type?: 'expense' | 'reimbursement';
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'expense', size = 'md' }) => {
  const colorClass = type === 'expense'
    ? (expenseStatusColors[status as ExpenseStatus] || 'bg-slate-100 text-slate-600')
    : (reimbStatusColors[status as ReimbursementStatus] || 'bg-slate-100 text-slate-600');

  const label = type === 'expense'
    ? (expenseStatusLabel[status as ExpenseStatus] || status)
    : (reimbursementStatusLabel[status as ReimbursementStatus] || status);

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${colorClass} ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {label}
    </span>
  );
};

export default StatusBadge;
