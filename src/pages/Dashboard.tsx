import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Coins, 
  Receipt,
  FileMinus,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Flame,
  Utensils
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onQuickAction?: (action: string) => void;
}

export default function Dashboard({ onNavigate, onQuickAction }: DashboardProps) {
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics upon load
  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        
        const [dailyRes, monthlyRes, weeklyRes] = await Promise.all([
          fetch(`/api/reports/daily?date=${todayStr}`),
          fetch(`/api/reports/monthly`),
          fetch(`/api/reports/7day-trend`)
        ]);

        const dailyData = await dailyRes.json();
        const monthlyData = await monthlyRes.json();
        const weeklyData = await weeklyRes.json();

        if (dailyData.success) setDailyStats(dailyData.data);
        if (monthlyData.success) setMonthlyStats(monthlyData.data);
        if (weeklyData.success) setWeeklyTrend(weeklyData.data);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
        setError('Connection failure loading sales analytics metrics.');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center font-sans">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500 font-medium">Crunching sales ledgers & metrics...</p>
        </div>
      </div>
    );
  }

  // Fallback defaults
  const dSales = dailyStats?.totalRevenue || 0;
  const mSales = monthlyStats?.totalRevenue || 0;
  const emps = monthlyStats?.employeeCount || 0;
  const mSalPaid = monthlyStats?.totalSalaryPaid || 0;
  const mAdvs = monthlyStats?.totalSalaryAdvances || 0;
  const mExpenses = monthlyStats?.totalExpenses || 0;
  const mProfit = monthlyStats?.estimatedNetProfit || 0;
  const totalProductsSold = monthlyStats?.totalProductsSold || 0;
  const productBreakdown = monthlyStats?.productBreakdown || [];

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 id="dashboard-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">Executive Performance Dashboard</h1>
          <p className="font-sans text-xs text-[#71717A]">Real-time indicators & financial statements for single owner operations.</p>
        </div>
        <div className="flex items-center gap-2 rounded bg-white px-3 py-1.5 border border-[#E4E4E7] text-[#18181B] font-sans text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          System Active
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Daily Sales */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-2xs font-bold uppercase tracking-wider text-[#71717A]">Daily Revenue</span>
            <div className="rounded bg-[#F4F4F5] p-2 text-[#18181B]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-sans text-xl font-bold tracking-tight text-[#18181B]">
              Rs. {dSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 font-sans text-[10px] text-[#A1A1AA]">Completed orders today</p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-2xs font-bold uppercase tracking-wider text-[#71717A]">Monthly Revenue</span>
            <div className="rounded bg-[#F4F4F5] p-2 text-[#18181B]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-sans text-xl font-bold tracking-tight text-[#18181B]">
              Rs. {mSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 font-sans text-[10px] text-[#71717A] font-semibold">{dailyStats?.totalOrders || 0} invoices cleared</p>
          </div>
        </div>

        {/* Monthly Profit Card */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-2xs font-bold uppercase tracking-wider text-[#71717A]">Estimated Net Profit</span>
            <div className="rounded bg-[#F4F4F5] p-2 text-[#18181B]">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-sans text-xl font-bold tracking-tight text-[#18181B]">
              Rs. {mProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 font-sans text-[10px] text-[#71717A] font-medium">Revenue - Payroll - Direct Expenses</p>
          </div>
        </div>

        {/* Staff Size */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-2xs font-bold uppercase tracking-wider text-[#71717A]">Active Payroll</span>
            <div className="rounded bg-[#F4F4F5] p-2 text-[#18181B]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-sans text-xl font-bold tracking-tight text-[#18181B]">{emps} Employees</h3>
            <p className="mt-1 font-sans text-[10px] text-[#A1A1AA]">Staff currently on roster</p>
          </div>
        </div>
      </div>

      {/* 7-Day Performance Trend Chart */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="font-sans text-sm font-bold text-[#18181B]">Sales Performance Trend (Last 7 Days)</h3>
            <p className="font-sans text-xs text-[#71717A]">Daily customer invoice checkouts aggregated in PKR.</p>
          </div>
          <div className="rounded bg-slate-900 px-2.5 py-1 text-white font-sans text-2xs font-extrabold tracking-wider uppercase border border-transparent self-start sm:self-center">
            Completed Orders (Rs. PKR)
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={weeklyTrend}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#18181B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" strokeOpacity={0.5} />
              <XAxis 
                dataKey="dayLabel" 
                tickLine={false}
                axisLine={false}
                stroke="#71717A"
                fontSize={10}
                fontFamily="Inter, sans-serif"
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                stroke="#71717A"
                fontSize={10}
                fontFamily="Inter, sans-serif"
                tickFormatter={(value) => `Rs.${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#E4E4E7', 
                  borderRadius: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: any) => [`Rs. ${Number(value).toFixed(2)}`, 'Revenue']}
                labelStyle={{ fontWeight: 'bold', color: '#18181B' }}
              />
              <Area 
                type="monotone" 
                dataKey="totalAmount" 
                stroke="#18181B" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Expenditures Breakdown Banner */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
        <h4 className="font-sans text-2xs font-extrabold uppercase tracking-wider text-[#71717A] mb-4">Operational Expenditures (Monthly Outflows)</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded border border-[#E4E4E7] bg-[#F9F9F9] p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-3.5 w-3.5 text-[#71717A]" />
              <span className="font-sans text-[11px] font-medium text-[#71717A]">Salaries Paid</span>
            </div>
            <p className="font-sans text-sm font-bold text-[#18181B]">Rs. {mSalPaid.toFixed(2)}</p>
          </div>
          <div className="rounded border border-[#E4E4E7] bg-[#F9F9F9] p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <FileMinus className="h-3.5 w-3.5 text-[#71717A]" />
              <span className="font-sans text-[11px] font-medium text-[#71717A]">Pre-paid Salary Advances</span>
            </div>
            <p className="font-sans text-sm font-bold text-[#18181B]">Rs. {mAdvs.toFixed(2)}</p>
          </div>
          <div className="rounded border border-[#E4E4E7] bg-[#F9F9F9] p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <FileMinus className="h-3.5 w-3.5 text-[#71717A]" />
              <span className="font-sans text-[11px] font-medium text-[#71717A]">Store Direct Expenses</span>
            </div>
            <p className="font-sans text-sm font-bold text-[#18181B]">Rs. {mExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Bento Block */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-6">
        <h3 className="font-sans text-sm font-bold text-[#18181B]">Quick Operations Launcher</h3>
        <p className="font-sans text-xs text-[#71717A] mt-1">One-click launchers for typical daily operations.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <button 
            id="quick-btn-order"
            onClick={() => onNavigate('orders')}
            className="flex flex-col items-start gap-2 rounded border border-[#E4E4E7] bg-white p-4 transition-colors hover:bg-[#F4F4F5] group text-left w-full"
          >
            <div className="rounded bg-[#18181B] text-white p-1.5">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1">
              <p className="font-sans text-xs font-bold text-[#18181B]">New Table Order</p>
              <p className="font-sans text-[10px] text-[#71717A] mt-0.5">Check out clients manually</p>
            </div>
          </button>

          <button 
            id="quick-btn-expense"
            onClick={() => onNavigate('expenses')}
            className="flex flex-col items-start gap-2 rounded border border-[#E4E4E7] bg-white p-4 transition-colors hover:bg-[#F4F4F5] group text-left w-full"
          >
            <div className="rounded bg-[#18181B] text-white p-1.5">
              <FileMinus className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1">
              <p className="font-sans text-xs font-bold text-[#18181B]">AIS OCR Expenses</p>
              <p className="font-sans text-[10px] text-[#71717A] mt-0.5">Drop receipt to auto-parse</p>
            </div>
          </button>

          <button 
            id="quick-btn-products"
            onClick={() => onNavigate('products')}
            className="flex flex-col items-start gap-2 rounded border border-[#E4E4E7] bg-white p-4 transition-colors hover:bg-[#F4F4F5] group text-left w-full"
          >
            <div className="rounded bg-[#18181B] text-white p-1.5">
              <Utensils className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1">
              <p className="font-sans text-xs font-bold text-[#18181B]">Menu Promotion Image</p>
              <p className="font-sans text-[10px] text-[#71717A] mt-0.5">Create menu promo posters</p>
            </div>
          </button>

          <button 
            id="quick-btn-payroll"
            onClick={() => onNavigate('payroll')}
            className="flex flex-col items-start gap-2 rounded border border-[#E4E4E7] bg-white p-4 transition-colors hover:bg-[#F4F4F5] group text-left w-full"
          >
            <div className="rounded bg-[#18181B] text-white p-1.5">
              <Coins className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1">
              <p className="font-sans text-xs font-bold text-[#18181B]">Process Salaries</p>
              <p className="font-sans text-[10px] text-[#71717A] mt-0.5">Hand out cash advances</p>
            </div>
          </button>
        </div>
      </div>

      {/* Row with Top Products and Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
            <h3 className="font-sans text-sm font-bold text-[#18181B]">Top Selling Menu Products</h3>
            <span className="font-sans text-[10px] text-[#71717A] font-medium">Performance metric</span>
          </div>
          <div className="mt-4 space-y-4">
            {productBreakdown.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F4F4F5] text-[#18181B]">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-sans text-xs font-bold text-[#18181B]">{item.productName}</h4>
                    <p className="font-sans text-[10px] text-[#71717A]">{item.category || 'Dishes'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-sans text-xs font-bold text-[#18181B]">{item.quantity} units</p>
                  <p className="font-sans text-[10px] text-[#71717A]">Rs. {item.totalRevenue.toFixed(2)} revenue</p>
                </div>
              </div>
            ))}
            {productBreakdown.length === 0 && (
              <div className="py-6 text-center text-xs text-[#71717A] italic">
                No active sales documented in the ledger system yet.
              </div>
            )}
          </div>
        </div>

        {/* Store operational indicators */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-sans text-sm font-bold text-[#18181B]">Live Volume Indicator</h3>
            <p className="font-sans text-xs text-[#71717A] mt-1">Status distribution of today's restaurant activities.</p>
            
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[#71717A] mb-1">
                  <span>Completed Dishes Volume</span>
                  <span>{totalProductsSold} items completed</span>
                </div>
                <div className="h-1.5 w-full bg-[#F4F4F5] rounded overflow-hidden">
                  <div className="h-full bg-[#18181B] rounded" style={{ width: totalProductsSold > 0 ? `${Math.min(100, (totalProductsSold / 100) * 100)}%` : '0%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[#71717A] mb-1">
                  <span>Store Direct Expenditure Ratio</span>
                  <span>Rs. {mExpenses.toFixed(2)} / Rs. 3,000 threshold</span>
                </div>
                <div className="h-1.5 w-full bg-[#F4F4F5] rounded overflow-hidden">
                  <div className="h-full bg-[#18181B]" style={{ width: `${Math.min(100, (mExpenses / 3000) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[#71717A] mb-1">
                  <span>Clear staff salary budget</span>
                  <span>Rs. {mSalPaid.toFixed(2)} / Rs. 10,000 limit</span>
                </div>
                <div className="h-1.5 w-full bg-[#F4F4F5] rounded overflow-hidden">
                  <div className="h-full bg-[#71717A]" style={{ width: `${Math.min(100, (mSalPaid / 10000) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-[#E4E4E7] pt-4">
            <button 
              onClick={() => onNavigate('invoices')}
              className="flex w-full items-center justify-between font-sans text-xs font-bold text-[#18181B] hover:opacity-85"
            >
              <span>View General Invoices Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
