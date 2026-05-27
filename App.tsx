
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  TrendingUp, 
  PieChart, 
  Settings, 
  Menu, 
  X, 
  Wallet,
  Plus,
  LogOut,
  ChevronRight,
  User,
  Bell,
  Search,
  Download,
  Filter,
  Sparkles,
  Phone,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Battery,
  Wifi,
  Signal,
  RotateCcw,
  Sparkle,
  MessageSquare,
  Eye,
  Settings2,
  HelpCircle,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { 
  Transaction, 
  Investment, 
  InvestmentTransaction, 
  Budget, 
  UserSettings,
  Account
} from './types';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import InvestmentsPage from './pages/InvestmentsPage';
import BudgetPage from './pages/BudgetPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import AIInsights from './pages/AIInsights';
import HubPage from './pages/HubPage';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from './constants';
import { useFirebaseSync } from './firebase-sync';

// Context for global state
interface AppState {
  transactions: Transaction[];
  investments: Investment[];
  investmentHistory: InvestmentTransaction[];
  budgets: Budget[];
  settings: UserSettings;
  accounts: Account[];
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  deleteInvestment: (id: string) => void;
  sellInvestment: (id: string, qty: number, price: number) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
  updateSettings: (s: UserSettings) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccountBalance: (id: string, newBalance: number) => void;
  // Dynamic categories
  incomeCategories: string[];
  expenseCategories: string[];
  addIncomeCategory: (cat: string) => void;
  addExpenseCategory: (cat: string) => void;
  deleteIncomeCategory: (cat: string) => void;
  deleteExpenseCategory: (cat: string) => void;
  // Dynamic currency formatting
  formatMoney: (amount: number, prefixOnly?: boolean) => string;
  // Auth state
  signedUser: { email: string; name: string } | null;
  doSignUp: (name: string, email: string, pass?: string) => Promise<void>;
  doSignIn: (email: string, pass?: string) => Promise<void>;
  doSignOut: () => void;
  // Simulated Gmail Backup
  gmailBackups: { id: string; email: string; date: string; summary: string; data: string }[];
  triggerGmailBackup: (email: string) => void;
  restoreFromGmail: (id: string) => boolean;
  importLocalBackup: (jsonData: string) => boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
};

