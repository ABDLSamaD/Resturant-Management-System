import React, { useState, useEffect } from 'react';
import { 
  FolderMinus, 
  Search, 
  Plus, 
  Trash2, 
  FileMinus, 
  Sparkles, 
  Upload, 
  Loader, 
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Folders,
  X
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Primary Form State
  const [showForm, setShowForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Raw Material',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // AI OCR Attachment States
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [search, selCategory, startDate, endDate]);

  async function loadData() {
    try {
      setLoading(true);
      // Fetch categories
      const catRes = await fetch('/api/expense-categories');
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data);
      }

      // Fetch expenses
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (selCategory) q.append('category', selCategory);
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);

      const expRes = await fetch(`/api/expenses?${q.toString()}`);
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.data);
      }
    } catch (err) {
      console.error('Error fetching expenses info', err);
    } finally {
      setLoading(false);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Convert uploaded image file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Please attach an image receipt file (.jpeg, .png, etc.)');
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptBase64(reader.result);
        triggerToast('success', 'Receipt picture appended to workspace.');
      }
    };
    reader.onerror = () => {
      triggerToast('error', 'Error reading image file.');
    };
    reader.readAsDataURL(file);
  };

  // Send baseline receipt image to Gemini Pro OCR API
  const handleTriggerOcr = async () => {
    if (!receiptBase64) {
      triggerToast('error', 'No receipt image uploaded in active workspace.');
      return;
    }

    try {
      setIsOcrProcessing(true);
      triggerToast('success', 'Gemini Pro is running OCR decryption & mapping fields...');

      const res = await fetch('/api/gemini/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: receiptBase64 })
      });
      const responseData = await res.json();

      if (responseData.success && responseData.data) {
        const ocr = responseData.data;
        // Prefill form
        setExpenseForm({
          title: ocr.title || 'Receipt Expense',
          category: ocr.category || 'Raw Material',
          amount: String(ocr.amount || ''),
          date: ocr.date || new Date().toISOString().split('T')[0],
          notes: ocr.notes || 'Parsed using Gemini Pro.'
        });
        triggerToast('success', 'Receipt attributes parsed successfully! Fields prefilled.');
      } else {
        triggerToast('error', responseData.message || 'Gemini OCR failed to extract values.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure connecting to Gemini Pro OCR.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleOpenAdd = () => {
    setExpenseForm({
      title: '',
      category: 'Raw Material',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setReceiptBase64('');
    setSelectedFileName('');
    setShowForm(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      triggerToast('error', 'Title and Amount are mandatory parameters.');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) })
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'Operational expense recorded in general ledger.');
        setShowForm(false);
        loadData();
      } else {
        triggerToast('error', data.message || 'Error occurred.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure recording expense.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record from ledger?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Expense row deleted.');
        loadData();
      }
    } catch (err) {
      triggerToast('error', 'Network fail.');
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {statusMsg.text && (
        <div id="toast-wrapper" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#18181B] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 id="expenses-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">Store Direct Expenditures</h1>
          <p className="font-sans text-xs text-[#71717A]">Log utility contracts, food raw material bills, and scan receipts using Gemini Pro OCR.</p>
        </div>

        <button 
          id="btn-expense-add-open"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded bg-[#18181B] px-3.5 py-2 font-sans text-xs font-semibold text-white hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Log Outflow / Invoice Scan
        </button>
      </div>

      {/* Outflow / Expense Add Modal with flagship OCR workspace split */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7] grid gap-6 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
            {/* Left Column: Form Details fields */}
            <div>
              <h3 className="font-sans text-sm font-bold text-[#18181B] pb-3 border-b border-[#E4E4E7] mb-4">
                Log New Expense
              </h3>

              <form onSubmit={handleSubmitExpense} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Expense Title</label>
                  <input 
                    type="text"
                    required
                    value={expenseForm.title}
                    onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                    placeholder="e.g. Purchased 50kg basmati rice"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Cost Category</label>
                  <select 
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c.name}>{c.name}</option>
                    ))}
                    {categories.length === 0 && (
                      <>
                        <option value="Raw Material">Raw Material</option>
                        <option value="Utility Bills">Utility Bills</option>
                        <option value="Rent">Rent</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Incurred Date</label>
                  <input 
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Amount (Rs. / PKR)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="e.g. 240.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Details Ledger notes</label>
                  <textarea 
                    value={expenseForm.notes}
                    onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                    rows={2}
                    placeholder="Supplier or items specifications..."
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E4E4E7]">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded border border-[#E4E4E7] py-2 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5]">Close</button>
                  <button type="submit" className="flex-1 rounded bg-[#18181B] py-2 text-xs font-bold text-white hover:opacity-90">Add Invoice Row</button>
                </div>
              </form>
            </div>

            {/* Right Column: Dynamic Gemini Pro OCR workspace selection */}
            <div className="border-l border-[#E4E4E7] pl-0 md:pl-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#18181B] mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                  <span>Gemini Pro OCR Decrypter</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-[#71717A] mb-4">
                  Drag and drop or select a photo of your supplier transaction receipt. Gemini Pro will read and automatically map amounts, dates, and names instantly!
                </p>

                {receiptBase64 ? (
                  <div className="rounded border border-[#E4E4E7] bg-[#F4F4F5] relative h-40 flex items-center justify-center mb-4">
                    <img src={receiptBase64} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => { setReceiptBase64(''); setSelectedFileName(''); }}
                      className="absolute top-2 right-2 rounded-full bg-[#18181B]/80 p-1 text-white hover:bg-[#18181B]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded border-2 border-dashed border-[#E4E4E7] h-40 flex flex-col items-center justify-center text-[#71717A] text-xs text-center p-4 mb-4 hover:border-[#A1A1AA] relative bg-[#F9F9F9]">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-[#A1A1AA] mb-1" />
                    <span>Drop receipt snapshot or click to upload</span>
                    <span className="text-[9px] text-[#A1A1AA] mt-1">Accepts PNG, JPEG up to 10MB</span>
                  </div>
                )}

                {selectedFileName && (
                  <p className="text-[10px] text-[#71717A] font-mono truncate mb-2">Selected: {selectedFileName}</p>
                )}
              </div>

              <button
                type="button"
                id="btn-trigger-ocr"
                disabled={isOcrProcessing || !receiptBase64}
                onClick={handleTriggerOcr}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-transparent bg-[#18181B] px-3 py-2.5 font-sans text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                {isOcrProcessing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Analyzing Photo Receipt...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-white" />
                    Trigger Gemini Pro OCR
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics and summaries section */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-[#71717A]">Ledger Cumulative Total Outflows</span>
          <h3 className="font-sans text-2xl font-bold text-[#18181B] mt-2">
            Rs. {totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-[#A1A1AA] mt-1">Across all categories and dates specified</p>
        </div>

        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 sm:col-span-1 md:col-span-2">
          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-[#71717A]">Expense distribution per categories</span>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {['Raw Material', 'Utility Bills', 'Rent', 'Maintenance', 'Other'].map(category => {
              const catSpent = expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
              const percent = totalSpent > 0 ? (catSpent / totalSpent) * 100 : 0;
              return (
                <div key={category} className="rounded border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-2 text-xs">
                  <p className="font-bold text-[#18181B]">{category}</p>
                  <p className="font-bold text-[#18181B] mt-0.5">Rs. {catSpent.toFixed(2)} <span className="text-[10px] text-[#71717A] font-normal">({percent.toFixed(0)}%)</span></p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and listings segments */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Keywords</label>
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-[#A1A1AA]" />
              <input 
                type="text" 
                placeholder="Search ledger details..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded border border-[#E4E4E7] pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Cost Category</label>
            <select 
              value={selCategory}
              onChange={e => setSelCategory(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Raw Material">Raw Material</option>
              <option value="Utility Bills">Utility Bills</option>
              <option value="Rent">Rent</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Incurred Start</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Incurred End</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#18181B] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white">
          <table className="w-full border-collapse text-left text-xs text-[#71717A]">
            <thead className="bg-[#F4F4F5] font-bold text-[#18181B] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-6 py-3">Expense Details</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3 font-bold">Paid Sum</th>
                <th className="px-6 py-3 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] font-sans">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="px-6 py-4 font-bold text-[#18181B]">{exp.title}</td>
                  <td className="px-6 py-4 font-semibold text-[#18181B]">{exp.category}</td>
                  <td className="px-6 py-4 font-medium text-[#71717A]">{exp.date}</td>
                  <td className="px-6 py-4 text-[#A1A1AA] italic max-w-xs truncate" title={exp.notes}>{exp.notes || 'No description added'}</td>
                  <td className="px-6 py-4 font-extrabold text-[#18181B]">Rs. {exp.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 rounded text-[#A1A1AA] hover:text-red-600 hover:bg-[#F4F4F5]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center italic text-[#A1A1AA]">No transactional expenses logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
