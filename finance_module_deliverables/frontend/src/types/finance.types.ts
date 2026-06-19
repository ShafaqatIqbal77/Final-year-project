export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category?: Category;
  payment_method?: PaymentMethod;
  reference_no?: string;
  status: TransactionStatus;
  notes?: string;
  attachment_url?: string;
  created_at: string;
}

export interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  client_name: string;
  client_email?: string;
  issue_date: string;
  due_date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  category?: Category;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_pct: number;
  alert_threshold_pct: number;
  is_over_budget: boolean;
  created_at: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
}

export interface ProfitLossData {
  summary: {
    income: number;
    expense: number;
    net: number;
  };
  categories: {
    id: number | null;
    name: string;
    type: TransactionType;
    color: string;
    total: number;
  }[];
}

export interface CashFlowData {
  date: string;
  income: number;
  expense: number;
  running_balance: number;
}
