import React, { useState } from 'react';
import { 
  useFinanceSummary, 
  useProfitLoss, 
  useCashFlow, 
  useBudgets,
  useTransactions 
} from '../hooks/useFinanceApi';
import { useFinanceStore } from '../store/useFinanceStore';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { CashFlowChart } from '../components/charts/CashFlowChart';
import { BudgetBarChart } from '../components/charts/BudgetBarChart';
// import { FinanceDataTable } from '../components/tables/FinanceDataTable';
// import { AddTransactionModal } from '../components/modals/AddTransactionModal';

export const FinanceDashboard: React.FC = () => {
  const { dateRange, setDateRange, setAddTransactionOpen } = useFinanceStore();
  
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');

  const { data: summary, isLoading: isLoadingSummary } = useFinanceSummary(dateRange);
  const { data: profitLoss, isLoading: isLoadingPL } = useProfitLoss(dateRange);
  
  // For cashflow, using current month of end_date
  const endDateObj = new Date(dateRange.endDate || new Date().toISOString());
  const { data: cashFlow, isLoading: isLoadingCF } = useCashFlow({ 
    year: endDateObj.getFullYear(), 
    month: endDateObj.getMonth() + 1 
  });
  
  const { data: budgetsData, isLoading: isLoadingBudgets } = useBudgets();

  const handleDatePreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      preset
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* TOP BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finance Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor your revenue, expenses, and cash flow.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
          {(['thisMonth', 'lastMonth', 'thisYear'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => handleDatePreset(preset)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                dateRange.preset === preset 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preset === 'thisMonth' ? 'This Month' : preset === 'lastMonth' ? 'Last Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Income" 
          amount={summary?.total_income || 0} 
          loading={isLoadingSummary}
          color="green"
        />
        <SummaryCard 
          title="Total Expenses" 
          amount={summary?.total_expense || 0} 
          loading={isLoadingSummary}
          color="red"
        />
        <SummaryCard 
          title="Net Profit/Loss" 
          amount={summary?.net_balance || 0} 
          loading={isLoadingSummary}
          color={(summary?.net_balance || 0) >= 0 ? 'green' : 'red'}
        />
        <SummaryCard 
          title="Pending Invoices" 
          amount={0} // Mocked or hook needed
          loading={false}
          color="blue"
          prefix=""
          subtitle="Count: 0"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseChart 
          data={profitLoss ? [{ 
            month: 'Selected Period', 
            income: profitLoss.summary.income, 
            expense: profitLoss.summary.expense 
          }] : []} 
        />
        <CategoryPieChart data={profitLoss?.categories || []} />
        <CashFlowChart data={cashFlow || []} />
        <BudgetBarChart budgets={budgetsData?.data || []} />
      </div>

      {/* RECENT TRANSACTIONS HEADER & ACTIONS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
          
          <div className="flex gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 md:w-64"
            />
            <select 
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button 
              onClick={() => setAddTransactionOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm whitespace-nowrap transition-colors"
            >
              + Add Transaction
            </button>
            <button 
              onClick={() => window.location.href='/finance/invoices/new'}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm whitespace-nowrap transition-colors"
            >
              New Invoice
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-500 italic mb-4">Note: Data table component will render here.</p>
          {/* <FinanceDataTable 
            type={filterType !== 'all' ? filterType : undefined} 
            search={search}
            dateRange={dateRange}
          /> */}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, amount, loading, color, prefix = '$', subtitle }: any) => {
  const colorStyles = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
      <span className="text-sm font-medium text-gray-500 mb-1">{title}</span>
      {loading ? (
        <div className="animate-pulse h-8 bg-gray-200 rounded w-1/2 mt-1"></div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${colorStyles[color as keyof typeof colorStyles]}`}>
            {prefix}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
      {subtitle && <span className="text-xs text-gray-400 mt-2">{subtitle}</span>}
    </div>
  );
};
