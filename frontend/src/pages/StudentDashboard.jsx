import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUrl, getSessionHeaders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Spinner from '../components/Spinner';
import '../components/finance/FinanceDashboard.css';

const NAV = [
  { id: 'catalog', label: 'Course Catalog' },
  { id: 'courses', label: 'My Courses' },
  { id: 'course', label: 'Course Workspace' },
  { id: 'fees', label: 'My Fees' },
];

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('catalog');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [offeringId, setOfferingId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState([]);
  const [finalRes, setFinalRes] = useState(null);
  const [fees, setFees] = useState([]);
  const [feeSummary, setFeeSummary] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payGateway, setPayGateway] = useState('stripe');
  const [payFeeId, setPayFeeId] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const approved = enrollments.filter((e) => e.status === 'approved');

  const loadCatalog = useCallback(async () => { const d = await api('student/catalog'); setCatalog(d.offerings || []); }, []);
  const loadEnrollments = useCallback(async () => { const d = await api('enrollments'); setEnrollments(d.enrollments || []); }, []);
  const loadAssignments = useCallback(async () => { if (!offeringId) { setAssignments([]); return; } const d = await api('assignments', { params: { course_offering_id: offeringId } }); setAssignments(d.assignments || []); }, [offeringId]);
  const loadAttendance = useCallback(async () => { if (!offeringId) { setAttendance(null); return; } const d = await api('attendance', { params: { course_offering_id: offeringId } }); setAttendance(d); }, [offeringId]);
  const loadMarks = useCallback(async () => { if (!offeringId) { setMarks([]); return; } const d = await api('marks', { params: { course_offering_id: offeringId } }); setMarks(d.marks || []); }, [offeringId]);
  const loadFinal = useCallback(async () => { if (!offeringId) { setFinalRes(null); return; } const d = await api('final-results', { params: { course_offering_id: offeringId } }); setFinalRes(d.result || null); }, [offeringId]);
  const loadFees = useCallback(async () => {
    const [fd, id, nf] = await Promise.all([
      api('finance/my-fees'),
      api('finance/installments'),
      api('finance/notifications'),
    ]);
    setFees(fd.fees || []);
    setFeeSummary(fd.summary || null);
    setInstallments(id.installments || []);
    setNotifications(nf.notifications || []);
  }, []);

  useEffect(() => {
    setErr(''); setLoading(true);
    (async () => {
      try {
        if (tab === 'catalog') await loadCatalog();
        if (tab === 'courses') await loadEnrollments();
        if (tab === 'fees') await loadFees();
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, loadCatalog, loadEnrollments, loadFees]);

  useEffect(() => { if (approved.length && !offeringId) setOfferingId(String(approved[0].course_offering_id)); }, [approved, offeringId]);

  useEffect(() => {
    if (tab !== 'course' || !offeringId) return;
    setErr('');
    (async () => { try { await Promise.all([loadAssignments(), loadAttendance(), loadMarks(), loadFinal()]); } catch (e) { setErr(e.message); } })();
  }, [tab, offeringId, loadAssignments, loadAttendance, loadMarks, loadFinal]);

  async function requestEnrollment(oid) {
    try { await api('enrollments', { method: 'POST', body: { action: 'request', course_offering_id: oid } }); toast('Enrollment requested'); await loadCatalog(); await loadEnrollments(); }
    catch (e) { setErr(e.message); }
  }

  async function submitAssignment(aid, e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.set('assignment_id', aid);
    try {
      const res = await fetch(apiUrl('submissions/upload'), { method: 'POST', body: fd, credentials: 'include', headers: getSessionHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      e.target.reset(); toast('Submission uploaded'); await loadAssignments();
    } catch (ex) { setErr(ex.message); }
  }

  async function handleLogout() { await logout(); navigate('/login'); }

  async function payOnline(e) {
    e.preventDefault();
    if (!payFeeId || !payAmount) { setErr('Select a fee and enter amount'); return; }
    try {
      const d = await api('finance/online-payments', { method: 'POST', body: { fee_id: Number(payFeeId), amount: Number(payAmount), gateway: payGateway } });
      toast(d.message);
      setPayFeeId('');
      setPayAmount('');
      await loadFees();
    } catch (ex) { setErr(ex.message); }
  }

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  const pendingFees = fees.filter((f) => f.status !== 'paid');

  // Attendance percentage color
  const attPct = attendance?.percentage;
  const attColor = attPct == null ? '' : attPct >= 75 ? 'green' : attPct >= 50 ? 'amber' : 'red';

  return (
    <DashboardLayout title="Student" role="student" userName={user?.full_name} navItems={NAV} active={tab} onNav={setTab} onLogout={handleLogout}>
      {err && <div className="alert alert-error" role="alert">{err}</div>}

      {tab === 'catalog' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Course Catalog</h1>
              <p className="page-subtitle">Browse and enroll in available course offerings for the current term.</p>
            </div>
          </header>

          {loading ? <div className="loading-state"><Spinner /></div> : (
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Course</th><th>Class / Section</th><th>Teacher</th><th>Term</th><th>Action</th></tr></thead>
                <tbody>
                  {catalog.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.code} — {o.title}</td>
                      <td>{o.class_name} / {o.section_name}</td>
                      <td className="muted">{o.teacher_name}</td>
                      <td className="muted">{o.semester} {o.academic_year}</td>
                      <td>
                        {o.enrollment_status === 'approved' && <span className="badge badge-approved">Enrolled</span>}
                        {o.enrollment_status === 'pending' && <span className="badge badge-pending">Pending</span>}
                        {o.enrollment_status === 'rejected' && <span className="badge badge-rejected">Rejected</span>}
                        {!o.enrollment_status && <button type="button" className="btn btn-primary btn-sm" onClick={() => requestEnrollment(o.id)}>Enroll Now</button>}
                      </td>
                    </tr>
                  ))}
                  {catalog.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>No courses available at the moment.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">My Courses</h1>
              <p className="page-subtitle">View your active enrollments and academic status.</p>
            </div>
          </header>

          {loading ? <div className="loading-state"><Spinner /></div> : (
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Course</th><th>Teacher</th><th>Status</th></tr></thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.code} — {e.title}</td>
                      <td className="muted">{e.teacher_name}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>You have not enrolled in any courses yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {tab === 'course' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Course Workspace</h1>
              <p className="page-subtitle">Access learning materials, track attendance, and view your grades.</p>
            </div>
          </header>

          <div className="card glass">
            <label style={{ fontWeight: 600 }}>Active Course
              <select className="inp" value={offeringId} onChange={(e) => setOfferingId(e.target.value)} style={{ marginTop: '0.5rem', width: '100%', maxWidth: '400px' }}>
                {approved.map((e) => (<option key={e.course_offering_id} value={e.course_offering_id}>{e.code} — {e.title}</option>))}
              </select>
            </label>
            {approved.length === 0 && <div className="empty-state"><p>No active courses found. Browse the catalog to enroll.</p></div>}
          </div>

          {approved.length > 0 && (
            <>
              {/* Assignments */}
              <div className="card">
                <h3>Assignments & Quizzes</h3>
                {assignments.map((a) => (
                  <div key={a.id} style={{ borderTop: '1px solid var(--border-light)', padding: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{a.title}</strong>
                        <span className="badge badge-draft" style={{ marginLeft: 8 }}>{a.assignment_type}</span>
                        <div className="muted">Due: {a.due_at || '—'}</div>
                        {a.attachment_url && <a href={a.attachment_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem' }}>Download Material</a>}
                      </div>
                      <form onSubmit={(ev) => submitAssignment(a.id, ev)} className="stack" style={{ minWidth: 220 }}>
                        <textarea className="inp" name="text_content" placeholder="Notes or answer text" rows={2} />
                        <input className="inp" name="file" type="file" />
                        <button type="submit" className="btn btn-primary btn-sm">Submit</button>
                        {a.my_submission && (
                          <span className="muted" style={{ fontSize: '0.82rem' }}>
                            ✓ Submitted {a.my_submission.submitted_at}
                            {a.my_submission.marks_obtained != null && ` — Grade: ${a.my_submission.marks_obtained}`}
                          </span>
                        )}
                      </form>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && <div className="empty-state"><p>No items posted yet.</p></div>}
              </div>

              {/* Attendance */}
              <div className="card">
                <h3>Attendance</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: attPct != null && attPct >= 75 ? 'var(--success)' : attPct != null && attPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {attPct != null ? `${attPct}%` : '—'}
                    </div>
                    <div className="muted">Sessions: {attendance?.sessions_marked ?? 0}</div>
                  </div>
                  {attPct != null && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div className="progress-bar">
                        <div className={`progress-fill ${attColor}`} style={{ width: `${attPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Marks */}
              <div className="card">
                <h3>Marks</h3>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Type</th><th>Title</th><th>Score</th></tr></thead>
                    <tbody>
                      {marks.map((m) => (
                        <tr key={m.id}>
                          <td><span className="badge badge-draft">{m.mark_type}</span></td>
                          <td>{m.title}</td>
                          <td style={{ fontWeight: 600 }}>{m.marks_obtained} / {m.max_marks}</td>
                        </tr>
                      ))}
                      {marks.length === 0 && <tr><td colSpan={3} className="muted" style={{ textAlign: 'center' }}>No marks recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Final Result */}
              <div className="card">
                <h3>Final Result</h3>
                {finalRes && finalRes.status === 'approved' ? (
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div className="muted">Total Marks</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{finalRes.total_marks}</div>
                    </div>
                    <div>
                      <div className="muted">Grade</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{finalRes.grade || '—'}</div>
                    </div>
                    <span className="badge badge-approved">Approved</span>
                  </div>
                ) : (
                  <div className="empty-state"><p>Final grades appear here after the administrator approves them.</p></div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">My Fees</h1>
              <p className="page-subtitle">View fee structure, pending dues, payment history, and pay online.</p>
            </div>
          </header>

          {loading ? <div className="loading-state"><Spinner /></div> : (
            <>
              {feeSummary && (
                <div className="grid-stats">
                  <div className="stat-card"><div className="stat-icon indigo">💰</div><div><div className="lbl">Total Amount</div><div className="val">{fmt(feeSummary.total_amount)}</div></div></div>
                  <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="lbl">Total Paid</div><div className="val">{fmt(feeSummary.total_paid)}</div></div></div>
                  <div className="stat-card"><div className="stat-icon amber">⏳</div><div><div className="lbl">Remaining</div><div className="val" style={{ color: feeSummary.total_remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(feeSummary.total_remaining)}</div></div></div>
                </div>
              )}

              {pendingFees.length > 0 && (
                <div className="card glass" style={{ marginBottom: '1rem' }}>
                  <h3>Online Fee Payment</h3>
                  <form onSubmit={payOnline} className="stack">
                    <label>Fee Record
                      <select className="inp" value={payFeeId} onChange={(e) => { setPayFeeId(e.target.value); const f = fees.find((x) => String(x.id) === e.target.value); if (f) setPayAmount(String(f.remaining_amount)); }}>
                        <option value="">Select fee to pay</option>
                        {pendingFees.map((f) => <option key={f.id} value={f.id}>{f.fee_type} — {fmt(f.remaining_amount)} due</option>)}
                      </select>
                    </label>
                    <label>Amount <input className="inp" type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required /></label>
                    <label>Payment Gateway</label>
                    <div className="finance-gateway-grid">
                      {['stripe', 'paypal', 'razorpay', 'jazzcash', 'easypaisa', 'bank_transfer'].map((g) => (
                        <button key={g} type="button" className={`finance-gateway-btn ${payGateway === g ? 'selected' : ''}`} onClick={() => setPayGateway(g)}>{g.replace('_', ' ')}</button>
                      ))}
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Pay Now</button>
                  </form>
                </div>
              )}

              <div className="card glass">
                <h3>Fee History</h3>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Fee Type</th><th>Semester</th><th>Amount</th><th>Discount</th><th>Fine</th><th>Paid</th><th>Remaining</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {fees.map((f) => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.fee_type}</td>
                          <td>{f.semester || '—'}</td>
                          <td>{fmt(f.amount)}</td>
                          <td>{fmt(f.discount)}</td>
                          <td>{fmt(f.fine)}</td>
                          <td>{fmt(f.paid_amount)}</td>
                          <td style={{ fontWeight: 600, color: f.remaining_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(f.remaining_amount)}</td>
                          <td>{new Date(f.due_date).toLocaleDateString()}</td>
                          <td><span className={`badge badge-${f.status}`}>{f.status?.replace('_', ' ')}</span></td>
                          <td>
                            {(f.status === 'paid' || f.paid_amount > 0) && (
                              <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { const d = await api('finance/fee-receipt', { params: { id: f.id } }); setSelectedFee(d); } catch (e) { setErr(e.message); } }}>Receipt</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(apiUrl('finance/fee-receipt', { id: f.id, format: 'pdf' }), '_blank')}>PDF</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {fees.length === 0 && <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No fee records found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {installments.length > 0 && (
                <div className="card glass" style={{ marginTop: '1rem' }}>
                  <h3>Installment Status</h3>
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>Fee Type</th><th>Total</th><th>Installments</th><th>Per Payment</th><th>Paid</th><th>Next Due</th><th>Status</th></tr></thead>
                      <tbody>
                        {installments.map((ip) => (
                          <tr key={ip.id}><td>{ip.fee_type}</td><td>{fmt(ip.total_amount)}</td><td>{ip.num_installments}</td><td>{fmt(ip.installment_amount)}</td><td>{ip.paid_installments}/{ip.num_installments}</td><td>{ip.next_due_date ? new Date(ip.next_due_date).toLocaleDateString() : '—'}</td><td><span className={`badge badge-${ip.status}`}>{ip.status}</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {notifications.filter((n) => !n.is_read).length > 0 && (
                <div className="card glass" style={{ marginTop: '1rem' }}>
                  <h3>Payment Notifications</h3>
                  {notifications.filter((n) => !n.is_read).slice(0, 5).map((n) => (
                    <div key={n.id} className="finance-notif-item unread">
                      <strong>{n.title}</strong>
                      <p className="muted" style={{ margin: '0.25rem 0' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedFee && (
                <div className="card glass" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Fee Receipt</h3>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedFee(null)}>Close</button>
                  </div>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                    <p><strong>Student:</strong> {selectedFee.student?.full_name}</p>
                    <p><strong>Student Code:</strong> {selectedFee.student?.student_code}</p>
                    <p><strong>Fee Type:</strong> {selectedFee.fee.fee_type}</p>
                    <p><strong>Amount:</strong> {fmt(selectedFee.fee.amount)}</p>
                    <p><strong>Discount:</strong> {fmt(selectedFee.fee.discount)}</p>
                    <p><strong>Fine:</strong> {fmt(selectedFee.fee.fine)}</p>
                    <p><strong>Paid:</strong> {fmt(selectedFee.fee.paid_amount)}</p>
                    <p><strong>Remaining:</strong> {fmt(selectedFee.fee.remaining_amount)}</p>
                    <p><strong>Status:</strong> {selectedFee.fee.status?.replace('_', ' ')}</p>
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.print()}>Print Receipt</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
