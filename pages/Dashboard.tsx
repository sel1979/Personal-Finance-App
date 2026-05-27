import React, { useMemo } from 'react';
import { useAppState } from '../App';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Plus, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Briefcase, 
  Activity, 
  Layers, 
  Award,
  Calendar
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#a855f7', '#3b82f6', '#f59e0b', '#ec4899'];

const Dashboard = () => {
  const { transactions, investments, settings, formatMoney, accounts } = useAppState();

      // Core metrics calculation
  const stats = useMemo(() => {
    // Current balance computed as sum of all manual balance cards
    const mockCashBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    // Liabilities Placeholder (Can compute loans)
    const liabilities = 0; // Mock until added correctly

    // Sum of all holdings
    let investmentsCurrentValue = 0;
    let investmentsInvestedValue = 0;
    let topStock = { name: 'None', symbol: '-', gain: 0, gainPercent: 0 };
    let bestGainVal = -Infinity;

    investments.forEach(inv => {
      const liveValue = inv.quantity * inv.currentPrice;
      const costValue = inv.quantity * inv.buyPrice;
      investmentsCurrentValue += liveValue;
      investmentsInvestedValue += costValue;

      const individualGain = liveValue - costValue;
      if (individualGain > bestGainVal) {
        bestGainVal = individualGain;
        topStock = {
          name: inv.name,
          symbol: inv.symbol,
          gain: individualGain,
          gainPercent: costValue > 0 ? (individualGain / costValue) * 100 : 0
        };
      }
    });

    const totalPortfolioValue = mockCashBalance + investmentsCurrentValue;
    const netWorth = totalPortfolioValue - liabilities;
    const savingsAmount = totalIncome - totalExpense;
    const monthlyNetWorthChange = savingsAmount; // Approximate month variance
    const portfolioProfitLoss = investmentsCurrentValue - investmentsInvestedValue;
    const portfolioPnLPercent = investmentsInvestedValue > 0 ? (portfolioProfitLoss / investmentsInvestedValue) * 100 : 0;

    // Smart Financial Health Score (0-100)
    let healthScore = 50; // base score
    if (totalIncome > 0) {
      if ((savingsAmount / totalIncome) > 0.2) healthScore += 20; // 20% savings rule
      if ((totalExpense / totalIncome) < 0.5) healthScore += 15; // needs < 50%
    }
    if (investmentsCurrentValue > 0) healthScore += 10;
    if (mockCashBalance > totalExpense * 2) healthScore += 5; // emergency fund
    healthScore = Math.min(100, Math.max(0, healthScore));

    return {
      totalIncome,
      totalExpense,
      savingsAmount,
      investmentsCurrentValue,
      totalPortfolioValue,
      netWorth,
      liabilities,
      monthlyNetWorthChange,
      healthScore,
      portfolioProfitLoss,
      portfolioPnLPercent,
      topStock,
      mockCashBalance
    };
  }, [transactions, investments, accounts]);

  // Area Chart Data representing progressive net worth growth
  const chartData = useMemo(() => {
    const baseIncome = stats.totalIncome || 75000;
    const baseExpense = stats.totalExpense || 32000;
    return [
      { name: 'Jan', income: baseIncome * 0.75, expense: baseExpense * 0.8 },
      { name: 'Feb', income: baseIncome * 0.82, expense: baseExpense * 0.95 },
      { name: 'Mar', income: baseIncome * 0.9, expense: baseExpense * 0.85 },
      { name: 'Apr', income: baseIncome * 0.94, expense: baseExpense * 0.9 },
      { name: 'May', income: baseIncome * 0.98, expense: baseExpense * 0.92 },
      { name: 'Current', income: baseIncome, expense: baseExpense }
    ];
  }, [stats]);

  // Expense breakdown categories mapping for Pie Chart
  const expenseCategoryData = useMemo(() => {
    const list: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      list[t.category] = (list[t.category] || 0) + t.amount;
    });
    return Object.entries(list).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [transactions]);

  // Asset allocation mapping
  const assetAllocationData = useMemo(() => {
    let stocksVal = 0;
    let mfVal = 0;
    let otherVal = 0;

    investments.forEach(i => {
      const val = i.quantity * i.currentPrice;
      if (i.type === 'stock') stocksVal += val;
      else if (i.type === 'mutual_fund') mfVal += val;
      else otherVal += val;
    });

    return [
      { name: 'Cash/Banks', value: stats.mockCashBalance },
      { name: 'Equities', value: stocksVal },
      { name: 'Mutual Funds', value: mfVal },
      { name: 'Other Assets', value: otherVal }
    ].filter(a => a.value > 0);
  }, [investments, stats]);

  // Goals completion aggregated calculation
  const goalTracker = useMemo(() => {
    const list: { name: string; target: number; current: number; percent: number }[] = [];
    investments.forEach(inv => {
      if (inv.goalName && inv.goalTarget) {
        const value = inv.quantity * inv.currentPrice;
        const matchIndex = list.findIndex(g => g.name.toLowerCase() === inv.goalName!.toLowerCase());
        if (matchIndex !== -1) {
          list[matchIndex].current += value;
          list[matchIndex].percent = Math.min(100, (list[matchIndex].current / list[matchIndex].target) * 100);
        } else {
          list.push({
            name: inv.goalName,
            target: inv.goalTarget,
            current: value,
            percent: Math.min(100, (value / inv.goalTarget) * 100)
          });
        }
      }
    });
    return list;
  }, [investments]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Groww & Zerodha styled Master Net Worth Card block */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-150 dark:shadow-none transition-all"
      >
        <div className="absolute -right-16 -top-16 w-52 h-52 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-md">
              Current Net Worth
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-2.5 break-words">
              {formatMoney(stats.netWorth)}
            </h2>
            <p className="text-xs lg:text-sm text-indigo-200 truncate font-medium">Assets {formatMoney(stats.totalPortfolioValue)} - Liabilities {formatMoney(stats.liabilities)}</p>
          </div>

          <div className="flex flex-row gap-4 items-center w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-md text-center shrink-0 flex-1 lg:flex-none">
              <span className="text-[9px] text-indigo-100 block uppercase font-bold tracking-widest">Health Score</span>
              <div className="flex items-center justify-center gap-1 mt-1 font-mono">
                <span className={`text-sm font-black ${stats.healthScore >= 70 ? 'text-green-300' : stats.healthScore >= 40 ? 'text-yellow-300' : 'text-red-300'}`}>
                  {stats.healthScore}
                </span>
                <span className="text-xs text-white pb-0.5">/100</span>
              </div>
            </div>
            
            <div className="bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-md font-mono text-center shrink-0">
              <span className="text-[9px] text-indigo-100 block uppercase font-bold tracking-widest">Investments ROI</span>
              <span className={`text-sm font-black flex items-center justify-center gap-0.5 mt-1 ${stats.portfolioProfitLoss >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {stats.portfolioProfitLoss >= 0 ? '+' : ''}{stats.portfolioPnLPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Accounts & UPI Wallets Ledgers */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">My Accounts & UPI Wallets</h4>
          <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold font-mono">
            {accounts.length} Active
          </span>
        </div>
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.04, delayChildren: 0.05 }
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {accounts.map(acc => {
            let badgeBg = 'bg-stone-100 text-stone-700 dark:bg-stone-950/60 dark:text-stone-300 border shadow-sm';
            if (acc.type === 'bank') badgeBg = 'bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100/10';
            if (acc.type === 'upi') badgeBg = 'bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100/10';
            if (acc.type === 'investment') badgeBg = 'bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100/10';

            return (
              <motion.div 
                key={acc.id} 
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                }}
                className={`p-3 rounded-2xl text-left flex flex-col justify-between bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm hover:scale-[1.01] transition-transform min-w-0`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-1">
                    {acc.name}
                  </span>
                  <span className={`text-[8px] font-mono leading-none tracking-tight font-extrabold uppercase shrink-0 py-0.5 px-1 rounded ${badgeBg}`}>
                    {acc.type}
                  </span>
                </div>
                <div className="flex justify-between items-end gap-1 mt-1">
                  <span className="text-[8px] opacity-65 font-mono text-slate-405 block truncate max-w-[50px] sm:max-w-[70px]">
                    {acc.accountNo ? `*${acc.accountNo.slice(-4)}` : 'Manual'}
                  </span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white leading-none truncate pl-1">
                    {formatMoney(acc.balance)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05, delayChildren: 0.1 }
          }
        }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {/* Cash balance */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="bg-white dark:bg-slate-800/50 p-3 md:p-4.5 rounded-2xl border dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform min-w-0"
        >
          <div className="flex justify-between items-center mb-1 gap-1">
            <span className="text-[10px] md:text-xs text-slate-400 font-bold block truncate">Available Capital</span>
            <span className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-lg text-[9px] font-black shrink-0">CASH</span>
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-slate-850 dark:text-slate-100 truncate w-full block">{formatMoney(stats.mockCashBalance)}</h3>
        </motion.div>

        {/* Monthly Income */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="bg-white dark:bg-slate-800/50 p-3 md:p-4.5 rounded-2xl border dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform min-w-0"
        >
          <div className="flex justify-between items-center mb-1 gap-1">
            <span className="text-[10px] md:text-xs text-slate-400 font-bold block truncate">Total Income</span>
            <div className="p-1 bg-green-50 dark:bg-green-950 text-green-600 rounded-lg shrink-0"><ArrowUpRight size={12} /></div>
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-slate-850 dark:text-slate-100 truncate w-full block">{formatMoney(stats.totalIncome)}</h3>
        </motion.div>

        {/* Monthly expenses */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="bg-white dark:bg-slate-800/50 p-3 md:p-4.5 rounded-2xl border dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform min-w-0"
        >
          <div className="flex justify-between items-center mb-1 gap-1">
            <span className="text-[10px] md:text-xs text-slate-400 font-bold block truncate">Expenses</span>
            <div className="p-1 bg-red-50 dark:bg-red-950 text-red-600 rounded-lg shrink-0"><ArrowDownRight size={12} /></div>
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-slate-850 dark:text-slate-100 truncate w-full block">{formatMoney(stats.totalExpense)}</h3>
        </motion.div>

        {/* Savings amount */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="bg-white dark:bg-slate-800/50 p-3 md:p-4.5 rounded-2xl border dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform min-w-0"
        >
          <div className="flex justify-between items-center mb-1 gap-1">
            <span className="text-[10px] md:text-xs text-slate-400 font-bold block truncate">Net Savings</span>
            <span className="py-0.5 px-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded text-[9px] font-black uppercase shrink-0">SAFE</span>
          </div>
          <h3 className={`text-lg md:text-xl font-extrabold truncate w-full block ${stats.savingsAmount >= 0 ? 'text-green-650' : 'text-red-650'}`}>
            {formatMoney(stats.savingsAmount)}
          </h3>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Capital Growth Strategy</h3>
              <p className="text-[10px] text-slate-400 font-medium">Monthly cash flow variance model</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Income</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-400 rounded-full"></span> Expenses</span>
            </div>
          </div>
          
          <div className="h-[200px] w-full font-mono text-[9px] overflow-hidden min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performer Stock and MF Highlights */}
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Holdings Highlights</h3>
            <p className="text-[10px] text-slate-400 font-medium pb-2">Top performers in self manual ledger</p>
          </div>

          <div className="space-y-3.5 flex-grow">
            {/* Top performing Stock */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border dark:border-slate-850">
              <span className="text-[8px] uppercase tracking-wider block text-green-500 font-extrabold mb-1">Top Performing Asset</span>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100">{stats.topStock.name}</h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{stats.topStock.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-green-500 flex items-center gap-0.5 justify-end">
                    ▲ {stats.topStock.gainPercent.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">+{formatMoney(stats.topStock.gain)}</span>
                </div>
              </div>
            </div>

            {/* Quick allocation metric */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border dark:border-slate-850">
              <span className="text-[8px] uppercase tracking-wider block text-indigo-500 font-extrabold mb-1">Mutual Fund pool Summary</span>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100">Continuous SIP Units</h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Recurring capital assets</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    {investments.filter(i => i.type === 'mutual_fund').length} Funds Active
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Goals Milestones */}
            {goalTracker.length > 0 ? (
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border dark:border-slate-850 space-y-2.5">
                <span className="text-[8px] uppercase tracking-wider block text-purple-600 font-extrabold">Active Goal Milestones</span>
                {goalTracker.slice(0, 3).map(g => (
                  <div key={g.name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{g.name}</span>
                      <span className="text-indigo-650 dark:text-indigo-400">{g.percent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-primary-gradient h-full rounded-full" style={{ width: `${g.percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                      <span>{formatMoney(g.current)}</span>
                      <span>Target: {formatMoney(g.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border dark:border-slate-850 text-center">
                <span className="text-[8px] uppercase tracking-wider block text-purple-600 font-extrabold mb-1">Financial Milestones</span>
                <p className="text-[10px] text-slate-400">Set a target goal name in Register Asset to track milestone progress here.</p>
              </div>
            )}
          </div>

          {/* AI Insights banner link */}
          <Link to="/ai-insights" className="bg-primary-gradient p-3.5 rounded-2xl text-white flex justify-between items-center group relative overflow-hidden shrink-0 mt-3 hover:scale-[1.01] transition-transform shadow-md">
            <div className="relative z-10">
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-100">WealthFlow Assistant AI</span>
              <h5 className="text-xs font-extrabold mt-0.5">Generate Smart Predictions</h5>
            </div>
            <Sparkles size={18} className="text-indigo-200 animate-pulse group-hover:rotate-12 transition-transform shrink-0" />
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Asset Allocation Pie chart */}
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-4 gap-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">Asset class Allocation</h4>
            <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">Total Diversification</span>
          </div>

          <div className="w-full h-[150px] overflow-hidden min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetAllocationData.length > 0 ? assetAllocationData : [{ name: 'Empty', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={55}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {assetAllocationData.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  {assetAllocationData.length === 0 && <Cell fill="#f1f5f9" />}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)'
                  }} 
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '11px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  formatter={(value: number) => [formatMoney(value), 'Value']} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 w-full pt-4 border-t dark:border-slate-700/50 text-[10px] font-extrabold">
            {assetAllocationData.map((e, index) => (
              <div key={e.name} className="flex items-center gap-1.5 justify-start bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-100/5 dark:border-slate-700/50/10">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-700 dark:text-slate-300 shrink-0 truncate max-w-[70px] select-none">{e.name}:</span>
                <span className="text-slate-900 dark:text-slate-100 shrink-0 ml-auto font-mono font-black">{formatMoney(e.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Category Breakdown Pie chart */}
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-4 gap-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">Expense category Allocation</h4>
            <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">Monthly Burn</span>
          </div>

          <div className="w-full h-[150px] overflow-hidden min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryData.length > 0 ? expenseCategoryData : [{ name: 'No spending', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={41}
                  outerRadius={56}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {expenseCategoryData.map((e, index) => <Cell key={index} fill={COLORS[(index + 1) % COLORS.length]} />)}
                  {expenseCategoryData.length === 0 && <Cell fill="#f1f5f9" />}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)'
                  }} 
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '11px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  formatter={(value: number) => [formatMoney(value), 'Value']} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 w-full pt-4 border-t dark:border-slate-700/50 text-[10px] font-extrabold">
            {expenseCategoryData.map((e, index) => (
              <div key={e.name} className="flex items-center gap-1.5 justify-start bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-100/5 dark:border-slate-700/50/10">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(index + 1) % COLORS.length] }}></span>
                <span className="text-slate-700 dark:text-slate-300 shrink-0 truncate max-w-[70px] select-none">{e.name}:</span>
                <span className="text-slate-900 dark:text-slate-100 shrink-0 ml-auto font-mono font-black">{formatMoney(e.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bill Reminders Widget */}
      <div className="bg-white dark:bg-slate-800/50 rounded-3xl border dark:border-slate-700/50 shadow-sm p-6 mt-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">Upcoming Bills & Reminders</h4>
            <p className="text-[10px] text-slate-400 font-medium">Keep track of upcoming dues and subscriptions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
           {useAppState().recurringTransactions.map((bill, i) => {
             const now = new Date();
             const nextDate = new Date(bill.nextDate);
             const daysDiff = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
             const dueStr = daysDiff === 0 ? 'Today' : daysDiff < 0 ? 'Overdue' : `In ${daysDiff} Days`;
             const priority = daysDiff < 3 ? 'Critical' : daysDiff < 7 ? 'High' : 'Medium';

             return (
             <div key={bill.id} className="bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-colors cursor-pointer group">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded block w-max mb-1.5">{bill.category}</span>
                   <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{bill.description}</h5>
                 </div>
               </div>
               <div className="flex justify-between items-end">
                 <div>
                   <span className={`block text-[10px] font-bold mb-0.5 tracking-wider uppercase ${daysDiff < 3 ? 'text-red-500' : 'text-slate-500'}`}>Due: {dueStr}</span>
                   <span className="text-lg font-black text-slate-900 dark:text-slate-100">{formatMoney(bill.amount)}</span>
                 </div>
                 <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${priority === 'Critical' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-900/40' : priority === 'High' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 border-orange-200 dark:border-orange-900/40' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-900/40'}`}>{priority}</span>
               </div>
             </div>
           )})}
        </div>
      </div>

      {/* Recent Transactions List inside phone layout scope */}
      <div className="bg-white dark:bg-slate-800/50 rounded-3xl border dark:border-slate-700/50 shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b dark:border-slate-700/50/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Recent manual ledger Logs</h4>
          <Link to="/transactions" className="text-indigo-650 dark:text-indigo-400 font-extrabold text-xs flex items-center gap-0.5">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {transactions.slice(0, 4).map(t => {
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-950 dark:text-slate-100">{t.description}</h5>
                    <span className="text-[10px] text-slate-400 uppercase font-black">{t.category} • {t.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-black block ${isIncome ? 'text-green-600' : 'text-red-650'}`}>
                    {isIncome ? '+' : '-'}{formatMoney(t.amount)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{t.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
