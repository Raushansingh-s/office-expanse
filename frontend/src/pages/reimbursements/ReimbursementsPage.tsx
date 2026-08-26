import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, CheckCircle, Clock, RefreshCcw, Upload } from 'lucide-react';
import { reimbursementsApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import type { Reimbursement, PaginationMeta } from '../../types';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = ['cash','upi','bank_transfer','cheque','other'];

const ReimbursementsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = ['super_admin','admin'].includes(user?.role?.name || '');
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page:1, limit:20, total:0, pages:0 });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [payModal, setPayModal] = useState<Reimbursement | null>(null);
  const [payForm, setPayForm] = useState({ paymentDate: new Date().toISOString().split('T')[0], paidAmount: '', paymentMethod: 'bank_transfer', transactionReference: '', paymentNotes: '' });
  const [payFile, setPayFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const [listRes, sumRes] = await Promise.all([
        reimbursementsApi.list(params),
        reimbursementsApi.summary()
      ]);
      setReimbursements(listRes.data.data);
      setPagination(listRes.data.pagination);
      setSummary(sumRes.data);
    } catch { toast.error('Failed to load reimbursements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleApprove = async (r: Reimbursement) => {
    try {
      await reimbursementsApi.approve(r.id, { approvedAmount: r.requestedAmount });
      toast.success('Reimbursement approved!');
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handlePay = async () => {
    if (!payModal) return;
    if (!payForm.paidAmount || !payForm.paymentDate || !payForm.paymentMethod) {
      toast.error('Please fill all required payment fields');
      return;
    }
    setActionLoading(true);
    try {
      const fd = new FormData();
      Object.entries(payForm).forEach(([k,v]) => fd.append(k, v));
      if (payFile) fd.append('paymentProof', payFile);
      await reimbursementsApi.pay(payModal.id, fd);
      toast.success('Payment recorded successfully!');
      setPayModal(null);
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to record payment'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reimbursements</h1>
        <p className="text-slate-500 text-sm">Track and process employee reimbursements</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending" amount={summary.pending.amount} count={summary.pending.count} icon={<Clock className="w-5 h-5" />} color="text-amber-600" bgColor="bg-amber-100" />
          <StatCard title="Approved for Payment" amount={summary.approvedForPayment.amount} count={summary.approvedForPayment.count} icon={<CheckCircle className="w-5 h-5" />} color="text-blue-600" bgColor="bg-blue-100" />
          <StatCard title="Paid This Month" amount={summary.paidThisMonth.amount} count={summary.paidThisMonth.count} icon={<DollarSign className="w-5 h-5" />} color="text-green-600" bgColor="bg-green-100" />
          <StatCard title="Total Reimbursed" amount={summary.totalReimbursed.amount} count={summary.totalReimbursed.count} icon={<RefreshCcw className="w-5 h-5" />} color="text-emerald-600" bgColor="bg-emerald-100" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', value: '' },
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved,partially_approved' },
          { label: 'Paid', value: 'paid' },
          { label: 'Rejected', value: 'rejected' },
        ].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Claim ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expense ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expense Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Claimed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Approved</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Date</th>
                {isAdmin && <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: isAdmin ? 10 : 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-3 rounded" /></td>)}</tr>
                ))
              ) : reimbursements.length === 0 ? (
                <tr><td colSpan={isAdmin ? 10 : 9}><EmptyState title="No reimbursements" description="No reimbursement records found." /></td></tr>
              ) : (
                reimbursements.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3.5"><span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{r.id.slice(0,8).toUpperCase()}</span></td>
                    <td className="px-4 py-3.5"><span className="font-mono text-xs text-slate-600">{r.expense?.expenseNumber || '—'}</span></td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-700">{r.user?.name}</p>
                      <p className="text-xs text-slate-400">{(r.user as any)?.department?.name || ''}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{r.expense?.expenseDate ? formatDate(r.expense.expenseDate) : '—'}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(r.requestedAmount)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-green-700">{r.approvedAmount ? formatCurrency(r.approvedAmount) : '—'}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{r.paidAmount ? formatCurrency(r.paidAmount) : '—'}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} type="reimbursement" size="sm" /></td>
                    <td className="px-4 py-3.5 text-slate-500">{r.paymentDate ? formatDate(r.paymentDate) : '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {r.status === 'pending' && (
                            <button onClick={() => handleApprove(r)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium">Approve</button>
                          )}
                          {['approved','partially_approved'].includes(r.status) && (
                            <button onClick={() => { setPayModal(r); setPayForm(f => ({ ...f, paidAmount: String(r.approvedAmount || r.requestedAmount) })); }}
                              className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium">
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={(p) => fetch(p)} />
      </div>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Record Reimbursement Payment</h3>
            <p className="text-slate-500 text-sm mb-5">{payModal.user?.name} — Approved: {formatCurrency(payModal.approvedAmount || payModal.requestedAmount)}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date <span className="text-red-500">*</span></label>
                <input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid Amount (₹) <span className="text-red-500">*</span></label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input type="number" value={payForm.paidAmount} onChange={e => setPayForm(f => ({ ...f, paidAmount: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method <span className="text-red-500">*</span></label>
                <select value={payForm.paymentMethod} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction ID / UTR</label>
                <input type="text" value={payForm.transactionReference} onChange={e => setPayForm(f => ({ ...f, transactionReference: e.target.value }))}
                  placeholder="e.g. UTR123456789" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea value={payForm.paymentNotes} onChange={e => setPayForm(f => ({ ...f, paymentNotes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Proof (optional)</label>
                <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">{payFile ? payFile.name : 'Upload screenshot or PDF'}</p>
                  <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setPayFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPayModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handlePay} disabled={actionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReimbursementsPage;
