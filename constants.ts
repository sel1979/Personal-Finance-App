
export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Dividends', 'Interest', 'Gift', 'Refund', 'Other Income'
];

export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Housing', 'Education', 'Travel', 'Insurance', 'Other'
];

export const PAYMENT_METHODS = [
  'Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Mobile Wallet'
];

export const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Stocks' },
  { value: 'mutual_fund', label: 'Mutual Funds' },
  { value: 'etf', label: 'ETFs' },
  { value: 'bond', label: 'Bonds' },
  { value: 'crypto', label: 'Cryptocurrency' }
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' }
];

export const MOCK_TRANSACTIONS = [
  { id: '1', type: 'income', amount: 5000, category: 'Salary', date: '2023-10-01', description: 'Monthly paycheck', paymentMethod: 'Bank Transfer', createdAt: '2023-10-01' },
  { id: '2', type: 'expense', amount: 150, category: 'Food', date: '2023-10-02', description: 'Grocery shopping', paymentMethod: 'Credit Card', createdAt: '2023-10-02' },
  { id: '3', type: 'expense', amount: 45, category: 'Transport', date: '2023-10-03', description: 'Gas refill', paymentMethod: 'Debit Card', createdAt: '2023-10-03' },
  { id: '4', type: 'expense', amount: 800, category: 'Housing', date: '2023-10-05', description: 'Monthly Rent', paymentMethod: 'Bank Transfer', createdAt: '2023-10-05' },
];
