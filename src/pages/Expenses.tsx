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
  X,
  Share2,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Expense, ExpenseCategory, CategoryPerformance } from '../types';

export default function Expenses() {
  const [activeTab, setActiveTab] = useState<'general' | 'categoryShare'>('general');
  const [loading, setLoading] = useState(true);

  // --- GENERAL EXPENSES STATE ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // General Outflow Form
  const [showForm, setShowForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Raw Material',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Gemini OCR Receipt Attachment
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // --- CATEGORY PERFORM OPERATIONS STATE ---
  const [categoryPerformances, setCategoryPerformances] = useState<CategoryPerformance[]>([]);
  const [selectedPerfDate, setSelectedPerfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPerfForm, setShowPerfForm] = useState(false);
  const [isEditingPerf, setIsEditingPerf] = useState(false);
  const [perfForm, setPerfForm] = useState({
    id: '',
    categoryName: 'Fast Food',
    date: new Date().toISOString().split('T')[0],
    dailyExpenses: '',
    dailyEarnings: '',
    profitSharingRatio: '25',
    profitSharingNotes: ''
  });

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Standard food categories mapped for the profit-sharing items as described by the user
  const operationCategories = [
    'Fast Food',
    'Barbecue & Tikka',
    'Chinese Cuisine',
    'Traditional Desi (Salan & Rice)',
    'Drinks, Lassi & Desserts'
  ];

  useEffect(() => {
    if (activeTab === 'general') {
      loadGeneralExpenses();
    } else {
      loadCategoryPerformances();
    }
  }, [activeTab, search, selCategory, startDate, endDate, selectedPerfDate]);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // --- GENERAL EXPENSES ACTIONS ---
  async function loadGeneralExpenses() {
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
        loadGeneralExpenses();
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
        loadGeneralExpenses();
      }
    } catch (err) {
      triggerToast('error', 'Network fail.');
    }
  };

  // --- CATEGORY PERFORMANCES OPERATIONS (NEW FEATURE) ---
  async function loadCategoryPerformances() {
    try {
      setLoading(true);
      const res = await fetch(`/api/category-performances?date=${selectedPerfDate}`);
      const data = await res.json();
      if (data.success) {
        setCategoryPerformances(data.data);
      }
    } catch (err) {
      console.error('Error loading category performances', err);
      triggerToast('error', 'Failed to retrieve daily category profit-sharing logs.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPerfAdd = (catName?: string) => {
    setPerfForm({
      id: '',
      categoryName: catName || 'Fast Food',
      date: selectedPerfDate,
      dailyExpenses: '',
      dailyEarnings: '',
      profitSharingRatio: '25',
      profitSharingNotes: ''
    });
    setIsEditingPerf(false);
    setShowPerfForm(true);
  };

  const handleOpenPerfEdit = (p: CategoryPerformance) => {
    setPerfForm({
      id: p.id,
      categoryName: p.categoryName,
      date: p.date,
      dailyExpenses: String(p.dailyExpenses),
      dailyEarnings: String(p.dailyEarnings),
      profitSharingRatio: String(p.profitSharingRatio),
      profitSharingNotes: p.profitSharingNotes || ''
    });
    setIsEditingPerf(true);
    setShowPerfForm(true);
  };

  const handleSubmitPerf = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, categoryName, date, dailyExpenses, dailyEarnings, profitSharingRatio, profitSharingNotes } = perfForm;
    
    if (!categoryName) {
      triggerToast('error', 'Option Category is required.');
      return;
    }

    try {
      const payload = {
        categoryName,
        date,
        dailyExpenses: Number(dailyExpenses) || 0,
        dailyEarnings: Number(dailyEarnings) || 0,
        profitSharingRatio: Number(profitSharingRatio) || 0,
        profitSharingNotes
      };

      const url = isEditingPerf ? `/api/category-performances/${id}` : '/api/category-performances';
      const method = isEditingPerf ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', isEditingPerf ? 'Operational performance metrics updated.' : 'Daily performance recorded.');
        setShowPerfForm(false);
        loadCategoryPerformances();
      } else {
        triggerToast('error', data.message || 'Error occurred.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure saving performance record.');
    }
  };

  const handleDeletePerf = async (id: string) => {
    if (!confirm('Are you sure you want to discard this category operational record?')) return;
    try {
      const res = await fetch(`/api/category-performances/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Performance logged record removed.');
        loadCategoryPerformances();
      }
    } catch (err) {
      triggerToast('error', 'Network failure deleting.');
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Computing sum statistics for category performances
  const totalPerfEarnings = categoryPerformances.reduce((sum, p) => sum + p.dailyEarnings, 0);
  const totalPerfExpenses = categoryPerformances.reduce((sum, p) => sum + p.dailyExpenses, 0);
  const totalCombinedNetProfits = categoryPerformances.reduce((sum, p) => sum + (p.dailyEarnings - p.dailyExpenses), 0);
  const totalCombinedSharingPaid = categoryPerformances.reduce((sum, p) => {
    const net = p.dailyEarnings - p.dailyExpenses;
    const share = net > 0 ? (net * p.profitSharingRatio) / 100 : 0;
    return sum + share;
  }, 0);

  return (
    <div className="space-y-6 p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      {statusMsg.text && (
        <div id="toast-wrapper" className="fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#0f223a] bg-white shadow-md flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      {/* Flagship Header and Navigation Tabs */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 id="expenses-header-title" className="text-xl font-bold tracking-tight text-[#0f223a] flex items-center gap-2">
            <FolderMinus className="h-5 w-5 text-[#2563EB]" />
            Expenses & Category Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track business utilities bills alongside decentralized food category daily earnings/costs and manually logged chef profit shares.
          </p>
        </div>

        {/* Tab Selection Switch Container */}
        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'general' 
                ? 'bg-white text-[#0f223a] shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct Expenses Ledger
          </button>
          <button
            onClick={() => setActiveTab('categoryShare')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'categoryShare' 
                ? 'bg-white text-[#0f223a] shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Category Profit-Sharing Logs
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL DIRECT EXPENDITURE WORKSPACE */}
      {activeTab === 'general' && (
        <>
          {/* Quick trigger Actions */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">
              Scanning Receipts instantly logs entries. Click button to begin.
            </div>
            <button 
              id="btn-expense-add-open"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Outflow / Invoice Scan
            </button>
          </div>

          {/* Outflow / Expense Add Modal with flagship OCR workspace split */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
              <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl border border-slate-200 grid gap-6 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
                {/* Left Column: Form Details fields */}
                <div>
                  <h3 className="text-sm font-bold text-[#0f223a] pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                    <FileMinus className="h-4 w-4 text-[#2563EB]" />
                    Log New Expense
                  </h3>

                  <form onSubmit={handleSubmitExpense} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expense Title</label>
                      <input 
                        type="text"
                        required
                        value={expenseForm.title}
                        onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none bg-white placeholder-slate-400"
                        placeholder="e.g. Purchased 50kg basmati rice"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost Category</label>
                      <select 
                        value={expenseForm.category}
                        onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Incurred Date</label>
                      <input 
                        type="date"
                        required
                        value={expenseForm.date}
                        onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (Rs. / PKR)</label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none bg-white placeholder-slate-400"
                        placeholder="e.g. 240.00"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detailed Ledger Notes</label>
                      <textarea 
                        value={expenseForm.notes}
                        onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none bg-white placeholder-slate-400"
                        rows={3}
                        placeholder="Supplier name or transaction details..."
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                      <button type="submit" className="flex-1 rounded bg-[#2563EB] py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors">Add Expense Row</button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Dynamic Gemini Pro OCR workspace selection */}
                <div className="border-l border-slate-100 pl-0 md:pl-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f223a] mb-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Gemini Pro OCR Decrypter</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500 mb-4">
                      Drag and drop or select a photo of your supplier transaction receipt. Gemini Pro will read and automatically map amounts, dates, and names instantly!
                    </p>

                    {receiptBase64 ? (
                      <div className="rounded border border-slate-200 bg-slate-100 relative h-48 flex items-center justify-center mb-4 overflow-hidden">
                        <img src={receiptBase64} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => { setReceiptBase64(''); setSelectedFileName(''); }}
                          className="absolute top-2 right-2 rounded-full bg-slate-900/60 p-1.5 text-white hover:bg-slate-900 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-slate-200 h-48 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4 mb-4 hover:border-slate-400 relative bg-slate-50 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="h-8 w-8 text-slate-300 mb-1" />
                        <span>Drop receipt snapshot or click to upload</span>
                        <span className="text-[9px] text-slate-400 mt-1">Accepts PNG, JPEG up to 10MB</span>
                      </div>
                    )}

                    {selectedFileName && (
                      <p className="text-[10px] text-slate-500 font-mono truncate mb-2">Selected: {selectedFileName}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    id="btn-trigger-ocr"
                    disabled={isOcrProcessing || !receiptBase64}
                    onClick={handleTriggerOcr}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-[#0f223a] px-3 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
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

          {/* Statistics widgets */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Direct Ledger Outflows</span>
              <h3 className="text-2xl font-bold text-[#0f223a] mt-2">
                Rs. {totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Across all categories and dates specified</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:col-span-1 md:col-span-2">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Direct Outflows per category</span>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {['Raw Material', 'Utility Bills', 'Rent', 'Maintenance', 'Other'].map(category => {
                  const catSpent = expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
                  const percent = totalSpent > 0 ? (catSpent / totalSpent) * 100 : 0;
                  return (
                    <div key={category} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-500">{category}</p>
                      <p className="font-bold text-[#0f223a] mt-0.5">Rs. {catSpent.toLocaleString('en-US')} <span className="text-[10px] text-slate-400 font-normal">({percent.toFixed(0)}%)</span></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filter segment */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keywords</label>
                <div className="relative">
                  <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search ledger details..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-[#2563EB] focus:outline-none bg-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Category</label>
                <select 
                  value={selCategory}
                  onChange={e => setSelCategory(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none"
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Incurred Start</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Incurred End</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Ledger Listing Table */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader className="h-6 w-6 animate-spin text-[#2563EB]" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50 font-bold text-[#0f223a] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Expense Details</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Notes</th>
                    <th className="px-6 py-3.5 font-bold">Incurred Outflow</th>
                    <th className="px-6 py-3.5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#0f223a]">{exp.title}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">{exp.date}</td>
                      <td className="px-6 py-4 text-slate-400 italic max-w-xs truncate" title={exp.notes}>{exp.notes || 'No notes description'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">Rs. {exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center italic text-slate-400">No transactional expenses logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB 2: DECENTRALIZED COMBINED CATEGORY PERFORMANCE OPERATIONS (NEW FEATURE) */}
      {activeTab === 'categoryShare' && (
        <>
          {/* Calendar Picker and Actions Rail */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#0f223a] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-4 w-4 text-[#2563EB]" />
                Operational Day:
              </span>
              <input
                type="date"
                value={selectedPerfDate}
                onChange={e => setSelectedPerfDate(e.target.value)}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#0f223a] focus:ring-1 focus:ring-[#2563EB] focus:outline-none font-semibold"
              />
            </div>

            <button
              id="btn-perf-add-open"
              onClick={() => handleOpenPerfAdd()}
              className="inline-flex items-center gap-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Category Daily performance
            </button>
          </div>

          {/* Form Modal for Category Performance Logs */}
          {showPerfForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-sm font-bold text-[#0f223a] flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-[#2563EB]" />
                    {isEditingPerf ? 'Update Operational Record' : 'Record Category Day Performance'}
                  </h3>
                  <button onClick={() => setShowPerfForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitPerf} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line Options Category</label>
                    <select
                      value={perfForm.categoryName}
                      disabled={isEditingPerf}
                      onChange={e => setPerfForm({ ...perfForm, categoryName: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none font-semibold"
                    >
                      {operationCategories.map((opCat) => (
                        <option key={opCat} value={opCat}>{opCat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Performance Date</label>
                    <input
                      type="date"
                      required
                      value={perfForm.date}
                      onChange={e => setPerfForm({ ...perfForm, date: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Earnings (Revenue)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        min="0"
                        required
                        value={perfForm.dailyEarnings}
                        onChange={e => setPerfForm({ ...perfForm, dailyEarnings: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Direct Cost (Exp)</label>
                      <input
                        type="number"
                        placeholder="e.g. 400"
                        min="0"
                        required
                        value={perfForm.dailyExpenses}
                        onChange={e => setPerfForm({ ...perfForm, dailyExpenses: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none font-bold text-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profit-Sharing Ratio (%)</label>
                      <span className="text-[10px] font-mono font-bold text-[#2563EB]">{perfForm.profitSharingRatio}%</span>
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={perfForm.profitSharingRatio}
                        onChange={e => setPerfForm({ ...perfForm, profitSharingRatio: e.target.value })}
                        className="flex-1 accent-[#2563EB]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={perfForm.profitSharingRatio}
                        onChange={e => setPerfForm({ ...perfForm, profitSharingRatio: e.target.value })}
                        className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-center text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">
                      The percentage of calculated profit allocated directly to chef or team partner.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Partner sharing notes</label>
                    <textarea
                      value={perfForm.profitSharingNotes}
                      onChange={e => setPerfForm({ ...perfForm, profitSharingNotes: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none font-sans"
                      rows={2}
                      placeholder="e.g., Assigned to Fast Food Chef Malik Cook..."
                    />
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setShowPerfForm(false)} className="flex-1 rounded border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                    <button type="submit" className="flex-1 rounded bg-[#2563EB] py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors">
                      {isEditingPerf ? 'Update Entry' : 'Save Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Operational Day stats cards summary */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 animate-fade-in">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Category Day revenue</span>
              <h3 className="text-2xl font-bold text-emerald-600 mt-2">
                Rs. {totalPerfEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Raw combined earnings across options</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Category Day direct cost</span>
              <h3 className="text-2xl font-bold text-rose-500 mt-2">
                Rs. {totalPerfExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Specific separate outflows logged</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Net Combined Net Profit</span>
              <h3 className={`text-2xl font-bold mt-2 ${totalCombinedNetProfits >= 0 ? 'text-[#2563EB]' : 'text-rose-600'}`}>
                Rs. {totalCombinedNetProfits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Excludes shared partner overheads</p>
            </div>

            <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/40 p-5 shadow-xs">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">Calculated Partner Payout</span>
              <h3 className="text-2xl font-bold text-indigo-700 mt-2 flex items-center gap-1.5">
                <DollarSign className="h-5 w-5 text-indigo-500 shrink-0" />
                Rs. {totalCombinedSharingPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-indigo-500 font-medium mt-1">Manual profit sharing total today</p>
            </div>
          </div>

          {/* Operational Day options detail grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0f223a] mb-4 flex items-center gap-1">
              <FileSpreadsheet className="h-4 w-4 text-[#2563EB]" />
              Breakdown per option category ({selectedPerfDate})
            </h3>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader className="h-6 w-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {operationCategories.map(catOptName => {
                  const pEntry = categoryPerformances.find(cp => cp.categoryName === catOptName);
                  const earns = pEntry?.dailyEarnings || 0;
                  const exps = pEntry?.dailyExpenses || 0;
                  const profit = earns - exps;
                  const ratio = pEntry?.profitSharingRatio || 0;
                  const partnerShare = profit > 0 ? (profit * ratio) / 100 : 0;

                  return (
                    <div 
                      key={catOptName} 
                      className={`rounded-xl border p-4 transition-all hover:shadow-xs flex flex-col justify-between ${
                        pEntry 
                          ? 'border-slate-200 bg-white' 
                          : 'border-slate-100 bg-slate-50/50 border-dashed text-slate-400'
                      }`}
                    >
                      <div>
                        {/* Option Title Bar */}
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#0f223a] truncate">{catOptName}</h4>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            pEntry ? 'bg-green-100 text-green-700' : 'bg-slate-200/80 text-slate-500'
                          }`}>
                            {pEntry ? 'Logged' : 'Missing'}
                          </span>
                        </div>

                        {/* Cost/Revenue comparison */}
                        {pEntry ? (
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Daily Earnings (In):</span>
                              <span className="font-bold text-emerald-600">Rs. {earns.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Daily Expenses (Out):</span>
                              <span className="font-bold text-rose-500">Rs. {exps.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-100 pt-1.5 flex justify-between text-xs font-semibold">
                              <span>Net Performance:</span>
                              <span className={profit >= 0 ? 'text-[#2563EB]' : 'text-rose-600'}>
                                Rs. {profit.toFixed(2)}
                              </span>
                            </div>

                            {/* Share Details block */}
                            <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                              <div className="flex justify-between font-medium">
                                <span>Profit-Share Ratio:</span>
                                <span>{ratio}%</span>
                              </div>
                              <div className="flex justify-between font-bold text-indigo-700">
                                <span>Calculated Share:</span>
                                <span>Rs. {partnerShare.toFixed(2)}</span>
                              </div>
                              {pEntry.profitSharingNotes && (
                                <p className="text-[10px] text-slate-400 truncate mt-1 italic">
                                  "{pEntry.profitSharingNotes}"
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="my-8 text-center">
                            <p className="text-xs italic text-slate-400 font-medium">No performance record listed</p>
                            <p className="text-[10px] text-slate-400 mt-1">Earnings and cost data missing for this day</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                        {pEntry ? (
                          <>
                            <button
                              onClick={() => handleDeletePerf(pEntry.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenPerfEdit(pEntry)}
                              className="text-xs font-bold text-[#0f223a] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              Edit Entries
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenPerfAdd(catOptName)}
                            className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#2563EB]/10 px-2.5 py-1 rounded transition-colors"
                          >
                            Add stats
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
