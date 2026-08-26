import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  RefreshCcw, Building, Users, Calendar, ArrowRight
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { expensesApi, reportsApi } from '../../services/api';
import { formatCurrency, formatDate, getDateRange } from '../../utils';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import type { DashboardSummary, MonthlyData, CategoryData, Expense } from '../../types';
import toast from 'react-hot-toast';

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'This FY', value: 'this_fy' },
];

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899'];

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
    <div className="skeleton h-11 w-11 rounded-xl mb-4" />
    <div className="skeleton h-3 w-24 mb-2 rounded" />
    <div className="skeleton h-7 w-32 rounded" />
  </div>
);

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('this_month');
  const [dateFilter, setDateFilter] = useState(getDateRange('this_month'));

  const fetchData = async (filters: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true);
      const [summaryRes, monthlyRes, catRes, recentRes, pendingRes] = await Promise.all([
        expensesApi.summary(filters),
        reportsApi.monthly({ year: new Date().getFullYear() }),
        reportsApi.categories(filters),
        expensesApi.list({ limit: 8, page: 1 }),
        expensesApi.list({ status: 'submitted,under_review', limit: 5 })
      ]);
      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data);
      setCategories(catRes.data.slice(0, 7));
      setRecentExpenses(recentRes.data.data);
      setPendingExpenses(pendingRes.data.data);
    } catch (_) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateFilter);
  }, []);

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const range = getDateRange(preset);
    setDateFilter(range);
    fetchData(range);
  };

  const cards = summary ? [
    { title: 'Total Expenses', amount: summary.total.amount, count: summary.total.count, icon: <DollarSign className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'This Month', amount: summary.thisMonth.amount, count: summary.thisMonth.count, icon: <Calendar className="w-5 h-5" />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { title: 'Today', amount: summary.today.amount, count: summary.today.count, icon: <TrendingUp className="w-5 h-5" />, color: 'text-violet-600', bgColor: 'bg-violet-100' },
    { title: 'Pending Approval', amount: summary.pendingApproval.amount, count: summary.pendingApproval.count, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    { title: 'Pending Reimbursement', amount: summary.pendingReimbursement.amount, count: summary.pendingReimbursement.count, icon: <RefreshCcw className="w-5 h-5" />, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { title: 'Reimbursed', amount: summary.reimbursed.amount, count: summary.reimbursed.count, icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Rejected', amount: summary.rejected.amount, count: summary.rejected.count, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bgColor: 'bg-red-100' },
    { title: 'Company Paid', amount: summary.companyPaid.amount, count: summary.companyPaid.count, icon: <Building className="w-5 h-5" />, color: 'text-teal-600', bgColor: 'bg-teal-100' },
    { title: 'Personally Paid', amount: summary.personallyPaid.amount, count: summary.personallyPaid.count, icon: <Users className="w-5 h-5" />, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  ] : [];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Financial overview of your company expenses</p>
        </div>

        {/* Date filter presets */}
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.slice(0,5).map((c) => (
            <StatCard key={c.title} {...c} />
          ))}
          {cards.slice(5).map((c) => (
            <StatCard key={c.title} {...c} />
          ))}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-800">Monthly Expense Trend</h3>
              <p className="text-xs text-slate-400">{new Date().getFullYear()} — all months</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, 'Amount']} />
                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-1">Category Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">By expense amount</p>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : categories.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="amount" paddingAngle={3}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categories.slice(0,5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 truncate max-w-24">{c.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pending Approvals + Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800">Pending Approvals</h3>
              {pendingExpenses.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingExpenses.length}
                </span>
              )}
            </div>
            <Link to="/approvals" className="text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))
            ) : pendingExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">All caught up! No pending approvals.</p>
              </div>
            ) : (
              pendingExpenses.map((exp) => (
                <Link key={exp.id} to={`/expenses/${exp.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                    {exp.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{exp.user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{exp.category?.name} · {exp.expenseNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(exp.amount)}</p>
                    <p className="text-xs text-slate-400">{formatDate(exp.expenseDate)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Recent Expenses</h3>
            <Link to="/expenses" className="text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="skeleton flex-1 h-3 rounded" />
                  <div className="skeleton w-16 h-3 rounded" />
                </div>
              ))
            ) : recentExpenses.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No expenses yet</div>
            ) : (
              recentExpenses.map((exp) => (
                <Link key={exp.id} to={`/expenses/${exp.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: exp.category?.color || '#94A3B8' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{exp.description}</p>
                    <p className="text-xs text-slate-400">{exp.user?.name} · {formatDate(exp.expenseDate)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(exp.amount)}</p>
                    <StatusBadge status={exp.status} size="sm" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
