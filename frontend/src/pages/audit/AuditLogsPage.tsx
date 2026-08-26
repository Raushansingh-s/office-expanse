import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { auditApi } from '../../services/api';
import { formatDateTime } from '../../utils';
import Pagination from '../../components/ui/Pagination';
import type { AuditLog, PaginationMeta } from '../../types';
import toast from 'react-hot-toast';

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-50 text-blue-700',
  CREATE_EXPENSE: 'bg-green-50 text-green-700',
  APPROVE_EXPENSE: 'bg-emerald-50 text-emerald-700',
  REJECT_EXPENSE: 'bg-red-50 text-red-700',
  UPDATE_EXPENSE: 'bg-amber-50 text-amber-700',
  CANCEL_EXPENSE: 'bg-slate-100 text-slate-600',
  PAY_REIMBURSEMENT: 'bg-purple-50 text-purple-700',
  CREATE_USER: 'bg-blue-50 text-blue-700',
  UPDATE_USER: 'bg-amber-50 text-amber-700',
  DEACTIVATE_USER: 'bg-red-50 text-red-700',
};

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const res = await auditApi.list({ page, limit: 50 });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
          <p className="text-slate-500 text-sm">Complete system activity history — read-only</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resource</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resource ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">IP Address</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-3 rounded" /></td>)}</tr>)
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 text-xs">{log.user?.name || 'System'}</p>
                    <p className="text-xs text-slate-400">{log.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>{log.action.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{log.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.resourceId ? log.resourceId.slice(0,8) + '...' : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={fetch} />
      </div>
    </div>
  );
};

export default AuditLogsPage;
