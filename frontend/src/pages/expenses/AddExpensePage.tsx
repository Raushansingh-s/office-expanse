import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar, DollarSign, Tag, Building2, FileText,
  Upload, X, AlertTriangle, ArrowLeft, Save
} from 'lucide-react';
import { expensesApi, categoriesApi, departmentsApi, usersApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { ExpenseCategory, Department, User } from '../../types';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const AddExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // if id present, edit mode
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role?.name || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);

  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    userId: '',
    departmentId: '',
    categoryId: '',
    description: '',
    amount: '',
    paymentSource: 'personal',
    paymentMethod: 'upi',
    merchantName: '',
    location: '',
    billNumber: '',
    reimbursementRequired: true,
    reimbursementAmount: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, deptRes] = await Promise.all([categoriesApi.list(), departmentsApi.list()]);
        setCategories(catRes.data);
        setDepartments(deptRes.data);
        if (isAdmin) {
          const usersRes = await usersApi.list({ status: 'active' });
          setUsers(usersRes.data);
        }
        if (id) {
          const expRes = await expensesApi.get(id);
          const exp = expRes.data;
          setForm({
            expenseDate: exp.expenseDate.split('T')[0],
            userId: exp.userId,
            departmentId: exp.departmentId || '',
            categoryId: exp.categoryId,
            description: exp.description,
            amount: String(exp.amount),
            paymentSource: exp.paymentSource,
            paymentMethod: exp.paymentMethod,
            merchantName: exp.merchantName || '',
            location: exp.location || '',
            billNumber: exp.billNumber || '',
            reimbursementRequired: exp.reimbursementRequired,
            reimbursementAmount: exp.reimbursementAmount ? String(exp.reimbursementAmount) : '',
            notes: exp.notes || '',
          });
          setExistingReceipts(exp.receipts || []);
        } else {
          setForm(f => ({
            ...f,
            userId: user?.id || '',
            departmentId: user?.departmentId || '',
          }));
        }
      } catch {
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
    if (key === 'amount' && form.paymentSource === 'personal') {
      setForm(f => ({ ...f, amount: value, reimbursementAmount: value }));
    }
    if (key === 'paymentSource' && value === 'company') {
      setForm(f => ({ ...f, paymentSource: value, reimbursementRequired: false, reimbursementAmount: '' }));
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}: File too large (max 5MB)`); return false; }
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!['jpg','jpeg','png','pdf'].includes(ext || '')) { toast.error(`${f.name}: Only JPG, PNG, PDF allowed`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => setFiles(f => f.filter((_, i) => i !== idx));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.expenseDate) errs.expenseDate = 'Please select an expense date';
    if (!form.categoryId) errs.categoryId = 'Please select an expense category';
    if (!form.description.trim()) errs.description = 'Please enter a purpose/description';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Please enter a valid amount';
    if (!form.paymentSource) errs.paymentSource = 'Please select a payment source';
    if (!form.paymentMethod) errs.paymentMethod = 'Please select a payment method';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors below'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) formData.append(k, String(v));
      });
      files.forEach(f => formData.append('receipts', f));

      let res;
      if (id) {
        res = await expensesApi.update(id, formData);
        toast.success('Expense updated successfully!');
      } else {
        res = await expensesApi.create(formData);
        if (res.data.isDuplicate) {
          setDuplicateWarning(true);
          toast.success('Expense submitted (possible duplicate flagged)');
        } else {
          toast.success('Expense submitted successfully!');
        }
      }
      navigate(`/expenses/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white ${errors[field] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`;

  if (loading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        <div className="bg-white rounded-2xl p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{id ? 'Edit Expense' : 'Add New Expense'}</h1>
            <p className="text-slate-500 text-sm">{id ? 'Update expense details' : 'Submit a new expense for approval'}</p>
          </div>
        </div>

        {duplicateWarning && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Possible Duplicate Expense Detected</p>
              <p className="text-amber-700 text-xs mt-1">A similar expense was already submitted for the same date and amount. The expense has been saved but flagged for review.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">Expense Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />Expense Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.expenseDate} onChange={e => handleChange('expenseDate', e.target.value)} className={inputClass('expenseDate')} max={new Date().toISOString().split('T')[0]} />
                {errors.expenseDate && <p className="text-red-500 text-xs mt-1">{errors.expenseDate}</p>}
              </div>

              {isAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Expense By</label>
                  <select value={form.userId} onChange={e => handleChange('userId', e.target.value)} className={inputClass('userId')}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role?.displayName})</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Submitted By</label>
                  <input type="text" value={user?.name || ''} disabled className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Department
                </label>
                <select value={form.departmentId} onChange={e => handleChange('departmentId', e.target.value)} className={inputClass('departmentId')}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Tag className="w-3.5 h-3.5 inline mr-1" />Expense Category <span className="text-red-500">*</span>
                </label>
                <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className={inputClass('categoryId')}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <FileText className="w-3.5 h-3.5 inline mr-1" />Purpose / Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe the purpose of this expense..."
                rows={2}
                className={inputClass('description') + ' resize-none'}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor / Merchant Name</label>
                <input type="text" value={form.merchantName} onChange={e => handleChange('merchantName', e.target.value)} placeholder="e.g. Swiggy, Uber, Amazon" className={inputClass('merchantName')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                <input type="text" value={form.location} onChange={e => handleChange('location', e.target.value)} placeholder="e.g. Bangalore, Mumbai" className={inputClass('location')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill / Invoice Number</label>
                <input type="text" value={form.billNumber} onChange={e => handleChange('billNumber', e.target.value)} placeholder="Optional" className={inputClass('billNumber')} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">Payment Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" />Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => handleChange('amount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClass('amount') + ' pl-7'}
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method <span className="text-red-500">*</span></label>
                <select value={form.paymentMethod} onChange={e => handleChange('paymentMethod', e.target.value)} className={inputClass('paymentMethod')}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Source <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'company', label: '🏢 Company Money', desc: 'Paid from company account' },
                  { value: 'personal', label: '👤 Personally Paid', desc: 'Paid from personal funds' },
                ].map(opt => (
                  <label key={opt.value} className={`relative flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.paymentSource === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="paymentSource" value={opt.value} checked={form.paymentSource === opt.value} onChange={e => handleChange('paymentSource', e.target.value)} className="sr-only" />
                    <span className="font-semibold text-sm text-slate-800">{opt.label}</span>
                    <span className="text-xs text-slate-500">{opt.desc}</span>
                    {form.paymentSource === opt.value && <div className="absolute top-3 right-3 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                  </label>
                ))}
              </div>
              {errors.paymentSource && <p className="text-red-500 text-xs mt-1">{errors.paymentSource}</p>}
            </div>

            {form.paymentSource === 'personal' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                <p className="text-sm font-semibold text-amber-800">Reimbursement Details</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.reimbursementRequired} onChange={e => handleChange('reimbursementRequired', e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm font-medium text-amber-800">Reimbursement Required</span>
                  </label>
                </div>
                {form.reimbursementRequired && (
                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-1.5">Reimbursement Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                      <input
                        type="number"
                        value={form.reimbursementAmount}
                        onChange={e => handleChange('reimbursementAmount', e.target.value)}
                        placeholder={form.amount || '0.00'}
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-4 py-2.5 border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                      />
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Leave blank to claim the full expense amount</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Bill / Receipt Upload</h2>

            {existingReceipts.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {existingReceipts.map(r => (
                  <a key={r.id} href={`/uploads/${r.filename}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-700 hover:bg-slate-200">
                    <FileText className="w-3 h-3" /> {r.originalName}
                  </a>
                ))}
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">JPG, JPEG, PNG, PDF — max 5MB each</p>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileAdd} />
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{f.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pb-6">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 sm:flex-none px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save className="w-4 h-4" />{id ? 'Update Expense' : 'Submit Expense'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpensePage;
