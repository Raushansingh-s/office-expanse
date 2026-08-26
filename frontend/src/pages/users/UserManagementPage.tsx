import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserCheck, UserX, Key } from 'lucide-react';
import { usersApi } from '../../services/api';
import type { User, Role, Department } from '../../types';
import { departmentsApi } from '../../services/api';
import toast from 'react-hot-toast';

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  director: 'bg-amber-100 text-amber-700',
  employee: 'bg-green-100 text-green-700',
};

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add'|'edit'|'reset'; data: any }>({ open: false, mode: 'add', data: {} });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, deptsRes] = await Promise.all([usersApi.list(), usersApi.roles(), departmentsApi.list()]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setDepartments(deptsRes.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    const { id, mode, ...data } = modal.data;
    if (modal.mode === 'add' && (!data.name || !data.email || !data.password || !data.roleId)) {
      toast.error('Name, email, password and role are required'); return;
    }
    setSaving(true);
    try {
      if (modal.mode === 'add') { await usersApi.create(data); toast.success('User created!'); }
      else if (modal.mode === 'edit') { await usersApi.update(id, data); toast.success('User updated!'); }
      else if (modal.mode === 'reset') {
        if (!data.password || data.password.length < 6) { toast.error('Password must be at least 6 characters'); setSaving(false); return; }
        await usersApi.resetPassword(id, data.password); toast.success('Password reset!');
      }
      setModal({ open: false, mode: 'add', data: {} });
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (user: User) => {
    try {
      await usersApi.update(user.id, { status: user.status === 'active' ? 'inactive' : 'active' });
      toast.success(`User ${user.status === 'active' ? 'deactivated' : 'activated'}`);
      fetch();
    } catch { toast.error('Failed to update user'); }
  };

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm">{users.length} total users</p>
        </div>
        <button onClick={() => setModal({ open: true, mode: 'add', data: { status: 'active' } })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mobile</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-3 rounded" /></td>)}</tr>)
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{u.name.charAt(0)}</div>
                      <div><p className="font-medium text-slate-700">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[u.role?.name] || 'bg-slate-100 text-slate-600'}`}>{u.role?.displayName}</span></td>
                  <td className="px-4 py-3.5 text-slate-500">{u.department?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{u.employeeId || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{u.mobile || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setModal({ open: true, mode: 'edit', data: { id: u.id, name: u.name, mobile: u.mobile, departmentId: u.departmentId, roleId: u.roleId, status: u.status } })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setModal({ open: true, mode: 'reset', data: { id: u.id, password: '' } })}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600" title="Reset Password"><Key className="w-4 h-4" /></button>
                      <button onClick={() => handleToggle(u)} className={`p-1.5 rounded-lg text-slate-400 ${u.status === 'active' ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-green-50 hover:text-green-600'}`}>
                        {u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal({ open: false, mode: 'add', data: {} })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">
              {modal.mode === 'add' ? 'Add User' : modal.mode === 'edit' ? 'Edit User' : 'Reset Password'}
            </h3>
            {modal.mode === 'reset' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <input type="password" value={modal.data.password || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, password: e.target.value } }))}
                  placeholder="Min 6 characters" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name {modal.mode === 'add' && <span className="text-red-500">*</span>}</label>
                  <input type="text" value={modal.data.name || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" /></div>
                {modal.mode === 'add' && (
                  <>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={modal.data.email || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                      <input type="password" value={modal.data.password || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, password: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Employee ID</label>
                      <input type="text" value={modal.data.employeeId || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, employeeId: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" /></div>
                  </>
                )}
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile</label>
                  <input type="tel" value={modal.data.mobile || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, mobile: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Role {modal.mode === 'add' && <span className="text-red-500">*</span>}</label>
                  <select value={modal.data.roleId || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, roleId: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500">
                    <option value="">Select role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                  <select value={modal.data.departmentId || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, departmentId: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500">
                    <option value="">No Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                {modal.mode === 'edit' && (
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                    <select value={modal.data.status || 'active'} onChange={e => setModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select></div>
                )}
              </div>
            )}
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

export default UserManagementPage;
