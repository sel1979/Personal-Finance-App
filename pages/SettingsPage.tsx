import React, { useState } from 'react';
import { useAppState } from '../App';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Globe, 
  ChevronRight, 
  Lock, 
  Unlock, 
  Smartphone,
  Check,
  Mail,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { CURRENCIES, PAYMENT_METHODS } from '../constants';

const SettingGroup = ({ title, children }: any) => (
  <div className="space-y-4">
    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{title}</h3>
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">
      {children}
    </div>
  </div>
);

const SettingRow = ({ icon: Icon, label, value, onClick, colorClass = "bg-gray-100 text-gray-500" }: any) => (
  <div 
    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-all cursor-pointer group text-left"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <span className="font-bold text-slate-900 dark:text-white text-sm block">{label}</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {value !== undefined && <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold font-mono">{value}</span>}
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
    </div>
  </div>
);

const SettingsPage = () => {
  const { 
    settings, updateSettings, 
    accounts = [], addAccount, addTransaction, transactions = [],
    incomeCategories = [], expenseCategories = [], addIncomeCategory, addExpenseCategory, 
    deleteIncomeCategory, deleteExpenseCategory, formatMoney 
  } = useAppState();

  // Profile Edit fields
  const [nameInput, setNameInput] = useState(settings.name || 'Personal Admin');
  const [emailInput, setEmailInput] = useState(settings.userEmail || 'araja01011979@gmail.com');
  const [bioInput, setBioInput] = useState(settings.userBio || 'Personal wealth expert managing banks and digital crypto ledgers.');
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  // Accounts Form fields
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'cash' | 'bank' | 'upi' | 'investment' | 'loan' | 'other'>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');

  // Passcode configuring states
  const [showPasscodeField, setShowPasscodeField] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // CSV Bulk Import Feedback
  const [csvFeedback, setCsvFeedback] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...settings,
      name: nameInput,
      userEmail: emailInput,
      userBio: bioInput
    });
    setIsProfileEditing(false);
    showToast("Successfully updated profile information assets!");
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const balanceVal = parseFloat(newAccBalance) || 0;
    const accountId = 'acc_' + Date.now();

    addAccount({
      name: newAccName,
      type: newAccType,
      balance: balanceVal,
      accountNo: newAccNumber || undefined
    });

    // Create opening balance transaction inside the books
    addTransaction({
      type: balanceVal >= 0 ? 'income' : 'expense',
      amount: Math.abs(balanceVal),
      category: 'Opening Balance',
      date: new Date().toISOString().split('T')[0],
      description: `Opening Balance for ${newAccName}`,
      paymentMethod: newAccName,
      accountId: accountId,
      isOpeningPortfolio: true
    });

    setNewAccName('');
    setNewAccType('bank');
    setNewAccBalance('');
    setNewAccNumber('');
    showToast(`Created account ${newAccName} with opening balance!`);
  };

  // Passcode setup triggers
  const handleTogglePasscodeOnOff = () => {
    if (settings.passcodeEnabled) {
      // Disable passcode
      updateSettings({
        ...settings,
        passcodeEnabled: false
      });
      showToast("Security PIN lock protection dissolved.");
    } else {
      // Prompt passcode setup
      setShowPasscodeField(true);
      setPinInput('');
      setPasscodeError('');
    }
  };

  const handleSaveUnlockPIN = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      setPasscodeError("Security pin MUST be exactly a 4-digit number.");
      return;
    }
    updateSettings({
      ...settings,
      passcode: pinInput,
      passcodeEnabled: true
    });
    setShowPasscodeField(false);
    setPinInput('');
    setPasscodeError('');
    showToast("Pristine 4-Digit Passcode lock activated! App is now protected.");
  };

  // CSV Exporter
  const handleCSVExport = () => {
    if (transactions.length === 0) {
      alert("No transaction entries logged in database to export.");
      return;
    }
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Source Account'];
    const rows = transactions.map(t => [
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
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealthflow_excel_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV Statement downloaded successfully!");
  };

  // Batch CSV Parse & Import
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setCsvFeedback("CSV file is empty or lacks headers.");
          return;
        }

        let addedCount = 0;
        // Parse CSV Rows manually (handling potential quote enclosures)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split columns while respecting quotes
          const colMatches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          if (colMatches.length < 5) continue;

          const date = colMatches[0]?.replace(/"/g, '').trim();
          const desc = colMatches[1]?.replace(/"/g, '').trim();
          const type = (colMatches[2]?.replace(/"/g, '').trim().toLowerCase() || 'expense') as any;
          const category = colMatches[3]?.replace(/"/g, '').trim();
          const amount = parseFloat(colMatches[4]?.replace(/"/g, '').trim() || '0');
          const source = colMatches[5] ? colMatches[5].replace(/"/g, '').trim() : 'Manual Ledger';

          if (date && category && !isNaN(amount) && amount > 0) {
            addTransaction({
              type: ['income', 'expense', 'transfer'].includes(type) ? type : 'expense',
              amount,
              category,
              date,
              description: desc || category,
              paymentMethod: source,
              accountId: accounts[0]?.id || 'acc_cash'
            });
            addedCount++;
          }
        }

        setCsvFeedback(`Pristine Excel CSV parsing successful! Imported ${addedCount} transactions!`);
        showToast(`Bulk imported ${addedCount} transactions from CSV!`);
      } catch (err) {
        setCsvFeedback("Parsing failed. Check that columns are Date,Description,Type,Category,Amount,Account");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 select-text font-sans p-1 text-slate-900 dark:text-white">
      
      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-2xl z-[250] animate-in fade-in zoom-in-90 duration-300">
          {toastMessage}
        </div>
      )}

      {/* Visual Portrait Profile Card Header */}
      <div className="bg-white dark:bg-slate-950 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden text-left space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-150 overflow-hidden flex items-center justify-center relative shadow-sm group">
              <img src={`https://picsum.photos/seed/${settings.name}/150/150`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                {settings.name || 'Personal Admin'}
              </h2>
              <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                <Mail size={12} /> {settings.userEmail || 'araja01011979@gmail.com'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 max-w-sm">
                {settings.userBio || 'Personal wealth expert managing bank resources and digital investment portfolios.'}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsProfileEditing(!isProfileEditing)}
            className="px-3.5 py-2 border border-gray-250 dark:border-slate-700 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 hover:dark:bg-slate-850 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm text-slate-800 dark:text-white"
          >
            {isProfileEditing ? 'Close Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile Editing Form Block */}
        <div className="absolute top-2 right-4 text-[9px] font-mono font-medium text-slate-400">
          App created by Selvam R @ 2026
        </div>
        {isProfileEditing && (
          <form onSubmit={handleProfileSave} className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Owner Name</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Sync Email Address</label>
                <input 
                  type="email" required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Account Bio / Description</label>
              <textarea 
                rows={2} required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                value={bioInput}
                onChange={e => setBioInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Commit Profile Changes
            </button>
          </form>
        )}
      </div>

      {/* Account & Localization Segment */}
      <SettingGroup title="Personalization & Security">
        
        {/* Passcode Security PIN Lock Configurator Toggle */}
        <div className="p-4 bg-white dark:bg-slate-950 flex flex-col space-y-3 justify-center">
          <div className="flex items-center justify-between text-left">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600`}>
                <Shield size={18} />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">Security Passcode Lock</span>
                <span className="text-[10px] text-slate-400 block leading-tight">Restrict entry to the finance app with a 4-Digit PIN</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleTogglePasscodeOnOff}
              className={`p-2 px-4 rounded-xl text-[10px] font-bold uppercase transition-transform cursor-pointer shadow-sm ${
                settings.passcodeEnabled 
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 hover:scale-[1.01]' 
                  : 'bg-indigo-600 text-white hover:scale-[1.01]'
              }`}
            >
              {settings.passcodeEnabled ? 'Turn Off Protection' : 'Set Active PIN'}
            </button>
          </div>

          {/* Setup Password Screen panel */}
          {showPasscodeField && (
            <form onSubmit={handleSaveUnlockPIN} className="text-left pt-3 border-t border-dashed border-gray-100 dark:border-slate-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Set 4-Digit Security PIN</label>
              <div className="flex gap-3 max-w-sm">
                <input 
                  type="password"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-xl text-xs font-bold font-mono tracking-widest text-center w-28 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                />
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all"
                >
                  Activate Protection
                </button>
              </div>
              {passcodeError && <p className="text-[10px] text-red-500 font-extrabold">{passcodeError}</p>}
            </form>
          )}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-all text-left">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600`}>
              <Globe size={18} />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm block">Preferred Currency</span>
              <span className="text-[10px] text-slate-400 block leading-tight">Adjust standard prefix notations</span>
            </div>
          </div>
          <select 
            value={settings.currency} 
            onChange={(e) => updateSettings({ ...settings, currency: e.target.value })}
            className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-xs font-black cursor-pointer text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="USD">$ USD (Dollars)</option>
            <option value="INR">₹ INR (Indian Rupees)</option>
            <option value="EUR">€ EUR (Euros)</option>
            <option value="GBP">£ GBP (Pounds)</option>
          </select>
        </div>

        {/* Appearance Row for Light/Dark Mode Controls */}
        <SettingRow 
          icon={Palette} 
          label="Interface Theme" 
          value={settings.darkMode ? 'Dark Mode (Clear Contrast)' : 'Light Mode (Stark Vision)'}
          onClick={() => updateSettings({ ...settings, darkMode: !settings.darkMode })}
          colorClass="bg-purple-50 dark:bg-purple-950/40 text-purple-600"
        />
      </SettingGroup>

      {/* Categories configuration */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Categories Configuration</h3>
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="text-left">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Custom Income Categories</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {incomeCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-xl border border-green-100 dark:border-green-900">
                  {cat}
                  {incomeCategories.length > 1 && (
                    <button 
                      onClick={() => deleteIncomeCategory(cat)}
                      className="text-green-550 hover:text-green-900 font-extrabold w-3.5 h-3.5 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-950 rounded-full cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            
            <div className="flex gap-2 max-w-sm">
              <input 
                type="text" 
                id="add-inc-setting"
                placeholder="Type custom category..." 
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      addIncomeCategory(val);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button 
                onClick={() => {
                  const el = document.getElementById('add-inc-setting') as HTMLInputElement;
                  if (el && el.value.trim()) {
                    addIncomeCategory(el.value.trim());
                    el.value = '';
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800 pt-6 text-left">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Custom Expense Categories</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {expenseCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900">
                  {cat}
                  {expenseCategories.length > 1 && (
                    <button 
                      onClick={() => deleteExpenseCategory(cat)}
                      className="text-red-550 hover:text-red-900 font-extrabold w-3.5 h-3.5 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-950 rounded-full cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-sm">
              <input 
                type="text" 
                id="add-exp-setting"
                placeholder="Type custom category..." 
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      addExpenseCategory(val);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button 
                onClick={() => {
                  const el = document.getElementById('add-exp-setting') as HTMLInputElement;
                  if (el && el.value.trim()) {
                    addExpenseCategory(el.value.trim());
                    el.value = '';
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Accounts Manager */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Configure Accounts & Wallets</h3>
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 p-6 shadow-sm space-y-6 text-left">
          
          {/* Active wallets grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Wallets Booked</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-35">
              {accounts.map(acc => {
                let badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
                if (acc.type === 'loan') badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
                else if (acc.type === 'cash') badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
                else if (acc.type === 'investment') badgeColor = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";
                else if (acc.type === 'bank') badgeColor = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300";

                return (
                  <div key={acc.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold text-sm text-slate-950 dark:text-white block">{acc.name}</span>
                        {acc.accountNo && <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{acc.accountNo}</span>}
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {acc.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs text-slate-400 font-semibold">Balance</span>
                      <span className={`text-sm font-black text-slate-900 dark:text-white font-mono`}>
                        {formatMoney(acc.balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Form with Opening Balance triggers */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
            <h4 className="text-xs font-black text-slate-550 uppercase tracking-wider mb-4">Create New Account with Opening Balance</h4>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Account / Wallet Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Axis Salary Bank"
                    value={newAccName}
                    onChange={e => setNewAccName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-505"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Account Class Type</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-505"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash Wallet</option>
                    <option value="upi">UPI ID / Digital Wallet</option>
                    <option value="investment">Investment Ledger</option>
                    <option value="loan">Loan Account (Liability)</option>
                    <option value="other">Other Assets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Opening Balance Entry</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25000 (negative if debt e.g. -5000)"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-505"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Account / Reference No. (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI account/IFSC ID"
                    value={newAccNumber}
                    onChange={e => setNewAccNumber(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-505 animate-in"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow active:scale-95 cursor-pointer"
              >
                Assemble & Open Account
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CSV and JSON Data Exporters Segment */}
      <SettingGroup title="Data Exporters & Sync">
        <div className="p-4 bg-white dark:bg-slate-950 text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl shrink-0">
                <Database size={18} />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white text-sm block">Export Statements</span>
                <span className="text-[10px] text-slate-400 block leading-tight">Create CSV Excel sheets or complete JSON states</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCSVExport}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer"
              >
                Export CSV Ledger
              </button>
              <button
                onClick={() => {
                  const completeState = {
                    transactions: localStorage.getItem('wf_transactions') ? JSON.parse(localStorage.getItem('wf_transactions')!) : [],
                    investments: localStorage.getItem('wf_investments') ? JSON.parse(localStorage.getItem('wf_investments')!) : [],
                    investmentHistory: localStorage.getItem('wf_inv_history') ? JSON.parse(localStorage.getItem('wf_inv_history')!) : [],
                    budgets: localStorage.getItem('wf_budgets') ? JSON.parse(localStorage.getItem('wf_budgets')!) : [],
                    accounts: localStorage.getItem('wf_accounts') ? JSON.parse(localStorage.getItem('wf_accounts')!) : [],
                    settings: localStorage.getItem('wf_settings') ? JSON.parse(localStorage.getItem('wf_settings')!) : {}
                  };
                  const blob = new Blob([JSON.stringify(completeState, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `wealthflow_backup_state_${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showToast("JSON backup created successfully!");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Bulk Import from CSV Panel */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white text-sm block">Import CSV Ledger</span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Upload `.csv` with columns: **Date, Description, Type, Category, Amount**
              </span>
            </div>
            
            <label className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white hover:scale-[1.01] text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl cursor-pointer text-center shrink-0">
              Bulk Upload (CSV)
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVImport}
              />
            </label>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800 pt-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white text-sm block">Restore System State</span>
              <span className="text-[10px] text-slate-400 block leading-tight">Sync back completely to a JSON snapshot profile</span>
            </div>
            <label className="bg-indigo-650 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl cursor-pointer text-center shrink-0">
              Restore State
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      if (data.transactions) localStorage.setItem('wf_transactions', JSON.stringify(data.transactions));
                      if (data.investments) localStorage.setItem('wf_investments', JSON.stringify(data.investments));
                      if (data.investmentHistory) localStorage.setItem('wf_inv_history', JSON.stringify(data.investmentHistory));
                      if (data.budgets) localStorage.setItem('wf_budgets', JSON.stringify(data.budgets));
                      if (data.accounts) localStorage.setItem('wf_accounts', JSON.stringify(data.accounts));
                      if (data.settings) localStorage.setItem('wf_settings', JSON.stringify(data.settings));
                      alert("Pristine system recovery successful! Reloading assets...");
                      window.location.reload();
                    } catch (err) {
                      alert("Invalid backup JSON properties.");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          {csvFeedback && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-805 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-350 tracking-tight leading-tight">
              {csvFeedback}
            </div>
          )}
        </div>

        <div 
          className="p-4 flex items-center justify-between text-red-500 font-black text-xs hover:bg-red-50 dark:hover:bg-red-950/20 uppercase tracking-widest cursor-pointer transition-colors" 
          onClick={() => { if(confirm("Are you sure you want to restore back to factory defaults? All manual wallets will clear.")) { localStorage.clear(); window.location.reload(); } }}
        >
          <span>Factory Reset System Storage</span>
          <AlertTriangle size={16} />
        </div>
      </SettingGroup>
      
      <p className="text-center text-[10px] text-slate-400 font-mono tracking-wider font-semibold">WEALTHFLOW CONTAINER V2.4.0-STABLE</p>
    </div>
  );
};

export default SettingsPage;
