import React, { useMemo, useState } from 'react';
import { useAppState } from '../App';
import { Plus, Target, AlertTriangle, CheckCircle2, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

const BudgetCard = ({ category, spent, limit, onDelete }: { category: string, spent: number, limit: number, key?: any, onDelete?: () => void }) => {
  const { formatMoney } = useAppState();
  const percent = Math.min((spent / limit) * 100, 100);
  const remaining = limit - spent;
  const isOver = spent > limit;
  const isApproaching = percent > 80 && !isOver;

  let color = 'bg-green-500';
  let textColor = 'text-green-600';
  let bgColor = 'bg-green-50';
  
  if (isOver) {
    color = 'bg-red-500';
    textColor = 'text-red-600';
    bgColor = 'bg-red-50';
  } else if (isApproaching) {
    color = 'bg-amber-500';
    textColor = 'text-amber-600';
    bgColor = 'bg-amber-50';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${bgColor} ${textColor} flex items-center justify-center`}>
            {isOver ? <AlertTriangle size={20} /> : isApproaching ? <Target size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{category}</h4>
            <span className="text-xs text-gray-500">
              {percent.toFixed(1)}% Consumed
            </span>
          </div>
        </div>
        {onDelete && (
           <button 
             onClick={() => {
               if(window.confirm(`Delete budget for ${category}?`)) onDelete();
             }}
             className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
           >
             <Trash2 size={16} />
           </button>
        )}
      </div>

      <div className="flex items-end justify-between mb-2">
        <p className="text-sm font-medium text-gray-500">
          Spent <span className="text-gray-900 font-bold">{formatMoney(spent)}</span> of {formatMoney(limit)}
        </p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgColor} ${textColor}`}>
          {Math.round(percent)}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${color}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {isOver ? (
            <span className="text-red-500 font-bold">Over budget by {formatMoney(Math.abs(remaining))}</span>
          ) : (
            <span>{formatMoney(remaining)} left to spend</span>
          )}
        </p>
        {isOver && <AlertTriangle size={14} className="text-red-500" />}
        {!isOver && percent >= 100 && <CheckCircle2 size={14} className="text-green-500" />}
      </div>
    </motion.div>
  );
};

const BudgetPage = () => {
  const { transactions, budgets, deleteBudget, addBudget, expenseCategories, formatMoney } = useAppState();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // For this simplified version, let's assume we use the first active budget or current month expenses
  const spentByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }, [transactions]);

  // Mock initial budget limits if none exist
  const displayBudgets = budgets.length > 0 ? budgets[0].categories : [
    { category: 'Food', budgetAmount: 500, spentAmount: spentByCategory['Food'] || 0 },
    { category: 'Transport', budgetAmount: 200, spentAmount: spentByCategory['Transport'] || 0 },
    { category: 'Shopping', budgetAmount: 300, spentAmount: spentByCategory['Shopping'] || 0 },
    { category: 'Entertainment', budgetAmount: 150, spentAmount: spentByCategory['Entertainment'] || 0 },
  ];

  const totals = useMemo(() => {
    const budgetTotal = displayBudgets.reduce((acc, b) => acc + b.budgetAmount, 0);
    const spentTotal = displayBudgets.reduce((acc, b) => acc + (spentByCategory[b.category] || 0), 0);
    return { budgetTotal, spentTotal };
  }, [displayBudgets, spentByCategory]);

  const overallPercent = Math.min((totals.spentTotal / totals.budgetTotal) * 100, 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
          <p className="text-gray-500">Set and track monthly spending targets by category.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} />
          <span>Set New Budget</span>
        </button>
      </div>

      {/* Overall Progress */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="relative w-48 h-48 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="96" cy="96" r="80" 
                  className="stroke-gray-100" strokeWidth="16" fill="transparent" 
                />
                <circle 
                  cx="96" cy="96" r="80" 
                  className={`${overallPercent > 90 ? 'stroke-red-500' : 'stroke-indigo-500'} transition-all duration-1000 ease-out`} 
                  strokeWidth="16" fill="transparent"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - overallPercent / 100)}
                  strokeLinecap="round"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold">{Math.round(overallPercent)}%</span>
                 <span className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Total Used</span>
              </div>
           </div>
           <div className="flex-1 space-y-6">
             <div>
               <h3 className="text-xl font-bold mb-1">Monthly Budget Status</h3>
               <p className="text-gray-500 text-sm">You have spent {formatMoney(totals.spentTotal)} out of your {formatMoney(totals.budgetTotal)} monthly allowance.</p>
             </div>
             <div className="grid grid-cols-2 gap-8">
               <div>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly Allowance</p>
                 <p className="text-2xl font-bold">{formatMoney(totals.budgetTotal)}</p>
               </div>
               <div>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
                 <p className={`text-2xl font-bold ${totals.budgetTotal - totals.spentTotal < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                   {formatMoney(Math.max(0, totals.budgetTotal - totals.spentTotal))}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-2 text-sm">
               <span className={`px-3 py-1 rounded-full font-bold ${overallPercent > 90 ? 'bg-red-100 text-red-650' : 'bg-indigo-100 text-indigo-600'}`}>
                 {overallPercent > 90 ? 'Caution: Near Limit' : 'On Track'}
               </span>
               <span className="text-gray-400">• Current cycle: Oct 1 - Oct 31</span>
             </div>
           </div>
         </div>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {displayBudgets.map(b => (
           <BudgetCard 
             key={b.category} 
             category={b.category} 
             limit={b.budgetAmount} 
             spent={spentByCategory[b.category] || 0}
             onDelete={() => deleteBudget(b.id)} 
           />
         ))}
         {displayBudgets.length === 0 && (
           <div className="col-span-full py-12 text-center text-gray-500">No category budgets defined. Click "Set New Budget" to begin.</div>
         )}
       </div>
 
       {/* Set New Budget Limit Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-200">
             <h3 className="text-xl font-bold mb-6">Create New Budget Limit</h3>
             <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-gray-700">Category</label>
                 <select id="b-cat" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl">
                   {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-gray-700">Monthly Limit</label>
                 <input id="b-amt" type="number" placeholder="500.00" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl" />
               </div>
               <button 
                 onClick={() => {
                   const cat = (document.getElementById('b-cat') as HTMLSelectElement).value;
                   const amt = parseFloat((document.getElementById('b-amt') as HTMLInputElement).value);
                   if (cat && amt > 0) {
                     addBudget({
                       name: 'Monthly Budget',
                       startDate: '2023-10-01',
                       endDate: '2023-10-31',
                       categories: [{ category: cat, budgetAmount: amt, spentAmount: 0 }]
                     });
                     setIsModalOpen(false);
                   }
                 }}
                 className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 mt-4"
               >
                 Set Limit
               </button>
               <button onClick={() => setIsModalOpen(false)} className="w-full py-2 text-gray-500 font-medium">Cancel</button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default BudgetPage;
