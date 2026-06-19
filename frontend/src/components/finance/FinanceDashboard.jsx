import { useCallback, useEffect, useState } from 'react';
import { api, apiUrl } from '../../api';
import { useToast } from '../Toast';
import Spinner from '../Spinner';
import Modal from '../Modal';
import './FinanceDashboard.css';

const TABS = [
  { id: 'overview', label: '📊 Dashboard' },
  { id: 'fees', label: '💰 Fees' },
  { id: 'collection', label: '💵 Collection' },
  { id: 'salaries', label: '💳 Salaries' },
  { id: 'expenses', label: '📉 Expenses' },
  { id: 'incomes', label: '📈 Income' },
  { id: 'reports', label: '📋 Reports' },
  { id: 'audit', label: '🔍 Audit' },
];

const FEE_TYPES = [
  'tuition', 'semester', 'admission', 'registration', 'examination',
  'library', 'hostel', 'transport', 'laboratory', 'miscellaneous', 'other',
];

const PAYMENT_METHODS = [
  'cash', 'bank_transfer', 'online', 'card', 'stripe', 'paypal', 'razorpay', 'jazzcash', 'easypaisa',
];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const monthName = (m) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });

function BarChart({ data, labelKey, valueKey, color = 'var(--accent)' }) {
  if (!data?.length) return <p className="muted">No data available</p>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="finance-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="finance-bar-col">
          <span className="finance-bar-value">{fmt(d[valueKey])}</span>
          <div className="finance-bar" style={{ height: `${(Number(d[valueKey]) / max) * 100}%`, background: color }} />
          <span className="finance-bar-label">{String(d[labelKey]).slice(0, 8)}</span>
        </div>
      ))}
    </div>
  );
}

function PieLegend({ data, labelKey, valueKey, colors }) {
  const total = data.reduce((s, d) => s + Number(d[valueKey]), 0) || 1;
  return (
    <div className="finance-pie-legend">
      {data.map((d, i) => (
        <div key={i} className="finance-pie-row">
          <span className="finance-pie-dot" style={{ background: colors[i % colors.length] }} />
          <span>{d[labelKey]}</span>
          <span className="muted" style={{ marginLeft: 'auto' }}>{fmt(d[valueKey])} ({((Number(d[valueKey]) / total) * 100).toFixed(0)}%)</span>
        </div>
      ))}
    </div>
  );
}

