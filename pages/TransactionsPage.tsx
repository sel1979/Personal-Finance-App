
import React, { useState, useMemo } from 'react';
import { useAppState } from '../App';
import { Plus, Search, Filter, Trash2, Edit2, ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { TransactionType } from '../types';

// Safe inline mathematical keypad calculator component
const MiniKeypadCalculator = ({ onApply, onClose, formatMoney }: { onApply: (val: string) => void; onClose: () => void; formatMoney: (n: number, p?: boolean) => string }) => {
  const [expr, setExpr] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const handleBtnClick = (val: string) => {
    if (val === 'C') {
      setExpr('');
    } else if (val === '⌫') {
      setExpr(prev => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
        const res = new Function(`return (${sanitized})`)();
        if (typeof res === 'number' && isFinite(res)) {
          const finalVal = parseFloat(res.toFixed(2));
          setHistory(prev => [...prev, `${expr} = ${finalVal}`]);
          setExpr(String(finalVal));
        } else {
          setExpr('Error');
        }
      } catch (e) {
        setExpr('Error');
      }
    } else {
      if (expr === 'Error') {
        setExpr(val);
      } else {
        setExpr(prev => prev + val);
      }
    }
  };

  const handleApply = () => {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
      const res = new Function(`return (${sanitized})`)();
      if (typeof res === 'number' && isFinite(res)) {
        onApply(String(parseFloat(res.toFixed(2))));
      } else {
        onApply(expr);
      }
    } catch {
      onApply(expr);
    }
    onClose();
  };

  const keys = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+']
  ];

  return (
    <div className="absolute top-16 left-0 right-0 bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-2xl z-[150] space-y-3.5 text-left animate-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1">
          🧮 Smart Accountant Calculator
        </span>
        <button 
          type="button" 
          onClick={onClose} 
          className="text-[10px] font-bold uppercase py-0.5 px-2 bg-gray-100 dark:bg-slate-900 hover:bg-gray-200 text-gray-500 rounded-lg cursor-pointer"
        >
          Close
        </button>
      </div>
      
      {/* Display bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 p-2.5 rounded-xl text-right overflow-hidden min-h-[46px] flex flex-col justify-between">
        <div className="text-[9px] font-semibold text-slate-400 truncate tracking-wide" style={{ minHeight: '12px' }}>
          {history[history.length - 1] || 'No calculation logged'}
        </div>
        <div className="text-lg font-black font-mono text-slate-900 dark:text-white truncate">
          {expr || '0'}
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid grid-cols-4 gap-2">
        {keys.map((row) => (
          row.map((btn) => {
            let color = 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100';
            if (btn === '=') color = 'bg-indigo-600 hover:bg-indigo-700 text-white font-black';
            else if (['/', '*', '-', '+'].includes(btn)) color = 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 font-black';
            
            return (
              <button
                key={btn}
                type="button"
                onClick={() => handleBtnClick(btn)}
                className={`p-2.5 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${color}`}
              >
                {btn}
              </button>
            );
          })
        ))}
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-gray-100 dark:border-slate-900">
        <button
          type="button"
          onClick={() => handleBtnClick('C')}
          className="p-2.5 bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 text-xs font-extrabold rounded-xl active:scale-95 cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => handleBtnClick('⌫')}
          className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 text-xs font-extrabold rounded-xl active:scale-95 cursor-pointer flex items-center justify-center"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl active:scale-95 cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  );
};

const TransactionsPage = () => {
  const { 
    transactions, addTransaction, deleteTransaction, 
    accounts = [],
    incomeCategories, expenseCategories, addIncomeCategory, addExpenseCategory, formatMoney,
    recurringTransactions, toggleRecurringTransaction
  } = useAppState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeView, setActiveView] = useState<'transactions' | 'recurring'>('transactions');

  // Form State
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: PAYMENT_METHODS[0],
    accountId: accounts[0]?.id || '',
    toAccountId: accounts[1]?.id || accounts[0]?.id || ''
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, filterType, filterCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    const sourceAcc = accounts.find(a => a.id === formData.accountId);
    const targetAcc = accounts.find(a => a.id === formData.toAccountId);

    if (formData.type === 'transfer') {
      if (!formData.accountId || !formData.toAccountId) {
        alert("Please set both source and target accounts for the transfer.");
        return;
      }
      if (formData.accountId === formData.toAccountId) {
        alert("Source and target accounts cannot be the same.");
        return;
      }
      addTransaction({
        type: 'transfer',
        amount: parseFloat(formData.amount),
        category: 'Transfer',
        date: formData.date,
        description: formData.description || `Transfer from ${sourceAcc?.name || 'Source'} to ${targetAcc?.name || 'Target'}`,
        paymentMethod: sourceAcc?.name || 'Transfer',
        accountId: formData.accountId,
        toAccountId: formData.toAccountId
      });
    } else {
      if (!formData.category) {
        alert("Please select a category.");
        return;
      }
      addTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        description: formData.description,
        paymentMethod: sourceAcc?.name || formData.paymentMethod,
        accountId: formData.accountId
      });
    }

    setIsModalOpen(false);
    setFormData({
      type: 'expense',
      amount: '',
      category: expenseCategories[0] || 'Food',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: PAYMENT_METHODS[0],
      accountId: accounts[0]?.id || '',
      toAccountId: accounts[1]?.id || accounts[0]?.id || ''
    });
  };

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="text-gray-500">Track and manage your daily income and expenses.</p>
        </div>
        <div className="flex gap-2">
          <div className="p-1 bg-white border border-gray-100 dark:border-slate-800 dark:bg-slate-900 rounded-xl flex gap-1 shadow-sm">
            <button 
              onClick={() => setActiveView('transactions')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${activeView === 'transactions' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              Ledger
            </button>
            <button 
              onClick={() => setActiveView('recurring')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${activeView === 'recurring' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              Recurring Bills
            </button>
          </div>
          <button 
            onClick={() => {
              setFormData(p => ({
                ...p,
                category: p.type === 'expense' ? expenseCategories[0] || 'Food' : incomeCategories[0] || 'Salary'
              }));
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 shrink-0"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Transaction</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {activeView === 'transactions' ? (
      <>
      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by description..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <select 
            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {[...incomeCategories, ...expenseCategories].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-slate-800/50 rounded-3xl border dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col space-y-0">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
              <Search size={32} className="text-slate-400"/>
            </div>
            <p className="font-semibold text-lg text-slate-900 dark:text-slate-100">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or add a new entry.</p>
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 md:px-6 md:py-5 border-b border-slate-100 dark:border-slate-700/50/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                  t.type === 'transfer' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-650 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {t.type === 'transfer' ? <span className="text-sm md:text-base font-extrabold font-mono">⇆</span> :
                   t.type === 'income' ? <ArrowUpRight size={20} className="sm:w-6 sm:h-6" /> : <ArrowDownRight size={20} className="sm:w-6 sm:h-6" />}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">{t.description}</p>
                    <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{t.category}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider">{t.date}</p>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden md:block"></span>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate hidden md:block">
                      {t.type === 'transfer' ? (
                        <span>{accounts.find(a => a.id === t.accountId)?.name || t.paymentMethod} → {accounts.find(a => a.id === t.toAccountId)?.name || 'Target'}</span>
                      ) : (accounts.find(a => a.id === t.accountId)?.name || t.paymentMethod)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                <span className={`text-sm md:text-base font-black font-mono tracking-tighter ${
                    t.type === 'transfer' ? 'text-indigo-600 dark:text-indigo-400' :
                    t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                  {t.type === 'transfer' ? '⇆ ' : t.type === 'income' ? '+ ' : '- '}{formatMoney(t.amount)}
                </span>
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => deleteTransaction(t.id)}
                    className="p-1 px-2 md:-mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-[10px] md:text-xs font-bold flex items-center justify-center gap-1"
                  >
                    Delete <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      ) : (
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col space-y-0 p-5 md:p-8">
           <h3 className="font-black text-xl mb-1 text-slate-900 dark:text-white">Active Recurring Mandates</h3>
           <p className="text-xs text-slate-500 mb-6 font-medium">Automatic billing cycles setup. They evaluate processing limits instantly on user access.</p>
           
           <div className="grid gap-3">
              {recurringTransactions.length === 0 ? (
                 <div className="text-center py-12 text-slate-500"><p>No recurring bills active.</p></div>
              ) : recurringTransactions.map(rt => {
                 let status = 'Inactive';
                 if (rt.active) status = 'Active';
                 const badgeColor = rt.active ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-slate-100 text-slate-500';

                 return (
                   <div key={rt.id} className="border dark:border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 flex-wrap dark:bg-slate-900/50 hover:border-indigo-200 transition-colors">
                      <div className="flex flex-col">
                         <span className={`text-[9px] w-max font-black uppercase tracking-widest px-2 py-0.5 rounded ${badgeColor}`}>{status}</span>
                         <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-1.5">{rt.description}</h4>
                         <p className="text-xs text-slate-400 font-medium">Runs {rt.frequency} • Next: <span className="text-slate-700 dark:text-slate-300 font-bold">{rt.nextDate}</span></p>
                      </div>
                      <div className="flex gap-4 items-center w-full md:w-auto mt-2 md:mt-0">
                         <div className="text-left md:text-right flex-1 md:flex-none">
                            <span className={`block font-black text-lg ${rt.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{rt.type === 'income' ? '+' : '-'}{formatMoney(rt.amount)}</span>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{rt.category}</span>
                         </div>
                         <div className="shrink-0 flex gap-2 ml-auto">
                             <button
                               onClick={() => toggleRecurringTransaction(rt.id, !rt.active)}
                               className={`p-2 border dark:border-slate-700 rounded-lg transition-colors shadow-sm cursor-pointer ${rt.active ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50' : 'bg-white dark:bg-slate-800 hover:bg-slate-50'}`}
                               title={rt.active ? "Pause" : "Resume"}
                             >
                                <span className={`text-xs font-black px-1 ${rt.active ? 'text-indigo-600' : 'text-slate-400'}`}>{rt.active ? 'Pause' : 'Resume'}</span>
                             </button>
                         </div>
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold">Add New Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {/* Type Toggle */}
              <div className="flex p-0.5 bg-gray-100 rounded-2xl">
                <button 
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${formData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: incomeCategories[0] || 'Salary' }))}
                >
                  Income
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: expenseCategories[0] || 'Food' }))}
                >
                  Expense
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${formData.type === 'transfer' ? 'bg-white text-indigo-650 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'transfer', category: 'Transfer' }))}
                >
                  Transfer
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-gray-700">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{formatMoney(0, true)}</span>
                    <input 
                      type="number" 
                      required
                      placeholder="0.00" 
                      className="w-full pl-8 pr-11 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCalculator(!showCalculator)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                      title="Open mathematical calculator tool"
                    >
                      🧮
                    </button>
                  </div>
                  {showCalculator && (
                    <MiniKeypadCalculator 
                      onApply={(val) => setFormData(prev => ({ ...prev, amount: val }))}
                      onClose={() => setShowCalculator(false)}
                      formatMoney={formatMoney}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              {formData.type !== 'transfer' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center select-none">
                    <label className="text-xs font-semibold text-gray-700">Category</label>
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase">Custom category capability</span>
                  </div>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Direct inline category creator box */}
                  <div className="flex gap-2 items-center mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <input 
                      type="text" 
                      id="inner-cat-add"
                      placeholder="Type new category..." 
                      className="flex-grow px-3 py-2 bg-white border border-gray-250 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-550"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.currentTarget as HTMLInputElement).value.trim();
                          if (val) {
                            if (formData.type === 'income') {
                              addIncomeCategory(val);
                              setFormData(prev => ({ ...prev, category: val }));
                            } else {
                              addExpenseCategory(val);
                              setFormData(prev => ({ ...prev, category: val }));
                            }
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const inp = document.getElementById('inner-cat-add') as HTMLInputElement;
                        const val = inp?.value.trim() || '';
                        if (val) {
                          if (formData.type === 'income') {
                            addIncomeCategory(val);
                            setFormData(prev => ({ ...prev, category: val }));
                          } else {
                            addExpenseCategory(val);
                            setFormData(prev => ({ ...prev, category: val }));
                          }
                          if (inp) inp.value = '';
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-705 text-white font-bold text-[10px] px-3.5 py-2.5 rounded-xl shrink-0 cursor-pointer"
                    >
                      + Add New
                    </button>
                  </div>
                </div>
              )}

              {formData.type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-gray-750">From (Source)</label>
                    <select 
                      required
                      className="w-full px-3 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
                      value={formData.accountId}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-gray-755">To (Destination)</label>
                    <select 
                      required
                      className="w-full px-3 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
                      value={formData.toAccountId}
                      onChange={(e) => setFormData(prev => ({ ...prev, toAccountId: e.target.value }))}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 border-t border-slate-50 pt-2.5 text-left">
                  <label className="text-xs font-semibold text-gray-700">Payment Account / Source</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Description</label>
                <input 
                  type="text"
                  placeholder="Memo context (e.g. Self transfer, coffee shop, etc.)" 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-primary-gradient text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-[1.01] transition-transform active:scale-100 mt-2 cursor-pointer"
              >
                Save Transaction Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
