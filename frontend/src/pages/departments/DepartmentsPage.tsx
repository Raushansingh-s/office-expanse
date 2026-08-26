import React, { useState, useEffect } from 'react';
import { Plus, Edit, Building2 } from 'lucide-react';
import { departmentsApi } from '../../services/api';
import type { Department } from '../../types';
import toast from 'react-hot-toast';

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add'|'edit'; data: Partial<Department> }>({ open: false, mode: 'add', data: {} });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    departmentsApi.list().then(r => setDepartments(r.data)).finally(() => setLoading(false));
  };
  useEffect(fetch, []);

  const handleSave = async () => {
    if (!modal.data.name) { toast.error('Department name is required'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await departmentsApi.create(modal.data);
        toast.success('Department created!');
      } else if (modal.data.id) {
        await departmentsApi.update(modal.data.id, modal.data);
        toast.success('Department updated!');
      }
      setModal({ open: false, mode: 'add', data: {} });
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Departments</h1>
          <p className="text-slate-500 text-sm">{departments.length} departments</p>
        </div>
        <button onClick={() => setModal({ open: true, mode: 'add', data: { status: 'active' } })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><div className="skeleton h-10 w-10 rounded-xl mb-3" /><div className="skeleton h-4 w-24 rounded mb-2" /><div className="skeleton h-3 w-16 rounded" /></div>)
        ) : (
          departments.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><Building2 className="w-5 h-5" /></div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ open: true, mode: 'edit', data: d })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{d.name}</h3>
              {d.code && <p className="text-xs text-slate-400 mt-0.5">Code: {d.code}</p>}
              {d.departmentHead && <p className="text-xs text-slate-400">Head: {d.departmentHead}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{d.status}</span>
                {d._count && <span className="text-xs text-slate-400">{d._count.users} members</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal({ open: false, mode: 'add', data: {} })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">{modal.mode === 'add' ? 'Add Department' : 'Edit Department'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={modal.data.name || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code</label>
                <input type="text" value={modal.data.code || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, code: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Department Head</label>
                <input type="text" value={modal.data.departmentHead || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, departmentHead: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select value={modal.data.status || 'active'} onChange={e => setModal(m => ({ ...m, data: { ...m.data, status: e.target.value as any } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false, mode: 'add', data: {} })} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
