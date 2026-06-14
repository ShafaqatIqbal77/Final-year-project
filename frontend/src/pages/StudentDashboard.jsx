import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUrl, getSessionHeaders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Spinner from '../components/Spinner';

const NAV = [
  { id: 'catalog', label: 'Course Catalog' },
  { id: 'courses', label: 'My Courses' },
  { id: 'course', label: 'Course Workspace' },
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

  const approved = enrollments.filter((e) => e.status === 'approved');

  const loadCatalog = useCallback(async () => { const d = await api('student/catalog'); setCatalog(d.offerings || []); }, []);
  const loadEnrollments = useCallback(async () => { const d = await api('enrollments'); setEnrollments(d.enrollments || []); }, []);
  const loadAssignments = useCallback(async () => { if (!offeringId) { setAssignments([]); return; } const d = await api('assignments', { params: { course_offering_id: offeringId } }); setAssignments(d.assignments || []); }, [offeringId]);
  const loadAttendance = useCallback(async () => { if (!offeringId) { setAttendance(null); return; } const d = await api('attendance', { params: { course_offering_id: offeringId } }); setAttendance(d); }, [offeringId]);
  const loadMarks = useCallback(async () => { if (!offeringId) { setMarks([]); return; } const d = await api('marks', { params: { course_offering_id: offeringId } }); setMarks(d.marks || []); }, [offeringId]);
  const loadFinal = useCallback(async () => { if (!offeringId) { setFinalRes(null); return; } const d = await api('final-results', { params: { course_offering_id: offeringId } }); setFinalRes(d.result || null); }, [offeringId]);

  useEffect(() => {
    setErr(''); setLoading(true);
    (async () => {
      try {
        if (tab === 'catalog') await loadCatalog();
        if (tab === 'courses') await loadEnrollments();
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, loadCatalog, loadEnrollments]);

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
    </DashboardLayout>
  );
}
