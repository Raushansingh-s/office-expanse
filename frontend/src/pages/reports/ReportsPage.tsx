import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { reportsApi, exportApi } from '../../services/api';
import { formatCurrency, downloadBlob } from '../../utils';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899'];

const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState('expenses');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      switch (activeReport) {
        case 'expenses': res = await reportsApi.expenses(filters); break;
        case 'monthly': res = await reportsApi.monthly(); break;
        case 'categories': res = await reportsApi.categories(filters); break;
        case 'departments': res = await reportsApi.departments(filters); break;
        case 'users': res = await reportsApi.users(filters); break;
        case 'reimbursements': res = await reportsApi.reimbursements(filters); break;
        case 'payment_methods': res = await reportsApi.paymentMethods(filters); break;
        default: res = await reportsApi.expenses(filters);
      }
      setData(res.data);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [activeReport, filters]);

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const fn = format === 'excel' ? exportApi.excel : format === 'csv' ? exportApi.csv : exportApi.pdf;
      const res = await fn(filters);
      const ext = format === 'excel' ? 'xlsx' : format;
      downloadBlob(res.data, `report-${activeReport}-${Date.now()}.${ext}`);
      toast.success('Report downloaded!');
    } catch { toast.error('Export failed'); }
  };

  const REPORTS = [
    { id: 'expenses', label: 'All Expenses' },
    { id: 'monthly', label: 'Monthly Trend' },
    { id: 'categories', label: 'By Category' },
    { id: 'departments', label: 'By Department' },
    { id: 'users', label: 'By Employee' },
    { id: 'reimbursements', label: 'Reimbursements' },
    { id: 'payment_methods', label: 'Payment Methods' },
  ];

  const renderChart = () => {
    if (activeReport === 'monthly') {
      return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
          <h3 className="font-semibold text-slate-700 mb-4">Monthly Expense Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, 'Amount']} />
              <Bar dataKey="amount" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    if (activeReport === 'categories' || activeReport === 'departments' || activeReport === 'payment_methods') {
      return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
          <h3 className="font-semibold text-slate-700 mb-4">Distribution Chart</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {data.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-600">{item.name || item.method || '—'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm text-slate-800">{formatCurrency(item.amount)}</span>
                    <span className="text-xs text-slate-400 ml-2">({item.count} exp.)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTable = () => {
    if (activeReport === 'expenses') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Purpose</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Approved</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reimb. Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice(0,100).map((exp: any) => (
                <tr key={exp.id}>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{exp.expenseNumber}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(exp.expenseDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{exp.user?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{exp.category?.name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-40"><p className="truncate">{exp.description}</p></td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(exp.amount)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{exp.approvedAmount ? formatCurrency(exp.approvedAmount) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-1.5 py-0.5 rounded-full ${exp.paymentSource==='company'?'bg-teal-50 text-teal-700':'bg-purple-50 text-purple-700'}`}>{exp.paymentSource==='company'?'Company':'Personal'}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={exp.status} size="sm" /></td>
                  <td className="px-4 py-3">{exp.reimbursement ? <StatusBadge status={exp.reimbursement.status} type="reimbursement" size="sm" /> : <span className="text-xs text-slate-300">N/A</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeReport === 'users') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Personal</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pending</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reimbursed</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Count</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((u: any) => (
                <tr key={u.user.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{u.user.name}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{u.user.role}</span></td>
                  <td className="px-4 py-3 text-slate-500">{u.user.department || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(u.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-teal-700">{formatCurrency(u.companyPaid)}</td>
                  <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(u.personallyPaid)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{formatCurrency(u.pendingReimbursement)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(u.reimbursed)}</td>
                  <td className="px-4 py-3 text-center"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{u.totalCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm">Generate and export expense reports</p>
        </div>
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 hidden group-hover:block">
            <button onClick={() => handleExport('excel')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">Excel (.xlsx)</button>
            <button onClick={() => handleExport('csv')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">CSV</button>
            <button onClick={() => handleExport('pdf')} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">PDF</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeReport === r.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3">
        <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-400" placeholder="From" />
        <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-400" placeholder="To" />
        <button onClick={fetchReport} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">Apply</button>
        <button onClick={() => { setFilters({ startDate:'', endDate:'', status:'' }); }} className="px-4 py-2 text-slate-500 rounded-lg text-sm hover:bg-slate-50">Clear</button>
        <span className="text-xs text-slate-400 self-center ml-auto">{data.length} records</span>
      </div>

      {!loading && renderChart()}

      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {renderTable() || (
            <div className="p-8 text-center text-slate-400 text-sm">Select a report type above to view detailed data</div>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Generating report...</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
