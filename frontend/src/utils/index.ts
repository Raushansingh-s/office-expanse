import type { ExpenseStatus, ReimbursementStatus, PaymentMethod, PaymentSource } from '../types';

export const formatCurrency = (amount: number, symbol = '₹'): string => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr: string | Date): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const expenseStatusLabel: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  reimbursement_pending: 'Reimbursement Pending',
  reimbursement_approved: 'Reimbursement Approved',
  reimbursed: 'Reimbursed',
  cancelled: 'Cancelled',
  correction_requested: 'Correction Requested'
};

export const reimbursementStatusLabel: Record<ReimbursementStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  partially_approved: 'Partially Approved',
  paid: 'Paid',
  rejected: 'Rejected'
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  debit_card: 'Debit Card',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other'
};

export const paymentSourceLabel: Record<PaymentSource, string> = {
  company: 'Company',
  personal: 'Personally Paid'
};

export const expenseStatusColors: Record<ExpenseStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  reimbursement_pending: 'bg-orange-100 text-orange-700',
  reimbursement_approved: 'bg-blue-100 text-blue-700',
  reimbursed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  correction_requested: 'bg-red-100 text-red-600'
};

export const reimbStatusColors: Record<ReimbursementStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  partially_approved: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const getDateRange = (preset: string): { startDate: string; endDate: string } => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case 'this_week': {
      const first = new Date(today); first.setDate(first.getDate() - first.getDay());
      return { startDate: fmt(first), endDate: fmt(today) };
    }
    case 'this_month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(first), endDate: fmt(today) };
    }
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(first), endDate: fmt(last) };
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const first = new Date(today.getFullYear(), q * 3, 1);
      return { startDate: fmt(first), endDate: fmt(today) };
    }
    case 'this_fy': {
      const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return { startDate: `${fy}-04-01`, endDate: `${fy + 1}-03-31` };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};
