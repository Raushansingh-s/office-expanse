import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../utils';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.users({ roleFilter: 'employee' })
      .then(res => setEmployees(res.data))
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Employees</h1>
        <p className="text-slate-500 text-sm">Employee expense tracking and summary</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Personal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pending Reimb.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reimbursed</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expenses</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-3 rounded" /></td>)}</tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No employees found" icon={<Users className="w-8 h-8" />} /></td></tr>
              ) : (
                employees.map(e => (
                  <tr key={e.user.id}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {e.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{e.user.name}</p>
                          <p className="text-xs text-slate-400">{e.user.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{e.user.department || '—'}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-800">{formatCurrency(e.totalAmount)}</td>
                    <td className="px-4 py-3.5 text-right text-teal-700 font-medium">{formatCurrency(e.companyPaid)}</td>
                    <td className="px-4 py-3.5 text-right text-purple-700 font-medium">{formatCurrency(e.personallyPaid)}</td>
                    <td className="px-4 py-3.5 text-right text-amber-700 font-medium">{formatCurrency(e.pendingReimbursement)}</td>
                    <td className="px-4 py-3.5 text-right text-green-700 font-medium">{formatCurrency(e.reimbursed)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">{e.totalCount}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link to={`/expenses?userId=${e.user.id}`} className="text-blue-600 text-xs hover:underline">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;
