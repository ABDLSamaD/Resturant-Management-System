import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  HelpCircle, 
  Check, 
  X,
  CreditCard,
  Folders
} from 'lucide-react';
import { Employee, EmployeeCategory } from '../types';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [selSalaryType, setSelSalaryType] = useState('');
  const [selStatus, setSelStatus] = useState('active');

  // Employee Form State
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    phone: '',
    category: '',
    salaryType: 'monthly' as 'monthly' | 'daily',
    monthlySalary: '',
    dailyWage: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  // Category Form State
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    description: ''
  });

  // Error/Success statuses
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [selCategory, selSalaryType, selStatus, search]);

  async function loadData() {
    try {
      setLoading(true);
      // Fetch categories
      const catRes = await fetch('/api/employee-categories');
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data);
      }

      // Fetch employees with filter list
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selCategory) query.append('category', selCategory);
      if (selSalaryType) query.append('salaryType', selSalaryType);
      if (selStatus) query.append('status', selStatus);

      const empRes = await fetch(`/api/employees?${query.toString()}`);
      const empData = await empRes.json();
      if (empData.success) {
        setEmployees(empData.data);
      }
    } catch (err) {
      console.error('Error loading employees', err);
    } finally {
      setLoading(false);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      name: emp.name,
      phone: emp.phone || '',
      category: emp.category,
      salaryType: emp.salaryType,
      monthlySalary: String(emp.monthlySalary || ''),
      dailyWage: String(emp.dailyWage || ''),
      joiningDate: emp.joiningDate,
      status: emp.status,
      notes: emp.notes || ''
    });
    setShowEmpForm(true);
  };

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setEmpForm({
      name: '',
      phone: '',
      category: categories[0]?.name || 'Waiter',
      salaryType: 'monthly',
      monthlySalary: '2000',
      dailyWage: '80',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: ''
    });
    setShowEmpForm(true);
  };

  const handleSubmitEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name) {
      triggerToast('error', 'Employee name is required.');
      return;
    }

    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : '/api/employees';
      const method = editingEmp ? 'PUT' : 'POST';

      const payload = {
        ...empForm,
        monthlySalary: empForm.salaryType === 'monthly' ? Number(empForm.monthlySalary) : undefined,
        dailyWage: empForm.salaryType === 'daily' ? Number(empForm.dailyWage) : undefined
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', editingEmp ? 'Employee profile updated successfully.' : 'New employee registered.');
        setShowEmpForm(false);
        loadData();
      } else {
        triggerToast('error', data.message || 'Operation failed.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure.');
    }
  };

  const handleDeactivateEmp = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee? This will set status to inactive.')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Employee profile deactivated.');
        loadData();
      }
    } catch (err) {
      triggerToast('error', 'Network failure.');
    }
  };

  const handleSubmitCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) {
      triggerToast('error', 'Category name is required.');
      return;
    }

    try {
      const res = await fetch('/api/employee-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'New Category added successfully.');
        setCatForm({ name: '', description: '' });
        setShowCatForm(false);
        loadData();
      } else {
        triggerToast('error', data.message || 'Category already exists.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure.');
    }
  };

  const handleDeactivateCat = async (id: string) => {
    if (!confirm('Are you sure you want to flag this category as inactive?')) return;
    try {
      const res = await fetch(`/api/employee-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Category flagged inactive.');
        loadData();
      }
    } catch (err) {
      triggerToast('error', 'Network error deactivating.');
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {/* Toast Alert Header */}
      {statusMsg.text && (
        <div id="toast-container" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#18181B] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 id="employees-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">Staff Management</h1>
          <p className="font-sans text-xs text-[#71717A]">Design structural categories, manage personnel lists, active roles, and contract wages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            id="btn-cat-form-open"
            onClick={() => setShowCatForm(true)}
            className="inline-flex items-center gap-1.5 rounded border border-[#E4E4E7] bg-white px-3.5 py-2 font-sans text-xs font-semibold text-[#18181B] hover:bg-[#F4F4F5]"
          >
            <Folders className="h-3.5 w-3.5 text-[#71717A]" />
            Manage Roles
          </button>
          
          <button 
            id="btn-emp-form-open"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded bg-[#18181B] px-3.5 py-2 font-sans text-xs font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Onboard Employee
          </button>
        </div>
      </div>

      {/* Category Manager Quickdrawer Modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <h2 className="font-sans text-sm font-bold text-[#18181B]">Manage Categories & Roles</h2>
              <button onClick={() => setShowCatForm(false)} className="rounded p-1 hover:bg-[#F4F4F5] text-[#18181B]"><X className="h-4 w-4" /></button>
            </div>
            
            <form onSubmit={handleSubmitCat} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase">Category Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Executive Cook, Pastry Baker..."
                  value={catForm.name}
                  onChange={e => setCatForm({...catForm, name: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase">Short Role Description</label>
                <textarea 
                  placeholder="Responsibilities..."
                  value={catForm.description}
                  onChange={e => setCatForm({...catForm, description: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                  rows={2}
                />
              </div>
              <button type="submit" className="w-full rounded bg-[#18181B] py-2 font-sans text-xs font-bold text-white hover:opacity-90">
                Register Category Role
              </button>
            </form>

            <div className="mt-6 border-t border-[#E4E4E7] pt-4">
              <h3 className="text-xs font-bold text-[#18181B] mb-2">Registered Active Groups</h3>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded bg-[#F4F4F5] px-3 py-2 text-xs text-[#18181B]">
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-[10px] text-[#71717A]">{c.description || 'No description'}</p>
                    </div>
                    {c.isActive ? (
                      <button 
                        onClick={() => handleDeactivateCat(c.id)}
                        className="text-[10px] font-semibold text-red-650 text-red-600 hover:underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#71717A] font-medium">Inactive</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard / Edit Employee Modal Form */}
      {showEmpForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <h2 className="font-sans text-sm font-bold text-[#18181B]">
                {editingEmp ? `Edit Profile - ${editingEmp.name}` : 'Onboard New Chef / Captain'}
              </h2>
              <button onClick={() => setShowEmpForm(false)} className="rounded p-1 hover:bg-[#F4F4F5] text-[#18181B]"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSubmitEmp} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Full Name</label>
                <input 
                  type="text"
                  required
                  value={empForm.name}
                  onChange={e => setEmpForm({...empForm, name: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  placeholder="e.g. John Jenkins"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Duty Phone (Optional)</label>
                <input 
                  type="text"
                  value={empForm.phone}
                  onChange={e => setEmpForm({...empForm, phone: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  placeholder="e.g. 555-0199"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Assigned Role</label>
                <select 
                  value={empForm.category}
                  onChange={e => setEmpForm({...empForm, category: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                >
                  {categories.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {categories.length === 0 && (
                    <option value="Waiter">Waiter</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Joining Date</label>
                <input 
                  type="date"
                  value={empForm.joiningDate}
                  onChange={e => setEmpForm({...empForm, joiningDate: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none align-middle"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Wage Structure</label>
                <div className="mt-1 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setEmpForm({...empForm, salaryType: 'monthly'})}
                    className={`flex-1 rounded py-1.5 text-xs font-semibold border transition-colors ${empForm.salaryType === 'monthly' ? 'bg-[#18181B] text-white border-transparent' : 'bg-white text-[#71717A] border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
                  >
                    Monthly Contract
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEmpForm({...empForm, salaryType: 'daily'})}
                    className={`flex-1 rounded py-1.5 text-xs font-semibold border transition-colors ${empForm.salaryType === 'daily' ? 'bg-[#18181B] text-white border-transparent' : 'bg-white text-[#71717A] border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
                  >
                    Daily Wage Rate
                  </button>
                </div>
              </div>

              {empForm.salaryType === 'monthly' ? (
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Monthly Salary (Rs. / PKR)</label>
                  <input 
                    type="number"
                    value={empForm.monthlySalary}
                    onChange={e => setEmpForm({...empForm, monthlySalary: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="e.g. 3500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Daily Wage (Rs. / PKR)</label>
                  <input 
                    type="number"
                    value={empForm.dailyWage}
                    onChange={e => setEmpForm({...empForm, dailyWage: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="e.g. 80"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Notes & Qualifications</label>
                <textarea 
                  value={empForm.notes}
                  onChange={e => setEmpForm({...empForm, notes: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  rows={2}
                  placeholder="Key background info..."
                />
              </div>

              {editingEmp && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Status</label>
                  <select 
                    value={empForm.status}
                    onChange={e => setEmpForm({...empForm, status: e.target.value as 'active' | 'inactive'})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  >
                    <option value="active">Active Duty</option>
                    <option value="inactive">Inactive / On leave</option>
                  </select>
                </div>
              )}

              <div className="sm:col-span-2 flex gap-2 border-t border-[#E4E4E7] pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEmpForm(false)}
                  className="flex-1 rounded border border-[#E4E4E7] py-2.5 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded bg-[#18181B] py-2.5 text-xs font-bold text-white hover:opacity-90 shrink-0"
                >
                  Save Employee Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#A1A1AA]" />
            <input 
              type="text"
              placeholder="Search by name, phone contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white pl-10 pr-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
            />
          </div>

          <div>
            <select 
              value={selCategory}
              onChange={e => setSelCategory(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              value={selSalaryType}
              onChange={e => setSelSalaryType(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:outline-none"
            >
              <option value="">All Wage Models</option>
              <option value="monthly">Monthly Contract</option>
              <option value="daily">Daily Wage Rates</option>
            </select>
          </div>

          <div>
            <select 
              value={selStatus}
              onChange={e => setSelStatus(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#18181B] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-[#71717A]">
              <thead className="bg-[#F4F4F5] font-sans font-bold text-[#18181B] border-b border-[#E4E4E7]">
                <tr>
                  <th className="px-6 py-4">Employee Details</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Contract Wages</th>
                  <th className="px-6 py-4">Onboarding Date</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7] font-sans">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#18181B]">{emp.name}</div>
                      <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">{emp.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded bg-[#F4F4F5] px-2.5 py-0.5 text-[10px] font-bold text-[#18181B]">
                        {emp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#18181B]">
                      {emp.salaryType === 'monthly' ? (
                        <span>Rs. {emp.monthlySalary?.toFixed(2)} <span className="text-[10px] text-[#71717A] font-normal">/ mo</span></span>
                      ) : (
                        <span>Rs. {emp.dailyWage?.toFixed(2)} <span className="text-[10px] text-[#71717A] font-normal">/ day</span></span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#71717A] font-medium">{emp.joiningDate}</td>
                    <td className="px-6 py-4">
                      {emp.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          <Check className="h-2.5 w-2.5" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded bg-[#F4F4F5] px-2 py-0.5 text-[10px] font-bold text-[#71717A]">
                          <X className="h-2.5 w-2.5" />
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(emp)}
                          className="rounded p-1 text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#18181B]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeactivateEmp(emp.id)}
                          className="rounded p-1 text-[#A1A1AA] hover:bg-red-50 hover:text-red-650"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center italic text-[#A1A1AA]">
                      No matching personnel lists found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
