import React, { useState, useMemo } from 'react';
import { useAppState } from '../App';
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as ChartIcon, 
  Table, 
  ChevronRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const ReportsPage = () => {
  const { transactions = [], settings, formatMoney } = useAppState();
  
  // States for period configuration
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'annually' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate Date Boundaries based on Active Period Type Toggle
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (periodType === 'weekly') {
      start.setDate(today.getDate() - 7);
    } else if (periodType === 'monthly') {
      start.setDate(today.getDate() - 30);
    } else if (periodType === 'annually') {
      start.setDate(today.getDate() - 365);
    } else { // custom period
      start = new Date(startDate);
      end = new Date(endDate);
    }

    // Reset clock details for accurate days parsing
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [periodType, startDate, endDate]);

  // Filter real transactions down to active period
  const filteredTxs = useMemo(() => {
    const { start, end } = dateBoundaries;
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });
  }, [transactions, dateBoundaries]);

  // Aggregate Key Aggregation Stats based on Filtered Transactions
  const metrics = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let transfers = 0;

    filteredTxs.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
      } else if (t.type === 'transfer') {
        transfers += t.amount;
      }
    });

    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    return {
      income,
      expenses,
      transfers,
      netSavings,
      savingsRate
    };
  }, [filteredTxs]);

  // Dynamic Grouping of trend values for area charts
  const trendChartData = useMemo(() => {
    const { start, end } = dateBoundaries;
    const diffMs = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Daily grouping
    if (diffDays <= 12) {
      const datesMap: Record<string, { name: string; income: number; expense: number }> = {};
      const curr = new Date(start);
      while (curr <= end) {
        const key = curr.toISOString().split('T')[0];
        // Format as e.g. "May 18"
        const label = curr.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        datesMap[key] = { name: label, income: 0, expense: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      filteredTxs.forEach(t => {
        if (datesMap[t.date]) {
          if (t.type === 'income') datesMap[t.date].income += t.amount;
          if (t.type === 'expense') datesMap[t.date].expense += t.amount;
        }
      });

      return Object.values(datesMap);
    } 
    
    // Weekly grouping
    if (diffDays <= 90) {
      // Group by weeks
      const weekData: { name: string; income: number; expense: number; startDay: Date }[] = [];
      const curr = new Date(start);
      let weekIdx = 1;

      while (curr <= end) {
        const weekStart = new Date(curr);
        const weekEnd = new Date(curr);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        weekData.push({
          name: `Wk ${weekIdx++}`,
          income: 0,
          expense: 0,
          startDay: weekStart
        });

        curr.setDate(curr.getDate() + 7);
      }

      filteredTxs.forEach(t => {
        const txDate = new Date(t.date);
        const match = weekData.find((w, idx) => {
          const nextWk = weekData[idx + 1]?.startDay || new Date(8640000000000000);
          return txDate >= w.startDay && txDate < nextWk;
        });
        if (match) {
          if (t.type === 'income') match.income += t.amount;
          if (t.type === 'expense') match.expense += t.amount;
        }
      });

      return weekData;
    }

    // Monthly Grouping
    const monthData: Record<string, { name: string; income: number; expense: number; key: number }> = {};
    const curr = new Date(start);
    while (curr <= end) {
      const monthLabel = curr.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      const keyVal = curr.getFullYear() * 12 + curr.getMonth();
      if (!monthData[monthLabel]) {
        monthData[monthLabel] = { name: monthLabel, income: 0, expense: 0, key: keyVal };
      }
      curr.setMonth(curr.getMonth() + 1);
    }

    filteredTxs.forEach(t => {
      const txD = new Date(t.date);
      const mLabel = txD.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      if (monthData[mLabel]) {
        if (t.type === 'income') monthData[mLabel].income += t.amount;
        if (t.type === 'expense') monthData[mLabel].expense += t.amount;
      }
    });

    return Object.values(monthData).sort((a,b) => a.key - b.key);
  }, [filteredTxs, dateBoundaries]);

  // Aggregate Category breakdown list for current selected period
  const categoryBreakdown = useMemo(() => {
    const expenseList: Record<string, number> = {};
    const incomeList: Record<string, number> = {};

    filteredTxs.forEach(t => {
      if (t.type === 'expense') {
        expenseList[t.category] = (expenseList[t.category] || 0) + t.amount;
      } else if (t.type === 'income') {
        incomeList[t.category] = (incomeList[t.category] || 0) + t.amount;
      }
    });

    const expArr = Object.entries(expenseList).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      type: 'expense'
    })).sort((a, b) => b.amount - a.amount);

    const incArr = Object.entries(incomeList).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      type: 'income'
    })).sort((a, b) => b.amount - a.amount);

    return { expenses: expArr, incomes: incArr };
  }, [filteredTxs]);

  // Custom function to export filtered period transactions down to CSV format
  const handleCSVExport = () => {
    if (filteredTxs.length === 0) {
      alert("No transaction entries matched in this interval window to export.");
      return;
    }
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Payment Account'];
    const rows = filteredTxs.map(t => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.amount,
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wealthflow_report_${periodType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 pb-20 select-text"
    >
      {/* Title Header with clean stark contrast */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
            Trends & Report Analyzer 📈
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
            Analyze income, expense schedules, and savings rates across customizable timelines.
          </p>
        </div>
        
        <button 
          onClick={handleCSVExport}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider px-4 py-3 sm:py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Download size={14} className="shrink-0" />
          <span className="truncate">Export Period Statement (CSV)</span>
        </button>
      </div>

      {/* Interactive Horizon Timeline Filter Card */}
      <div className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 p-5 rounded-3xl shadow-sm text-left space-y-4">
        <div className="flex flex-col space-y-3.5">
          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Select Reporting Horizon</label>
          <div className="bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto w-full hide-scrollbar relative">
            {[
              { id: 'weekly', label: 'Weekly Trend' },
              { id: 'monthly', label: 'Monthly Trend' },
              { id: 'annually', label: 'Annual Trend' },
              { id: 'custom', label: 'Custom Window' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodType(p.id as any)}
                className={`flex-1 min-w-[100px] shrink-0 py-2.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  periodType === p.id 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Calendar Picker Inputs if Custom Window is Chosen */}
        {periodType === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-gray-200 dark:border-slate-700/50"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From (Beginning Date)</label>
              <input 
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To (Ending Date)</label>
              <input 
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Aggregate Financial Metrics Panel with pristine readability */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm text-left min-w-0">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate pr-1">Inflow Volume</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="p-1 green-text-badge bg-green-50 dark:bg-green-950/40 text-green-600 rounded-lg shrink-0">
              <ArrowUpRight size={14} />
            </span>
            <span className="text-base md:text-lg font-black text-slate-950 dark:text-white truncate">
              {formatMoney(metrics.income)}
            </span>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm text-left min-w-0">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate pr-1">Outflow Volume</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="p-1 red-text-badge bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg shrink-0">
              <ArrowDownRight size={14} />
            </span>
            <span className="text-base md:text-lg font-black text-slate-950 dark:text-white truncate">
              {formatMoney(metrics.expenses)}
            </span>
          </div>
        </div>

        {/* Savings Volume */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm text-left min-w-0">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block pr-1 truncate">Periodic Savings</span>
          <div className="mt-2 text-base md:text-lg font-black block truncate text-slate-950 dark:text-white">
            <span className={metrics.netSavings >= 0 ? 'text-green-650' : 'text-red-655'}>
              {metrics.netSavings >= 0 ? '+' : ''}{formatMoney(metrics.netSavings)}
            </span>
          </div>
        </div>

        {/* Savings Efficiency Rate Indicator */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm text-left min-w-0">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block pr-1 truncate">Savings Efficiency</span>
          <div className="mt-2 text-base md:text-lg font-black block truncate text-indigo-600 dark:text-indigo-400">
            {metrics.savingsRate.toFixed(1)}% <span className="text-[9px] md:text-[10px] font-medium text-slate-400">rate</span>
          </div>
        </div>
      </div>

      {/* Main Bar/Area Chart displaying Progressive Trends over Selected Range */}
      <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm text-left flex flex-col space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Trend Analysis Flowchart</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Cash inflows mapped side-by-side against structural expenditures</p>
        </div>

        <div className="h-[250px] w-full font-mono text-[9px] relative overflow-hidden min-w-0">
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="trendInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="trendOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#495057', fontSize: 10}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#495057', fontSize: 10}} />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Legend iconType="circle" />
                <Area type="monotone" name="Inflow Amount" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#trendInflow)" />
                <Area type="monotone" name="Outflow Amount" dataKey="expense" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#trendOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <ChartIcon size={40} className="stroke-1 mb-2 text-indigo-200" />
              <p className="text-xs">No ledger entries logged inside this timeframe.</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories Breakdown List view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Expenditure categories breakdown */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
            <div>
              <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">Outflow Breakdown</h4>
              <p className="text-[9px] text-slate-400">Spending categories sorted by amount</p>
            </div>
            <TrendingDown size={18} className="text-red-500 shrink-0" />
          </div>

          <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
            {categoryBreakdown.expenses.length > 0 ? (
              categoryBreakdown.expenses.map(cat => {
                const totalExp = metrics.expenses || 1;
                const ratio = Math.min(100, (cat.amount / totalExp) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cat.category}</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatMoney(cat.amount)} <span className="text-[9px] text-slate-400 font-normal">({ratio.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No structural expenses during this period.</p>
            )}
          </div>
        </div>

        {/* Income categories breakdown */}
        <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
            <div>
              <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">Inflow Breakdown</h4>
              <p className="text-[9px] text-slate-400">Revenue categories sorted by amount</p>
            </div>
            <TrendingUp size={18} className="text-green-500 shrink-0" />
          </div>

          <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
            {categoryBreakdown.incomes.length > 0 ? (
              categoryBreakdown.incomes.map(cat => {
                const totalInc = metrics.income || 1;
                const ratio = Math.min(100, (cat.amount / totalInc) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cat.category}</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatMoney(cat.amount)} <span className="text-[9px] text-slate-400 font-normal">({ratio.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No logged revenue sources during this period.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportsPage;
