
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'upi' | 'investment' | 'loan' | 'other';
  balance: number;
  accountNo?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  paymentMethod: string;
  accountId?: string; // Links to payment Account (Source Account if transfer)
  toAccountId?: string; // Links to Target Account if transfer
  tags?: string[];
  createdAt: string;
  isOpeningPortfolio?: boolean;
}

export type InvestmentType = 'stock' | 'mutual_fund' | 'etf' | 'gold' | 'bond' | 'crypto';

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
  broker: string;
  brokerage?: number;
  sellQuantity?: number;
  sellPrice?: number;
  notes?: string;
  // Mutual Fund & SIP specific fields
  amcName?: string;
  sipAmount?: number;
  isSIP?: boolean; // SIP Mode = true, Lump Sum = false
  sipDate?: string;
  sipFrequency?: string;
  nav?: number;
  purchaseDate?: string;
  goalName?: string;
  goalTarget?: number;
  paymentAccountId?: string; // selected account
  isOpeningBalance?: boolean; // true if Opening Balance Investment
  overallGainPnL?: number;
  overallGainPercent?: number;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  transactionType: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  totalAmount: number;
  profitLoss?: number;
}

export interface BudgetCategory {
  category: string;
  budgetAmount: number;
  spentAmount: number;
}

export interface Budget {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  categories: BudgetCategory[];
}

export interface UserSettings {
  currency: string;
  darkMode: boolean;
  name: string;
  passcode?: string;
  passcodeEnabled?: boolean;
  userEmail?: string;
  userBio?: string;
}
