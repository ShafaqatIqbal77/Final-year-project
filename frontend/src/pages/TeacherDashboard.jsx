import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUrl, getSessionHeaders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Spinner from '../components/Spinner';

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'marks', label: 'Marks' },
  { id: 'final', label: 'Final Results' },
  { id: 'salary', label: 'Salary' },
];

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [offeringId, setOfferingId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState([]);
  const [finalRows, setFinalRows] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [selectedSalary, setSelectedSalary] = useState(null);

  const loadOfferings = useCallback(async () => { const d = await api('offerings'); setOfferings(d.offerings || []); }, []);
  const loadEnrollments = useCallback(async () => { const d = await api('enrollments'); setEnrollments(d.enrollments || []); }, []);
  const loadAssignments = useCallback(async () => { if (!offeringId) { setAssignments([]); return; } const d = await api('assignments', { params: { course_offering_id: offeringId } }); setAssignments(d.assignments || []); }, [offeringId]);
  const loadStudents = useCallback(async () => { if (!offeringId) { setStudents([]); return; } const d = await api('teacher/students', { params: { course_offering_id: offeringId } }); setStudents(d.students || []); }, [offeringId]);
  const loadMarks = useCallback(async () => { if (!offeringId) { setMarks([]); return; } const d = await api('marks', { params: { course_offering_id: offeringId } }); setMarks(d.marks || []); }, [offeringId]);
  const loadFinal = useCallback(async () => { if (!offeringId) { setFinalRows([]); return; } const d = await api('final-results', { params: { course_offering_id: offeringId } }); setFinalRows(d.results || []); }, [offeringId]);
  const loadSalaries = useCallback(async () => { const d = await api('finance/my-salary'); setSalaries(d.salaries || []); }, []);

  useEffect(() => {
    setErr(''); setLoading(true);
    (async () => {
      try {
        if (tab === 'overview') await loadOfferings();
        if (tab === 'registrations') await loadEnrollments();
        if (['assignments', 'attendance', 'marks', 'final'].includes(tab)) await loadOfferings();
        if (tab === 'salary') await loadSalaries();
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, loadOfferings, loadEnrollments, loadSalaries]);

  useEffect(() => { if (offerings.length && !offeringId) setOfferingId(String(offerings[0].id)); }, [offerings, offeringId]);

  useEffect(() => {
    if (!offeringId) return;
    setErr('');
    (async () => {
      try {
        if (tab === 'assignments') await loadAssignments();
        if (['attendance', 'marks', 'final'].includes(tab)) await loadStudents();
        if (tab === 'marks') await loadMarks();
        if (tab === 'final') await loadFinal();
      } catch (e) { setErr(e.message); }
    })();
  }, [tab, offeringId, loadAssignments, loadStudents, loadMarks, loadFinal]);

  async function decideEnrollment(id, status) {
    try { await api('enrollments', { method: 'POST', body: { action: 'decide', enrollment_id: id, status } }); toast(`Enrollment ${status}`); await loadEnrollments(); }
    catch (e) { setErr(e.message); }
  }

  async function saveAttendance() {
    try {
      const records = students.map((s) => ({ student_id: s.id, status: document.querySelector(`select[name="att_${s.id}"]`)?.value || 'present' }));
      await api('attendance', { method: 'POST', body: { course_offering_id: Number(offeringId), class_date: attDate, records } });
      toast('Attendance saved successfully');
    } catch (e) { setErr(e.message); }
  }

  async function addMark(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('marks', { method: 'POST', body: { course_offering_id: Number(offeringId), student_id: Number(fd.get('student_id')), mark_type: fd.get('mark_type'), title: fd.get('title'), marks_obtained: Number(fd.get('marks_obtained')), max_marks: Number(fd.get('max_marks') || 100) } });
      e.target.reset(); toast('Mark added'); await loadMarks();
    } catch (ex) { setErr(ex.message); }
  }

  async function saveFinalRow(studentId, total, grade, notes) {
    try {
      await api('final-results', { method: 'POST', body: { action: 'save', course_offering_id: Number(offeringId), student_id: studentId, total_marks: total, grade, teacher_notes: notes } });
      toast('Result saved'); await loadFinal();
    } catch (e) { setErr(e.message); }
  }

  async function submitFinalsToAdmin() {
    try {
      await api('final-results', { method: 'POST', body: { action: 'submit', course_offering_id: Number(offeringId) } });
      toast('Results submitted for approval'); await loadFinal();
    } catch (e) { setErr(e.message); }
  }

  async function handleLogout() { await logout(); navigate('/login'); }

  const OfferingPicker = () => (
    <label>Course offering
      <select className="inp" value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
        {offerings.map((o) => (<option key={o.id} value={o.id}>{o.course_code} — {o.class_name}/{o.section_name} ({o.semester} {o.academic_year})</option>))}
      </select>
    </label>
  );

  return (
    <DashboardLayout title="Teacher" role="teacher" userName={user?.full_name} navItems={NAV} active={tab} onNav={setTab} onLogout={handleLogout}>
      {err && <div className="alert alert-error" role="alert">{err}</div>}

      {tab === 'overview' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Teacher Overview</h1>
              <p className="page-subtitle">Manage your assigned courses and track student performance.</p>
            </div>
          </header>
          {loading ? <div className="loading-state"><Spinner /></div> : (
          <div className="card glass">
            <p className="muted" style={{ marginTop: 0 }}>You are currently assigned to <strong>{offerings.length}</strong> active course offering(s).</p>
            <OfferingPicker />
          </div>
          )}
        </div>
      )}

      {tab === 'registrations' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Registration Requests</h1>
              <p className="page-subtitle">Review and manage student enrollment requests for your courses.</p>
            </div>
          </header>
          <div className="card glass">
            {loading ? <div className="loading-state"><Spinner /></div> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.student_name}</td>
                      <td className="muted">{e.code} — {e.title}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                      <td>{e.status === 'pending' && (
                        <div className="row-actions">
                          <button type="button" className="btn btn-success btn-sm" onClick={() => decideEnrollment(e.id, 'approved')}>Approve</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => decideEnrollment(e.id, 'rejected')}>Reject</button>
                        </div>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            {enrollments.filter(e => e.status === 'pending').length === 0 && <div className="empty-state"><p>No pending registrations to review.</p></div>}
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Course Assignments</h1>
              <p className="page-subtitle">Create and manage learning materials, quizzes, and papers.</p>
            </div>
          </header>
          <div className="card glass">
            <OfferingPicker />
            <h3 style={{ marginTop: '1.25rem' }}>Create Assignment</h3>
            <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); fd.set('course_offering_id', offeringId); try { const res = await fetch(apiUrl('assignments/upload'), { method: 'POST', body: fd, credentials: 'include', headers: getSessionHeaders() }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Upload failed'); e.target.reset(); toast('Assignment created'); await loadAssignments(); } catch (ex) { setErr(ex.message); } }} className="stack" style={{ marginTop: '0.5rem' }}>
              <input type="hidden" name="course_offering_id" value={offeringId} />
              <div className="form-row">
                <label>Title <input className="inp" name="title" required /></label>
                <label>Type <select className="inp" name="assignment_type"><option value="assignment">Assignment</option><option value="quiz">Quiz</option><option value="paper">Paper</option></select></label>
                <label>Due <input className="inp" name="due_at" type="datetime-local" /></label>
                <label>Total marks <input className="inp" name="total_marks" type="number" defaultValue={100} /></label>
              </div>
              <label>Description <textarea className="inp" name="description" rows={2} /></label>
              <label>Attachment (optional) <input className="inp" name="file" type="file" /></label>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!offeringId}>Upload Assignment</button>
            </form>
          </div>
          <div className="card glass">
            <h3>Existing Items</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Title</th><th>Type</th><th>Due</th><th>Submissions</th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.title}</td>
                      <td><span className="badge badge-draft">{a.assignment_type}</span></td>
                      <td className="muted">{a.due_at || '—'}</td>
                      <td><SubmissionLink assignmentId={a.id} /></td>
                    </tr>
                  ))}
                  {assignments.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No assignments created yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Attendance Tracking</h1>
              <p className="page-subtitle">Mark and manage student attendance for your classes.</p>
            </div>
          </header>
          <div className="card glass">
            <OfferingPicker />
            <label style={{ marginTop: '1.25rem', fontWeight: 600 }}>Class Date 
              <input className="inp" type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} style={{ marginTop: '0.5rem', display: 'block' }} />
            </label>
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data">
                <thead><tr><th>Student</th><th>Status</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td><select className="inp" name={`att_${s.id}`} defaultValue="present" style={{ minWidth: 120 }}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={2} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No students enrolled in this offering.</td></tr>}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={saveAttendance} disabled={!offeringId || students.length === 0}>Save Attendance Record</button>
          </div>
        </div>
      )}

      {tab === 'marks' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Quiz & Paper Marks</h1>
              <p className="page-subtitle">Record scores for assignments, quizzes, and other assessments.</p>
            </div>
          </header>
          <div className="card glass">
            <OfferingPicker />
            <form onSubmit={addMark} className="form-row" style={{ marginTop: '1.25rem' }}>
              <label>Student <select className="inp" name="student_id" required><option value="">Select Student</option>{students.map((s) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}</select></label>
              <label>Type <select className="inp" name="mark_type" required><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="paper">Paper</option></select></label>
              <label>Title <input className="inp" name="title" placeholder="e.g. Midterm Quiz" required /></label>
              <label>Marks <input className="inp" name="marks_obtained" type="number" step="0.01" required /></label>
              <label>Max <input className="inp" name="max_marks" type="number" step="0.01" defaultValue={100} /></label>
              <button type="submit" className="btn btn-primary" disabled={!offeringId}>Add Score</button>
            </form>
          </div>
          <div className="card glass">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Type</th><th>Title</th><th>Score</th></tr></thead>
                <tbody>
                  {marks.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.student_name}</td>
                      <td><span className="badge badge-draft">{m.mark_type}</span></td>
                      <td className="muted">{m.title}</td>
                      <td style={{ fontWeight: 600 }}>{m.marks_obtained} / {m.max_marks}</td>
                    </tr>
                  ))}
                  {marks.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No marks recorded yet for this selection.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'final' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Final Grading</h1>
              <p className="page-subtitle">Submit final grades for administrator approval.</p>
            </div>
          </header>
          <div className="card glass">
            <OfferingPicker />
            <p className="muted" style={{ marginTop: '1rem' }}>Enter the final totals and grades, then click "Submit" to send to admin.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Total Marks</th><th>Grade</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {students.map((s) => {
                    const row = finalRows.find((r) => Number(r.student_id) === Number(s.id));
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                        <td><input className="inp" style={{ minWidth: 80 }} type="number" step="0.01" defaultValue={row?.total_marks ?? ''} id={`tot_${s.id}`} /></td>
                        <td><input className="inp" style={{ minWidth: 60 }} defaultValue={row?.grade ?? ''} id={`gr_${s.id}`} /></td>
                        <td><span className={`badge badge-${row?.status || 'draft'}`}>{row?.status || 'Draft'}</span></td>
                        <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => saveFinalRow(s.id, Number(document.getElementById(`tot_${s.id}`).value), document.getElementById(`gr_${s.id}`).value, null)}>Save Draft</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={submitFinalsToAdmin} disabled={!offeringId}>Submit All Grades to Admin</button>
          </div>
        </div>
      )}

      {tab === 'salary' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">My Salary</h1>
              <p className="page-subtitle">View salary history, tax details, and download salary slips.</p>
            </div>
          </header>
          {loading ? <div className="loading-state"><Spinner /></div> : (
            <>
              <div className="grid-stats">
                <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="lbl">Total Paid</div><div className="val">${salaries.filter((s) => s.status === 'paid').reduce((sum, s) => sum + Number(s.net_salary || s.amount), 0).toFixed(2)}</div></div></div>
                <div className="stat-card"><div className="stat-icon amber">⏳</div><div><div className="lbl">Pending</div><div className="val">${salaries.filter((s) => s.status === 'unpaid').reduce((sum, s) => sum + Number(s.net_salary || s.amount), 0).toFixed(2)}</div></div></div>
                <div className="stat-card"><div className="stat-icon indigo">📋</div><div><div className="lbl">Total Records</div><div className="val">{salaries.length}</div></div></div>
              </div>
              <div className="card glass">
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Month</th><th>Year</th><th>Basic</th><th>Allowances</th><th>Bonus</th><th>Deductions</th><th>Tax</th><th>Net Salary</th><th>Payment Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {salaries.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{new Date(0, s.month - 1).toLocaleString('default', { month: 'long' })}</td>
                          <td>{s.year}</td>
                          <td>${Number(s.basic_salary || s.amount).toFixed(2)}</td>
                          <td>${Number(s.allowances || 0).toFixed(2)}</td>
                          <td>${Number(s.bonus || 0).toFixed(2)}</td>
                          <td>${Number(s.deductions || 0).toFixed(2)}</td>
                          <td>${Number(s.tax || 0).toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>${Number(s.net_salary || s.amount).toFixed(2)}</td>
                          <td>{s.payment_date ? new Date(s.payment_date).toLocaleDateString() : '—'}</td>
                          <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                          <td>
                            {s.status === 'paid' && (
                              <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { const d = await api('finance/salary-slip', { params: { id: s.id } }); setSelectedSalary(d); } catch (e) { setErr(e.message); } }}>View Slip</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(apiUrl('finance/salary-slip', { id: s.id, format: 'pdf' }), '_blank')}>PDF</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {salaries.length === 0 && <tr><td colSpan={11} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No salary records found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedSalary && (
                <div className="card glass" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Salary Slip</h3>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedSalary(null)}>Close</button>
                  </div>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                    <p><strong>Employee:</strong> {selectedSalary.employee?.full_name}</p>
                    <p><strong>Employee Code:</strong> {selectedSalary.employee?.employee_code}</p>
                    <p><strong>Period:</strong> {new Date(0, selectedSalary.salary.month - 1).toLocaleString('default', { month: 'long' })} {selectedSalary.salary.year}</p>
                    <hr style={{ margin: '1rem 0' }} />
                    <p><strong>Basic Salary:</strong> ${Number(selectedSalary.salary.basic_salary || selectedSalary.salary.amount).toFixed(2)}</p>
                    <p><strong>Allowances:</strong> ${Number(selectedSalary.salary.allowances || 0).toFixed(2)}</p>
                    <p><strong>Bonus:</strong> ${Number(selectedSalary.salary.bonus || 0).toFixed(2)}</p>
                    <p><strong>Deductions:</strong> ${Number(selectedSalary.salary.deductions || 0).toFixed(2)}</p>
                    <p><strong>Tax:</strong> ${Number(selectedSalary.salary.tax || 0).toFixed(2)}</p>
                    <p><strong>Net Salary:</strong> ${Number(selectedSalary.salary.net_salary || selectedSalary.salary.amount).toFixed(2)}</p>
                    <p><strong>Payment Status:</strong> {selectedSalary.salary.status}</p>
                    {selectedSalary.salary.bank_info && <p><strong>Bank Info:</strong> {selectedSalary.salary.bank_info}</p>}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.print()}>Print Slip</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

function SubmissionLink({ assignmentId }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const toast = useToast();

  async function load() { try { const d = await api('submissions', { params: { assignment_id: assignmentId } }); setRows(d.submissions || []); setOpen(true); } catch (e) { setErr(e.message); } }

  async function grade(subId, marks, feedback) {
    try {
      const m = marks === '' || marks == null ? null : Number(marks);
      await api('submissions/grade', { method: 'POST', body: { submission_id: subId, marks_obtained: m, feedback } });
      toast('Grade saved');
      const d = await api('submissions', { params: { assignment_id: assignmentId } }); setRows(d.submissions || []);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={load}>View / Grade</button>
      {err && <span className="muted"> {err}</span>}
      {open && (
        <div className="card" style={{ marginTop: '0.5rem' }}>
          {rows.map((r) => (
            <div key={r.id} className="stack" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong>{r.full_name}</strong>
                <span className="muted">{r.submitted_at}</span>
                {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Download</a>}
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <input className="inp" type="number" step="0.01" placeholder="Marks" defaultValue={r.marks_obtained ?? ''} id={`m_${assignmentId}_${r.id}`} style={{ minWidth: 100 }} />
                <input className="inp" placeholder="Feedback" defaultValue={r.feedback ?? ''} id={`f_${assignmentId}_${r.id}`} />
                <button type="button" className="btn btn-primary btn-sm" onClick={() => grade(r.id, document.getElementById(`m_${assignmentId}_${r.id}`).value, document.getElementById(`f_${assignmentId}_${r.id}`).value)}>Save Grade</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="muted">No submissions yet.</p>}
        </div>
      )}
    </div>
  );
}
