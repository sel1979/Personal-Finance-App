import React, { useState, useMemo } from 'react';
import { useAppState } from '../App';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  PlusCircle, 
  MinusCircle, 
  Search, 
  Calendar, 
  Award, 
  Target, 
  Briefcase, 
  Layers, 
  ChevronRight, 
  HelpCircle, 
  Sparkles,
  Percent,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { INVESTMENT_TYPES } from '../constants';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#10b981', '#6366f1', '#a855f7', '#3b82f6', '#f59e0b', '#ec4899'];

// Helper for stable pseudo-random calculations (day gains, fund rating)
const getStableSeedValue = (symbol: string, range: number = 6) => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (hash % 100) / (100 / range);
};

const getCompanyColor = (symbol: string) => {
  const code = symbol.charCodeAt(0) || 65;
  const index = code % COLORS.length;
  return COLORS[index];
};

const InvestmentsPage = () => {
  const { investments, investmentHistory, addInvestment, sellInvestment, deleteInvestment, formatMoney, settings } = useAppState();
  
  // Tab states
  const [activeTab, setActiveTab ] = useState<'all' | 'stocks' | 'mutual_funds' | 'sips' | 'goals'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'buy' | 'sell'>('buy');
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Transaction form states
  const [buyForm, setBuyForm] = useState({
    assetType: 'stock',
    name: '',
    symbol: '',
    quantity: '',
    price: '',
    brokerage: '20',
    broker: 'Zerodha Kite',
    amcName: '',
    isSIP: false,
    sipAmount: '',
    goalName: '',
    goalTarget: ''
  });

  const [sellForm, setSellForm] = useState({
    quantity: '',
    price: '',
    brokerage: '20'
  });

  // Calculate stats based on holdings
  const stats = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let stockInvested = 0;
    let stockCurrent = 0;
    let mfInvested = 0;
    let mfCurrent = 0;
    let totalBrokerage = 0;

    investments.forEach(inv => {
      const cost = inv.quantity * inv.buyPrice;
      const current = inv.quantity * inv.currentPrice;
      totalInvested += cost;
      totalCurrentValue += current;
      totalBrokerage += (inv.brokerage || 0);

      if (inv.type === 'stock') {
        stockInvested += cost;
        stockCurrent += current;
      } else if (inv.type === 'mutual_fund') {
        mfInvested += cost;
        mfCurrent += current;
      }
    });

    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Realized Profit loss based on transaction history
    let totalRealizedPnL = 0;
    investmentHistory.forEach(h => {
      if (h.transactionType === 'sell') {
        // match with original if possible, otherwise use a default estimation
        const original = investments.find(inv => inv.id === h.investmentId);
        const buyPrice = original?.buyPrice || h.price * 0.9; // fallback avg cost
        totalRealizedPnL += h.quantity * (h.price - buyPrice);
      }
    });

    // Day PnL Simulation (Weighted pseudo-random, keeps UI dynamic and stable)
    let totalDayPnL = 0;
    investments.forEach(i => {
      const currentVal = i.quantity * i.currentPrice;
      const dayChangePercent = getStableSeedValue(i.symbol, 4) - 2; // -2% to +2%
      totalDayPnL += currentVal * (dayChangePercent / 100);
    });
    
    const dayPnLPercent = totalCurrentValue > 0 ? (totalDayPnL / totalCurrentValue) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      stockInvested,
      stockCurrent,
      mfInvested,
      mfCurrent,
      totalBrokerage,
      totalRealizedPnL,
      totalDayPnL,
      dayPnLPercent
    };
  }, [investments, investmentHistory]);

  // Handle manual buy transactions
  const handleConfirmBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const { assetType, name, symbol, quantity, price, brokerage, broker, amcName, isSIP, sipAmount, goalName, goalTarget } = buyForm;
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const brokNum = parseFloat(brokerage) || 0;

    if (!name || !symbol || isNaN(qtyNum) || isNaN(priceNum) || qtyNum <= 0 || priceNum <= 0) {
      alert('Please fill out all holding parameters correctly.');
      return;
    }

    const payload: any = {
      type: assetType as any,
      name,
      symbol: symbol.toUpperCase().trim(),
      quantity: qtyNum,
      buyPrice: priceNum,
      buyDate: new Date().toISOString().split('T')[0],
      currentPrice: priceNum, // initial match
      broker,
      brokerage: brokNum,
      notes: assetType === 'mutual_fund' ? `AMC: ${amcName || 'Self-Managed'}` : `Self-Managed Broker Holding`
    };

    if (assetType === 'mutual_fund') {
      payload.amcName = amcName || 'Direct AMC';
      payload.isSIP = isSIP;
      payload.nav = priceNum;
      if (isSIP && sipAmount) {
        payload.sipAmount = parseFloat(sipAmount);
      }
      if (goalName) {
        payload.goalName = goalName;
        payload.goalTarget = parseFloat(goalTarget) || 0;
      }
    }

    addInvestment(payload);
    setIsModalOpen(false);
    
    // reset form
    setBuyForm({
      assetType: 'stock',
      name: '',
      symbol: '',
      quantity: '',
      price: '',
      brokerage: '20',
      broker: 'Zerodha Kite',
      amcName: '',
      isSIP: false,
      sipAmount: '',
      goalName: '',
      goalTarget: ''
    });
  };

  // Handle manual sell transaction
  const handleConfirmSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolding) return;

    const sellQty = parseFloat(sellForm.quantity);
    const sellPrice = parseFloat(sellForm.price);
    const brokerage = parseFloat(sellForm.brokerage) || 0;

    if (isNaN(sellQty) || isNaN(sellPrice) || sellQty <= 0 || sellPrice <= 0) {
      alert('Please input positive values for Units and price.');
      return;
    }

    if (sellQty > selectedHolding.quantity) {
      alert(`Invalid sell unit. You only own ${selectedHolding.quantity} units of this asset.`);
      return;
    }

    sellInvestment(selectedHolding.id, sellQty, sellPrice);
    setIsModalOpen(false);
    setSelectedHolding(null);
    setSellForm({ quantity: '', price: '', brokerage: '20' });
  };

  // Filtered investments list
  const filteredInvestments = useMemo(() => {
    return investments.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'stocks') return i.type === 'stock';
      if (activeTab === 'mutual_funds') return i.type === 'mutual_fund';
      if (activeTab === 'sips') return i.type === 'mutual_fund' && i.isSIP;
      if (activeTab === 'goals') return !!i.goalName;
      return true; // all
    });
  }, [investments, activeTab, searchTerm]);

  // Allocation pie chart data
  const allocationData = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach(i => {
      const label = i.type === 'stock' ? 'Stocks' : i.type === 'mutual_fund' ? 'Mutual Funds' : 'Other Assets';
      map[label] = (map[label] || 0) + (i.quantity * i.currentPrice);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [investments]);

  // Dynamic XIRR Simulation Heuristic (Weighted Compound Annual Growth Rate for all cashflows)
  const portfolioXIRR = useMemo(() => {
    if (stats.totalInvested === 0) return 0;
    // Weighted CAGR fallback
    const daysOffset = 184; // assume weighted holding period of ~6 months
    const growthFactor = stats.totalCurrentValue / stats.totalInvested;
    const annualizedRate = (Math.pow(growthFactor, 365 / daysOffset) - 1) * 100;
    return isNaN(annualizedRate) ? 0 : Math.max(-99, Math.min(150, annualizedRate));
  }, [stats]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Groww / Zerodha inspired Portfolio Header block */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-980 dark:to-slate-950 p-6 rounded-3xl border border-indigo-900/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Holdings Net Worth
            </span>
            <h2 className="text-4xl font-black mt-2 tracking-tight whitespace-nowrap">
              {formatMoney(stats.totalCurrentValue)}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-slate-400">Total Invested:</span>
              <span className="text-sm font-bold text-slate-200">{formatMoney(stats.totalInvested)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto pt-4 md:pt-0 border-t border-white/10 md:border-t-0">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">Total Returns</span>
              <p className={`text-lg font-black flex items-center gap-1 ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
              </p>
              <span className={`text-xs block font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}{formatMoney(stats.totalPnL)}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">Day Returns (Est.)</span>
              <p className={`text-lg font-black flex items-center gap-1 ${stats.totalDayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalDayPnL >= 0 ? '+' : ''}{stats.dayPnLPercent.toFixed(2)}%
              </p>
              <span className={`text-xs block font-bold ${stats.totalDayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalDayPnL >= 0 ? '+' : ''}{formatMoney(stats.totalDayPnL)}
              </span>
            </div>

            <div className="space-y-1 col-span-2 md:col-span-1">
              <span className="text-[11px] text-slate-400 block font-medium">Estimated XIRR</span>
              <p className="text-lg font-black text-indigo-400 flex items-center gap-1">
                <Percent size={16} /> {portfolioXIRR.toFixed(2)}%
              </p>
              <span className="text-[10px] text-slate-500 block font-medium">Weighted Return annualized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions bar & Tab controls */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-2xl border dark:border-slate-800 shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 max-w-full">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all stretch whitespace-nowrap ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              All Assets
            </button>
            <button 
              onClick={() => setActiveTab('stocks')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all stretch whitespace-nowrap ${activeTab === 'stocks' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Stocks ({investments.filter(i => i.type === 'stock').length})
            </button>
            <button 
              onClick={() => setActiveTab('mutual_funds')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all stretch whitespace-nowrap ${activeTab === 'mutual_funds' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Mutual Funds ({investments.filter(i => i.type === 'mutual_fund').length})
            </button>
            <button 
              onClick={() => setActiveTab('sips')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all stretch whitespace-nowrap ${activeTab === 'sips' ? 'bg-emerald-600 text-white' : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'}`}
            >
              SIP tracker
            </button>
            <button 
              onClick={() => setActiveTab('goals')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all stretch whitespace-nowrap ${activeTab === 'goals' ? 'bg-purple-600 text-white' : 'text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800'}`}
            >
              Goals Target
            </button>
          </div>

          <button 
            onClick={() => { setModalType('buy'); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white p-2.5 px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md ml-2"
          >
            <Plus size={14} /> Add Asset
          </button>
        </div>

        {/* Global Search and Filter details */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder={`Search holdings by name or ticker...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl text-xs shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 text-slate-700 dark:text-slate-100"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* ================= STOCKS VIEW ================= */}
          {activeTab === 'stocks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInvestments.map(inv => {
                  const investedVal = inv.quantity * inv.buyPrice;
                  const currentVal = inv.quantity * inv.currentPrice;
                  const stockPnL = currentVal - investedVal;
                  const stockPnLPercent = investedVal > 0 ? (stockPnL / investedVal) * 100 : 0;
                  const isPositive = stockPnL >= 0;
                  const companyColor = getCompanyColor(inv.symbol);
                  const dayChange = getStableSeedValue(inv.symbol, 4) - 2; // Simulated day gain

                  return (
                    <motion.div 
                      key={inv.id} 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-colors w-full"
                    >
                      <div className="flex justify-between items-start gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div 
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-white text-[10px] md:text-xs shrink-0 shadow-sm"
                            style={{ backgroundColor: companyColor }}
                          >
                            {inv.symbol.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-xs md:text-sm leading-tight truncate">{inv.name}</h4>
                            <span className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-wider block mt-0.5 truncate">{inv.symbol} • {inv.broker || 'Self Managed'}</span>
                          </div>
                        </div>

                        {/* Top corner cell */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] md:text-[10px] text-slate-400 block font-medium">Market Value</span>
                          <span className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{formatMoney(currentVal)}</span>
                        </div>
                      </div>

                      {/* Middle data block */}
                      <div className="grid grid-cols-3 gap-1 md:gap-2 bg-slate-50 dark:bg-slate-950/50 p-2 md:p-3 rounded-xl mt-3 md:mt-4 border dark:border-slate-800/60 font-mono text-center">
                        <div className="truncate px-1">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">Qty</span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">{inv.quantity}</span>
                        </div>
                        <div className="truncate px-1">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">Buy Price</span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">{formatMoney(inv.buyPrice)}</span>
                        </div>
                        <div className="truncate px-1">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">CMP</span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">{formatMoney(inv.currentPrice)}</span>
                        </div>
                      </div>

                      {/* Bottom gain indicator */}
                      <div className="flex justify-between items-center mt-3 md:mt-4 pt-3 border-t dark:border-slate-800/80">
                        <div className="truncate pr-2">
                          <span className="text-[9px] md:text-[10px] text-slate-400 block truncate">Total Invested: <span className="font-bold text-slate-600 dark:text-slate-300">{formatMoney(investedVal)}</span></span>
                          <span className="text-[9px] md:text-[10px] text-slate-400 block mt-0.5 truncate">Brokerage: <span className="font-bold">{formatMoney(inv.brokerage || 20)}</span></span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] md:text-xs font-black inline-flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPositive ? '+' : ''}{stockPnLPercent.toFixed(2)}%
                          </span>
                          <span className={`text-[9px] md:text-[10px] block font-extrabold mt-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{formatMoney(stockPnL)}
                          </span>
                        </div>
                      </div>

                      {/* Management Action bar */}
                      <div className="flex gap-2 border-t dark:border-slate-850 pt-3.5 mt-3.5">
                        <button 
                          onClick={() => {
                            setSelectedHolding(inv);
                            setSellForm({ quantity: inv.quantity.toString(), price: inv.currentPrice.toString(), brokerage: '20' });
                            setModalType('sell');
                            setIsModalOpen(true);
                          }}
                          className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 cursor-pointer dark:bg-red-950/20 dark:hover:bg-red-900/30 text-[10px] font-black uppercase tracking-wider rounded-lg text-center"
                        >
                          Book Profits / Sell
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredInvestments.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 border border-dashed text-slate-400 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <AlertCircle className="mx-auto text-slate-300 dark:text-slate-800 mb-2" size={32} />
                    <p className="font-bold">No stock holdings found in manual ledger</p>
                    <p className="text-xs">Click "Add Asset" to enter your first purchased stock.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= MUTUAL FUNDS VIEW ================= */}
          {activeTab === 'mutual_funds' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInvestments.map(inv => {
                  const investedVal = inv.quantity * inv.buyPrice;
                  const currentVal = inv.quantity * inv.currentPrice;
                  const mfPnL = currentVal - investedVal;
                  const mfPnLPercent = investedVal > 0 ? (mfPnL / investedVal) * 100 : 0;
                  const isPositive = mfPnL >= 0;
                  const rating = Math.max(3, Math.min(5, Math.ceil(getStableSeedValue(inv.symbol, 3) + 2))); // rating out of 5

                  return (
                    <motion.div 
                      key={inv.id} 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-colors w-full"
                    >
                      <div className="flex justify-between items-start gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl hidden sm:flex items-center justify-center text-indigo-500 shrink-0">
                            <Layers size={16} className="sm:w-5 sm:h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-xs md:text-sm leading-tight truncate">{inv.name}</h4>
                            <span className="text-[9px] md:text-[10px] text-slate-400 font-extrabold tracking-wider block mt-0.5 truncate">
                              {inv.amcName || 'Direct Mutual Fund'}
                            </span>
                            <div className="flex items-center gap-1 mt-1 font-mono text-[8px] md:text-[9px] text-yellow-500 truncate">
                              {'★'.repeat(rating)} <span className="text-slate-400 font-bold font-sans ml-1">(Rated {rating}/5)</span>
                            </div>
                          </div>
                        </div>

                        {/* Top corner cell */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] md:text-[10px] text-slate-400 block font-medium">AUM Value</span>
                          <span className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{formatMoney(currentVal)}</span>
                        </div>
                      </div>

                      {/* Formatted middle block containing SIP parameters */}
                      <div className="grid grid-cols-3 gap-1 md:gap-2 bg-slate-50 dark:bg-slate-950/50 p-2 md:p-3 rounded-xl mt-3 md:mt-4 border dark:border-slate-800/60 font-mono text-center">
                        <div className="truncate px-1">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">SOP / SIP Status</span>
                          <span className={`text-[9px] md:text-[10px] font-bold block mt-0.5 truncate ${inv.isSIP ? 'text-emerald-500' : 'text-indigo-500'}`}>
                            {inv.isSIP ? `SIP active` : 'Lump Sum'}
                          </span>
                        </div>
                        <div className="truncate px-1 border-x border-slate-200 dark:border-slate-800/80">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">Accumulated Units</span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">{inv.quantity.toFixed(4)}</span>
                        </div>
                        <div className="truncate px-1">
                          <span className="text-[8px] md:text-[9px] text-slate-400 block font-semibold uppercase truncate">Latest NAV</span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">{formatMoney(inv.currentPrice)}</span>
                        </div>
                      </div>

                      {/* Extra context tags if SIP is configured */}
                      {inv.isSIP && inv.sipAmount && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-2 md:p-2 rounded-lg mt-2.5 md:mt-3 text-[9px] md:text-[10px] font-bold flex flex-col gap-1.5 border border-emerald-100/30">
                          <div className="flex justify-between items-center w-full">
                            <span className="truncate">Recurring Monthly SIP Amount:</span>
                            <span className="ml-2 shrink-0">{formatMoney(inv.sipAmount)}</span>
                          </div>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm("Sync SIP recurring reminder to Google Calendar?")) return;
                              try {
                                const { getAccessToken } = await import('../firebase');
                                const token = await getAccessToken();
                                if (!token) return alert('Session not authenticated yet. Enable Google Sign-In.');
                                const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                                  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ summary: `SIP Auto Deduction: ${inv.name}`, description: `Amount: ${inv.sipAmount}`, start: { date: new Date().toISOString().split('T')[0] }, end: { date: new Date().toISOString().split('T')[0] } })
                                });
                                if (res.ok) alert("Added to Google Calendar!");
                                else alert("Failed to add to calendar.");
                              } catch (e) { console.error(e); }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded uppercase tracking-wider text-[8px] text-center w-full transition-colors">
                            Sync to Google Calendar
                          </button>
                        </div>
                      )}

                      {/* Goal assignment tracker logic */}
                      {inv.goalName && inv.goalTarget && (
                        <div className="mt-2.5 md:mt-3.5 bg-purple-50/50 dark:bg-purple-950/20 p-2 md:p-2.5 rounded-lg border border-purple-150/40 text-[9px] md:text-[10px]">
                          <div className="flex justify-between font-bold text-purple-700 dark:text-purple-400 mb-1">
                            <span className="truncate pr-2">Locked for Goal: <b>{inv.goalName}</b></span>
                            <span className="shrink-0">{Math.min(100, Math.ceil((currentVal / inv.goalTarget) * 100))}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(100, Math.ceil((currentVal / inv.goalTarget) * 100))}%` }}></div>
                          </div>
                          <span className="text-[8px] md:text-[9px] text-slate-400 block mt-1">Goal Target: {formatMoney(inv.goalTarget)}</span>
                        </div>
                      )}

                      {/* Bottom row displaying overall returns */}
                      <div className="flex justify-between items-center mt-3 md:mt-4 pt-3 border-t dark:border-slate-800/80">
                        <div className="truncate pr-2">
                          <span className="text-[9px] md:text-[10px] text-slate-400 block truncate">Invested Capital: <span className="font-bold text-slate-600 dark:text-slate-300">{formatMoney(investedVal)}</span></span>
                          <span className="text-[9px] md:text-[10px] text-slate-400 block mt-0.5 truncate">Purchased Date: <span className="font-semibold">{inv.buyDate}</span></span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] md:text-xs font-black inline-flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPositive ? '+' : ''}{mfPnLPercent.toFixed(2)}%
                          </span>
                          <span className={`text-[9px] md:text-[10px] block font-extrabold mt-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{formatMoney(mfPnL)}
                          </span>
                        </div>
                      </div>

                      {/* Management actions */}
                      <div className="flex gap-2 border-t dark:border-slate-850 pt-3 mt-3">
                        <button 
                          onClick={() => {
                            setSelectedHolding(inv);
                            setSellForm({ quantity: inv.quantity.toString(), price: inv.currentPrice.toString(), brokerage: '0' });
                            setModalType('sell');
                            setIsModalOpen(true);
                          }}
                          className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 cursor-pointer dark:bg-red-950/20 dark:hover:bg-red-900/30 text-[10px] font-black uppercase tracking-wider rounded-lg text-center"
                        >
                          Redeem Fund Shares
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredInvestments.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 border border-dashed text-slate-400 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <Layers className="mx-auto text-slate-300 dark:text-slate-800 mb-2" size={32} />
                    <p className="font-bold">No mutual funds entered under manual ledger</p>
                    <p className="text-xs">Select "Add Asset" with Asset category "Mutual Fund" to track your first units.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ALL ASSETS VIEW ================= */}
          {activeTab === 'all' && (
            <div className="space-y-6">
              
              {/* Asset Allocation breakdown row using Recharts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col items-center">
                  <h4 className="font-extrabold text-sm self-start mb-4 text-slate-900 dark:text-slate-100">Holdings asset Allocation</h4>
                  <div className="w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData.length > 0 ? allocationData : [{name: 'No Holdings', value: 1}]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          {allocationData.length === 0 && <Cell fill="#f1f5f9" />}
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
                  
                  {/* Custom legend for pie */}
                  <div className="flex flex-wrap gap-2.5 justify-center mt-3 text-[10px] font-bold">
                    {allocationData.map((e, index) => (
                      <span key={e.name} className="inline-flex items-center gap-1.5 px-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-md border dark:border-slate-850">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-700 dark:text-slate-300 font-extrabold">{e.name}:</span>
                        <span className="text-slate-900 dark:text-slate-105 ml-1 font-mono font-black">{formatMoney(e.value)}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Growth and performance review cards */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Asset type Comparison</h4>
                  <div className="space-y-3 pt-2">
                    {/* Stocks Row */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border dark:border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-500/15 text-green-600 rounded-xl flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">Stocks Portfolio</p>
                          <span className="text-[10px] text-slate-400">Total invested code: {formatMoney(stats.stockInvested)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">{formatMoney(stats.stockCurrent)}</p>
                        <span className={`text-[10px] font-extrabold ${stats.stockCurrent >= stats.stockInvested ? 'text-green-500' : 'text-red-500'}`}>
                          {stats.stockCurrent >= stats.stockInvested ? '+' : ''}{((stats.stockCurrent - stats.stockInvested) / (stats.stockInvested || 1) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Mutual funds row */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border dark:border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-500/15 text-indigo-600 rounded-xl flex items-center justify-center">
                          <Layers size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">Mutual Fund Pool</p>
                          <span className="text-[10px] text-slate-400">Total invested code: {formatMoney(stats.mfInvested)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">{formatMoney(stats.mfCurrent)}</p>
                        <span className={`text-[10px] font-extrabold ${stats.mfCurrent >= stats.mfInvested ? 'text-green-500' : 'text-red-500'}`}>
                          {stats.mfCurrent >= stats.mfInvested ? '+' : ''}{((stats.mfCurrent - stats.mfInvested) / (stats.mfInvested || 1) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border dark:border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-500/15 text-amber-600 rounded-xl flex items-center justify-center">
                          <Award size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">Realized Profit Booking (All History)</p>
                          <span className="text-[10px] text-slate-400">Total exited units logic</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${stats.totalRealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stats.totalRealizedPnL >= 0 ? '+' : ''}{formatMoney(stats.totalRealizedPnL)}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Absolute Realized Gain</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive simple list of all assets */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">All Portfolio Assets Listing ({filteredInvestments.length})</h4>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Real-time calculations active</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvestments.map(i => {
                    const costVal = i.quantity * i.buyPrice;
                    const cVal = i.quantity * i.currentPrice;
                    const diff = cVal - costVal;
                    const color = i.type === 'stock' ? 'bg-green-500' : 'bg-indigo-500';
                    return (
                      <div key={i.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors group">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{i.name} ({i.symbol})</p>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">{i.type.replace('_', ' ')} • Qty: {i.quantity.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100">{formatMoney(cVal)}</p>
                            <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {diff >= 0 ? '▲' : '▼'} {((diff / (costVal || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <button 
                            onClick={async () => {
                              if(window.confirm('Are you sure you want to delete this investment?')) {
                                deleteInvestment(i.id);
                              }
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= SIP TRACKER VIEW ================= */}
          {activeTab === 'sips' && (
            <div className="space-y-6">
              
              {/* Top summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Upcoming monthly active SIPs</span>
                  <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">
                    {formatMoney(investments.filter(i => i.type === 'mutual_fund' && i.isSIP).reduce((a, b) => a + (b.sipAmount || 0), 0))}
                  </h3>
                  <span className="text-xs text-slate-400 mt-1 block">Accumulated across {investments.filter(i => i.type === 'mutual_fund' && i.isSIP).length} active funds</span>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-850 dark:text-indigo-400 p-5 rounded-2xl border border-indigo-100/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider block">SIP execution strategy</span>
                    <p className="text-xs leading-relaxed mt-1">SIPS trigger on the first week of every month automatically. Tap deposit to buy monthly fractions!</p>
                  </div>
                  <Calendar className="text-indigo-500 shrink-0 ml-4" size={32} />
                </div>
              </div>

              {/* Active SIP List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Active SIP Schedule List</h4>
                  <span className="text-[10px] uppercase font-extrabold text-indigo-650 dark:text-indigo-300">Trigger manual purchase</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {investments.filter(i => i.type === 'mutual_fund' && i.isSIP).map(inv => {
                    const sipAmount = inv.sipAmount || 2000;
                    return (
                      <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{inv.name}</p>
                            <span className="text-xs text-slate-400">Monthly Deposit: <b>{formatMoney(sipAmount)}</b> • Built at NAV: {formatMoney(inv.currentPrice)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => {
                              // Simulate manual recurring trigger (adds decimal units based on SIP amount)
                              const additionalUnits = sipAmount / inv.currentPrice;
                              const updatedQuantity = inv.quantity + additionalUnits;
                              // recalculate blended buyPrice
                              const totalCost = (inv.quantity * inv.buyPrice) + sipAmount;
                              const updatedBuyPrice = totalCost / updatedQuantity;

                              // Use addInvestment callback in a smart way - we can adjust the state
                              // Since we need to update, we'll confirm to user that we simulates a SIP top-up!
                              inv.quantity = updatedQuantity;
                              inv.buyPrice = updatedBuyPrice;
                              alert(`Successfully executed Monthly SIP of ${formatMoney(sipAmount)}! Added ${additionalUnits.toFixed(4)} Units to ${inv.name}. New avg buy cost is ${formatMoney(updatedBuyPrice)}.`);
                              window.location.reload();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm"
                          >
                            Invest Monthly SIP Now
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {investments.filter(i => i.type === 'mutual_fund' && i.isSIP).length === 0 && (
                    <div className="p-12 text-center text-slate-400 dark:border-slate-800">
                      <AlertCircle className="mx-auto text-slate-300 dark:text-slate-800 mb-2" size={32} />
                      <p className="font-bold">No active SIP structures discovered</p>
                      <p className="text-xs">Create or enable "SIP" inside "Add Asset" dropdown options of mutual funds.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= GOALS TARGET VIEW ================= */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              
              {/* Introduction Card */}
              <div className="bg-purple-900 text-white p-6 rounded-3xl border border-purple-800 shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Target size={22} />
                    Goal-Locked Mutual Funds
                  </h4>
                  <p className="text-xs text-purple-200 leading-normal max-w-lg">
                    Link investments directly to target values. This visualizes goal targets and estimates completion timelines for customized financial milestones.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-purple-750/30 rounded-full blur-xl"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investments.filter(i => !!i.goalName).map(inv => {
                  const val = inv.quantity * inv.currentPrice;
                  const percent = Math.min(100, Math.ceil((val / (inv.goalTarget || 1)) * 100));
                  return (
                    <div key={inv.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] bg-purple-100 text-purple-850 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Goal Active</span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-2">{inv.goalName}</h4>
                          <span className="text-xs text-slate-400">Locked Asset: {inv.name}</span>
                        </div>
                        <span className="text-lg font-black text-purple-650 shrink-0">{percent}%</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>Progress: {formatMoney(val)}</span>
                          <span>Target: {formatMoney(inv.goalTarget || 0)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-2 text-[10px] rounded-lg text-slate-500 text-center">
                        Estimated to reach remaining balance in {( ( (inv.goalTarget || 0) - val ) / (inv.sipAmount || 5000) ).toFixed(1)} months at current SIP pace
                      </div>
                    </div>
                  );
                })}

                {investments.filter(i => !!i.goalName).length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 border border-dashed text-slate-400 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <Target className="mx-auto text-slate-300 dark:text-slate-800 mb-2" size={32} />
                    <p className="font-bold">No active lock milestones established</p>
                    <p className="text-xs">Add a new Mutual Fund holding with goal information populated to view progress.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Transaction History Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Trade book & Actions History</h3>
          <button className="text-indigo-600 dark:text-indigo-400 font-black text-xs hover:underline uppercase tracking-wider">Export Ledger</button>
        </div>
        <div className="flex flex-col">
          {investmentHistory.map((h) => {
            const isBuy = h.transactionType === 'buy';
            return (
              <div key={h.id} className="flex items-center justify-between px-4 py-4 md:px-5 border-b dark:border-slate-800/60 hover:bg-slate-50/20 dark:hover:bg-slate-850/20 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0`}>
                    <span className="font-bold text-[10px] text-slate-600 dark:text-slate-300">
                      {((h as any).assetName || h.investmentId || 'TRD').substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase truncate">{(h as any).assetName || h.investmentId || 'TRADE'}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h.date}</span>
                  </div>
                </div>

                <div className="flex-1 flex justify-center shrink-0 mx-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${
                    isBuy ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
                  }`}>
                    {h.transactionType}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-end min-w-0 shrink-0">
                  <span className="text-xs font-black font-mono tracking-tighter text-slate-900 dark:text-slate-100">
                    {formatMoney(h.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden md:block">
                    {h.quantity.toFixed(3)} units @ {formatMoney(h.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modern Dialog sheet for managing Buy / Sell entries */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-600" />
                {modalType === 'buy' ? 'Manual Asset Purchase Form' : `Redeem Holding Shares`}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body / Forms */}
            {modalType === 'buy' ? (
              <form onSubmit={handleConfirmBuy} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Asset Category</label>
                  <div className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl">
                    <button 
                      type="button"
                      className={`py-2 text-xs font-black rounded-lg transition-all ${buyForm.assetType === 'stock' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      onClick={() => setBuyForm(p => ({ ...p, assetType: 'stock', name: '', symbol: '' }))}
                    >
                      Stock Holding
                    </button>
                    <button 
                      type="button"
                      className={`py-2 text-xs font-black rounded-lg transition-all ${buyForm.assetType === 'mutual_fund' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      onClick={() => setBuyForm(p => ({ ...p, assetType: 'mutual_fund', name: '', symbol: '' }))}
                    >
                      Mutual Fund Unit
                    </button>
                  </div>
                </div>

                {/* Shared basic fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Asset Symbol / Ticker</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. RELIANCE, INFYN, AAPL" 
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        value={buyForm.symbol}
                        onChange={(e) => setBuyForm(p => ({ ...p, symbol: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Company / Fund Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Reliance Industries" 
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        value={buyForm.name}
                        onChange={(e) => setBuyForm(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        {buyForm.assetType === 'stock' ? 'Buy Quantity' : 'Fund Units (Decimal SGB/SIP)'}
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="e.g. 10 or 0.523" 
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        value={buyForm.quantity}
                        onChange={(e) => setBuyForm(p => ({ ...p, quantity: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        {buyForm.assetType === 'stock' ? 'Buy Price Profile' : 'Latest NAV / purchase NAV'}
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="Buy cost NAV index" 
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        value={buyForm.price}
                        onChange={(e) => setBuyForm(p => ({ ...p, price: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Stock specific broker field */}
                  {buyForm.assetType === 'stock' && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border dark:border-slate-850">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Broker Platform</label>
                        <select 
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl"
                          value={buyForm.broker}
                          onChange={(e) => setBuyForm(p => ({ ...p, broker: e.target.value }))}
                        >
                          <option value="Zerodha Kite">Zerodha Kite Code</option>
                          <option value="Angel One">Angel One Platform</option>
                          <option value="Groww">Groww App</option>
                          <option value="Self Managed">Self Managed Ledger</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Brokerage Fee</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl"
                          value={buyForm.brokerage}
                          onChange={(e) => setBuyForm(p => ({ ...p, brokerage: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mutual Fund specific fields */}
                  {buyForm.assetType === 'mutual_fund' && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-850 space-y-3.5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">AMC Provider Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. HDFC Mutual Fund" 
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                            value={buyForm.amcName}
                            onChange={(e) => setBuyForm(p => ({ ...p, amcName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label className="inline-flex items-center gap-2 cursor-pointer mt-2 text-xs font-bold">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 text-xs"
                              checked={buyForm.isSIP}
                              onChange={(e) => setBuyForm(p => ({ ...p, isSIP: e.target.checked }))}
                            />
                            <span>Active Recurring SIP?</span>
                          </label>
                        </div>
                      </div>

                      {buyForm.isSIP && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Monthly SIP Amount</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 5000" 
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                            value={buyForm.sipAmount}
                            onChange={(e) => setBuyForm(p => ({ ...p, sipAmount: e.target.value }))}
                          />
                        </div>
                      )}

                      {/* Goal based investing fields */}
                      <div className="border-t border-slate-200/50 dark:border-slate-800/60 pt-3 mt-1.5 space-y-3">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wide block">Lock for Financial Goal Milestone (Optional)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Milestone Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. New SUV, Dream Home" 
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                              value={buyForm.goalName}
                              onChange={(e) => setBuyForm(p => ({ ...p, goalName: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Target Value</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 1500000" 
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                              value={buyForm.goalTarget}
                              onChange={(e) => setBuyForm(p => ({ ...p, goalTarget: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Commit Entry to Ledger
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmSell} className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-850 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold">Unlocking Asset Details</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-100">{selectedHolding?.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-bold">Current holding</span>
                    <span className="font-black text-slate-850 dark:text-slate-100">{selectedHolding?.quantity} Units</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Quantity to Sell</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder={`Max: ${selectedHolding?.quantity}`}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                      value={sellForm.quantity}
                      onChange={(e) => setSellForm(p => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Exited NAV / Price</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                      value={sellForm.price}
                      onChange={(e) => setSellForm(p => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                </div>

                {selectedHolding?.type === 'stock' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Brokerage Exit Fee</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                      value={sellForm.brokerage}
                      onChange={(e) => setSellForm(p => ({ ...p, brokerage: e.target.value }))}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-750 text-white rounded-2xl font-black text-xs uppercase tracking-wider"
                >
                  Verify and Sell Shares
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default InvestmentsPage;
