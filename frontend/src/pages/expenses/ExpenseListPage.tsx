import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle, Search, Filter, Download, Eye, Edit, CheckCircle,
  XCircle, Trash2, FileText, X
} from 'lucide-react';
import { expensesApi, departmentsApi, categoriesApi, usersApi, exportApi } from '../../services/api';
import { formatCurrency, formatDate, expenseStatusLabel, downloadBlob } from '../../utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuthStore } from '../../stores/authStore';
import type { Expense, Department, ExpenseCategory, User, PaginationMeta, ExpenseStatus } from '../../types';
import toast from 'react-hot-toast';

const STATUSES = ['submitted','under_review','approved','rejected','reimbursement_pending','reimbursed','cancelled','correction_requested'];
const PAYMENT_SOURCES = [{ label: 'Company', value: 'company' }, { label: 'Personally Paid', value: 'personal' }];
const PAYMENT_METHODS = ['cash','upi','debit_card','credit_card','bank_transfer','cheque','other'];

const ExpenseListPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = ['super_admin','admin'].includes(user?.role?.name || '');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState({
    search: '', userId: '', departmentId: '', categoryId: '',
    status: '', paymentSource: '', paymentMethod: '',
    startDate: '', endDate: '', minAmount: '', maxAmount: '',
    page: 1, limit: 20
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const load = async () => {
      const [deptRes, catRes] = await Promise.all([
        departmentsApi.list(),
        categoriesApi.list()
      ]);
      setDepartments(deptRes.data);
      setCategories(catRes.data);
      if (isAdmin) {
        const usersRes = await usersApi.list({ status: 'active' });
        setUsers(usersRes.data);
      }
    };
    load();
  }, [isAdmin]);

  const fetchExpenses = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params: any = { page: f.page, limit: f.limit };
      if (f.search) params.search = f.search;
      if (f.userId) params.userId = f.userId;
      if (f.departmentId) params.departmentId = f.departmentId;
      if (f.categoryId) params.categoryId = f.categoryId;
      if (f.status) params.status = f.status;
      if (f.paymentSource) params.paymentSource = f.paymentSource;
      if (f.paymentMethod) params.paymentMethod = f.paymentMethod;
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.minAmount) params.minAmount = f.minAmount;
      if (f.maxAmount) params.maxAmount = f.maxAmount;

      const res = await expensesApi.list(params);
      setExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(filters); }, []);

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value, page: 1 };
    setFilters(updated);
    fetchExpenses(updated);
  };

  const handlePageChange = (page: number) => {
    const updated = { ...filters, page };
    setFilters(updated);
    fetchExpenses(updated);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await expensesApi.cancel(deleteId);
      toast.success('Expense cancelled');
      setDeleteId(null);
      fetchExpenses(filters);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel expense');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      const fn = format === 'excel' ? exportApi.excel : format === 'csv' ? exportApi.csv : exportApi.pdf;
      const res = await fn(params);
      const ext = format === 'excel' ? 'xlsx' : format;
      downloadBlob(res.data, `expenses-${Date.now()}.${ext}`);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Export failed');
    }
  };

  const clearFilters = () => {
    const reset = { search:'', userId:'', departmentId:'', categoryId:'', status:'', paymentSource:'', paymentMethod:'', startDate:'', endDate:'', minAmount:'', maxAmount:'', page:1, limit:20 };
    setFilters(reset);
    fetchExpenses(reset);
  };

  const hasActiveFilters = Object.entries(filters).some(([k,v]) => !['page','limit'].includes(k) && v !== '');

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
          <p className="text-slate-500 text-sm">{pagination.total} total records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Download className="w-4 h-4" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 hidden group-hover:block">
              <button onClick={() => handleExport('excel')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">Excel (.xlsx)</button>
              <button onClick={() => handleExport('csv')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">CSV</button>
              <button onClick={() => handleExport('pdf')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">PDF</button>
            </div>
          </div>
          <Link to="/expenses/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle className="w-4 h-4" /> Add Expense
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, name, merchant, purpose..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters {hasActiveFilters && <span className="w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">!</span>}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 border border-red-100">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {isAdmin && (
              <select value={filters.userId} onChange={e => handleFilterChange('userId', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
                <option value="">All Users</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <select value={filters.departmentId} onChange={e => handleFilterChange('departmentId', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filters.categoryId} onChange={e => handleFilterChange('categoryId', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{expenseStatusLabel[s as ExpenseStatus] || s}</option>)}
            </select>
            <select value={filters.paymentSource} onChange={e => handleFilterChange('paymentSource', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="">Payment Source</option>
              {PAYMENT_SOURCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={filters.paymentMethod} onChange={e => handleFilterChange('paymentMethod', e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="">Payment Method</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} placeholder="From date" className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400" />
            <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} placeholder="To date" className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400" />
            <input type="number" value={filters.minAmount} onChange={e => handleFilterChange('minAmount', e.target.value)} placeholder="Min amount" className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400" />
            <input type="number" value={filters.maxAmount} onChange={e => handleFilterChange('maxAmount', e.target.value)} placeholder="Max amount" className="border border-slate-200 rounded-lg text-sm px-2.5 py-2 focus:outline-none focus:border-blue-400" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Expense ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide max-w-36">Purpose</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reimbursement</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 11 : 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="skeleton h-3 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10}>
                    <EmptyState title="No expenses found" description="Try adjusting your filters or add a new expense." icon={<FileText className="w-8 h-8" />} action={<Link to="/expenses/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"><PlusCircle className="w-4 h-4" /> Add Expense</Link>} />
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{exp.expenseNumber}</span>
                        {exp.isDuplicate && <span title="Possible duplicate"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-700 whitespace-nowrap">{exp.user?.name}</div>
                      <div className="text-xs text-slate-400">{exp.user?.employeeId}</div>
                    </td>
                    {isAdmin && <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{exp.department?.name || '—'}</td>}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: exp.category?.color || '#94A3B8' }} />
                        <span className="text-slate-600 whitespace-nowrap">{exp.category?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-36">
                      <p className="truncate" title={exp.description}>{exp.description}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exp.paymentSource === 'company' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>
                        {exp.paymentSource === 'company' ? 'Company' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={exp.status} size="sm" /></td>
                    <td className="px-4 py-3.5">
                      {exp.reimbursement ? (
                        <StatusBadge status={exp.reimbursement.status} type="reimbursement" size="sm" />
                      ) : exp.reimbursementRequired ? (
                        <span className="text-xs text-slate-400">Pending</span>
                      ) : (
                        <span className="text-xs text-slate-300">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/expenses/${exp.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(exp.userId === user?.id || isAdmin) && ['draft','submitted','correction_requested'].includes(exp.status) && (
                          <Link to={`/expenses/${exp.id}/edit`} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        {isAdmin && ['submitted','under_review'].includes(exp.status) && (
                          <>
                            <button className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600" title="Approve" onClick={() => navigate(`/expenses/${exp.id}`)}>
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Reject" onClick={() => navigate(`/expenses/${exp.id}`)}>
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(exp.userId === user?.id || isAdmin) && ['draft','submitted'].includes(exp.status) && (
                          <button onClick={() => setDeleteId(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Cancel">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={handlePageChange} />
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Cancel Expense"
        message="Are you sure you want to cancel this expense? This action cannot be undone."
        confirmLabel="Yes, Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={deleting}
      />
    </div>
  );
};

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default ExpenseListPage;
