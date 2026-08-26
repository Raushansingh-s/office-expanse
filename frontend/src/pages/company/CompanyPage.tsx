import React, { useState, useEffect } from 'react';
import { Building, Save } from 'lucide-react';
import { companyApi } from '../../services/api';
import type { Company } from '../../types';
import toast from 'react-hot-toast';

const CompanyPage: React.FC = () => {
  const [company, setCompany] = useState<Partial<Company>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    companyApi.get().then(r => setCompany(r.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyApi.update(company);
      toast.success('Company details updated!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const field = (key: keyof Company, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={(company[key] as string) || ''}
        onChange={e => setCompany(c => ({ ...c, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
    </div>
  );

  if (loading) return <div className="p-6"><div className="skeleton h-8 w-64 rounded mb-4" /><div className="bg-white rounded-2xl p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Building className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Company Settings</h1>
            <p className="text-slate-500 text-sm">Update your company information</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">General Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('name', 'Company Name', 'text', 'Acme Technologies Pvt Ltd')}
            {field('email', 'Company Email', 'email', 'info@company.com')}
            {field('phone', 'Phone Number', 'tel', '+91 98765 43210')}
            {field('website', 'Website', 'url', 'https://example.com')}
          </div>
          <div>{field('address', 'Registered Address', 'text', '123 MG Road, Bangalore, KA 560001')}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">Tax & Compliance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('gstNumber', 'GST Number', 'text', '22AAAAA0000A1Z5')}
            {field('panNumber', 'PAN Number', 'text', 'AAAAA0000A')}
            {field('cinNumber', 'CIN Number', 'text', 'U00000MH2020PTC000000')}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">Financial Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Financial Year</label>
              <select value={company.financialYear || 'april_march'} onChange={e => setCompany(c => ({ ...c, financialYear: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                <option value="april_march">April–March (Indian FY)</option>
                <option value="january_december">January–December</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency Symbol</label>
              <input type="text" value={company.currencySymbol || '₹'} onChange={e => setCompany(c => ({ ...c, currencySymbol: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pb-6">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;
