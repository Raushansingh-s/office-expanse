import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { expensesApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import type { Expense, PaginationMeta } from '../../types';
import toast from 'react-hot-toast';

const ApprovalsPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted,under_review');
  const [approveModal, setApproveModal] = useState<{ exp: Expense; amount: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ exp: Expense; reason: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const res = await expensesApi.list({ status: statusFilter, page, limit: 20 });
      setExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load approvals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleApprove = async () => {
    if (!approveModal) return;
    setActionLoading(true);
    try {
      await expensesApi.approve(approveModal.exp.id, { approvedAmount: parseFloat(approveModal.amount) });
      toast.success('Expense approved!');
      setApproveModal(null);
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to approve'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectModal.reason.trim()) { toast.error('Rejection reason required'); return; }
    setActionLoading(true);
    try {
      await expensesApi.reject(rejectModal.exp.id, { reason: rejectModal.reason });
      toast.success('Expense rejected');
      setRejectModal(null);
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to reject'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expense Approvals</h1>
          <p className="text-slate-500 text-sm">{pagination.total} expense{pagination.total !== 1 ? 's' : ''} to review</p>
        </div>
        <div className="flex gap-2">
          {[
            { label: 'Pending', value: 'submitted,under_review' },
            { label: 'Approved', value: 'approved,reimbursement_pending,reimbursed' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: '' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expense ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Purpose</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-3 rounded" /></td>)}</tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No expenses to review" description="All caught up! There are no pending approvals." icon={<CheckCircle className="w-8 h-8" />} /></td></tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{exp.expenseNumber}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-700">{exp.user?.name}</p>
                      <p className="text-xs text-slate-400">{exp.department?.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.category?.color || '#94A3B8' }} />
                        <span className="text-slate-600 text-xs">{exp.category?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-48"><p className="text-slate-600 truncate">{exp.description}</p></td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exp.paymentSource === 'company' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>
                        {exp.paymentSource === 'company' ? 'Company' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={exp.status} size="sm" /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/expenses/${exp.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></Link>
                        {['submitted','under_review'].includes(exp.status) && (
                          <>
                            <button onClick={() => setApproveModal({ exp, amount: String(exp.amount) })} className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => setRejectModal({ exp, reason: '' })} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={fetch} />
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setApproveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Approve Expense</h3>
            <p className="text-slate-500 text-sm mb-4">{approveModal.exp.expenseNumber} — {approveModal.exp.user?.name}</p>
            <div className="mb-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approved Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input type="number" value={approveModal.amount} onChange={e => setApproveModal(m => m ? { ...m, amount: e.target.value } : null)}
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-green-500" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Claimed amount: {formatCurrency(approveModal.exp.amount)}</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setApproveModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleApprove} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Reject Expense</h3>
            <p className="text-slate-500 text-sm mb-4">{rejectModal.exp.expenseNumber} — {rejectModal.exp.user?.name}</p>
            <div className="mb-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea value={rejectModal.reason} onChange={e => setRejectModal(m => m ? { ...m, reason: e.target.value } : null)}
                placeholder="e.g. Bill not uploaded, Amount mismatch..." rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRejectModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
