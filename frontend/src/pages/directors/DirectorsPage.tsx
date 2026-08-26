import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../utils';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const DirectorsPage: React.FC = () => {
  const [directors, setDirectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.users({ roleFilter: 'director' })
      .then(res => setDirectors(res.data))
      .catch(() => toast.error('Failed to load directors'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Directors</h1>
        <p className="text-slate-500 text-sm">Director expense tracking and summary</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
              <div className="skeleton h-12 w-12 rounded-full" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
              {Array.from({ length: 4 }).map((_, j) => <div key={j} className="skeleton h-3 rounded" />)}
            </div>
          ))}
        </div>
      ) : directors.length === 0 ? (
        <EmptyState title="No directors found" description="No director accounts exist in the system." icon={<Users className="w-8 h-8" />} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directors.map(d => (
            <Link key={d.user.id} to={`/expenses?userId=${d.user.id}`} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-0.5 block">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {d.user.name.charAt(0)}
                </div>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">Director</span>
              </div>
              <h3 className="font-bold text-slate-800">{d.user.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{d.user.department || 'No Department'}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Expenses</span>
                  <span className="font-bold text-slate-800">{formatCurrency(d.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Company Paid</span>
                  <span className="font-medium text-teal-700">{formatCurrency(d.companyPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Personally Paid</span>
                  <span className="font-medium text-purple-700">{formatCurrency(d.personallyPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pending Reimburse</span>
                  <span className="font-medium text-amber-700">{formatCurrency(d.pendingReimbursement)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reimbursed</span>
                  <span className="font-medium text-green-700">{formatCurrency(d.reimbursed)}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">{d.totalCount} expenses</span>
                <span className="text-xs text-blue-600 font-medium">View Expenses →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DirectorsPage;
