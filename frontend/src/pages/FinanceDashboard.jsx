import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: '📊' },
  { id: 'fees', label: 'Fees', icon: '💰' },
  { id: 'salaries', label: 'Salaries', icon: '💳' },
  { id: 'expenses', label: 'Expenses', icon: '📉' },
  { id: 'incomes', label: 'Income', icon: '📈' },
  { id: 'reports', label: 'Reports', icon: '📋' },
];

export default function FinanceDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  
  // Fees
  const [fees, setFees] = useState([]);
  const [feeFilter, setFeeFilter] = useState({ status: '', fee_type: '', student_name: '' });
  const [feePagination, setFeePagination] = useState({ page: 1, total: 0, pages: 0 });
  const [editingFee, setEditingFee] = useState(null);
  
  // Salaries
  const [salaries, setSalaries] = useState([]);
  const [salaryFilter, setSalaryFilter] = useState({ status: '', month: '', year: '' });
  const [salaryPagination, setSalaryPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [editingSalary, setEditingSalary] = useState(null);
  
  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [expenseFilter, setExpenseFilter] = useState({ category: '', date_from: '', date_to: '' });
  const [expensePagination, setExpensePagination] = useState({ page: 1, total: 0, pages: 0 });
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Incomes
  const [incomes, setIncomes] = useState([]);
  const [incomeFilter, setIncomeFilter] = useState({ source: '', date_from: '', date_to: '' });
  const [incomePagination, setIncomePagination] = useState({ page: 1, total: 0, pages: 0 });
  const [editingIncome, setEditingIncome] = useState(null);
  
  // Reports
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('daily_collection');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  const [modal, setModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Loaders
  const loadDashboard = useCallback(async () => {
    const d = await api('finance/dashboard');
    setStats(d.stats);
    setMonthlyRevenue(d.monthly_revenue || []);
    setMonthlyExpenses(d.monthly_expenses || []);
    setRecentTransactions(d.recent_transactions || []);
  }, []);

  const loadFees = useCallback(async () => {
    const d = await api('finance/fees', { params: { ...feeFilter, page: feePagination.page } });
    setFees(d.fees || []);
    setFeePagination(d.pagination);
  }, [feeFilter, feePagination.page]);

  const loadSalaries = useCallback(async () => {
    const d = await api('finance/salaries', { params: { ...salaryFilter, page: salaryPagination.page } });
    setSalaries(d.salaries || []);
    setSalaryPagination(d.pagination);
  }, [salaryFilter, salaryPagination.page]);

  const loadExpenses = useCallback(async () => {
    const d = await api('finance/expenses', { params: { ...expenseFilter, page: expensePagination.page } });
    setExpenses(d.expenses || []);
    setExpensePagination(d.pagination);
  }, [expenseFilter, expensePagination.page]);

  const loadIncomes = useCallback(async () => {
    const d = await api('finance/incomes', { params: { ...incomeFilter, page: incomePagination.page } });
    setIncomes(d.incomes || []);
    setIncomePagination(d.pagination);
  }, [incomeFilter, incomePagination.page]);

  const loadStudents = useCallback(async () => {
    const d = await api('admin/users', { params: { role: 'student' } });
    setStudents(d.users || []);
  }, []);

  const loadEmployees = useCallback(async () => {
    const d = await api('admin/users', { params: { role: 'teacher' } });
    setEmployees(d.users || []);
  }, []);

  const loadReport = useCallback(async () => {
    const d = await api('finance/reports', { params: { report_type: reportType, date_from: dateRange.from, date_to: dateRange.to } });
    setReportData(d.data);
  }, [reportType, dateRange]);

  useEffect(() => {
    setErr('');
    setLoading(true);
    (async () => {
      try {
        if (tab === 'overview') await loadDashboard();
        if (tab === 'fees') { await loadFees(); await loadStudents(); }
        if (tab === 'salaries') { await loadSalaries(); await loadEmployees(); }
        if (tab === 'expenses') await loadExpenses();
        if (tab === 'incomes') await loadIncomes();
        if (tab === 'reports') await loadReport();
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, loadDashboard, loadFees, loadSalaries, loadExpenses, loadIncomes, loadReport, loadStudents, loadEmployees]);

  // Fee actions
  async function createFee(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/fees', { method: 'POST', body: { student_id: fd.get('student_id'), fee_type: fd.get('fee_type'), amount: fd.get('amount'), discount: fd.get('discount') || 0, fine: fd.get('fine') || 0, due_date: fd.get('due_date'), remarks: fd.get('remarks') || null } });
      e.target.reset(); toast('Fee record created successfully'); await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateFee(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/fees', { method: 'PATCH', body: { id: editingFee.id, paid_amount: fd.get('paid_amount') || null, status: fd.get('status') || null, remarks: fd.get('remarks') || null } });
      setEditingFee(null); toast('Fee record updated successfully'); await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  async function deleteFee(id) {
    try {
      await api('finance/fees', { method: 'DELETE', body: { id } });
      toast('Fee record deleted successfully'); await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  // Salary actions
  async function createSalary(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/salaries', { method: 'POST', body: { employee_id: fd.get('employee_id'), month: fd.get('month'), year: fd.get('year'), amount: fd.get('amount'), remarks: fd.get('remarks') || null } });
      e.target.reset(); toast('Salary record created successfully'); await loadSalaries();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateSalary(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/salaries', { method: 'PATCH', body: { id: editingSalary.id, status: fd.get('status') || null, amount: fd.get('amount') || null, remarks: fd.get('remarks') || null } });
      setEditingSalary(null); toast('Salary record updated successfully'); await loadSalaries();
    } catch (ex) { setErr(ex.message); }
  }

  async function deleteSalary(id) {
    try {
      await api('finance/salaries', { method: 'DELETE', body: { id } });
      toast('Salary record deleted successfully'); await loadSalaries();
    } catch (ex) { setErr(ex.message); }
  }

  // Expense actions
  async function createExpense(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/expenses', { method: 'POST', body: { title: fd.get('title'), category: fd.get('category'), amount: fd.get('amount'), expense_date: fd.get('expense_date'), description: fd.get('description') || null } });
      e.target.reset(); toast('Expense created successfully'); await loadExpenses();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateExpense(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/expenses', { method: 'PATCH', body: { id: editingExpense.id, title: fd.get('title'), category: fd.get('category'), amount: fd.get('amount'), expense_date: fd.get('expense_date'), description: fd.get('description') || null } });
      setEditingExpense(null); toast('Expense updated successfully'); await loadExpenses();
    } catch (ex) { setErr(ex.message); }
  }

  async function deleteExpense(id) {
    try {
      await api('finance/expenses', { method: 'DELETE', body: { id } });
      toast('Expense deleted successfully'); await loadExpenses();
    } catch (ex) { setErr(ex.message); }
  }

  // Income actions
  async function createIncome(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/incomes', { method: 'POST', body: { source: fd.get('source'), amount: fd.get('amount'), income_date: fd.get('income_date'), description: fd.get('description') || null } });
      e.target.reset(); toast('Income created successfully'); await loadIncomes();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateIncome(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/incomes', { method: 'PATCH', body: { id: editingIncome.id, source: fd.get('source'), amount: fd.get('amount'), income_date: fd.get('income_date'), description: fd.get('description') || null } });
      setEditingIncome(null); toast('Income updated successfully'); await loadIncomes();
    } catch (ex) { setErr(ex.message); }
  }

  async function deleteIncome(id) {
    try {
      await api('finance/incomes', { method: 'DELETE', body: { id } });
      toast('Income deleted successfully'); await loadIncomes();
    } catch (ex) { setErr(ex.message); }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }

  function getStatusBadge(status) {
    const colors = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status.replace('_', ' ')}</span>;
  }

  function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      toast('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = value == null ? '' : String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('CSV exported successfully');
  }

  return (
    <div className="fade-in">
      {/* Professional Navigation Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 bg-white rounded-xl shadow-sm p-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-200 ${
                tab === item.id 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {err}
          <button onClick={() => setErr('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <Spinner />
            <p className="mt-4 text-gray-500 text-sm">Loading financial data...</p>
          </div>
        </div>
      )}

      {/* Overview Dashboard */}
      {tab === 'overview' && stats && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Financial Overview</h1>
              <p className="text-gray-500 mt-1">Monitor your institution's financial health</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {/* Professional Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Total Income Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-green-600 text-sm font-medium bg-green-200 px-2 py-1 rounded-full">+12.5%</span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Income</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.total_income)}</p>
              <p className="text-xs text-gray-500 mt-2">vs last month</p>
            </div>

            {/* Total Expenses Card */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
                <span className="text-red-600 text-sm font-medium bg-red-200 px-2 py-1 rounded-full">-8.3%</span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.total_expenses)}</p>
              <p className="text-xs text-gray-500 mt-2">vs last month</p>
            </div>

            {/* Total Salaries Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-blue-600 text-sm font-medium bg-blue-200 px-2 py-1 rounded-full">+5.2%</span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Salaries</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.total_salaries)}</p>
              <p className="text-xs text-gray-500 mt-2">Paid this month</p>
            </div>

            {/* Net Balance Card */}
            <div className={`bg-gradient-to-br ${stats.net_balance >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stats.net_balance >= 0 ? 'bg-emerald-500' : 'bg-orange-500'} rounded-xl flex items-center justify-center shadow-md`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={`${stats.net_balance >= 0 ? 'text-emerald-600 bg-emerald-200' : 'text-orange-600 bg-orange-200'} text-sm font-medium px-2 py-1 rounded-full`}>
                  {stats.net_balance >= 0 ? '+15.8%' : '-12.3%'}
                </span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Net Balance</p>
              <p className={`text-3xl font-bold ${stats.net_balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>{formatCurrency(stats.net_balance)}</p>
              <p className="text-xs text-gray-500 mt-2">Current balance</p>
            </div>

            {/* Pending Dues Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-orange-600 text-sm font-medium bg-orange-200 px-2 py-1 rounded-full">-3.2%</span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Dues</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.pending_dues)}</p>
              <p className="text-xs text-gray-500 mt-2">Outstanding fees</p>
            </div>

            {/* Monthly Revenue Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-purple-600 text-sm font-medium bg-purple-200 px-2 py-1 rounded-full">+18.7%</span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(monthlyRevenue.reduce((sum, item) => sum + (item.revenue || 0), 0))}</p>
              <p className="text-xs text-gray-500 mt-2">This month</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Monthly Revenue Trend</h3>
                <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">+12.5%</span>
              </div>
              <div className="h-72 flex items-end justify-between gap-3 px-2">
                {monthlyRevenue.length > 0 ? monthlyRevenue.map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-300 group-hover:from-green-700 group-hover:to-green-500 relative" style={{ height: `${Math.max((item.revenue / (Math.max(...monthlyRevenue.map(r => r.revenue)) || 1)) * 100, 5)}%` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 font-medium">{item.month}</span>
                  </div>
                )) : (
                  <div className="col-span-12 flex items-center justify-center h-full text-gray-400">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Expenses Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Monthly Expenses</h3>
                <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">-8.3%</span>
              </div>
              <div className="h-72 flex items-end justify-between gap-3 px-2">
                {monthlyExpenses.length > 0 ? monthlyExpenses.map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg transition-all duration-300 group-hover:from-red-700 group-hover:to-red-500 relative" style={{ height: `${Math.max((item.expense / (Math.max(...monthlyExpenses.map(r => r.expense)) || 1)) * 100, 5)}%` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(item.expense)}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 font-medium">{item.month}</span>
                  </div>
                )) : (
                  <div className="col-span-12 flex items-center justify-center h-full text-gray-400">
                    No expense data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
                <button onClick={() => exportToCSV(recentTransactions, 'recent_transactions')} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTransactions.length > 0 ? recentTransactions.map((tx, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'fee' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {tx.type === 'fee' ? '💰 Fee' : '📉 Expense'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800 font-medium">{tx.student_name}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800">{formatCurrency(tx.amount)}</td>
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(tx.created_at)}</td>
                      <td className="py-4 px-6">{getStatusBadge(tx.status)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fee Management */}
      {tab === 'fees' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Fee Management</h1>
              <p className="text-gray-500 mt-1">Manage student fees and payments</p>
            </div>
            <button 
              onClick={() => setModal({ open: true, title: 'Add New Fee', message: '', onConfirm: () => document.getElementById('feeForm')?.requestSubmit() })}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Fee
            </button>
          </div>

          {/* Advanced Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search by student name" 
                  value={feeFilter.student_name} 
                  onChange={(e) => setFeeFilter({ ...feeFilter, student_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <select 
                value={feeFilter.fee_type} 
                onChange={(e) => setFeeFilter({ ...feeFilter, fee_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Fee Types</option>
                <option value="tuition">💰 Tuition</option>
                <option value="library">📚 Library</option>
                <option value="lab">🔬 Lab</option>
                <option value="sports">⚽ Sports</option>
                <option value="transport">🚌 Transport</option>
                <option value="examination">📝 Examination</option>
                <option value="admission">🎓 Admission</option>
                <option value="other">📦 Other</option>
              </select>
              <select 
                value={feeFilter.status} 
                onChange={(e) => setFeeFilter({ ...feeFilter, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Status</option>
                <option value="unpaid">🔴 Unpaid</option>
                <option value="partially_paid">🟡 Partially Paid</option>
                <option value="paid">🟢 Paid</option>
              </select>
              <button 
                onClick={() => { setFeePagination({ ...feePagination, page: 1 }); loadFees(); }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Fees Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Fee Records</h3>
                  <p className="text-sm text-gray-500 mt-1">Showing {fees.length} of {feePagination.total} records</p>
                </div>
                <button 
                  onClick={() => exportToCSV(fees, 'fees_export')}
                  className="inline-flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Type</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Discount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fine</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Remaining</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fees.length > 0 ? fees.map((fee, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">{fee.student_name?.charAt(0) || 'S'}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{fee.student_name}</div>
                            <div className="text-sm text-gray-500">{fee.student_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {fee.fee_type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800">{formatCurrency(fee.amount)}</td>
                      <td className="py-4 px-6 text-sm text-green-600">{formatCurrency(fee.discount)}</td>
                      <td className="py-4 px-6 text-sm text-red-600">{formatCurrency(fee.fine)}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800">{formatCurrency(fee.paid_amount)}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-orange-600">{formatCurrency(fee.remaining_amount)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{formatDate(fee.due_date)}</td>
                      <td className="py-4 px-6">{getStatusBadge(fee.status)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {fee.status === 'paid' && (
                            <button 
                              onClick={() => window.open(`/api/finance/fee-receipt?id=${fee.id}&format=pdf`, '_blank')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download Receipt"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingFee(fee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setModal({ open: true, title: 'Delete Fee', message: `Are you sure you want to delete the fee record for ${fee.student_name}? This action cannot be undone.`, onConfirm: () => { deleteFee(fee.id); setModal({ ...modal, open: false }); }, danger: true })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-lg font-medium">No fee records found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or add a new fee record</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {feePagination.pages > 1 && (
              <div className="p-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Page {feePagination.page} of {feePagination.pages} ({feePagination.total} total records)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { if (feePagination.page > 1) setFeePagination({ ...feePagination, page: feePagination.page - 1 }); }}
                    disabled={feePagination.page === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button 
                    onClick={() => { if (feePagination.page < feePagination.pages) setFeePagination({ ...feePagination, page: feePagination.page + 1 }); }}
                    disabled={feePagination.page === feePagination.pages}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary Management */}
      {tab === 'salaries' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Salary Management</h1>
              <p className="text-gray-500 mt-1">Manage teacher and staff salaries</p>
            </div>
            <button 
              onClick={() => setModal({ open: true, title: 'Add New Salary', message: '', onConfirm: () => document.getElementById('salaryForm')?.requestSubmit() })}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Salary
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select 
                value={salaryFilter.status} 
                onChange={(e) => setSalaryFilter({ ...salaryFilter, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Status</option>
                <option value="unpaid">🔴 Unpaid</option>
                <option value="paid">🟢 Paid</option>
              </select>
              <input 
                type="number" 
                placeholder="Month (1-12)" 
                min="1" 
                max="12"
                value={salaryFilter.month} 
                onChange={(e) => setSalaryFilter({ ...salaryFilter, month: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <input 
                type="number" 
                placeholder="Year" 
                min="2020" 
                max="2030"
                value={salaryFilter.year} 
                onChange={(e) => setSalaryFilter({ ...salaryFilter, year: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button 
                onClick={() => { setSalaryPagination({ ...salaryPagination, page: 1 }); loadSalaries(); }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Salaries Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Salary Records</h3>
                  <p className="text-sm text-gray-500 mt-1">Showing {salaries.length} of {salaryPagination.total} records</p>
                </div>
                <button 
                  onClick={() => exportToCSV(salaries, 'salaries_export')}
                  className="inline-flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Year</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salaries.length > 0 ? salaries.map((salary, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">{salary.employee_name?.charAt(0) || 'E'}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{salary.employee_name}</div>
                            <div className="text-sm text-gray-500">{salary.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {salary.employee_role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800">{salary.month}</td>
                      <td className="py-4 px-6 text-sm text-gray-800">{salary.year}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800">{formatCurrency(salary.amount)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{formatDate(salary.payment_date)}</td>
                      <td className="py-4 px-6">{getStatusBadge(salary.status)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {salary.status === 'paid' && (
                            <button 
                              onClick={() => window.open(`/api/finance/salary-slip?id=${salary.id}&format=pdf`, '_blank')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download Salary Slip"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingSalary(salary)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setModal({ open: true, title: 'Delete Salary', message: `Are you sure you want to delete the salary record for ${salary.employee_name}? This action cannot be undone.`, onConfirm: () => { deleteSalary(salary.id); setModal({ ...modal, open: false }); }, danger: true })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg font-medium">No salary records found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or add a new salary record</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {salaryPagination.pages > 1 && (
              <div className="p-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Page {salaryPagination.page} of {salaryPagination.pages} ({salaryPagination.total} total records)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { if (salaryPagination.page > 1) setSalaryPagination({ ...salaryPagination, page: salaryPagination.page - 1 }); }}
                    disabled={salaryPagination.page === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button 
                    onClick={() => { if (salaryPagination.page < salaryPagination.pages) setSalaryPagination({ ...salaryPagination, page: salaryPagination.page + 1 }); }}
                    disabled={salaryPagination.page === salaryPagination.pages}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Management */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Expense Management</h1>
              <p className="text-gray-500 mt-1">Track and manage institutional expenses</p>
            </div>
            <button 
              onClick={() => setModal({ open: true, title: 'Add New Expense', message: '', onConfirm: () => document.getElementById('expenseForm')?.requestSubmit() })}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Expense
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select 
                value={expenseFilter.category} 
                onChange={(e) => setExpenseFilter({ ...expenseFilter, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Categories</option>
                <option value="utilities">💡 Utilities</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="equipment">🖥️ Equipment</option>
                <option value="office_supplies">📦 Office Supplies</option>
                <option value="salaries">💳 Salaries</option>
                <option value="miscellaneous">📝 Miscellaneous</option>
              </select>
              <input 
                type="date" 
                value={expenseFilter.date_from} 
                onChange={(e) => setExpenseFilter({ ...expenseFilter, date_from: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <input 
                type="date" 
                value={expenseFilter.date_to} 
                onChange={(e) => setExpenseFilter({ ...expenseFilter, date_to: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button 
                onClick={() => { setExpensePagination({ ...expensePagination, page: 1 }); loadExpenses(); }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Expense Records</h3>
                  <p className="text-sm text-gray-500 mt-1">Showing {expenses.length} of {expensePagination.total} records</p>
                </div>
                <button 
                  onClick={() => exportToCSV(expenses, 'expenses_export')}
                  className="inline-flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.length > 0 ? expenses.map((expense, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-800">{expense.title}</div>
                        {expense.description && (
                          <div className="text-sm text-gray-500 mt-1">{expense.description}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          expense.category === 'utilities' ? 'bg-yellow-50 text-yellow-700' :
                          expense.category === 'maintenance' ? 'bg-orange-50 text-orange-700' :
                          expense.category === 'equipment' ? 'bg-blue-50 text-blue-700' :
                          expense.category === 'office_supplies' ? 'bg-green-50 text-green-700' :
                          expense.category === 'salaries' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {expense.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{formatDate(expense.expense_date)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{expense.created_by_name || '-'}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingExpense(expense)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setModal({ open: true, title: 'Delete Expense', message: `Are you sure you want to delete the expense "${expense.title}"? This action cannot be undone.`, onConfirm: () => { deleteExpense(expense.id); setModal({ ...modal, open: false }); }, danger: true })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <p className="text-lg font-medium">No expense records found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or add a new expense record</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {expensePagination.pages > 1 && (
              <div className="p-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Page {expensePagination.page} of {expensePagination.pages} ({expensePagination.total} total records)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { if (expensePagination.page > 1) setExpensePagination({ ...expensePagination, page: expensePagination.page - 1 }); }}
                    disabled={expensePagination.page === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button 
                    onClick={() => { if (expensePagination.page < expensePagination.pages) setExpensePagination({ ...expensePagination, page: expensePagination.page + 1 }); }}
                    disabled={expensePagination.page === expensePagination.pages}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Income Management */}
      {tab === 'incomes' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Income Management</h1>
              <p className="text-gray-500 mt-1">Track and manage institutional income sources</p>
            </div>
            <button 
              onClick={() => setModal({ open: true, title: 'Add New Income', message: '', onConfirm: () => document.getElementById('incomeForm')?.requestSubmit() })}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Income
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select 
                value={incomeFilter.source} 
                onChange={(e) => setIncomeFilter({ ...incomeFilter, source: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Sources</option>
                <option value="donations">💝 Donations</option>
                <option value="grants">🎓 Grants</option>
                <option value="fees">💰 Fees</option>
                <option value="other">📦 Other</option>
              </select>
              <input 
                type="date" 
                value={incomeFilter.date_from} 
                onChange={(e) => setIncomeFilter({ ...incomeFilter, date_from: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <input 
                type="date" 
                value={incomeFilter.date_to} 
                onChange={(e) => setIncomeFilter({ ...incomeFilter, date_to: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button 
                onClick={() => { setIncomePagination({ ...incomePagination, page: 1 }); loadIncomes(); }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Incomes Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Income Records</h3>
                  <p className="text-sm text-gray-500 mt-1">Showing {incomes.length} of {incomePagination.total} records</p>
                </div>
                <button 
                  onClick={() => exportToCSV(incomes, 'incomes_export')}
                  className="inline-flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomes.length > 0 ? incomes.map((income, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          income.source === 'donations' ? 'bg-pink-50 text-pink-700' :
                          income.source === 'grants' ? 'bg-indigo-50 text-indigo-700' :
                          income.source === 'fees' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {income.source}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold text-green-600">{formatCurrency(income.amount)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{formatDate(income.income_date)}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{income.description || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{income.created_by_name || '-'}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingIncome(income)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setModal({ open: true, title: 'Delete Income', message: `Are you sure you want to delete this income record of ${formatCurrency(income.amount)}? This action cannot be undone.`, onConfirm: () => { deleteIncome(income.id); setModal({ ...modal, open: false }); }, danger: true })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-lg font-medium">No income records found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or add a new income record</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {incomePagination.pages > 1 && (
              <div className="p-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Page {incomePagination.page} of {incomePagination.pages} ({incomePagination.total} total records)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { if (incomePagination.page > 1) setIncomePagination({ ...incomePagination, page: incomePagination.page - 1 }); }}
                    disabled={incomePagination.page === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button 
                    onClick={() => { if (incomePagination.page < incomePagination.pages) setIncomePagination({ ...incomePagination, page: incomePagination.page + 1 }); }}
                    disabled={incomePagination.page === incomePagination.pages}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Finance Reports</h1>
              <p className="text-gray-500 mt-1">Generate and export financial reports</p>
            </div>
          </div>

          {/* Report Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="daily_collection">📊 Daily Collection Report</option>
                  <option value="monthly_collection">📈 Monthly Collection Report</option>
                  <option value="yearly_collection">📅 Yearly Collection Report</option>
                  <option value="outstanding_fees">⚠️ Outstanding Fees Report</option>
                  <option value="salary_report">💳 Salary Report</option>
                  <option value="expense_report">📉 Expense Report</option>
                  <option value="profit_loss">💰 Profit/Loss Summary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input 
                  type="date" 
                  value={dateRange.from} 
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input 
                  type="date" 
                  value={dateRange.to} 
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <button 
              onClick={loadReport}
              className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Report
            </button>
          </div>

          {/* Report Display */}
          {reportData && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 capitalize">{reportType.replace('_', ' ')} Report</h3>
                    <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(`/api/finance/reports?report_type=${reportType}&date_from=${dateRange.from}&date_to=${dateRange.to}&format=excel`, '_blank')}
                      className="inline-flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Excel
                    </button>
                    <button 
                      onClick={() => exportToCSV(reportData, `${reportType}_report`)}
                      className="inline-flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>
              </div>
              
              {reportType === 'profit_loss' ? (
                <div className="p-6 space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Income
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Fees Collected</span>
                        <span className="font-semibold">{formatCurrency(reportData.income.fees)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Other Income</span>
                        <span className="font-semibold">{formatCurrency(reportData.income.other)}</span>
                      </div>
                      <div className="border-t border-green-300 pt-2 mt-2">
                        <div className="flex justify-between text-green-800 font-bold">
                          <span>Total Income</span>
                          <span>{formatCurrency(reportData.income.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      Expenses
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Operations</span>
                        <span className="font-semibold">{formatCurrency(reportData.expenses.operations)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Salaries</span>
                        <span className="font-semibold">{formatCurrency(reportData.expenses.salaries)}</span>
                      </div>
                      <div className="border-t border-red-300 pt-2 mt-2">
                        <div className="flex justify-between text-red-800 font-bold">
                          <span>Total Expenses</span>
                          <span>{formatCurrency(reportData.expenses.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`bg-gradient-to-br ${reportData.net_profit >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} rounded-xl p-6 border`}>
                    <div className="flex justify-between items-center">
                      <h4 className={`font-semibold ${reportData.net_profit >= 0 ? 'text-emerald-800' : 'text-orange-800'} flex items-center gap-2`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Net Profit/Loss
                      </h4>
                      <span className={`text-2xl font-bold ${reportData.net_profit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {formatCurrency(reportData.net_profit)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(reportData[0] || {}).map((key, i) => (
                          <th key={i} className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">{key.replace('_', ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="py-4 px-6">{typeof val === 'number' && (key = Object.keys(row)[j], (key.includes('amount') || key.includes('total') || key.includes('revenue') || key.includes('expense') || key.includes('collected'))) ? formatCurrency(val) : val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.title} onConfirm={modal.onConfirm} danger={modal.danger}>
        {modal.message && <p className="mb-4 text-gray-600">{modal.message}</p>}
        
        {/* Fee Form Modal */}
        {modal.title === 'Add New Fee' && (
          <form id="feeForm" onSubmit={createFee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select name="student_id" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
              <select name="fee_type" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="tuition">💰 Tuition</option>
                <option value="library">📚 Library</option>
                <option value="lab">🔬 Lab</option>
                <option value="sports">⚽ Sports</option>
                <option value="transport">🚌 Transport</option>
                <option value="examination">📝 Examination</option>
                <option value="admission">🎓 Admission</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input name="amount" type="number" step="0.01" placeholder="0.00" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                <input name="discount" type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fine</label>
                <input name="fine" type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input name="due_date" type="date" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea name="remarks" placeholder="Add any additional notes..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Salary Form Modal */}
        {modal.title === 'Add New Salary' && (
          <form id="salaryForm" onSubmit={createSalary} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select name="employee_id" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <input name="month" type="number" min="1" max="12" placeholder="1-12" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input name="year" type="number" min="2000" max="2100" placeholder="2025" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input name="amount" type="number" step="0.01" placeholder="0.00" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea name="remarks" placeholder="Add any additional notes..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Expense Form Modal */}
        {modal.title === 'Add New Expense' && (
          <form id="expenseForm" onSubmit={createExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input name="title" type="text" placeholder="Enter expense title" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select name="category" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="utilities">💡 Utilities</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="equipment">🖥️ Equipment</option>
                <option value="office_supplies">📦 Office Supplies</option>
                <option value="salaries">💳 Salaries</option>
                <option value="miscellaneous">📝 Miscellaneous</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input name="amount" type="number" step="0.01" placeholder="0.00" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expense Date</label>
                <input name="expense_date" type="date" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea name="description" placeholder="Add expense details..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Income Form Modal */}
        {modal.title === 'Add New Income' && (
          <form id="incomeForm" onSubmit={createIncome} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select name="source" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="donations">💝 Donations</option>
                <option value="grants">🎓 Grants</option>
                <option value="fees">💰 Fees</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input name="amount" type="number" step="0.01" placeholder="0.00" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Income Date</label>
                <input name="income_date" type="date" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea name="description" placeholder="Add income details..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Edit Fee Modal */}
        {modal.title === 'Edit Fee' && editingFee && (
          <form onSubmit={updateFee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Payment Amount</label>
              <input name="paid_amount" type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select name="status" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">Keep Current Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea name="remarks" placeholder="Add any notes..." defaultValue={editingFee.remarks} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Edit Salary Modal */}
        {modal.title === 'Edit Salary' && editingSalary && (
          <form onSubmit={updateSalary} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingSalary.amount} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select name="status" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="">Keep Current Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea name="remarks" placeholder="Add any notes..." defaultValue={editingSalary.remarks} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Edit Expense Modal */}
        {modal.title === 'Edit Expense' && editingExpense && (
          <form onSubmit={updateExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input name="title" type="text" placeholder="Enter expense title" defaultValue={editingExpense.title} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select name="category" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="utilities">💡 Utilities</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="equipment">🖥️ Equipment</option>
                <option value="office_supplies">📦 Office Supplies</option>
                <option value="salaries">💳 Salaries</option>
                <option value="miscellaneous">📝 Miscellaneous</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingExpense.amount} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expense Date</label>
                <input name="expense_date" type="date" defaultValue={editingExpense.expense_date} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea name="description" placeholder="Add expense details..." defaultValue={editingExpense.description} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}

        {/* Edit Income Modal */}
        {modal.title === 'Edit Income' && editingIncome && (
          <form onSubmit={updateIncome} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select name="source" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="donations">💝 Donations</option>
                <option value="grants">🎓 Grants</option>
                <option value="fees">💰 Fees</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingIncome.amount} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Income Date</label>
                <input name="income_date" type="date" defaultValue={editingIncome.income_date} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea name="description" placeholder="Add income details..." defaultValue={editingIncome.description} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="3" />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
