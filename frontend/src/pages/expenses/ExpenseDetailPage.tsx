import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, CheckCircle, XCircle,
  FileText, MapPin, Store, Hash, Clock,
  User, Building2, Tag, AlertTriangle,
  ExternalLink, MessageSquare
} from 'lucide-react';
import { expensesApi } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime, paymentMethodLabel, paymentSourceLabel } from '../../utils';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import type { Expense } from '../../types';
import toast from 'react-hot-toast';

const ExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role?.name || '');

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExpense = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await expensesApi.get(id);
      setExpense(res.data);
      setApprovedAmount(String(res.data.amount));
    } catch {
      toast.error('Expense not found');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpense(); }, [id]);

  const handleApprove = async () => {
    if (!expense) return;
    setActionLoading(true);
    try {
      await expensesApi.approve(expense.id, { approvedAmount: parseFloat(approvedAmount) || expense.amount });
      toast.success('Expense approved successfully!');
      setShowApproveModal(false);
      fetchExpense();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!expense || !rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setActionLoading(true);
    try {
      await expensesApi.reject(expense.id, { reason: rejectReason });
      toast.success('Expense rejected');
      setShowRejectModal(false);
      fetchExpense();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!expense || !correctionNote.trim()) { toast.error('Please explain what needs correction'); return; }
    setActionLoading(true);
    try {
      await expensesApi.requestCorrection(expense.id, { comment: correctionNote });
      toast.success('Correction requested');
      setShowCorrectionModal(false);
      fetchExpense();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request correction');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="bg-white rounded-2xl p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-4 rounded" />)}
        </div>
      </div>
    );
  }

  if (!expense) return null;

  const canEdit = (expense.userId === user?.id || isAdmin) && ['draft','submitted','correction_requested'].includes(expense.status);
  const canApproveReject = isAdmin && ['submitted','under_review'].includes(expense.status);

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white text-slate-500 mt-0.5">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-base font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">{expense.expenseNumber}</span>
                <StatusBadge status={expense.status} />
                {expense.isDuplicate && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    <AlertTriangle className="w-3 h-3" /> Possible Duplicate
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(expense.amount)}</p>
              <p className="text-slate-500 text-sm mt-1">Submitted on {formatDate(expense.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Link to={`/expenses/${expense.id}/edit`} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Edit className="w-4 h-4" /> Edit
              </Link>
            )}
            {canApproveReject && (
              <>
                <button onClick={() => setShowCorrectionModal(true)} className="flex items-center gap-2 px-4 py-2 border border-amber-200 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50">
                  <MessageSquare className="w-4 h-4" /> Request Correction
                </button>
                <button onClick={() => setShowRejectModal(true)} className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => setShowApproveModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </>
            )}
          </div>
        </div>

        {expense.status === 'rejected' && expense.rejectionReason && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Rejection Reason</p>
              <p className="text-red-700 text-sm mt-1">{expense.rejectionReason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Expense Details</h3>
              <div className="space-y-3">
                {[
                  { icon: <Calendar className="w-4 h-4" />, label: 'Expense Date', value: formatDate(expense.expenseDate) },
                  { icon: <User className="w-4 h-4" />, label: 'Submitted By', value: `${expense.user?.name} (${expense.user?.employeeId || 'N/A'})` },
                  { icon: <Building2 className="w-4 h-4" />, label: 'Department', value: expense.department?.name || '—' },
                  { icon: <Tag className="w-4 h-4" />, label: 'Category', value: expense.category?.name },
                  { icon: <FileText className="w-4 h-4" />, label: 'Purpose', value: expense.description },
                  { icon: <Store className="w-4 h-4" />, label: 'Merchant', value: expense.merchantName || '—' },
                  { icon: <MapPin className="w-4 h-4" />, label: 'Location', value: expense.location || '—' },
                  { icon: <Hash className="w-4 h-4" />, label: 'Bill Number', value: expense.billNumber || '—' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-slate-400 mt-0.5 flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                      <p className="text-sm text-slate-700 font-medium mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Payment & Amount Breakdown</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Claimed Amount</span>
                  <span className="font-bold text-slate-800 text-lg">{formatCurrency(expense.amount)}</span>
                </div>
                {expense.approvedAmount !== null && expense.approvedAmount !== undefined && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-500">Approved Amount</span>
                      <span className="font-bold text-green-700">{formatCurrency(expense.approvedAmount)}</span>
                    </div>
                    {expense.approvedAmount < expense.amount && (
                      <div className="flex items-center justify-between py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">Rejected Amount</span>
                        <span className="font-bold text-red-600">{formatCurrency(expense.amount - expense.approvedAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                {expense.reimbursementRequired && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Reimbursement Claimed</span>
                    <span className="font-semibold text-orange-700">{formatCurrency(expense.reimbursementAmount || expense.amount)}</span>
                  </div>
                )}
                {expense.reimbursement?.paidAmount && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-500">Reimbursed Amount</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(expense.reimbursement.paidAmount)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className={`rounded-xl p-3 text-center ${expense.paymentSource === 'company' ? 'bg-teal-50' : 'bg-purple-50'}`}>
                    <p className="text-xs font-medium text-slate-500 mb-1">Payment Source</p>
                    <p className="font-semibold text-sm">{paymentSourceLabel[expense.paymentSource]}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs font-medium text-slate-500 mb-1">Payment Method</p>
                    <p className="font-semibold text-sm">{paymentMethodLabel[expense.paymentMethod]}</p>
                  </div>
                </div>
              </div>
            </div>

            {expense.receipts && expense.receipts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Bills & Receipts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {expense.receipts.map((r) => (
                    <a
                      key={r.id}
                      href={`/uploads/${r.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      {r.mimeType.startsWith('image/') ? (
                        <img src={`/uploads/${r.filename}`} alt={r.originalName} className="w-full h-20 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="w-full">
                        <p className="text-xs text-slate-600 truncate font-medium">{r.originalName}</p>
                        <p className="text-xs text-slate-400">{(r.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Approval Timeline</h3>
              <div className="space-y-0">
                {expense.approvals && expense.approvals.length > 0 ? (
                  expense.approvals.map((ap, i) => (
                    <div key={ap.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < expense.approvals!.length - 1 && (
                        <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-slate-100" />
                      )}
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                        ap.action === 'approved' ? 'bg-green-100 text-green-700' :
                        ap.action === 'rejected' ? 'bg-red-100 text-red-700' :
                        ap.action === 'correction_requested' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ap.action === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> :
                         ap.action === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 capitalize">{ap.action.replace(/_/g,' ')}</p>
                        <p className="text-xs text-slate-400">{ap.user?.name}</p>
                        {ap.comment && <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-2 py-1 italic">"{ap.comment}"</p>}
                        <p className="text-xs text-slate-300 mt-1">{formatDateTime(ap.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No timeline entries</p>
                )}
              </div>
            </div>

            {expense.reimbursement && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Reimbursement</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Status</span>
                    <StatusBadge status={expense.reimbursement.status} type="reimbursement" size="sm" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Requested</span>
                    <span className="font-medium text-sm">{formatCurrency(expense.reimbursement.requestedAmount)}</span>
                  </div>
                  {expense.reimbursement.approvedAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Approved</span>
                      <span className="font-medium text-sm text-green-700">{formatCurrency(expense.reimbursement.approvedAmount)}</span>
                    </div>
                  )}
                  {expense.reimbursement.paidAmount && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Paid</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(expense.reimbursement.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Payment Date</span>
                        <span className="text-sm">{formatDate(expense.reimbursement.paymentDate!)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Transaction Ref</span>
                        <span className="text-xs font-mono text-slate-600">{expense.reimbursement.transactionReference || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {expense.approvedBy && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-3">Approval Info</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Approved By</span>
                    <span className="text-sm font-medium">{expense.approvedBy.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Approved On</span>
                    <span className="text-sm">{formatDate(expense.approvedAt!)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Approve Expense</h3>
            <p className="text-slate-500 text-sm mb-4">You can approve the full amount or a partial amount.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approved Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Claimed: {formatCurrency(expense.amount)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleApprove} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Reject Expense</h3>
            <p className="text-slate-500 text-sm mb-4">Please provide a reason for rejection.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Bill not uploaded, Amount mismatch, Not a business expense..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Rejecting...' : 'Reject Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCorrectionModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Request Correction</h3>
            <p className="text-slate-500 text-sm mb-4">Tell the employee what needs to be corrected.</p>
            <div className="mb-4">
              <textarea
                value={correctionNote}
                onChange={e => setCorrectionNote(e.target.value)}
                placeholder="e.g. Please upload a clearer receipt image..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCorrectionModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleRequestCorrection} disabled={actionLoading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? 'Sending...' : 'Request Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);

export default ExpenseDetailPage;