export default function FinanceDashboard() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [stats, setStats] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [recentTx, setRecentTx] = useState([]);

  const [fees, setFees] = useState([]);
  const [feeFilter, setFeeFilter] = useState({ status: '', fee_type: '', student_name: '' });
  const [feePage, setFeePage] = useState(1);
  const [feePag, setFeePag] = useState({ total: 0, pages: 0 });

  const [salaries, setSalaries] = useState([]);
  const [salaryFilter, setSalaryFilter] = useState({ status: '', month: '', year: '' });
  const [salaryPage, setSalaryPage] = useState(1);
  const [salaryPag, setSalaryPag] = useState({ total: 0, pages: 0 });

  const [expenses, setExpenses] = useState([]);
  const [expenseFilter, setExpenseFilter] = useState({ category: '', date_from: '', date_to: '' });
  const [expensePage, setExpensePage] = useState(1);

  const [incomes, setIncomes] = useState([]);
  const [incomeFilter, setIncomeFilter] = useState({ source: '', date_from: '', date_to: '' });

  const [structures, setStructures] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [pendingDues, setPendingDues] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [lateRules, setLateRules] = useState([]);
  const [installments, setInstallments] = useState([]);

  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [reportType, setReportType] = useState('daily_collection');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const [modal, setModal] = useState({ open: false, title: '', onConfirm: null, danger: false, form: null });
  const [editItem, setEditItem] = useState(null);

  const loadDashboard = useCallback(async () => {
    const d = await api('finance/dashboard');
    setStats(d.stats);
    setMonthlyRevenue(d.monthly_revenue || []);
    setMonthlyExpenses(d.monthly_expenses || []);
    setRecentTx(d.recent_transactions || []);
  }, []);

  const loadFees = useCallback(async () => {
    const d = await api('finance/fees', { params: { ...feeFilter, page: feePage } });
    setFees(d.fees || []);
    setFeePag(d.pagination || { total: 0, pages: 0 });
  }, [feeFilter, feePage]);

  const loadSalaries = useCallback(async () => {
    const d = await api('finance/salaries', { params: { ...salaryFilter, page: salaryPage } });
    setSalaries(d.salaries || []);
    setSalaryPag(d.pagination || { total: 0, pages: 0 });
  }, [salaryFilter, salaryPage]);

  const loadExpenses = useCallback(async () => {
    const d = await api('finance/expenses', { params: { ...expenseFilter, page: expensePage } });
    setExpenses(d.expenses || []);
  }, [expenseFilter, expensePage]);

  const loadIncomes = useCallback(async () => {
    const d = await api('finance/incomes', { params: { ...incomeFilter, page: 1 } });
    setIncomes(d.incomes || []);
  }, [incomeFilter]);

  const loadStructures = useCallback(async () => {
    const d = await api('finance/fee-structures');
    setStructures(d.structures || []);
  }, []);

  const loadScholarships = useCallback(async () => {
    const d = await api('finance/scholarships');
    setScholarships(d.scholarships || []);
  }, []);

  const loadPending = useCallback(async () => {
    const d = await api('finance/pending-dues');
    setPendingDues(d.pending_dues || []);
  }, []);

  const loadNotifications = useCallback(async () => {
    const d = await api('finance/notifications');
    setNotifications(d.notifications || []);
  }, []);

  const loadAudit = useCallback(async () => {
    const d = await api('finance/audit', { params: { date_from: dateRange.from || undefined, date_to: dateRange.to || undefined } });
    setAuditLogs(d.logs || []);
  }, [dateRange.from, dateRange.to]);

  const loadLateRules = useCallback(async () => {
    const d = await api('finance/late-fee-rules');
    setLateRules(d.rules || []);
  }, []);

  const loadInstallments = useCallback(async () => {
    const d = await api('finance/installments');
    setInstallments(d.installments || []);
  }, []);

  const loadStudents = useCallback(async () => {
    const d = await api('admin/users', { params: { role: 'student' } });
    setStudents(d.users || []);
  }, []);

  const loadEmployees = useCallback(async () => {
    const [t, a] = await Promise.all([
      api('admin/users', { params: { role: 'teacher' } }),
      api('admin/users', { params: { role: 'admin' } }),
    ]);
    setEmployees([...(t.users || []), ...(a.users || [])]);
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
        if (tab === 'fees') { await Promise.all([loadFees(), loadStudents(), loadStructures(), loadScholarships(), loadLateRules(), loadInstallments()]); }
        if (tab === 'collection') { await Promise.all([loadPending(), loadFees()]); }
        if (tab === 'salaries') { await Promise.all([loadSalaries(), loadEmployees()]); }
        if (tab === 'expenses') await loadExpenses();
        if (tab === 'incomes') await loadIncomes();
        if (tab === 'reports') await loadReport();
        if (tab === 'audit') { await Promise.all([loadAudit(), loadNotifications()]); }
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, feePage, salaryPage, expensePage, loadDashboard, loadFees, loadSalaries, loadExpenses, loadIncomes, loadStructures, loadScholarships, loadPending, loadNotifications, loadAudit, loadLateRules, loadInstallments, loadStudents, loadEmployees, loadReport]);

  async function collectFee(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/collect-fee', { method: 'POST', body: {
        fee_id: fd.get('fee_id'), amount: fd.get('amount'),
        payment_method: fd.get('payment_method'), notes: fd.get('notes') || null,
      }});
      toast('Payment collected successfully');
      e.target.reset();
      await Promise.all([loadPending(), loadFees()]);
    } catch (ex) { setErr(ex.message); }
  }

  async function createFee(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/fees', { method: 'POST', body: {
        student_id: fd.get('student_id'), fee_type: fd.get('fee_type'), amount: fd.get('amount'),
        discount: fd.get('discount') || 0, fine: fd.get('fine') || 0, due_date: fd.get('due_date'),
        semester: fd.get('semester') || null, remarks: fd.get('remarks') || null,
      }});
      toast('Fee created'); setModal((m) => ({ ...m, open: false })); await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateFee(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/fees', { method: 'PATCH', body: {
        id: editItem.id, paid_amount: fd.get('paid_amount') || undefined,
        status: fd.get('status') || undefined, remarks: fd.get('remarks') || undefined,
      }});
      toast('Fee updated'); setEditItem(null); setModal((m) => ({ ...m, open: false })); await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  async function deleteFee(id) {
    try { await api('finance/fees', { method: 'DELETE', body: { id } }); toast('Fee deleted'); await loadFees(); }
    catch (ex) { setErr(ex.message); }
  }

  async function createSalary(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const basic = Number(fd.get('basic_salary') || fd.get('amount'));
    const allowances = Number(fd.get('allowances') || 0);
    const bonus = Number(fd.get('bonus') || 0);
    const overtime = Number(fd.get('overtime') || 0);
    const deductions = Number(fd.get('deductions') || 0);
    const tax = Number(fd.get('tax') || 0);
    const net = basic + allowances + bonus + overtime - deductions - tax;
    try {
      await api('finance/salaries', { method: 'POST', body: {
        employee_id: fd.get('employee_id'), month: fd.get('month'), year: fd.get('year'),
        amount: net, basic_salary: basic, allowances, bonus, overtime, deductions, tax, net_salary: net,
        bank_info: fd.get('bank_info') || null, remarks: fd.get('remarks') || null,
      }});
      toast('Salary created'); setModal((m) => ({ ...m, open: false })); await loadSalaries();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateSalary(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/salaries', { method: 'PATCH', body: {
        id: editItem.id, status: fd.get('status') || undefined, amount: fd.get('amount') || undefined, remarks: fd.get('remarks') || undefined,
      }});
      toast('Salary updated'); setEditItem(null); setModal((m) => ({ ...m, open: false })); await loadSalaries();
    } catch (ex) { setErr(ex.message); }
  }

  async function createExpense(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/expenses', { method: 'POST', body: {
        title: fd.get('title'), category: fd.get('category'), amount: fd.get('amount'),
        expense_date: fd.get('expense_date'), description: fd.get('description') || null,
      }});
      toast('Expense added'); setModal((m) => ({ ...m, open: false })); await loadExpenses();
    } catch (ex) { setErr(ex.message); }
  }

  async function approveExpense(id, status) {
    try {
      await api('finance/approve-expense', { method: 'POST', body: { id, status } });
      toast(`Expense ${status}`); await loadExpenses();
    } catch (ex) { setErr(ex.message); }
  }

  async function createIncome(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('finance/incomes', { method: 'POST', body: {
        source: fd.get('source'), amount: fd.get('amount'), income_date: fd.get('income_date'), description: fd.get('description') || null,
      }});
      toast('Income recorded'); setModal((m) => ({ ...m, open: false })); await loadIncomes();
    } catch (ex) { setErr(ex.message); }
  }

  async function sendReminder(feeId) {
    try {
      await api('finance/send-reminder', { method: 'POST', body: { fee_id: feeId, channel: 'notification' } });
      toast('Reminder sent');
    } catch (ex) { setErr(ex.message); }
  }

  function exportReport(fmtType) {
    const url = apiUrl('finance/reports', { report_type: reportType, date_from: dateRange.from, date_to: dateRange.to, format: fmtType });
    window.open(url, '_blank');
  }

  function exportCSV(rows, name) {
    if (!rows?.length) { toast('No data'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${name}.csv`;
    a.click();
    toast('Exported');
  }

  const s = stats || {};
  const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

  return (
    <div className="finance-dashboard fade-in">
      <header className="dashboard-header">
        <div>
          <h1 className="page-title">Finance Management</h1>
          <p className="page-subtitle">Enterprise financial operations — fees, salaries, expenses, reports & analytics</p>
        </div>
      </header>

      {err && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{err}</div>}

      <div className="finance-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`finance-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && tab !== 'overview' ? <div className="loading-state"><Spinner /></div> : null}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          {loading ? <div className="loading-state"><Spinner /></div> : (
            <>
              <div className="grid-stats">
                <div className="stat-card"><div className="stat-icon indigo">💰</div><div><div className="lbl">Total Revenue</div><div className="val">{fmt(s.total_revenue || s.total_income)}</div></div></div>
                <div className="stat-card"><div className="stat-icon red">📉</div><div><div className="lbl">Total Expenses</div><div className="val">{fmt(s.total_expenses)}</div></div></div>
                <div className="stat-card"><div className="stat-icon blue">🎓</div><div><div className="lbl">Student Fees</div><div className="val">{fmt(s.total_student_fees)}</div></div></div>
                <div className="stat-card"><div className="stat-icon amber">⏳</div><div><div className="lbl">Pending Fees</div><div className="val">{fmt(s.pending_fees || s.pending_dues)}</div></div></div>
                <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="lbl">Collected Fees</div><div className="val">{fmt(s.collected_fees)}</div></div></div>
                <div className="stat-card"><div className="stat-icon indigo">👨‍🏫</div><div><div className="lbl">Teacher Salaries</div><div className="val">{fmt(s.teacher_salaries)}</div></div></div>
                <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="lbl">Staff Salaries</div><div className="val">{fmt(s.staff_salaries)}</div></div></div>
                <div className="stat-card"><div className="stat-icon green">📈</div><div><div className="lbl">Monthly Income</div><div className="val">{fmt(s.monthly_income)}</div></div></div>
                <div className="stat-card"><div className="stat-icon red">📊</div><div><div className="lbl">Monthly Expenses</div><div className="val">{fmt(s.monthly_expenses)}</div></div></div>
                <div className="stat-card"><div className="stat-icon indigo">💹</div><div><div className="lbl">Profit & Loss</div><div className="val" style={{ color: (s.profit_loss ?? s.net_balance) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(s.profit_loss ?? s.net_balance)}</div></div></div>
                <div className="stat-card"><div className="stat-icon green">💵</div><div><div className="lbl">Cash Flow</div><div className="val">{fmt(s.cash_flow)}</div></div></div>
              </div>

              <div className="finance-charts">
                <div className="finance-chart-card">
                  <h4>Revenue Trends (12 months)</h4>
                  <BarChart data={s.revenue_trends || monthlyRevenue} labelKey="month" valueKey="revenue" />
                </div>
                <div className="finance-chart-card">
                  <h4>Monthly Expenses</h4>
                  <BarChart data={monthlyExpenses} labelKey="month" valueKey="expense" color="var(--danger)" />
                </div>
                <div className="finance-chart-card">
                  <h4>Fee Collection by Type</h4>
                  <PieLegend data={s.fee_collection_chart || []} labelKey="fee_type" valueKey="total" colors={pieColors} />
                </div>
                <div className="finance-chart-card">
                  <h4>Expenses by Category</h4>
                  <PieLegend data={s.expense_chart || []} labelKey="category" valueKey="total" colors={pieColors} />
                </div>
              </div>

              <div className="finance-section-grid">
                <div className="card glass">
                  <h3>Recent Transactions</h3>
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>Type</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {recentTx.map((tx, i) => (
                          <tr key={i}>
                            <td><span className="badge badge-draft">{tx.type}</span></td>
                            <td>{tx.student_name}</td>
                            <td>{fmt(tx.paid_amount || tx.amount)}</td>
                            <td>{fmtDate(tx.created_at)}</td>
                            <td><span className={`badge badge-${tx.status}`}>{tx.status}</span></td>
                          </tr>
                        ))}
                        {!recentTx.length && <tr><td colSpan={5} className="muted">No recent transactions</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card glass">
                  <h3>Due Fee Alerts</h3>
                  <ul className="finance-alert-list">
                    {(s.due_fee_alerts || []).map((a) => (
                      <li key={a.id} className={`finance-alert-item ${a.days_overdue > 0 ? 'overdue' : ''}`}>
                        <div><strong>{a.student_name}</strong><br /><span className="muted">{a.fee_type} — due {fmtDate(a.due_date)}</span></div>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(a.remaining_amount)}</span>
                      </li>
                    ))}
                    {!(s.due_fee_alerts || []).length && <li className="muted">No upcoming dues</li>}
                  </ul>
                  <h3 style={{ marginTop: '1.5rem' }}>Upcoming Salary Payments</h3>
                  <ul className="finance-alert-list">
                    {(s.upcoming_salary_payments || []).map((sal) => (
                      <li key={sal.id} className="finance-alert-item">
                        <div><strong>{sal.employee_name}</strong><br /><span className="muted">{monthName(sal.month)} {sal.year}</span></div>
                        <span style={{ fontWeight: 600 }}>{fmt(sal.amount)}</span>
                      </li>
                    ))}
                    {!(s.upcoming_salary_payments || []).length && <li className="muted">No pending salaries</li>}
                  </ul>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── FEES ── */}
      {tab === 'fees' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Student Fee Management</h2>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, title: 'Add Fee Record', form: 'fee' })}>+ Add Fee</button>
          </div>
          <div className="finance-filters">
            <input className="inp" placeholder="Student name" value={feeFilter.student_name} onChange={(e) => setFeeFilter({ ...feeFilter, student_name: e.target.value })} />
            <select className="inp" value={feeFilter.fee_type} onChange={(e) => setFeeFilter({ ...feeFilter, fee_type: e.target.value })}>
              <option value="">All Types</option>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="inp" value={feeFilter.status} onChange={(e) => setFeeFilter({ ...feeFilter, status: e.target.value })}>
              <option value="">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
            <button type="button" className="btn btn-ghost" onClick={() => { setFeePage(1); loadFees(); }}>Filter</button>
            <button type="button" className="btn btn-ghost" onClick={() => exportCSV(fees, 'fees')}>Export CSV</button>
          </div>
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Type</th><th>Amount</th><th>Discount</th><th>Fine</th><th>Paid</th><th>Remaining</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.student_name}</strong><br /><span className="muted">{f.student_code}</span></td>
                      <td>{f.fee_type}</td>
                      <td>{fmt(f.amount)}</td>
                      <td>{fmt(f.discount)}</td>
                      <td>{fmt(f.fine)}</td>
                      <td>{fmt(f.paid_amount)}</td>
                      <td style={{ fontWeight: 600, color: f.remaining_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(f.remaining_amount)}</td>
                      <td>{fmtDate(f.due_date)}</td>
                      <td><span className={`badge badge-${f.status}`}>{f.status?.replace('_', ' ')}</span></td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditItem(f); setModal({ open: true, title: 'Edit Fee', form: 'editFee' }); }}>Edit</button>
                        {f.status === 'paid' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(apiUrl('finance/fee-receipt', { id: f.id, format: 'pdf' }), '_blank')}>Receipt</button>}
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setModal({ open: true, title: 'Delete Fee', message: 'Delete this fee record?', danger: true, onConfirm: () => { deleteFee(f.id); setModal((m) => ({ ...m, open: false })); } })}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!fees.length && <tr><td colSpan={10} className="muted">No fees found</td></tr>}
                </tbody>
              </table>
            </div>
            {feePag.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
                <span className="muted">Page {feePage} of {feePag.pages}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={feePage <= 1} onClick={() => setFeePage((p) => p - 1)}>Prev</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={feePage >= feePag.pages} onClick={() => setFeePage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>

          <div className="finance-subsection">
            <h3>Fee Structures</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Semester</th><th>Status</th></tr></thead>
                <tbody>
                  {structures.map((st) => (
                    <tr key={st.id}><td>{st.name}</td><td>{st.fee_type}</td><td>{fmt(st.amount)}</td><td>{st.semester || '—'}</td><td><span className={`badge badge-${st.is_active ? 'approved' : 'inactive'}`}>{st.is_active ? 'Active' : 'Inactive'}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="finance-subsection">
            <h3>Scholarships</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Scholarship</th><th>Type</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  {scholarships.map((sc) => (
                    <tr key={sc.id}><td>{sc.student_name}</td><td>{sc.name}</td><td>{sc.discount_type}</td><td>{sc.discount_type === 'percentage' ? `${sc.discount_value}%` : fmt(sc.discount_value)}</td><td><span className={`badge badge-${sc.status}`}>{sc.status}</span></td></tr>
                  ))}
                  {!scholarships.length && <tr><td colSpan={5} className="muted">No scholarships</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="finance-subsection">
            <h3>Installment Plans</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Fee Type</th><th>Total</th><th>Installments</th><th>Per Installment</th><th>Paid</th><th>Next Due</th><th>Status</th></tr></thead>
                <tbody>
                  {installments.map((ip) => (
                    <tr key={ip.id}><td>{ip.student_name}</td><td>{ip.fee_type}</td><td>{fmt(ip.total_amount)}</td><td>{ip.num_installments}</td><td>{fmt(ip.installment_amount)}</td><td>{ip.paid_installments}/{ip.num_installments}</td><td>{fmtDate(ip.next_due_date)}</td><td><span className={`badge badge-${ip.status}`}>{ip.status}</span></td></tr>
                  ))}
                  {!installments.length && <tr><td colSpan={8} className="muted">No installment plans</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── COLLECTION ── */}
      {tab === 'collection' && !loading && (
        <>
          <div className="finance-section-grid">
            <div className="card glass">
              <h3>Collect Fee</h3>
              <form onSubmit={collectFee} className="stack">
                <label>Fee Record
                  <select name="fee_id" className="inp" required>
                    <option value="">Select fee</option>
                    {fees.filter((f) => f.remaining_amount > 0).map((f) => (
                      <option key={f.id} value={f.id}>{f.student_name} — {f.fee_type} ({fmt(f.remaining_amount)} due)</option>
                    ))}
                  </select>
                </label>
                <label>Amount <input name="amount" type="number" step="0.01" className="inp" required /></label>
                <label>Payment Method
                  <select name="payment_method" className="inp" required>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </label>
                <label>Notes <textarea name="notes" className="inp" rows={2} /></label>
                <button type="submit" className="btn btn-primary">Collect Payment</button>
              </form>
            </div>
            <div className="card glass">
              <h3>Pending Dues ({pendingDues.length})</h3>
              <div className="table-wrap" style={{ maxHeight: 400, overflow: 'auto' }}>
                <table className="data">
                  <thead><tr><th>Student</th><th>Due</th><th>Fine</th><th>Total</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingDues.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.student_name}</strong><br /><span className="muted">{d.fee_type}</span></td>
                        <td>{fmt(d.remaining_amount)}</td>
                        <td>{fmt(d.calculated_fine)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(d.total_due)}</td>
                        <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => sendReminder(d.id)}>Remind</button></td>
                      </tr>
                    ))}
                    {!pendingDues.length && <tr><td colSpan={5} className="muted">No pending dues</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SALARIES ── */}
      {tab === 'salaries' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Salary Management</h2>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, title: 'Generate Salary', form: 'salary' })}>+ Generate Salary</button>
          </div>
          <div className="finance-filters">
            <select className="inp" value={salaryFilter.status} onChange={(e) => setSalaryFilter({ ...salaryFilter, status: e.target.value })}>
              <option value="">All Status</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option>
            </select>
            <input className="inp" type="number" placeholder="Month" value={salaryFilter.month} onChange={(e) => setSalaryFilter({ ...salaryFilter, month: e.target.value })} />
            <input className="inp" type="number" placeholder="Year" value={salaryFilter.year} onChange={(e) => setSalaryFilter({ ...salaryFilter, year: e.target.value })} />
            <button type="button" className="btn btn-ghost" onClick={loadSalaries}>Filter</button>
            <button type="button" className="btn btn-ghost" onClick={() => exportCSV(salaries, 'salaries')}>Export CSV</button>
          </div>
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Employee</th><th>Role</th><th>Period</th><th>Basic</th><th>Allowances</th><th>Bonus</th><th>Deductions</th><th>Tax</th><th>Net</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {salaries.map((sal) => (
                    <tr key={sal.id}>
                      <td><strong>{sal.employee_name}</strong></td>
                      <td>{sal.employee_role}</td>
                      <td>{monthName(sal.month)} {sal.year}</td>
                      <td>{fmt(sal.basic_salary || sal.amount)}</td>
                      <td>{fmt(sal.allowances)}</td>
                      <td>{fmt(sal.bonus)}</td>
                      <td>{fmt(sal.deductions)}</td>
                      <td>{fmt(sal.tax)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(sal.net_salary || sal.amount)}</td>
                      <td><span className={`badge badge-${sal.status}`}>{sal.status}</span></td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditItem(sal); setModal({ open: true, title: 'Edit Salary', form: 'editSalary' }); }}>Edit</button>
                        {sal.status === 'paid' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(apiUrl('finance/salary-slip', { id: sal.id, format: 'pdf' }), '_blank')}>Slip</button>}
                      </td>
                    </tr>
                  ))}
                  {!salaries.length && <tr><td colSpan={11} className="muted">No salary records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── EXPENSES ── */}
      {tab === 'expenses' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Expense Management</h2>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, title: 'Add Expense', form: 'expense' })}>+ Add Expense</button>
          </div>
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex.id}>
                      <td><strong>{ex.title}</strong><br /><span className="muted">{ex.description?.slice(0, 50)}</span></td>
                      <td>{ex.category}</td>
                      <td>{fmt(ex.amount)}</td>
                      <td>{fmtDate(ex.expense_date)}</td>
                      <td><span className={`badge badge-${ex.status || 'approved'}`}>{ex.status || 'approved'}</span></td>
                      <td>
                        {(ex.status === 'pending' || !ex.status) && (
                          <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => approveExpense(ex.id, 'approved')}>Approve</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => approveExpense(ex.id, 'rejected')}>Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!expenses.length && <tr><td colSpan={6} className="muted">No expenses</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── INCOMES ── */}
      {tab === 'incomes' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Income Management</h2>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, title: 'Add Income', form: 'income' })}>+ Add Income</button>
          </div>
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Source</th><th>Amount</th><th>Date</th><th>Description</th></tr></thead>
                <tbody>
                  {incomes.map((inc) => (
                    <tr key={inc.id}><td>{inc.source}</td><td>{fmt(inc.amount)}</td><td>{fmtDate(inc.income_date)}</td><td>{inc.description || '—'}</td></tr>
                  ))}
                  {!incomes.length && <tr><td colSpan={4} className="muted">No income records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && (
        <>
          <div className="finance-filters">
            <select className="inp" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="daily_collection">Daily Collection</option>
              <option value="weekly_collection">Weekly Collection</option>
              <option value="monthly_collection">Monthly Collection</option>
              <option value="yearly_collection">Yearly Collection</option>
              <option value="outstanding_fees">Pending Fees</option>
              <option value="salary_report">Salary Report</option>
              <option value="expense_report">Expense Report</option>
              <option value="income_report">Income Report</option>
              <option value="profit_loss">Profit & Loss</option>
            </select>
            <input className="inp" type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
            <input className="inp" type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
            <button type="button" className="btn btn-primary" onClick={loadReport}>Generate</button>
            <button type="button" className="btn btn-ghost" onClick={() => exportReport('excel')}>Export Excel</button>
            <button type="button" className="btn btn-ghost" onClick={() => exportCSV(Array.isArray(reportData) ? reportData : [reportData], reportType)}>Export CSV</button>
          </div>
          <div className="card glass">
            {loading ? <Spinner /> : reportData ? (
              Array.isArray(reportData) ? (
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr>{reportData[0] && Object.keys(reportData[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                    <tbody>{reportData.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              ) : (
                <pre style={{ padding: '1rem', overflow: 'auto' }}>{JSON.stringify(reportData, null, 2)}</pre>
              )
            ) : <p className="muted">Select a report type and click Generate</p>}
          </div>
        </>
      )}

      {/* ── AUDIT ── */}
      {tab === 'audit' && !loading && (
        <div className="finance-section-grid">
          <div className="card glass">
            <h3>Finance Audit Logs</h3>
            <div className="table-wrap" style={{ maxHeight: 450, overflow: 'auto' }}>
              <table className="data">
                <thead><tr><th>User</th><th>Action</th><th>Details</th><th>Date</th></tr></thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}><td>{log.user_name}</td><td><span className="badge badge-draft">{log.action}</span></td><td className="muted">{log.details?.slice(0, 60)}</td><td>{fmtDate(log.created_at)}</td></tr>
                  ))}
                  {!auditLogs.length && <tr><td colSpan={4} className="muted">No audit logs</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card glass">
            <h3>Notifications</h3>
            {notifications.map((n) => (
              <div key={n.id} className={`finance-notif-item ${n.is_read ? '' : 'unread'}`} onClick={async () => { await api('finance/notifications', { method: 'PATCH', body: { id: n.id } }); loadNotifications(); }}>
                <strong>{n.title}</strong>
                <p className="muted" style={{ margin: '0.25rem 0' }}>{n.message}</p>
                <small className="muted">{fmtDate(n.created_at)}</small>
              </div>
            ))}
            {!notifications.length && <p className="muted">No notifications</p>}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <Modal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || (() => { document.getElementById('financeModalForm')?.requestSubmit(); setModal((m) => ({ ...m, open: false })); })}
        onCancel={() => { setModal((m) => ({ ...m, open: false })); setEditItem(null); }}
        danger={modal.danger}
        confirmText={modal.danger ? 'Delete' : 'Save'}
      >
        {modal.form === 'fee' && (
          <form id="financeModalForm" onSubmit={createFee} className="stack">
            <label>Student <select name="student_id" className="inp" required><option value="">Select</option>{students.map((st) => <option key={st.id} value={st.id}>{st.full_name}</option>)}</select></label>
            <label>Fee Type <select name="fee_type" className="inp" required>{FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
            <label>Amount <input name="amount" type="number" step="0.01" className="inp" required /></label>
            <label>Discount <input name="discount" type="number" step="0.01" className="inp" defaultValue="0" /></label>
            <label>Fine <input name="fine" type="number" step="0.01" className="inp" defaultValue="0" /></label>
            <label>Due Date <input name="due_date" type="date" className="inp" required /></label>
            <label>Semester <input name="semester" className="inp" placeholder="Fall 2025" /></label>
            <label>Remarks <textarea name="remarks" className="inp" rows={2} /></label>
          </form>
        )}
        {modal.form === 'editFee' && editItem && (
          <form id="financeModalForm" onSubmit={updateFee} className="stack">
            <label>Additional Payment <input name="paid_amount" type="number" step="0.01" className="inp" /></label>
            <label>Status <select name="status" className="inp"><option value="">Keep current</option><option value="unpaid">Unpaid</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option></select></label>
            <label>Remarks <textarea name="remarks" className="inp" defaultValue={editItem.remarks} rows={2} /></label>
          </form>
        )}
        {modal.form === 'salary' && (
          <form id="financeModalForm" onSubmit={createSalary} className="stack">
            <label>Employee <select name="employee_id" className="inp" required><option value="">Select</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.role})</option>)}</select></label>
            <div className="form-row"><label>Month <input name="month" type="number" min="1" max="12" className="inp" required /></label><label>Year <input name="year" type="number" className="inp" required defaultValue={new Date().getFullYear()} /></label></div>
            <label>Basic Salary <input name="basic_salary" type="number" step="0.01" className="inp" required /></label>
            <div className="form-row"><label>Allowances <input name="allowances" type="number" step="0.01" className="inp" defaultValue="0" /></label><label>Bonus <input name="bonus" type="number" step="0.01" className="inp" defaultValue="0" /></label></div>
            <div className="form-row"><label>Overtime <input name="overtime" type="number" step="0.01" className="inp" defaultValue="0" /></label><label>Deductions <input name="deductions" type="number" step="0.01" className="inp" defaultValue="0" /></label></div>
            <label>Tax <input name="tax" type="number" step="0.01" className="inp" defaultValue="0" /></label>
            <label>Bank Info <input name="bank_info" className="inp" placeholder="Account details" /></label>
            <label>Remarks <textarea name="remarks" className="inp" rows={2} /></label>
          </form>
        )}
        {modal.form === 'editSalary' && editItem && (
          <form id="financeModalForm" onSubmit={updateSalary} className="stack">
            <label>Amount <input name="amount" type="number" step="0.01" className="inp" defaultValue={editItem.amount} /></label>
            <label>Status <select name="status" className="inp"><option value="">Keep current</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
            <label>Remarks <textarea name="remarks" className="inp" defaultValue={editItem.remarks} rows={2} /></label>
          </form>
        )}
        {modal.form === 'expense' && (
          <form id="financeModalForm" onSubmit={createExpense} className="stack">
            <label>Title <input name="title" className="inp" required /></label>
            <label>Category <select name="category" className="inp" required>
              {['utilities','maintenance','equipment','office_supplies','electricity','internet','water','furniture','stationery','events','marketing','miscellaneous'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
            <label>Amount <input name="amount" type="number" step="0.01" className="inp" required /></label>
            <label>Date <input name="expense_date" type="date" className="inp" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label>Description <textarea name="description" className="inp" rows={2} /></label>
          </form>
        )}
        {modal.form === 'income' && (
          <form id="financeModalForm" onSubmit={createIncome} className="stack">
            <label>Source <select name="source" className="inp" required>
              {['donations','grants','fees','event_income','hostel_income','transport_income','other'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select></label>
            <label>Amount <input name="amount" type="number" step="0.01" className="inp" required /></label>
            <label>Date <input name="income_date" type="date" className="inp" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label>Description <textarea name="description" className="inp" rows={2} /></label>
          </form>
        )}
      </Modal>
    </div>
  );
}
