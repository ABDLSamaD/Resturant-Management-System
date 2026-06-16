import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Coins, 
  TrendingUp, 
  History, 
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Search,
  Plus,
  ArrowRight,
  Printer,
  FileText
} from 'lucide-react';
import { Employee, SalaryPayment, EmployeeAdvance, SalaryHistory } from '../types';

export default function Payroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [histories, setHistories] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Time metrics
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Form toggles and states
  const [activeTab, setActiveTab] = useState<'payouts' | 'advances' | 'raises'>('payouts');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Payout process modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [workedDays, setWorkedDays] = useState<string>('26');
  const [calcDetails, setCalcDetails] = useState<any>(null);
  const [processingPay, setProcessingPay] = useState(false);
  const [payNotes, setPayNotes] = useState('');

  // Advance state
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Raise state
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    employeeId: '',
    increaseType: 'fixed' as 'fixed' | 'percentage',
    increaseValue: '',
    reason: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAllData();
  }, [selectedMonth, selectedYear]);

  async function loadAllData() {
    try {
      setLoading(true);
      const [empRes, paysRes, advsRes, histRes] = await Promise.all([
        fetch('/api/employees?status=active'),
        fetch(`/api/salary-payments?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/advances?month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/salary-history')
      ]);

      const empData = await empRes.json();
      const paysData = await paysRes.json();
      const advsData = await advsRes.json();
      const histData = await histRes.json();

      if (empData.success) setEmployees(empData.data);
      if (paysData.success) setPayments(paysData.data);
      if (advsData.success) setAdvances(advsData.data);
      if (histData.success) setHistories(histData.data);

    } catch (err) {
      console.error('Error loading payroll data', err);
    } finally {
      setLoading(false);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Run salary calculation API (Deducts monthly advances!)
  const handleCalculateSalary = async (empId: string, days: string) => {
    if (!empId) return;
    try {
      const res = await fetch(`/api/salary-payments/calculate?employeeId=${empId}&month=${selectedMonth}&year=${selectedYear}&workedDays=${days}`);
      const data = await res.json();
      if (data.success) {
        setCalcDetails(data.data);
      }
    } catch (err) {
      console.error('Calculation fail', err);
    }
  };

  const handleOpenPayout = (emp: Employee) => {
    setSelectedEmp(emp.id);
    setWorkedDays(emp.salaryType === 'daily' ? '26' : '0');
    setCalcDetails(null);
    setPayNotes('');
    setShowPayoutModal(true);
    handleCalculateSalary(emp.id, emp.salaryType === 'daily' ? '26' : '0');
  };

  const handleRegisterPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcDetails) return;

    try {
      setProcessingPay(true);
      const payload = {
        employeeId: selectedEmp,
        month: selectedMonth,
        year: selectedYear,
        baseSalary: calcDetails.baseSalary,
        totalAdvances: calcDetails.totalAdvances,
        paidAmount: calcDetails.finalPayable,
        notes: payNotes,
        paymentDate: new Date().toISOString().split('T')[0]
      };

      const res = await fetch('/api/salary-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'Salary pay finalized and logged.');
        setShowPayoutModal(false);
        setCalcDetails(null);
        loadAllData();
      } else {
        triggerToast('error', data.message || 'Processing failed.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure processing payout.');
    } finally {
      setProcessingPay(false);
    }
  };

  const handleRegisterAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.employeeId || !advanceForm.amount) {
      triggerToast('error', 'Please complete all advance fields');
      return;
    }

    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceForm)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'Advance logged. Deducting from this month payout.');
        setShowAdvanceForm(false);
        setAdvanceForm({ employeeId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
        loadAllData();
      }
    } catch (err) {
      triggerToast('error', 'Network error registering advance');
    }
  };

  const handleRegisterRaise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raiseForm.employeeId || !raiseForm.increaseValue) {
      triggerToast('error', 'Please complete all raise fields.');
      return;
    }

    try {
      const res = await fetch('/api/salary-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(raiseForm)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'Base salary scale revised and history cataloged.');
        setShowRaiseForm(false);
        setRaiseForm({ employeeId: '', increaseType: 'fixed', increaseValue: '', reason: '', effectiveDate: new Date().toISOString().split('T')[0] });
        loadAllData();
      }
    } catch (err) {
      triggerToast('error', 'Network error revising salary scales');
    }
  };

  // Download PDF report
  const handleDownloadMonthlyPayrollReport = () => {
    window.open(`/api/reports/monthly/pdf?year=${selectedYear}&month=${selectedMonth}`);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {statusMsg.text && (
        <div id="toast-wrapper" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#18181B] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 id="payroll-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">Salaries & Payroll Center</h1>
          <p className="font-sans text-xs text-[#71717A]">Run calculations, hand out cash advances, and register base salary increases.</p>
        </div>

        {/* Month selector & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded border border-[#E4E4E7] bg-white p-1">
            <select 
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent px-2.5 py-1 text-xs font-semibold text-[#18181B] focus:outline-none"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent px-2 py-1 text-xs font-semibold text-[#18181B] focus:outline-none border-l border-[#E4E4E7]"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <button 
            onClick={handleDownloadMonthlyPayrollReport}
            className="inline-flex items-center gap-1.5 rounded bg-[#18181B] px-3.5 py-2 font-sans text-xs font-semibold text-white hover:opacity-90"
          >
            <Printer className="h-3.5 w-3.5" />
            Payroll PDF
          </button>
        </div>
      </div>

      {/* Tab select row */}
      <div className="flex border-b border-[#E4E4E7] gap-4">
        <button 
          onClick={() => setActiveTab('payouts')}
          className={`px-1 py-2 text-xs font-bold -mb-px border-b-2 transition-colors ${activeTab === 'payouts' ? 'border-[#18181B] text-[#18181B]' : 'border-transparent text-[#71717A] hover:text-[#18181B]'}`}
        >
          Process Salaries
        </button>
        <button 
          onClick={() => setActiveTab('advances')}
          className={`px-1 py-2 text-xs font-bold -mb-px border-b-2 transition-colors ${activeTab === 'advances' ? 'border-[#18181B] text-[#18181B]' : 'border-transparent text-[#71717A] hover:text-[#18181B]'}`}
        >
          Salary Advances Taken
        </button>
        <button 
          onClick={() => setActiveTab('raises')}
          className={`px-1 py-2 text-xs font-bold -mb-px border-b-2 transition-colors ${activeTab === 'raises' ? 'border-[#18181B] text-[#18181B]' : 'border-transparent text-[#71717A] hover:text-[#18181B]'}`}
        >
          Salary Increase History
        </button>
      </div>

      {/* Tab: Payouts */}
      {activeTab === 'payouts' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Unprocessed Staff list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
              <h3 className="font-sans text-xs font-bold text-[#18181B] uppercase tracking-wider mb-3">On-Duty Payroll Execution desk</h3>
              <div className="space-y-3">
                {employees.map(emp => {
                  const paid = payments.find(p => p.employee === emp.id);
                  return (
                    <div key={emp.id} className="flex items-center justify-between border-b border-[#E4E4E7]/60 pb-3 last:border-0 last:pb-0">
                      <div>
                        <h4 className="font-sans text-xs font-bold text-[#18181B]">{emp.name}</h4>
                        <p className="font-sans text-[10px] text-[#71717A]">{emp.category} (Rate: {emp.salaryType === 'monthly' ? `Rs. ${emp.monthlySalary}/mo` : `Rs. ${emp.dailyWage}/day`})</p>
                      </div>

                      {paid ? (
                        <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700 border border-teal-100">
                          Cleared - Rs. {paid.paidAmount.toFixed(2)}
                        </span>
                      ) : (
                        <button 
                          id={`payout-btn-${emp.id}`}
                          onClick={() => handleOpenPayout(emp)}
                          className="inline-flex items-center gap-1.5 rounded border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-1.5 font-sans text-[10px] font-bold text-[#18181B] hover:bg-[#E4E4E7] transition-colors"
                        >
                          Calculate Salary
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Small Month overview card */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
              <h3 className="font-sans text-xs font-bold text-[#18181B] uppercase tracking-widest mb-3">Current Payouts Stat</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717A] font-medium">Month-Cycle</span>
                  <span className="font-bold text-[#18181B]">{monthNames[selectedMonth-1]} {selectedYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A] font-medium">Salaries Transferred</span>
                  <span className="font-bold text-[#18181B]">Rs. {payments.reduce((sum, p) => sum + p.paidAmount, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A] font-medium">Unpaid/Accrued Pool</span>
                  <span className="font-bold text-red-650 text-red-650">Rs. {payments.reduce((sum, p) => sum + p.remainingAmount, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowRaiseForm(true)}
              className="w-full flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] hover:bg-[#E4E4E7] p-4 text-left transition-colors"
            >
              <div>
                <p className="font-sans text-xs font-bold text-[#18181B]">Assign Salary Increase</p>
                <p className="font-sans text-[10px] text-[#71717A] mt-1">Increment bases based on merits.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-[#18181B]" />
            </button>
          </div>
        </div>
      )}

      {/* Tab: Advances */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans text-sm font-bold text-[#18181B]">Advances issued for {monthNames[selectedMonth-1]}</h3>
            <button 
              id="btn-advance-open"
              onClick={() => setShowAdvanceForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#18181B] hover:opacity-80 rounded border border-[#E4E4E7] bg-white px-3 py-1.5"
            >
              <Plus className="h-4 w-4" /> Issue Advance
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white">
            <table className="w-full border-collapse text-left text-xs text-[#71717A]">
              <thead className="bg-[#F4F4F5] font-bold text-[#18181B] border-b border-[#E4E4E7]">
                <tr>
                  <th className="px-6 py-3">Employee Name</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Advance Amount</th>
                  <th className="px-6 py-3">Operations / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {advances.map(adv => (
                  <tr key={adv.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#18181B]">{adv.employeeName}</td>
                    <td className="px-6 py-4 text-[#71717A]">{adv.date}</td>
                    <td className="px-6 py-4 font-bold text-[#18181B]">Rs. {adv.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[#A1A1AA] italic">{adv.notes || 'No notes added'}</td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center italic text-[#A1A1AA]">No advance records filed for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Raises */}
      {activeTab === 'raises' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans text-sm font-bold text-[#18181B]">Wages Scale Revision History</h3>
            <button 
              onClick={() => setShowRaiseForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#18181B] hover:opacity-80 rounded border border-[#E4E4E7] bg-white px-3 py-1.5"
            >
              <Plus className="h-4 w-4" /> Revise Wage Scale
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white">
            <table className="w-full border-collapse text-left text-xs text-[#71717A]">
              <thead className="bg-[#F4F4F5] font-bold text-[#18181B] border-b border-[#E4E4E7]">
                <tr>
                  <th className="px-6 py-3">Staff Profile</th>
                  <th className="px-6 py-3">Previous Base</th>
                  <th className="px-6 py-3">Raise / Rev</th>
                  <th className="px-6 py-3">Revised Target Base</th>
                  <th className="px-6 py-3">Reasoning</th>
                  <th className="px-6 py-3">Effective Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7] font-sans">
                {histories.map(sh => (
                  <tr key={sh.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#18181B]">{sh.employeeName}</td>
                    <td className="px-6 py-4 text-[#71717A]">Rs. {sh.oldSalary.toFixed(2)}</td>
                    <td className="px-6 py-4 text-green-700 font-semibold">
                      +{sh.increaseType === 'fixed' ? `Rs. ${sh.increaseValue}` : `${sh.increaseValue}%`}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#18181B]">Rs. {sh.newSalary.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[#71717A]">{sh.reason}</td>
                    <td className="px-6 py-4 text-[#A1A1AA] font-mono text-[10px]">{sh.effectiveDate}</td>
                  </tr>
                ))}
                {histories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center italic text-[#A1A1AA]">No revisions processed. Use the Revise action to grant increments.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Payout Modal (Deductions calculation!) */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7]">
            <h3 className="font-sans text-sm font-bold text-[#18181B] pb-3 border-b border-[#E4E4E7]">Execute Monthly Pay Processing</h3>
            
            {calcDetails ? (
              <form onSubmit={handleRegisterPayout} className="mt-4 space-y-4">
                <div className="rounded border border-[#E4E4E7] bg-[#F4F4F5] p-4 space-y-2 mt-2">
                  <div className="flex justify-between text-xs text-[#71717A]">
                    <span>Beneficiary:</span>
                    <span className="font-bold text-[#18181B]">{calcDetails.employeeName}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#71717A]">
                    <span>Base Salary / Calculated Pay:</span>
                    <span className="font-bold text-[#18181B]">Rs. {calcDetails.baseSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#71717A]">
                    <span>Advances Deductibles (Subtracted):</span>
                    <span className="font-bold text-red-650 text-red-600">-Rs. {calcDetails.totalAdvances.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E4E4E7] pt-2 text-sm font-bold text-[#18181B] mt-2">
                    <span>Final Net Payable:</span>
                    <span className="text-green-700">Rs. {calcDetails.finalPayable.toFixed(2)}</span>
                  </div>
                </div>

                {calcDetails.salaryType === 'daily' && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Input Days Worked (Modifies Wages Calculation)</label>
                    <input 
                      type="number" 
                      value={workedDays}
                      onChange={e => {
                        setWorkedDays(e.target.value);
                        handleCalculateSalary(selectedEmp, e.target.value);
                      }}
                      className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Process Notes</label>
                  <input 
                    type="text" 
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="e.g. Month salary released full"
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                  />
                </div>

                <div className="flex gap-2 border-t border-[#E4E4E7] pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowPayoutModal(false)}
                    className="flex-1 rounded border border-[#E4E4E7] py-2 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5]"
                  >
                    Close
                  </button>
                  <button 
                    type="submit"
                    disabled={processingPay}
                    className="flex-1 rounded bg-[#18181B] py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Authorize payout
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center text-xs text-[#A1A1AA]">Loading payout particulars...</div>
            )}
          </div>
        </div>
      )}

      {/* Advance Modal Form */}
      {showAdvanceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7]">
            <h3 className="font-sans text-sm font-bold text-[#18181B] pb-3 border-b border-[#E4E4E7]">Issue Cash Advance</h3>
            
            <form onSubmit={handleRegisterAdvance} className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Recipient Staff</label>
                <select 
                  required
                  value={advanceForm.employeeId}
                  onChange={e => setAdvanceForm({...advanceForm, employeeId: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Advance Amount (Rs. / PKR)</label>
                <input 
                  type="number"
                  required
                  value={advanceForm.amount}
                  onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})}
                  placeholder="e.g. 150"
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Date of disbursement</label>
                <input 
                  type="date"
                  value={advanceForm.date}
                  onChange={e => setAdvanceForm({...advanceForm, date: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#18181B] bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Reasoning / Notes</label>
                <input 
                  type="text"
                  value={advanceForm.notes}
                  onChange={e => setAdvanceForm({...advanceForm, notes: e.target.value})}
                  placeholder="Gas, child home expenses, etc."
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-[#E4E4E7]">
                <button type="button" onClick={() => setShowAdvanceForm(false)} className="flex-1 rounded border border-[#E4E4E7] py-2 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5]">Cancel</button>
                <button type="submit" className="flex-1 rounded bg-[#18181B] py-2 text-xs font-bold text-white hover:opacity-90">Disburse Cash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Scale Modal Form */}
      {showRaiseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7]">
            <h3 className="font-sans text-sm font-bold text-[#18181B] pb-3 border-b border-[#E4E4E7]">Execute Salary Raise</h3>
            
            <form onSubmit={handleRegisterRaise} className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Select Target Employee</label>
                <select 
                  required
                  value={raiseForm.employeeId}
                  onChange={e => setRaiseForm({...raiseForm, employeeId: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Revising Method</label>
                <select 
                  value={raiseForm.increaseType}
                  onChange={e => setRaiseForm({...raiseForm, increaseType: e.target.value as 'fixed' | 'percentage'})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                >
                  <option value="fixed">Fixed sum Increase (Rs. / PKR)</option>
                  <option value="percentage">Percentage scaling (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Increment Value</label>
                <input 
                  type="number"
                  required
                  placeholder={raiseForm.increaseType === 'fixed' ? 'e.g. 200' : 'e.g. 5%'}
                  value={raiseForm.increaseValue}
                  onChange={e => setRaiseForm({...raiseForm, increaseValue: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Effective Since</label>
                <input 
                  type="date"
                  value={raiseForm.effectiveDate}
                  onChange={e => setRaiseForm({...raiseForm, effectiveDate: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#18181B] bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Revision Reason</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Completed 1 year anniversary bonus"
                  value={raiseForm.reason}
                  onChange={e => setRaiseForm({...raiseForm, reason: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-[#E4E4E7]">
                <button type="button" onClick={() => setShowRaiseForm(false)} className="flex-1 rounded border border-[#E4E4E7] py-2 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5]">Cancel</button>
                <button type="submit" className="flex-1 rounded bg-[#18181B] py-2 text-xs font-bold text-white hover:opacity-90">Authorize revision</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
