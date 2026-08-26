import React, { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { categoriesApi } from '../../services/api';
import type { ExpenseCategory } from '../../types';
import toast from 'react-hot-toast';

const COLORS_LIST = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899','#64748B','#78716C'];

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add'|'edit'; data: Partial<ExpenseCategory> }>({ open: false, mode: 'add', data: {} });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    categoriesApi.list().then(r => setCategories(r.data)).finally(() => setLoading(false));
  };
  useEffect(fetch, []);

  const handleSave = async () => {
    if (!modal.data.name) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') { await categoriesApi.create(modal.data); toast.success('Category created!'); }
      else if (modal.data.id) { await categoriesApi.update(modal.data.id, modal.data); toast.success('Category updated!'); }
      setModal({ open: false, mode: 'add', data: {} });
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expense Categories</h1>
          <p className="text-slate-500 text-sm">{categories.length} categories</p>
        </div>
        <button onClick={() => setModal({ open: true, mode: 'add', data: { color: '#3B82F6', status: 'active' } })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"><div className="skeleton h-8 w-8 rounded-full mb-2" /><div className="skeleton h-3 w-20 rounded" /></div>)
        ) : (
          categories.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: (c.color || '#94A3B8') + '20' }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color || '#94A3B8' }} />
                </div>
                <button onClick={() => setModal({ open: true, mode: 'edit', data: c })} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="font-medium text-slate-700 text-sm">{c.name}</p>
              {c.isDefault && <span className="text-xs text-slate-400">Default</span>}
              {c._count && <p className="text-xs text-slate-400 mt-1">{c._count.expenses} expenses</p>}
            </div>
          ))
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal({ open: false, mode: 'add', data: {} })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">{modal.mode === 'add' ? 'Add Category' : 'Edit Category'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={modal.data.name || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS_LIST.map(col => (
                    <button key={col} type="button" onClick={() => setModal(m => ({ ...m, data: { ...m.data, color: col } }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${modal.data.color === col ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: col }} />
                  ))}
                </div>
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

export default CategoriesPage;