// standalone synthesize sound for acoustic haptics without external file requirements
const playHapticSound = (type: 'tap' | 'lock' | 'notify' | 'volume') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'tap') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'lock') {
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'notify') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'volume') {
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    }
  } catch (e) {
    // Browsers block audio until custom interactions
  }
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('wf_transactions');
    return saved ? JSON.parse(saved) : [
      { id: 't1', type: 'income', amount: 5000, category: 'Salary', date: '2026-05-01', description: 'Monthly Paycheck', paymentMethod: 'Bank Transfer', createdAt: '2026-05-01T09:00:00Z' },
      { id: 't2', type: 'expense', amount: 120, category: 'Food', date: '2026-05-18', description: 'Whole Foods Groceries', paymentMethod: 'Credit Card', createdAt: '2026-05-18T18:30:00Z' },
      { id: 't3', type: 'expense', amount: 48, category: 'Transport', date: '2026-05-19', description: 'Gas refill', paymentMethod: 'Debit Card', createdAt: '2026-05-19T11:20:00Z' },
      { id: 't4', type: 'expense', amount: 85, category: 'Entertainment', date: '2026-05-20', description: 'Movie night tickets', paymentMethod: 'Mobile Wallet', createdAt: '2026-05-20T21:00:00Z' }
    ];
  });
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('wf_investments');
    return saved ? JSON.parse(saved) : [
      { id: 'inv1', type: 'stock', name: 'Reliance Industries', symbol: 'RELIANCE', quantity: 10, buyPrice: 2450.0, buyDate: '2026-01-15', currentPrice: 2870.5, brokerage: 20, broker: 'Zerodha Kite', notes: 'Heavyweight energy & telecom holding' },
      { id: 'inv2', type: 'stock', name: 'Tata Motors Ltd', symbol: 'TATAMOTORS', quantity: 25, buyPrice: 610.0, buyDate: '2026-02-10', currentPrice: 940.3, brokerage: 15, broker: 'Angel One', notes: 'EV market leader' },
      { id: 'inv3', type: 'mutual_fund', name: 'Parag Parikh Flexi Cap Fund Direct', symbol: 'PPFLEXICAP', quantity: 245.81, buyPrice: 55.4, buyDate: '2026-01-05', currentPrice: 68.1, broker: 'Groww', amcName: 'Parag Parikh Mutual Fund', isSIP: true, sipAmount: 5000, nav: 68.1, purchaseDate: '2026-01-05', goalName: 'Retirement Corpus', goalTarget: 5000000 },
      { id: 'inv4', type: 'mutual_fund', name: 'HDFC Top 100 Fund Direct Growth', symbol: 'HDFCTOP100', quantity: 120.45, buyPrice: 85.2, buyDate: '2026-02-12', currentPrice: 98.4, broker: 'Groww', amcName: 'HDFC Mutual Fund', isSIP: false, nav: 98.4, purchaseDate: '2026-02-12', goalName: 'Car Downpayment', goalTarget: 800000 },
      { id: 'inv5', type: 'gold', name: 'Sovereign Gold Bond 2026', symbol: 'SGB2026', quantity: 5, buyPrice: 6200, buyDate: '2026-03-01', currentPrice: 7150, broker: 'Zerodha Kite', notes: 'Tax-free interest hedge' }
    ];
  });
  const [investmentHistory, setInvestmentHistory] = useState<InvestmentTransaction[]>(() => {
    const saved = localStorage.getItem('wf_inv_history');
    return saved ? JSON.parse(saved) : [
      { id: 'ih1', investmentId: 'inv1', transactionType: 'buy', quantity: 10, price: 2450.0, date: '2026-01-15', totalAmount: 24500.0 },
      { id: 'ih2', investmentId: 'inv2', transactionType: 'buy', quantity: 25, price: 610.0, date: '2026-02-10', totalAmount: 15250.0 },
      { id: 'ih3', investmentId: 'inv3', transactionType: 'buy', quantity: 245.81, price: 55.4, date: '2026-01-05', totalAmount: 13617.87 },
      { id: 'ih4', investmentId: 'inv4', transactionType: 'buy', quantity: 120.45, price: 85.2, date: '2026-02-12', totalAmount: 10262.34 },
      { id: 'ih5', investmentId: 'inv5', transactionType: 'buy', quantity: 5, price: 6200, date: '2026-03-01', totalAmount: 31000.0 }
    ];
  });
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('wf_budgets');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('wf_settings');
    return saved ? JSON.parse(saved) : { currency: 'INR', darkMode: false, name: 'Aniket Sharma' };
  });

  // Dynamic user-customized Categories
  const [incomeCategories, setIncomeCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('wf_custom_income_cats');
    return saved ? JSON.parse(saved) : INCOME_CATEGORIES;
  });
  
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('wf_custom_expense_cats');
    return saved ? JSON.parse(saved) : EXPENSE_CATEGORIES;
  });

  // Live Authentication State
  const [signedUser, setSignedUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('wf_signed_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Simulated Gmail backups inside user profile
  const [gmailBackups, setGmailBackups] = useState<{ id: string; email: string; date: string; summary: string; data: string }[]>(() => {
    const saved = localStorage.getItem('wf_gmail_backups');
    return saved ? JSON.parse(saved) : [];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('wf_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'acc_cash', name: 'Cash Wallet', type: 'cash', balance: 15000 },
      { id: 'acc_sbi', name: 'SBI Bank Account', type: 'bank', balance: 120000, accountNo: 'XXXX-9821' },
      { id: 'acc_hdfc', name: 'HDFC UPI Account', type: 'upi', balance: 8500, accountNo: 'araga@okhdfcbank' },
      { id: 'acc_groww', name: 'Zerodha Ledger', type: 'investment', balance: 50000 }
    ];
  });

  // Keep saved credentials mock
  useEffect(() => {
    localStorage.setItem('wf_transactions', JSON.stringify(transactions));
    localStorage.setItem('wf_investments', JSON.stringify(investments));
    localStorage.setItem('wf_inv_history', JSON.stringify(investmentHistory));
    localStorage.setItem('wf_budgets', JSON.stringify(budgets));
    localStorage.setItem('wf_settings', JSON.stringify(settings));
    localStorage.setItem('wf_custom_income_cats', JSON.stringify(incomeCategories));
    localStorage.setItem('wf_custom_expense_cats', JSON.stringify(expenseCategories));
    localStorage.setItem('wf_gmail_backups', JSON.stringify(gmailBackups));
    localStorage.setItem('wf_accounts', JSON.stringify(accounts));
    if (signedUser) {
      localStorage.setItem('wf_signed_user', JSON.stringify(signedUser));
    } else {
      localStorage.removeItem('wf_signed_user');
    }
  }, [transactions, investments, investmentHistory, budgets, settings, incomeCategories, expenseCategories, signedUser, gmailBackups, accounts]);

  const {
    isSynchronizing,
    performGoogleLogin,
    performSignIn,
    performSignUp,
    performLogout,
    fbSaveTransaction,
    fbDeleteTransaction,
    fbSaveInvestment,
    fbDeleteInvestment,
    fbSaveHistory,
    fbSaveAccount,
    fbUpdateSettings
  } = useFirebaseSync(
    signedUser,
    setSignedUser,
    setTransactions,
    setInvestments,
    setInvestmentHistory,
    setAccounts,
    setSettings
  );

  // Auth Operations
  const doSignIn = async (email: string, pass?: string) => {
    if (pass) {
        await performSignIn(email, pass);
    } else {
        await performGoogleLogin();
    }
  };

  const doSignUp = async (name: string, email: string, pass?: string) => {
    if (pass) {
        await performSignUp(email, pass, name);
    } else {
        await performGoogleLogin();
    }
  };

  const doSignOut = async () => {
    await performLogout();
    setSignedUser(null);
  };

  // Gmail Sync Backup and Restore Implementation
  const triggerGmailBackup = (email: string) => {
    const backupPayload = JSON.stringify({
      transactions,
      investments,
      investmentHistory,
      budgets,
      settings,
      incomeCategories,
      expenseCategories
    });
    
    const summaryText = `${transactions.length} Tx, ${investments.length} Assets, ${budgets.length} Budgets`;
    
    const newBackup = {
      id: 'bak_' + Date.now(),
      email,
      date: new Date().toLocaleString(),
      summary: summaryText,
      data: backupPayload
    };

    setGmailBackups(prev => [newBackup, ...prev]);
  };

  const restoreFromGmail = (id: string): boolean => {
    const bkp = gmailBackups.find(b => b.id === id);
    if (!bkp) return false;
    try {
      const parsed = JSON.parse(bkp.data);
      if (parsed.transactions) setTransactions(parsed.transactions);
      if (parsed.investments) setInvestments(parsed.investments);
      if (parsed.investmentHistory) setInvestmentHistory(parsed.investmentHistory);
      if (parsed.budgets) setBudgets(parsed.budgets);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.incomeCategories) setIncomeCategories(parsed.incomeCategories);
      if (parsed.expenseCategories) setExpenseCategories(parsed.expenseCategories);
      return true;
    } catch {
      return false;
    }
  };

  const importLocalBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.transactions) setTransactions(parsed.transactions);
      if (parsed.investments) setInvestments(parsed.investments);
      if (parsed.investmentHistory) setInvestmentHistory(parsed.investmentHistory);
      if (parsed.budgets) setBudgets(parsed.budgets);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.incomeCategories) setIncomeCategories(parsed.incomeCategories);
      if (parsed.expenseCategories) setExpenseCategories(parsed.expenseCategories);
      return true;
    } catch {
      return false;
    }
  };

  const addIncomeCategory = (cat: string) => {
    if (!cat || incomeCategories.includes(cat)) return;
    setIncomeCategories(prev => [...prev, cat]);
  };

  const addExpenseCategory = (cat: string) => {
    if (!cat || expenseCategories.includes(cat)) return;
    setExpenseCategories(prev => [...prev, cat]);
  };

  const deleteIncomeCategory = (cat: string) => {
    setIncomeCategories(prev => prev.filter(c => c !== cat));
  };

  const deleteExpenseCategory = (cat: string) => {
    setExpenseCategories(prev => prev.filter(c => c !== cat));
  };

  // CENTRAL MONEY FORMATTER
  const formatMoney = (amount: number, prefixOnly?: boolean): string => {
    const isINR = settings.currency === 'INR';
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥'
    };
    const prefix = currencyMap[settings.currency] || '$';
    if (prefixOnly) return prefix;

    if (isINR) {
      // Standard Indian Formatting (Lakhs & Crores format)
      try {
        const x = amount.toFixed(2).split('.');
        let lastThree = x[0].substring(x[0].length - 3);
        const otherNumbers = x[0].substring(0, x[0].length - 3);
        if (otherNumbers !== '') {
          lastThree = ',' + lastThree;
        }
        const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
        const dec = x[1] && x[1] !== '00' ? '.' + x[1] : '';
        return `${prefix}${res}${dec}`;
      } catch {
        return `${prefix}${amount.toLocaleString('en-IN')}`;
      }
    }
    
    return `${prefix}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const addAccount = (acc: Omit<Account, 'id'>) => {
    setAccounts(prev => [...prev, { ...acc, id: 'acc_' + Date.now() }]);
  };

  const updateAccountBalance = (id: string, newBalance: number) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, balance: newBalance } : a));
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setTransactions(prev => [newTransaction, ...prev]);
    fbSaveTransaction(newTransaction);

    // Perform account balance updates if not an opening ledger
    if (!t.isOpeningPortfolio) {
      if (t.type === 'transfer') {
        setAccounts(prev => prev.map(acc => {
          if (acc.id === t.accountId) {
            const upd = { ...acc, balance: acc.balance - t.amount }; fbSaveAccount(upd); return upd;
          }
          if (acc.id === t.toAccountId) {
            const upd = { ...acc, balance: acc.balance + t.amount }; fbSaveAccount(upd); return upd;
          }
          return acc;
        }));
      } else if (t.accountId) {
        setAccounts(prev => prev.map(acc => {
          if (acc.id === t.accountId) {
            const delta = t.type === 'income' ? t.amount : -t.amount;
            const upd = { ...acc, balance: acc.balance + delta }; fbSaveAccount(upd); return upd;
          }
          return acc;
        }));
      }
    }
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (target && !target.isOpeningPortfolio) {
      if (target.type === 'transfer') {
        setAccounts(prev => prev.map(acc => {
          if (acc.id === target.accountId) {
            const upd = { ...acc, balance: acc.balance + target.amount }; fbSaveAccount(upd); return upd;
          }
          if (acc.id === target.toAccountId) {
            const upd = { ...acc, balance: acc.balance - target.amount }; fbSaveAccount(upd); return upd;
          }
          return acc;
        }));
      } else if (target.accountId) {
        setAccounts(prev => prev.map(acc => {
          if (acc.id === target.accountId) {
            const delta = target.type === 'income' ? -target.amount : target.amount;
            const upd = { ...acc, balance: acc.balance + delta }; fbSaveAccount(upd); return upd;
          }
          return acc;
        }));
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
    fbDeleteTransaction(id);
  };

  const addInvestment = (i: Omit<Investment, 'id'>) => {
    const totalCost = i.quantity * i.buyPrice;
    
    // Check if the investment already exists by matching symbol and type (ignores casing)
    const existingIndex = investments.findIndex(
      inv => inv.symbol.toUpperCase() === i.symbol.toUpperCase() && inv.type === i.type
    );
    
    let targetInvId = '';
    
    if (existingIndex !== -1) {
      const existing = investments[existingIndex];
      const newQty = existing.quantity + i.quantity;
      const newTotalCost = (existing.quantity * existing.buyPrice) + totalCost;
      const newAvgBuyPrice = newTotalCost / newQty;
      
      const updatedInv = {
        ...existing,
        quantity: newQty,
        buyPrice: newAvgBuyPrice,
        nav: i.nav || i.buyPrice,
        currentPrice: i.currentPrice || i.buyPrice,
        buyDate: i.buyDate // set to latest date
      };
      
      setInvestments(prev => {
        const copy = [...prev];
        copy[existingIndex] = updatedInv;
        return copy;
      });
      targetInvId = existing.id;
    } else {
      const newId = crypto.randomUUID();
      const newInv: Investment = { ...i, id: newId };
      setInvestments(prev => [...prev, newInv]);
      targetInvId = newId;
    }
    
    const hist: InvestmentTransaction = {
      id: crypto.randomUUID(),
      investmentId: targetInvId,
      transactionType: 'buy',
      quantity: i.quantity,
      price: i.buyPrice,
      date: i.buyDate,
      totalAmount: totalCost
    };
    setInvestmentHistory(prev => [hist, ...prev]);

    // Handle account deduction & central ledger logging
    if (!i.isOpeningBalance) {
      if (i.paymentAccountId) {
        setAccounts(prev => prev.map(acc => {
          if (acc.id === i.paymentAccountId) {
            return { ...acc, balance: acc.balance - totalCost };
          }
          return acc;
        }));
      }
      
      const accountName = accounts.find(a => a.id === i.paymentAccountId)?.name || i.broker || 'Investment Account';
      const desc = `Invested in ${i.name} (${i.symbol}) - ${i.isSIP ? 'SIP' : 'Lump Sum'}`;
      
      // Add custom transaction inside spending ledger to reflect investment expense
      const ledgerTx: Transaction = {
        id: crypto.randomUUID(),
        type: 'expense',
        amount: totalCost,
        category: 'Investment',
        date: i.buyDate,
        description: desc,
        paymentMethod: accountName,
        accountId: i.paymentAccountId,
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [ledgerTx, ...prev]);
    } else {
      // For Opening balanceEntries we log a zero-deduction transaction item
      const ledgerTx: Transaction = {
        id: crypto.randomUUID(),
        type: 'income',
        amount: totalCost,
        category: 'Investment',
        date: i.buyDate,
        description: `Opening portfolio balance: ${i.name} (${i.symbol})`,
        paymentMethod: 'Opening Balance Portfolio',
        createdAt: new Date().toISOString(),
        isOpeningPortfolio: true
      };
      setTransactions(prev => [ledgerTx, ...prev]);
    }
  };

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    setInvestmentHistory(prev => prev.filter(h => h.id !== id));
  };

  const sellInvestment = (id: string, qty: number, price: number) => {
    // ... sell logic below

    const target = investments.find(inv => inv.id === id);
    setInvestments(prev => prev.map(inv => {
      if (inv.id === id) {
        return { ...inv, quantity: inv.quantity - qty };
      }
      return inv;
    }).filter(inv => inv.quantity > 0));

    const totalRevenue = qty * price;

    const hist: InvestmentTransaction = {
      id: crypto.randomUUID(),
      investmentId: id,
      transactionType: 'sell',
      quantity: qty,
      price: price,
      date: new Date().toISOString().split('T')[0],
      totalAmount: totalRevenue
    };
    setInvestmentHistory(prev => [hist, ...prev]);

    // Log the cash inflow in transactions and add to account if linked
    if (target) {
      const paymentAccount = target.paymentAccountId || 'acc_cash';
      setAccounts(prev => prev.map(acc => {
        if (acc.id === paymentAccount) {
          return { ...acc, balance: acc.balance + totalRevenue };
        }
        return acc;
      }));

      const accountName = accounts.find(a => a.id === paymentAccount)?.name || 'Account';
      const ledgerTx: Transaction = {
        id: crypto.randomUUID(),
        type: 'income',
        amount: totalRevenue,
        category: 'Investment',
        date: new Date().toISOString().split('T')[0],
        description: `Sold ${qty} units of ${target.name} (${target.symbol})`,
        paymentMethod: accountName,
        accountId: paymentAccount,
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [ledgerTx, ...prev]);
    }
  };

  const addBudget = (b: Omit<Budget, 'id'>) => {
    setBudgets(prev => [{ ...b, id: crypto.randomUUID() }, ...prev]);
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const updateSettings = (s: UserSettings) => setSettings(s);

  const value = {
    transactions,
    investments,
    investmentHistory,
    budgets,
    settings,
    accounts,
    addTransaction,
    deleteTransaction,
    addInvestment,
    deleteInvestment,
    sellInvestment,
    addBudget,
    deleteBudget,
    updateSettings,
    addAccount,
    updateAccountBalance,
    incomeCategories,
    expenseCategories,
    addIncomeCategory,
    addExpenseCategory,
    deleteIncomeCategory,
    deleteExpenseCategory,
    formatMoney,
    signedUser,
    doSignUp,
    doSignIn,
    doSignOut,
    gmailBackups,
    triggerGmailBackup,
    restoreFromGmail,
    importLocalBackup
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const AuthView = ({ onBypass, soundEnabled }: { onBypass: () => void; soundEnabled: boolean }) => {
  const { doSignIn, doSignUp } = useAppState();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorWord, setErrorWord] = useState('');
  const [simLoading, setSimLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (soundEnabled) playHapticSound('tap');
    setSimLoading(true);
    try {
        await doSignIn('', ''); // pass empty, it behaves as google login
    } catch (e: any) {
        setErrorWord(e.message);
    }
    setSimLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWord('');
    if (!email || !password || (tab === 'signup' && !name)) {
        setErrorWord('Please fill in all details');
        return;
    }
    if (soundEnabled) playHapticSound('tap');
    setSimLoading(true);
    
    try {
        if (tab === 'signup') {
            await doSignUp(name, email, password);
        } else {
            await doSignIn(email, password);
        }
    } catch (e: any) {
        setErrorWord(e.message);
    }
    
    setSimLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-200 p-6 justify-center animate-in fade-in duration-300">
      <div className="space-y-6 max-w-sm mx-auto w-full py-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center border border-indigo-500/20 mx-auto">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">WealthFlow Secure</h2>
          <p className="text-xs text-slate-400">Sign Up or Sign In to sync across endpoints</p>
        </div>

        {/* Tab Header */}
        <div className="flex p-1 bg-slate-900 rounded-2xl">
          <button 
            type="button"
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'signin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => { if (soundEnabled) playHapticSound('tap'); setTab('signin'); setErrorWord(''); }}
          >
            Sign In Account
          </button>
          <button 
            type="button"
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => { if (soundEnabled) playHapticSound('tap'); setTab('signup'); setErrorWord(''); }}
          >
            Register
          </button>
        </div>

        {errorWord && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs text-red-500 text-center font-semibold">
            {errorWord}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {tab === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
              <input 
                type="text" required placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-white transition-all outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
            <input 
              type="email" required placeholder="user@example.com"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-white transition-all outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
            <input 
              type="password" required placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-white transition-all outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" disabled={simLoading}
            className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 duration-200 outline-none"
          >
            {simLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>{tab === 'signin' ? 'Sign In Securely' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">or continue with</span>
            <div className="flex-grow border-t border-slate-800/80"></div>
        </div>

        <button 
          type="button" onClick={handleGoogleLogin} disabled={simLoading}
          className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm cursor-pointer outline-none"
        >
          {simLoading ? (
             <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
          ) : (
             <>
               <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.61 0 3.05.55 4.19 1.63l3.12-3.12C17.38 1.62 14.88 1 12 1 7.37 1 3.4 3.63 1.45 7.46l3.87 3a7.02 7.02 0 0 1 6.68-5.42z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46a5.53 5.53 0 0 1-2.4 3.63v3.02h3.87c2.27-2.09 3.56-5.17 3.56-8.76z"/>
                  <path fill="#FBBC05" d="M5.32 14.31A7.05 7.05 0 0 1 4.9 12c0-.81.14-1.59.4-2.31L1.44 6.7A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.28 5.4l4.04-3.09z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.87-3.02c-1.07.72-2.45 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97L1.38 16.3A11.98 11.98 0 0 0 12 23z"/>
               </svg>
               <span>Google</span>
             </>
          )}
        </button>

        <div className="text-center pt-2">
          <button 
            type="button" onClick={onBypass}
            className="text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-widest cursor-pointer underline"
          >
            Skip & Enter as Guest (Offline)
          </button>
        </div>
      </div>
    </div>
  );
};

// Security Passcode circular numerical lock screen overlay
const PasscodeOverlay = ({ 
  correctPasscode, 
  userName, 
  onUnlock, 
  soundEnabled 
}: { 
  correctPasscode: string; 
  userName: string; 
  onUnlock: () => void; 
  soundEnabled: boolean;
}) => {
  const [typed, setTyped] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num: string) => {
    setErrorMsg('');
    if (typed.length < 4) {
      const next = typed + num;
      setTyped(next);
      if (next === correctPasscode) {
        onUnlock();
      } else if (next.length === 4) {
        setTimeout(() => {
          setErrorMsg('Incorrect Security PIN! Please retype.');
          setTyped('');
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    setTyped(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setTyped('');
    setErrorMsg('');
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-12 z-[190] bg-slate-950 text-white flex flex-col justify-between p-6 select-none animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 pt-2">
        <div className="p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full animate-bounce">
          <Lock size={28} />
        </div>
        
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-white tracking-tight">Security PIN Required</h2>
          <p className="text-[10px] text-slate-400 font-medium">Please enter your 4-digit code to access assets</p>
        </div>

        {/* Indicators */}
        <div className="flex justify-center items-center gap-4 py-2">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                typed.length > i 
                  ? 'bg-indigo-500 border-indigo-500 scale-125 shadow shadow-indigo-500/50' 
                  : 'border-slate-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-[10px] text-red-400 font-extrabold bg-red-950/40 border border-red-900/40 py-1 px-3 rounded-lg">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Numeric Grid with circular buttons */}
      <div className="grid grid-cols-3 gap-y-3.5 gap-x-6 max-w-[210px] mx-auto pb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="w-13 h-13 rounded-full bg-slate-900 hover:bg-slate-850 text-base font-bold border border-slate-800/45 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] font-black uppercase text-slate-500 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          Clear
        </button>
        
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="w-13 h-13 rounded-full bg-slate-900 hover:bg-slate-850 text-base font-bold border border-slate-800/45 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          0
        </button>
        
        <button
          type="button"
          onClick={handleBackspace}
          className="text-[10px] font-black uppercase text-slate-500 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          Del
        </button>
      </div>

      <p className="text-center text-[8px] text-slate-500 font-mono tracking-widest leading-none pb-2">
        WEALTHFLOW ENCRYPTED CONTAINER
      </p>
    </div>
  );
};

// Safe mini keypad calculator component
const MiniKeypadCalculator = ({ onApply, onClose, formatMoney }: { onApply: (val: string) => void; onClose: () => void; formatMoney: (n: number, p?: boolean) => string }) => {
  const [expr, setExpr] = useState('');

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
          setExpr(String(parseFloat(res.toFixed(1))));
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
    <div className="absolute top-14 left-0 right-0 bg-white dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl z-[220] space-y-2 text-left animate-in slide-in-from-top-2 duration-200">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-650 dark:text-indigo-400">
          Smart Calc
        </span>
        <button 
          type="button" 
          onClick={onClose} 
          className="text-[9px] font-black uppercase tracking-wider py-0.5 px-1.5 bg-gray-100 dark:bg-slate-900 text-gray-400 rounded cursor-pointer"
        >
          Close
        </button>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-right font-mono text-xs font-black text-slate-900 dark:text-white truncate">
        {expr || '0'}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {keys.map((row) => (
          row.map((btn) => (
            <button
              key={btn}
              type="button"
              onClick={() => handleBtnClick(btn)}
              className="p-2 text-[10px] font-bold rounded-lg bg-gray-55 dark:bg-slate-900 hover:bg-gray-100 text-slate-800 dark:text-white cursor-pointer active:scale-95 transition-transform"
            >
              {btn}
            </button>
          ))
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-gray-100 dark:border-slate-900">
        <button
          type="button"
          onClick={() => handleBtnClick('C')}
          className="p-1.5 bg-red-50 text-red-600 font-bold text-[10px] rounded"
        >
          C
        </button>
        <button
          type="button"
          onClick={() => handleBtnClick('⌫')}
          className="p-1.5 bg-amber-50 text-amber-600 font-bold text-[10px] rounded"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="p-1.5 bg-emerald-600 text-white font-black text-[10px] rounded"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { 
    settings, updateSettings, addTransaction, addInvestment, investments, transactions,
    incomeCategories, expenseCategories, formatMoney, signedUser, accounts
  } = useAppState();

  // Bypassed Guest Login State
  const [bypassAuth, setBypassAuth] = useState(false);
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);
  const [showQuickAddCalc, setShowQuickAddCalc] = useState(false);

  // Mode & configuration and haptic preference
  const [viewMode, setViewMode] = useState<'simulator' | 'full'>('simulator');
  const [deviceColor, setDeviceColor] = useState<'titanium' | 'obsidian' | 'blue' | 'purple'>('titanium');
  const [zoomScale, setZoomScale] = useState<number>(0.85); // optimized default for laptops
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(75);
  const [showVolumeRinger, setShowVolumeRinger] = useState<boolean>(false);
  const [ringerTimer, setRingerTimer] = useState<NodeJS.Timeout | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Dynamic status parameters
  const [realClock, setRealClock] = useState<string>('09:41');
  const [realDate, setRealDate] = useState<string>('Friday, June 14');

  // Slide-up bottom sheets
  const [isFABSheetOpen, setIsFABSheetOpen] = useState<boolean>(false);
  const [fabSheetView, setFABSheetView] = useState<'options' | 'transaction' | 'asset'>('options');

  // Push notification state
  const [activeNotification, setActiveNotification] = useState<{title: string; desc: string; link: string} | null>(null);

  // Lockscreen Customization Backgrounds
  const [wallpaper, setWallpaper] = useState<'cyber' | 'rose' | 'ocean' | 'obsidian'>('cyber');

  // Quick Forms State
  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense' | 'transfer',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: PAYMENT_METHODS[0],
    accountId: 'acc_cash',
    toAccountId: 'acc_sbi'
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    symbol: '',
    type: 'stock',
    quantity: '',
    buyPrice: '',
    isSIP: false,
    sipAmount: '',
    sipDate: '1',
    sipFrequency: 'Monthly',
    paymentAccountId: 'acc_cash',
    isOpeningBalance: false,
    amcName: '',
    goalName: '',
    goalTarget: ''
  });

  // Calculate local physical time in formatted style
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const isAm = hours < 12;
      const hoursStr = String(hours % 12 || 12).padStart(2, '0');
      setRealClock(`${hoursStr}:${minutes}`);
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      setRealDate(now.toLocaleDateString('en-US', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const adjustVolume = (direction: 'up' | 'down') => {
    if (soundEnabled) playHapticSound('volume');
    setVolume(prev => {
      const newVal = direction === 'up' ? Math.min(prev + 10, 100) : Math.max(prev - 10, 0);
      return newVal;
    });
    setShowVolumeRinger(true);
    if (ringerTimer) clearTimeout(ringerTimer);
    const timer = setTimeout(() => setShowVolumeRinger(false), 2000);
    setRingerTimer(timer);
  };

  const handleDeviceLock = () => {
    if (soundEnabled) playHapticSound('lock');
    setIsLocked(p => !p);
  };

  const triggerNotificationAlert = (title: string, desc: string, targetLink: string) => {
    if (soundEnabled) playHapticSound('notify');
    setActiveNotification({ title, desc, link: targetLink });
    setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  };

  // Navigations configuration inside mobile client
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { label: '', path: '#add', icon: Plus, isFAB: true },
    { label: 'Investments', path: '/investments', icon: TrendingUp },
    { label: 'Analytics', path: '/reports', icon: PieChart },
    { label: 'Profile', path: '/hub', icon: User }
  ];

  const handleNavClick = (isFABClick?: boolean) => {
    if (soundEnabled) playHapticSound('tap');
    if (isFABClick) {
      setFABSheetView('options');
      // Autofill default category
      setTxForm(p => ({
        ...p,
        category: p.type === 'expense' ? expenseCategories[0] || 'Food' : incomeCategories[0] || 'Salary'
      }));
      setIsFABSheetOpen(true);
    }
  };

  const handleQuickTxSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount) return;
    if (txForm.type !== 'transfer' && !txForm.category) return;
    
    const targetAccount = accounts.find(a => a.id === txForm.accountId);
    let accountLabel = targetAccount ? targetAccount.name : txForm.paymentMethod;

    if (txForm.type === 'transfer') {
      const destAccount = accounts.find(a => a.id === txForm.toAccountId);
      accountLabel = `${targetAccount?.name || 'Sender'} ➔ ${destAccount?.name || 'Receiver'}`;
    }

    addTransaction({
      type: txForm.type,
      amount: parseFloat(txForm.amount),
      category: txForm.type === 'transfer' ? 'Transfer' : txForm.category,
      date: txForm.date,
      description: txForm.description || (txForm.type === 'transfer' ? `Transfer to ${accounts.find(a => a.id === txForm.toAccountId)?.name || 'Account'}` : txForm.category),
      paymentMethod: accountLabel,
      accountId: txForm.accountId,
      toAccountId: txForm.type === 'transfer' ? txForm.toAccountId : undefined
    });
    setTxForm({
      type: 'expense',
      amount: '',
      category: expenseCategories[0] || 'Food',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: PAYMENT_METHODS[0],
      accountId: 'acc_cash',
      toAccountId: accounts.find(a => a.id !== 'acc_cash')?.id || 'acc_sbi'
    });
    setIsFABSheetOpen(false);
    triggerNotificationAlert('Transaction Logged!', `Successfully added your ${formatMoney(parseFloat(txForm.amount))} ${txForm.type} entry!`, '/transactions');
  };

  const handleQuickAssetSave = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = parseFloat(assetForm.quantity);
    const buyPrice = parseFloat(assetForm.buyPrice);
    if (!assetForm.name || !assetForm.symbol || quantity <= 0 || buyPrice <= 0) return;

    addInvestment({
      name: assetForm.name,
      symbol: assetForm.symbol.toUpperCase(),
      type: assetForm.type as any,
      quantity,
      buyPrice,
      buyDate: new Date().toISOString().split('T')[0],
      currentPrice: buyPrice * (1 + (Math.random() * 0.16 - 0.08)), // Simulated start fluctuations
      broker: 'WealthFlow Mobile',
      amcName: assetForm.amcName || undefined,
      isSIP: assetForm.isSIP,
      sipAmount: assetForm.isSIP ? parseFloat(assetForm.sipAmount) : undefined,
      sipDate: assetForm.isSIP ? assetForm.sipDate : undefined,
      sipFrequency: assetForm.isSIP ? assetForm.sipFrequency : undefined,
      paymentAccountId: assetForm.paymentAccountId,
      isOpeningBalance: assetForm.isOpeningBalance,
      goalName: assetForm.goalName || undefined,
      goalTarget: assetForm.goalTarget ? parseFloat(assetForm.goalTarget) : undefined
    });

    setAssetForm({
      name: '',
      symbol: '',
      type: 'stock',
      quantity: '',
      buyPrice: '',
      isSIP: false,
      sipAmount: '',
      sipDate: '1',
      sipFrequency: 'Monthly',
      paymentAccountId: 'acc_cash',
      isOpeningBalance: false,
      amcName: '',
      goalName: '',
      goalTarget: ''
    });
    setIsFABSheetOpen(false);
    triggerNotificationAlert('Asset Registered!', `Successfully logged your holding of ${quantity} units of ${assetForm.symbol.toUpperCase()}!`, '/investments');
  };

  const wallpapers = {
    cyber: 'bg-gradient-to-tr from-slate-950 via-indigo-900 to-purple-950',
    rose: 'bg-gradient-to-tr from-stone-900 via-rose-950 to-pink-950',
    ocean: 'bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950',
    obsidian: 'bg-gradient-to-br from-neutral-950 via-neutral-900 to-zinc-950',
  };

  const ringerPercent = Math.round(volume);

  const isAuthRequired = signedUser === null && !bypassAuth;

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden transition-colors`}>
      
      {/* Dynamic Top Workspace Toolbar */}
      <header className="w-full bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/25">
            <Wallet className="text-indigo-400 animate-pulse" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              FinanceTracker Pro <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 px-2 py-0.5 rounded-full">Mobile Sandbox v2.4</span>
            </h1>
            <p className="text-xs text-slate-400">High-Fidelity Interactive Mobile Design Simulator</p>
          </div>
        </div>

        {/* Master Format Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl flex">
            <button 
              onClick={() => { if (soundEnabled) playHapticSound('tap'); setViewMode('simulator'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'simulator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Phone size={14} />
              <span>Mobile Device Mockup</span>
            </button>
            <button 
              onClick={() => { if (soundEnabled) playHapticSound('tap'); setViewMode('full'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'full' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Eye size={14} />
              <span>Full Screen Web-App</span>
            </button>
          </div>

          <button 
            onClick={() => setSoundEnabled(s => !s)}
            className={`p-2.5 rounded-xl border transition-colors ${soundEnabled ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
            title="Toggle haptic beep simulator sounds"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0 bg-slate-950/40 relative">
        
        {/* Left Side: Control Deck Bar (Visible in simulator mode to allow sandbox manipulation) */}
        {viewMode === 'simulator' && (
          <aside className="w-full lg:w-80 border-b lg:border-r lg:border-b-0 border-slate-900 bg-slate-950/60 p-6 flex flex-col gap-6 shrink-0 lg:overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={14} /> Sim Control Deck
              </h3>
              <p className="text-xs text-slate-400 mt-1">Simulate real-world conditions inside WealthFlow.</p>
            </div>

            {/* Chassis Finishes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Titanium Chassis Color</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'titanium', hex: 'bg-zinc-400', name: 'Natural' },
                  { id: 'obsidian', hex: 'bg-zinc-800', name: 'Obsidian' },
                  { id: 'blue', hex: 'bg-slate-600', name: 'Blue' },
                  { id: 'purple', hex: 'bg-indigo-900', name: 'Ultra' }
                ].map(clr => (
                  <button 
                    key={clr.id}
                    title={clr.name}
                    onClick={() => { if (soundEnabled) playHapticSound('tap'); setDeviceColor(clr.id as any); }}
                    className={`h-10 rounded-xl border flex items-center justify-center transition-all ${deviceColor === clr.id ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                  >
                    <span className={`w-4 h-4 rounded-full ${clr.hex}`}></span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Alerts Deck */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Trigger Mock Notifications</label>
              <div className="space-y-1.5">
                <button 
                  onClick={() => triggerNotificationAlert('💸 Category Limit Alert', 'You have burned 82% of your food budget milestone!', '/budgets')}
                  className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800/80 p-3 rounded-xl text-xs flex items-center gap-3 group transition-all"
                >
                  <MessageSquare size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-bold text-slate-200">Budget Overrun Alert</p>
                    <p className="text-[10px] text-slate-500">Fast warning overlay</p>
                  </div>
                </button>

                <button 
                  onClick={() => triggerNotificationAlert('🚀 Market Spike Report', 'AAPL is up 4.8% on higher volume today.', '/investments')}
                  className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800/80 p-3 rounded-xl text-xs flex items-center gap-3 group transition-all"
                >
                  <MessageSquare size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-bold text-slate-200">Portfolio Growth Report</p>
                    <p className="text-[10px] text-slate-500">Ticker signal update</p>
                  </div>
                </button>

                <button 
                  onClick={() => triggerNotificationAlert('🧠 AI Spend Insight', 'Dining out patterns changed. Run an auto-audit?', '/ai-insights')}
                  className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800/80 p-3 rounded-xl text-xs flex items-center gap-3 group transition-all"
                >
                  <MessageSquare size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-bold text-slate-200">Gemini Advisory Note</p>
                    <p className="text-[10px] text-slate-500">Live AI analysis model</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Lockscreen Wallpaper Panel */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Device Wallpaper Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cyber', label: 'Neon Cyber' },
                  { id: 'rose', label: 'Dusty Rose' },
                  { id: 'ocean', label: 'Deep Ocean' },
                  { id: 'obsidian', label: 'Obsidian Black' }
                ].map(w => (
                  <button 
                    key={w.id}
                    onClick={() => { if (soundEnabled) playHapticSound('tap'); setWallpaper(w.id as any); }}
                    className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${wallpaper === w.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-850 bg-slate-900/30 text-slate-400 hover:text-slate-300'}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scaler Panel */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Simulator Scale</span>
                <span className="text-indigo-400 font-bold">{Math.round(zoomScale * 100)}%</span>
              </label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                <button onClick={() => setZoomScale(s => Math.max(s - 0.05, 0.7))} className="p-1.5 hover:bg-slate-800 rounded-lg text-xs font-bold shrink-0">-</button>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.1" 
                  step="0.05"
                  value={zoomScale} 
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500" 
                />
                <button onClick={() => setZoomScale(s => Math.min(s + 0.05, 1.1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-xs font-bold shrink-0">+</button>
              </div>
            </div>

            {/* Key Actions */}
            <div className="pt-4 border-t border-slate-900/80 flex flex-col gap-2">
              <button 
                onClick={handleDeviceLock}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{isLocked ? 'Wake / Unlock Screen' : 'Simulate Power (Sleep)'}</span>
              </button>
            </div>
          </aside>
        )}

        {/* Center Canvas Workspace: Renders phone or fullscreen app */}
        <main className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-auto min-h-0 bg-slate-950/80">
          
          {viewMode === 'simulator' ? (
            /* ==========================================================
               PHONE SIMULATOR WRAPPER
               ========================================================== */
            <div 
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              className="relative select-none transition-transform duration-300 flex items-center justify-center py-4 origin-center"
            >
              {/* iPhone Hardware Outer Bezel Box */}
              <div className={`relative rounded-[56px] p-4 bg-slate-950 border-[6px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-all duration-300 ${
                deviceColor === 'titanium' ? 'border-zinc-500/80 shadow-zinc-950/40' :
                deviceColor === 'obsidian' ? 'border-zinc-800 shadow-black' :
                deviceColor === 'blue' ? 'border-slate-750' :
                'border-indigo-950/80 shadow-indigo-950/10'
              }`}>
                {/* Simulated Hard Buttons */}
                {/* Volume Buttons Left */}
                <button 
                  onClick={() => adjustVolume('up')}
                  className="absolute left-[-10px] top-32 w-1.5 h-16 bg-neutral-700/80 hover:bg-neutral-600 rounded-l-md transition-colors border-l border-neutral-800 z-10"
                ></button>
                <button 
                  onClick={() => adjustVolume('down')}
                  className="absolute left-[-10px] top-52 w-1.5 h-16 bg-neutral-700/80 hover:bg-neutral-600 rounded-l-md transition-colors border-l border-neutral-800 z-10"
                ></button>
                {/* Power Lock Button Right */}
                <button 
                  onClick={handleDeviceLock}
                  className="absolute right-[-10px] top-40 w-1.5 h-20 bg-neutral-700/80 hover:bg-neutral-600 rounded-r-md transition-colors border-r border-neutral-800 z-10"
                ></button>

                {/* iPhone Screen Frame Area */}
                <div className={`w-[390px] h-[844px] rounded-[42px] overflow-hidden relative ${settings.darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col shadow-[inset_0_0_12px_rgba(0,0,0,0.4)] border border-neutral-900 select-text`}>
                  
                  {/* SIMULATED PHONE LOCK STATE SCREEN */}
                  {isLocked ? (
                    <div className={`absolute inset-0 z-[200] ${wallpapers[wallpaper]} flex flex-col text-white animate-fade-in`}>
                      {/* Top status bar items but larger for Lock Screen */}
                      <header className="px-10 pt-12 flex justify-between items-center relative z-20">
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          <Lock size={12} className="text-white/80" /> Secured
                        </span>
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Signal size={14} />
                          <Wifi size={14} />
                          <Battery size={16} />
                        </div>
                      </header>

                      {/* Lock Screen Time Clock */}
                      <div className="flex-1 flex flex-col items-center justify-start pt-12 relative z-20">
                        <p className="text-white/90 font-medium tracking-wide text-sm">{realDate}</p>
                        <h2 className="text-7xl font-light tracking-tighter text-white mt-1 select-none font-bold tabular-nums">
                          {realClock}
                        </h2>

                        {/* Glassmorphic Net Worth Mini Widget */}
                        <div className="mt-8 px-6 py-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl w-[290px] shadow-lg shadow-black/10">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Total Net Assets</p>
                          <div className="flex justify-between items-end mt-1">
                            <span className="text-2xl font-black">${(transactions.filter(t=>t.type==='income').reduce((a,c)=>a+c.amount,0) - transactions.filter(t=>t.type==='expense').reduce((a,c)=>a+c.amount,0) + investments.reduce((a,c)=>a+(c.quantity*c.currentPrice),0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
                              +12.4% <SparklingIcon size={12} />
                            </span>
                          </div>
                        </div>

                        {/* Glassmorphic Quick Notification in Lockscreen if active */}
                        {activeNotification && (
                          <div className="mt-4 mx-6 p-4 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-md w-[290px] shadow-md animate-in slide-in-from-top-4 duration-300">
                            <div className="flex gap-2.5 items-start">
                              <div className="bg-indigo-600/30 p-1.5 rounded-lg border border-indigo-400/30">
                                <Sparkles size={14} className="text-indigo-200" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-white leading-tight">{activeNotification.title}</p>
                                <p className="text-[10px] text-white/70 leading-normal mt-0.5">{activeNotification.desc}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Unlock Swipe Indicator */}
                      <div className="p-8 pb-12 flex flex-col items-center justify-end z-20">
                        <button 
                          onClick={() => { if (soundEnabled) playHapticSound('tap'); setIsLocked(false); }}
                          className="w-14 h-14 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full flex items-center justify-center animate-bounce shadow-lg cursor-pointer transition-all"
                        >
                          <Unlock size={20} className="text-white" />
                        </button>
                        <p className="text-[11px] font-bold text-slate-300 tracking-wider uppercase mt-3">
                          Tap Lock Icon to Unlock
                        </p>
                      </div>

                      {/* Subtle Wallpaper mesh layout */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_120%,rgba(99,102,241,0.15),transparent_60%)] z-10"></div>
                    </div>
                  ) : null}

                  {/* ==========================================================
                     INNER WORKING SMARTPHONE CORE APPLICATION
                     ========================================================== */}
                  {/* Dynamic Apple status bar */}
                  <div className="h-12 bg-white dark:bg-slate-950 flex items-center justify-between px-8 text-xs font-bold shrink-0 select-none z-[110] relative text-slate-900 dark:text-slate-100">
                    <span className="tabular-nums">{realClock}</span>
                    
                    {/* Dynamic Island Shape Bezel */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-3.5 w-[110px] h-[30px] bg-black rounded-full z-50 flex items-center justify-center transition-all">
                      {/* Dynamic Island Notification Drop Simulation */}
                      {activeNotification ? (
                        <div className="absolute top-0 w-[350px] bg-slate-950/95 border border-slate-800 text-white rounded-3xl p-4 flex items-center gap-3 shadow-2xl animate-in zoom-in-75 duration-300 translate-y-2.5 left-[-120px] z-[210] backdrop-blur-xl">
                          <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20">
                            <Sparkle size={20} className="animate-spin duration-3000" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h4 className="font-bold text-xs truncate">{activeNotification.title}</h4>
                            <p className="text-[10px] text-slate-300 truncate mt-0.5">{activeNotification.desc}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 scale-90">
                      <Signal size={12} />
                      <Wifi size={12} />
                      <Battery size={14} className="text-slate-800 dark:text-slate-200" />
                    </div>
                  </div>

                  {/* iOS Style Action Ringer HUD (Slide from Left when volume changes) */}
                  {showVolumeRinger && (
                    <div className="absolute left-3 top-24 z-[120] bg-black/90 p-2.5 rounded-2xl flex flex-col items-center gap-2 border border-slate-800/60 shadow-xl animate-in slide-in-from-left-4 duration-200 backdrop-blur-md">
                      <Volume2 size={14} className="text-white" />
                      <div className="w-1.5 h-16 bg-neutral-800 rounded-full relative overflow-hidden">
                        <div 
                          className="w-full bg-white absolute bottom-0 left-0 transition-all rounded-full" 
                          style={{ height: `${ringerPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-white font-extrabold tabular-nums">{ringerPercent}%</span>
                    </div>
                  )}

                  {/* Mobile Web View Header Wrapper inside phone screen */}
                  <header className="h-14 bg-white dark:bg-slate-950 border-b dark:border-slate-900 flex items-center justify-between px-5 shrink-0 z-30 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary-gradient p-1.5 rounded-lg text-white">
                        <Wallet size={16} />
                      </div>
                      <span className="font-extrabold tracking-tight text-sm text-slate-900 dark:text-white">FinanceTracker Pro</span>
                    </div>

                    {/* Quick user avatar */}
                    <div className="flex items-center gap-3">
                      {/* Sun / Moon Light Mode Toggle */}
                      <button
                        onClick={() => {
                          if (soundEnabled) playHapticSound('tap');
                          updateSettings({ ...settings, darkMode: !settings.darkMode });
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center border border-transparent dark:border-slate-800"
                        title="Toggle dark/light theme"
                      >
                        {settings.darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-650" />}
                      </button>

                      <div className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] border border-indigo-100/30">
                        {settings.currency}
                      </div>
                      <div 
                        onClick={() => { if (soundEnabled) playHapticSound('tap'); window.location.hash = '#/hub'; }}
                        className="w-8 h-8 rounded-full border-2 border-indigo-500 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                      >
                        <img src={`https://picsum.photos/seed/${settings.name}/100/100`} alt="Avatar" />
                      </div>
                    </div>
                  </header>

                  {/* SCREEN BODY - SCROLLABLE PAGE AREA */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 transition-colors relative">
                    {isAuthRequired ? (
                      <AuthView onBypass={() => setBypassAuth(true)} soundEnabled={soundEnabled} />
                    ) : settings.passcodeEnabled && settings.passcode && !isPasscodeUnlocked ? (
                      <PasscodeOverlay 
                        correctPasscode={settings.passcode} 
                        userName={settings.name} 
                        onUnlock={() => setIsPasscodeUnlocked(true)} 
                        soundEnabled={soundEnabled} 
                      />
                    ) : (
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/transactions" element={<TransactionsPage />} />
                        <Route path="/investments" element={<InvestmentsPage />} />
                        <Route path="/budgets" element={<BudgetPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/ai-insights" element={<AIInsights />} />
                        <Route path="/hub" element={<HubPage />} />
                      </Routes>
                    )}
                  </div>

                  {/* ==========================================================
                     STIKY NATIVE iOS-LIKE BOTTOM NAVIGATION TAB BAR
                     ========================================================== */}
                  <nav className="h-20 bg-white/95 dark:bg-slate-950/95 border-t dark:border-slate-900 flex items-center justify-around px-2 shrink-0 z-40 backdrop-blur-md pb-5 select-none text-slate-900 dark:text-slate-100">
                    {navItems.map((item, idx) => {
                      const isActive = location.pathname === item.path;
                      
                      if (item.isFAB) {
                        return (
                          <div key="fab-holder" className="flex items-center justify-center -translate-y-3.5 relative z-50 w-12 h-12 shrink-0">
                            <button 
                              onClick={() => handleNavClick(true)}
                              className="w-14 h-14 absolute bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer border-4 border-white dark:border-slate-950"
                              title="Register new transaction/asset"
                            >
                              <Plus size={24} className="hover:rotate-90 transition-transform duration-300" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <Link 
                          key={item.path} 
                          to={item.path}
                          onClick={() => handleNavClick(false)}
                          className="flex flex-col items-center justify-center flex-1 py-1 relative cursor-pointer"
                        >
                          <item.icon 
                            size={20} 
                            className={`transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`} 
                          />
                          <span className={`text-[9px] font-black mt-1 transition-colors ${isActive ? 'text-indigo-605 dark:text-indigo-400 font-extrabold' : 'text-slate-450 dark:text-slate-400'}`}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Home Swipe Bar Indicator */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-neutral-300/85 dark:bg-slate-800 rounded-full z-50"></div>
                </div>
              </div>
            </div>
          ) : (
            /* ==========================================================
               FLUID RESPONSIVE MOBILE & TABLET CLIENT FRAME
               ========================================================== */
            <div className={`w-full max-w-6xl mx-auto min-h-screen lg:min-h-[calc(100vh-2rem)] lg:my-4 shadow-2xl relative flex flex-col overflow-hidden lg:rounded-3xl border border-slate-800 ${settings.darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-white text-slate-850'}`}>
              
              {/* Core Header */}
              <header className="h-16 bg-white dark:bg-slate-950 border-b dark:border-slate-900 flex items-center justify-between px-6 shrink-0 z-30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="bg-primary-gradient p-2 rounded-xl text-white">
                    <Wallet size={18} />
                  </div>
                  <span className="font-extrabold tracking-tight text-lg text-slate-900 dark:text-white">FinanceTracker Pro</span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Sun / Moon Light Mode Toggle */}
                  <button
                    onClick={() => {
                      if (soundEnabled) playHapticSound('tap');
                      updateSettings({ ...settings, darkMode: !settings.darkMode });
                    }}
                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center border border-transparent dark:border-slate-800"
                    title="Toggle dark/light theme"
                  >
                    {settings.darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-650" />}
                  </button>

                  <div className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] border border-indigo-100/30">
                    {settings.currency}
                  </div>
                  <div 
                    onClick={() => { if (soundEnabled) playHapticSound('tap'); window.location.hash = '#/hub'; }}
                    className="w-10 h-10 rounded-full border-2 border-indigo-500 overflow-hidden cursor-pointer"
                  >
                    <img src={`https://picsum.photos/seed/${settings.name}/100/100`} alt="Avatar" />
                  </div>
                </div>
              </header>

              {/* Push alert banner */}
              {activeNotification && (
                <div className="mx-4 mt-4 p-4 bg-slate-950 border border-slate-800 text-white rounded-2xl flex gap-3 shadow-lg animate-in slide-in-from-top-4 duration-300 backdrop-blur-md z-40">
                  <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-bold text-xs truncate">{activeNotification.title}</h4>
                    <p className="text-[10px] text-slate-300 truncate mt-0.5">{activeNotification.desc}</p>
                  </div>
                </div>
              )}

              {/* Scrollable workspace content */}
              <div className="flex-1 overflow-y-auto p-5 pb-24 bg-slate-50 dark:bg-slate-900 transition-colors relative">
                {isAuthRequired ? (
                  <AuthView onBypass={() => setBypassAuth(true)} soundEnabled={soundEnabled} />
                ) : settings.passcodeEnabled && settings.passcode && !isPasscodeUnlocked ? (
                  <PasscodeOverlay 
                    correctPasscode={settings.passcode} 
                    userName={settings.name} 
                    onUnlock={() => setIsPasscodeUnlocked(true)} 
                    soundEnabled={soundEnabled} 
                  />
                ) : (
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/investments" element={<InvestmentsPage />} />
                    <Route path="/budgets" element={<BudgetPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/ai-insights" element={<AIInsights />} />
                    <Route path="/hub" element={<HubPage />} />
                  </Routes>
                )}
              </div>

               {/* Standard mobile bottom navigation tab bar */}
               <nav className="fixed bottom-0 lg:absolute left-1/2 -translate-x-1/2 w-full h-20 bg-white/95 dark:bg-slate-950/95 border-t dark:border-slate-900 flex items-center justify-around md:justify-center md:gap-8 px-4 z-50 backdrop-blur-md pb-4 text-slate-900 dark:text-slate-100">
                 {navItems.map((item) => {
                   const isActive = location.pathname === item.path;
                   
                   if (item.isFAB) {
                     return (
                       <div key="fab-holder-fs" className="flex items-center justify-center -translate-y-3.5 relative z-50 w-12 h-12 shrink-0">
                         <button 
                           onClick={() => handleNavClick(true)}
                           className="w-14 h-14 absolute bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer border-4 border-white dark:border-slate-950"
                           title="Add entry"
                         >
                           <Plus size={24} className="hover:rotate-90 transition-transform duration-300" />
                         </button>
                       </div>
                     );
                   }
 
                   return (
                     <Link 
                       key={item.path} 
                       to={item.path}
                       onClick={() => handleNavClick(false)}
                       className="flex flex-col items-center justify-center flex-1 py-1"
                     >
                       <item.icon 
                         size={20} 
                         className={`transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`} 
                       />
                       <span className={`text-[9px] font-black mt-1 transition-colors ${isActive ? 'text-indigo-605 dark:text-indigo-400 font-extrabold' : 'text-slate-450 dark:text-slate-400'}`}>
                         {item.label}
                       </span>
                     </Link>
                   );
                 })}
               </nav>
            </div>
          )}

          {/* ==========================================================
             NATIVE-STYLE GLASS BOTTOM SHEET SELECTOR MODAL (FAB Overlay)
             ========================================================== */}
          {isFABSheetOpen && (
            <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[250] flex items-end justify-center animate-in fade-in duration-200">
              {/* Outer sheet backplate clicker */}
              <div className="absolute inset-0" onClick={() => setIsFABSheetOpen(false)}></div>
              
              {/* Physical sliding slide pane */}
              <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-t-[32px] border-t border-neutral-100 dark:border-slate-800 p-6 shadow-2xl relative z-[260] animate-in slide-in-from-bottom-24 duration-300 flex flex-col max-h-[92vh] overflow-y-auto">
                
                {/* Visual iOS drag notch */}
                <span className="w-12 h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full mx-auto mb-6 shrink-0"></span>

                {/* Switchable Sheet Internal Views */}
                {fabSheetView === 'options' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quick Actions</h3>
                      <p className="text-xs text-slate-400 mt-1">Add transaction logs or investment assets instantly.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { if (soundEnabled) playHapticSound('tap'); setFABSheetView('transaction'); }}
                        className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 p-6 rounded-2xl border border-indigo-100/20 text-center flex flex-col items-center gap-3 active:scale-95 transition-all text-slate-800 dark:text-indigo-300"
                      >
                        <div className="p-3 bg-indigo-600 text-white rounded-xl">
                          <ArrowLeftRight size={22} />
                        </div>
                        <span className="text-xs font-bold font-sans">New Transaction</span>
                      </button>

                      <button 
                        onClick={() => { if (soundEnabled) playHapticSound('tap'); setFABSheetView('asset'); }}
                        className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 p-6 rounded-2xl border border-emerald-100/20 text-center flex flex-col items-center gap-3 active:scale-95 transition-all text-slate-800 dark:text-emerald-300"
                      >
                        <div className="p-3 bg-emerald-600 text-white rounded-xl">
                          <TrendingUp size={22} />
                        </div>
                        <span className="text-xs font-bold font-sans">Register Asset</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => setIsFABSheetOpen(false)}
                      className="w-full py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center pt-4"
                    >
                      Dismiss Sheet
                    </button>
                  </div>
                )}

                {/* Sub-view: Quick Add Transaction */}
                {fabSheetView === 'transaction' && (
                  <div className="animate-in fade-in">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Log Transaction</h3>
                      <button 
                        onClick={() => setFABSheetView('options')}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 py-1 px-3 rounded-lg"
                      >
                        Back
                      </button>
                    </div>

                    <form onSubmit={handleQuickTxSave} className="space-y-4 text-left">
                      {/* Sub-type toggle */}
                      <div className="flex p-1 bg-neutral-100 dark:bg-slate-900 rounded-xl shrink-0 gap-1">
                        <button 
                          type="button"
                          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${txForm.type === 'expense' ? 'bg-white dark:bg-slate-800 text-red-655 shadow' : 'text-slate-400'}`}
                          onClick={() => setTxForm(p => ({ ...p, type: 'expense', category: expenseCategories[0] || 'Food' }))}
                        >
                          Expense
                        </button>
                        <button 
                          type="button"
                          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${txForm.type === 'income' ? 'bg-white dark:bg-slate-800 text-green-655 shadow' : 'text-slate-400'}`}
                          onClick={() => setTxForm(p => ({ ...p, type: 'income', category: incomeCategories[0] || 'Salary' }))}
                        >
                          Income
                        </button>
                        <button 
                          type="button"
                          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${txForm.type === 'transfer' ? 'bg-white dark:bg-slate-800 text-indigo-650 shadow' : 'text-slate-400'}`}
                          onClick={() => setTxForm(p => ({ ...p, type: 'transfer', category: 'Transfer' }))}
                        >
                          Transfer
                        </button>
                      </div>

                       <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 relative">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                              {formatMoney(0, true)}
                            </span>
                            <input 
                              type="number" required placeholder="0.00"
                              className="w-full pl-7 pr-10 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                              value={txForm.amount}
                              onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => setShowQuickAddCalc(!showQuickAddCalc)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Open integrated calculator"
                            >
                              🧮
                            </button>
                            {showQuickAddCalc && (
                              <MiniKeypadCalculator 
                                onApply={(val) => setTxForm(p => ({ ...p, amount: val }))}
                                onClose={() => setShowQuickAddCalc(false)}
                                formatMoney={formatMoney}
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</label>
                          <input 
                            type="date" required
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={txForm.date}
                            onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))}
                          />
                        </div>
                      </div>

                      {txForm.type !== 'transfer' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                          <select 
                            required
                            className="w-full px-3 py-3 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={txForm.category}
                            onChange={e => setTxForm(p => ({ ...p, category: e.target.value }))}
                          >
                            <option value="">Select category</option>
                            {(txForm.type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {txForm.type === 'transfer' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From (Debited Account)</label>
                            <select 
                              required
                              className="w-full px-2 py-3 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                              value={txForm.accountId}
                              onChange={e => setTxForm(p => ({ ...p, accountId: e.target.value }))}
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({formatMoney(acc.balance)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To (Credited Account)</label>
                            <select 
                              required
                              className="w-full px-2 py-3 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                              value={txForm.toAccountId}
                              onChange={e => setTxForm(p => ({ ...p, toAccountId: e.target.value }))}
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({formatMoney(acc.balance)})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Account / Source</label>
                          <select 
                            required
                            className="w-full px-3 py-3 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={txForm.accountId}
                            onChange={e => setTxForm(p => ({ ...p, accountId: e.target.value }))}
                          >
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({formatMoney(acc.balance)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Memo Description</label>
                        <input 
                          type="text" placeholder="Coffee shop, utilities, salary payment, etc."
                          className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                          value={txForm.description}
                          onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))}
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-primary-gradient text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-[0.99] transition-transform"
                      >
                        Save Ledger Entry
                      </button>
                    </form>
                  </div>
                )}

                {/* Sub-view: Quick Add Invest Asset */}
                {fabSheetView === 'asset' && (
                  <div className="animate-in fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Register Portfolio Asset</h3>
                      <button 
                        onClick={() => setFABSheetView('options')}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 py-1 px-3 rounded-lg"
                      >
                        Back
                      </button>
                    </div>

                    <form onSubmit={handleQuickAssetSave} className="space-y-3.5 text-left">
                      {/* Asset Type Select */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Category Class</label>
                          <select 
                            required
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.type}
                            onChange={e => setAssetForm(p => ({ ...p, type: e.target.value }))}
                          >
                            <option value="stock">Equity Stock</option>
                            <option value="mutual_fund">Mutual Fund</option>
                            <option value="crypto">Cryptocurrency</option>
                            <option value="etf">Index ETF</option>
                            <option value="bond">Fixed Bond</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Account / Source</label>
                          <select 
                            required
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            disabled={assetForm.isOpeningBalance}
                            value={assetForm.paymentAccountId}
                            onChange={e => setAssetForm(p => ({ ...p, paymentAccountId: e.target.value }))}
                          >
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({formatMoney(acc.balance)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Header Title & Symbol */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Asset Title</label>
                          <input 
                            type="text" required placeholder="e.g. Parag Parikh Flexi or Reliance"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.name}
                            onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Symbol</label>
                          <input 
                            type="text" required placeholder="RELIANCE, BTC"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.symbol}
                            onChange={e => setAssetForm(p => ({ ...p, symbol: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* AMC Name if Mutual Fund */}
                      {assetForm.type === 'mutual_fund' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">AMC Provider Name</label>
                          <input 
                            type="text" placeholder="e.g. Nippon India Mutual Fund"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.amcName}
                            onChange={e => setAssetForm(p => ({ ...p, amcName: e.target.value }))}
                          />
                        </div>
                      )}

                      {/* Mode: SIP vs Lump Sum toggle */}
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl space-y-3 border border-neutral-100/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350">SIP Mode Automation</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={assetForm.isSIP}
                              onChange={e => setAssetForm(p => ({ ...p, isSIP: e.target.checked }))}
                            />
                            <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        {assetForm.isSIP && (
                          <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mb-1">SIP Amount</label>
                              <input 
                                type="number" placeholder="5000"
                                className="w-full px-2 py-2 bg-neutral-100 dark:bg-slate-950 rounded-lg text-xs text-slate-950 dark:text-white"
                                value={assetForm.sipAmount}
                                onChange={e => setAssetForm(p => ({ ...p, sipAmount: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mb-1">SIP Date & Freq</label>
                              <div className="flex gap-1">
                                <select 
                                  className="w-1/2 px-1 py-1.5 bg-neutral-100 dark:bg-slate-950 rounded-lg text-xs"
                                  value={assetForm.sipDate}
                                  onChange={e => setAssetForm(p => ({ ...p, sipDate: e.target.value }))}
                                >
                                  {[1,5,10,15,20,25].map(d => <option key={d} value={d}>Day {d}</option>)}
                                </select>
                                <select 
                                  className="w-1/2 px-1 py-1.5 bg-neutral-100 dark:bg-slate-950 rounded-lg text-[10px]"
                                  value={assetForm.sipFrequency}
                                  onChange={e => setAssetForm(p => ({ ...p, sipFrequency: e.target.value }))}
                                >
                                  <option value="Weekly">Weekly</option>
                                  <option value="Monthly">Monthly</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Shares Quantity & Acquisition Price */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Shares/Units Purchased</label>
                          <input 
                            type="number" step="any" required placeholder="e.g. 15.228"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.quantity}
                            onChange={e => setAssetForm(p => ({ ...p, quantity: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">NAV / Price ({formatMoney(0, true)})</label>
                          <input 
                            type="number" step="any" required placeholder="0.00"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.buyPrice}
                            onChange={e => setAssetForm(p => ({ ...p, buyPrice: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Goals Association */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Attach Financial Goal</label>
                          <input 
                            type="text" placeholder="e.g. Retirement Corpus"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
                            value={assetForm.goalName}
                            onChange={e => setAssetForm(p => ({ ...p, goalName: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Goal Target ({formatMoney(0, true)})</label>
                          <input 
                            type="number" placeholder="5000000"
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            value={assetForm.goalTarget}
                            onChange={e => setAssetForm(p => ({ ...p, goalTarget: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Opening Balance Investment checkbox */}
                      <div className="flex items-center gap-2.5 py-1.5 px-3 bg-indigo-550/10 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl shrink-0">
                        <input 
                          type="checkbox" 
                          id="opening-balance-buy"
                          className="rounded text-indigo-650 accent-indigo-500"
                          checked={assetForm.isOpeningBalance}
                          onChange={e => setAssetForm(p => ({ ...p, isOpeningBalance: e.target.checked }))}
                        />
                        <label htmlFor="opening-balance-buy" className="text-[10px] md:text-xs text-slate-600 dark:text-indigo-300 font-semibold cursor-pointer select-none leading-tight">
                          Opening Balance Entry (No cash account deduction)
                        </label>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-primary-gradient text-white rounded-2xl font-bold mt-2 shadow-lg active:scale-[0.99] transition-transform"
                      >
                        Confirm Purchase holding
                      </button>
                    </form>
                  </div>
                )}
                
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

// Helper Sparkle layout wrapper component
const SparklingIcon = ({ size, className }: { size: number, className?: string }) => {
  return (
    <Sparkles size={size} className={`${className || ''} animate-pulse text-yellow-300`} />
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </AppProvider>
  );
}

