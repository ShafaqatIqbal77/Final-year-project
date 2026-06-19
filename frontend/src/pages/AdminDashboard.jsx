import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import MonitoringDashboard from '../components/MonitoringDashboard';
import FinanceDashboard from '../components/finance/FinanceDashboard';

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Teachers & Students' },
  { id: 'classes', label: 'Classes & Sections' },
  { id: 'courses', label: 'Courses' },
  { id: 'offerings', label: 'Course Offerings' },
  { id: 'enrollments', label: 'Enrollments' },
  { id: 'results', label: 'Approve Results' },
  { id: 'finance', label: '💰 Finance' },
  { id: 'settings', label: 'Settings' },
  { id: 'activity', label: 'Activity' },
  { id: 'monitoring', label: '📊 Audit & Monitoring' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classId, setClassId] = useState('');
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pending, setPending] = useState([]);
  const [settings, setSettings] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [modal, setModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [editingUser, setEditingUser] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  /* ── Loaders ── */
  const loadStats = useCallback(async () => { const d = await api('admin/stats'); setStats(d.stats); }, []);
  const loadUsers = useCallback(async () => { const d = await api('admin/users', { params: { role: userFilter || undefined } }); setUsers(d.users || []); }, [userFilter]);
  const loadClasses = useCallback(async () => { const d = await api('classes'); setClasses(d.classes || []); }, []);
  const loadSections = useCallback(async () => { if (!classId) { setSections([]); return; } const d = await api('sections', { params: { class_id: classId } }); setSections(d.sections || []); }, [classId]);
  const loadCourses = useCallback(async () => { const d = await api('courses'); setCourses(d.courses || []); }, []);
  const loadOfferings = useCallback(async () => { const d = await api('offerings'); setOfferings(d.offerings || []); }, []);
  const loadTeachers = useCallback(async () => { const d = await api('admin/users', { params: { role: 'teacher' } }); setTeachers(d.users || []); }, []);
  const loadActivity = useCallback(async () => { const d = await api('admin/activity'); setActivity(d.items || []); }, []);
  const loadPending = useCallback(async () => { const d = await api('admin/pending-results'); setPending(d.results || []); }, []);
  const loadSettings = useCallback(async () => { const d = await api('settings'); setSettings(d.settings || {}); }, []);
  const loadEnrollments = useCallback(async () => { const d = await api('admin/enrollments'); setEnrollments(d.enrollments || []); }, []);

  useEffect(() => {
    setErr('');
    setLoading(true);
    (async () => {
      try {
        if (tab === 'overview') await loadStats();
        if (tab === 'users') await loadUsers();
        if (tab === 'classes') { await loadClasses(); if (classId) await loadSections(); }
        if (tab === 'courses') await loadCourses();
        if (tab === 'offerings') { await Promise.all([loadOfferings(), loadClasses(), loadCourses(), loadTeachers()]); }
        if (tab === 'enrollments') await loadEnrollments();
        if (tab === 'results') await loadPending();
        if (tab === 'settings') await loadSettings();
        if (tab === 'activity') await loadActivity();
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [tab, classId, userFilter, loadStats, loadUsers, loadClasses, loadSections, loadCourses, loadOfferings, loadTeachers, loadActivity, loadPending, loadSettings, loadEnrollments]);

  useEffect(() => {
    if (tab === 'classes' && classId) loadSections().catch((e) => setErr(e.message));
  }, [classId, tab, loadSections]);

  /* ── Actions ── */
  async function createUser(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('admin/users', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') || undefined, role: fd.get('role'), full_name: fd.get('full_name'), phone: fd.get('phone') || undefined, student_code: fd.get('student_code') || undefined, employee_code: fd.get('employee_code') || undefined } });
      e.target.reset(); toast('User created successfully'); await loadUsers();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateUser(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const body = { id: editingUser.id, full_name: fd.get('full_name'), phone: fd.get('phone') || null, student_code: fd.get('student_code') || null, employee_code: fd.get('employee_code') || null };
      const pwd = fd.get('password');
      if (pwd) body.password = pwd;
      await api('admin/users', { method: 'PATCH', body });
      setEditingUser(null); toast('User updated'); await loadUsers();
    } catch (ex) { setErr(ex.message); }
  }

  function confirmDeleteUser(u) {
    setModal({ open: true, title: 'Delete User', message: `Are you sure you want to delete "${u.full_name}"? This action cannot be undone.`, danger: true,
      onConfirm: async () => { try { await api('admin/users', { method: 'DELETE', body: { id: u.id } }); toast('User deleted'); await loadUsers(); } catch (ex) { setErr(ex.message); } setModal(m => ({ ...m, open: false })); }
    });
  }

  async function toggleUserActive(u) {
    try {
      await api('admin/users', { method: 'PATCH', body: { id: u.id, is_active: u.is_active ? 0 : 1 } });
      toast(u.is_active ? 'User deactivated' : 'User activated'); await loadUsers();
    } catch (ex) { setErr(ex.message); }
  }

  async function createClass(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('classes', { method: 'POST', body: { name: fd.get('name'), program: fd.get('program'), year_level: fd.get('year_level') } });
      e.target.reset(); toast('Class created'); await loadClasses();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateClass(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('classes', { method: 'PATCH', body: { id: editingClass.id, name: fd.get('name'), program: fd.get('program'), year_level: fd.get('year_level') } });
      setEditingClass(null); toast('Class updated'); await loadClasses();
    } catch (ex) { setErr(ex.message); }
  }

  function confirmDeleteClass(c) {
    setModal({ open: true, title: 'Delete Class', message: `Delete "${c.name}"? All sections and related data will also be removed.`, danger: true,
      onConfirm: async () => { try { await api('classes', { method: 'DELETE', body: { id: c.id } }); toast('Class deleted'); await loadClasses(); } catch (ex) { setErr(ex.message); } setModal(m => ({ ...m, open: false })); }
    });
  }

  function confirmDeleteSection(s) {
    setModal({ open: true, title: 'Delete Section', message: `Delete section "${s.name}"?`, danger: true,
      onConfirm: async () => { try { await api('sections', { method: 'DELETE', body: { id: s.id } }); toast('Section deleted'); await loadSections(); } catch (ex) { setErr(ex.message); } setModal(m => ({ ...m, open: false })); }
    });
  }

  async function createCourse(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('courses', { method: 'POST', body: { code: fd.get('code'), title: fd.get('title'), description: fd.get('description'), credits: fd.get('credits') || 3 } });
      e.target.reset(); toast('Course created'); await loadCourses();
    } catch (ex) { setErr(ex.message); }
  }

  async function updateCourse(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('courses', { method: 'PATCH', body: { id: editingCourse.id, code: fd.get('code'), title: fd.get('title'), description: fd.get('description'), credits: fd.get('credits') || 3 } });
      setEditingCourse(null); toast('Course updated'); await loadCourses();
    } catch (ex) { setErr(ex.message); }
  }

  function confirmDeleteCourse(c) {
    setModal({ open: true, title: 'Delete Course', message: `Delete "${c.code} — ${c.title}"?`, danger: true,
      onConfirm: async () => { try { await api('courses', { method: 'DELETE', body: { id: c.id } }); toast('Course deleted'); await loadCourses(); } catch (ex) { setErr(ex.message); } setModal(m => ({ ...m, open: false })); }
    });
  }

  function confirmDeleteOffering(o) {
    setModal({ open: true, title: 'Delete Offering', message: `Delete "${o.course_code} — ${o.class_name}/${o.section_name}"?`, danger: true,
      onConfirm: async () => { try { await api('offerings', { method: 'DELETE', body: { id: o.id } }); toast('Offering deleted'); await loadOfferings(); } catch (ex) { setErr(ex.message); } setModal(m => ({ ...m, open: false })); }
    });
  }

  async function onApproveResult(id, action) {
    try {
      await api('final-results', { method: 'POST', body: { action, id } });
      toast(action === 'approve' ? 'Result approved' : 'Result rejected'); await loadPending(); await loadStats();
    } catch (ex) { setErr(ex.message); }
  }

  async function adminEnrollmentDecide(eid, status) {
    try {
      await api('admin/enrollments', { method: 'POST', body: { enrollment_id: eid, status } });
      toast(`Enrollment ${status}`); await loadEnrollments();
    } catch (ex) { setErr(ex.message); }
  }

  async function saveSettings(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('settings', { method: 'PATCH', body: { site_name: fd.get('site_name'), academic_year: fd.get('academic_year') } });
      toast('Settings saved'); await loadSettings();
    } catch (ex) { setErr(ex.message); }
  }

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <>
    <DashboardLayout
      title="Admin"
      role="admin"
      userName={user?.full_name}
      navItems={NAV}
      active={tab}
      onNav={setTab}
      onLogout={handleLogout}
    >
      {err && <div className="alert alert-error" role="alert">{err} <button type="button" onClick={() => setErr('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="fade-in">
          <header className="dashboard-header">
            <div>
              <h1 className="page-title">Dashboard Overview</h1>
              <p className="page-subtitle">Welcome back, {user?.full_name}. Here's what's happening today.</p>
            </div>
          </header>

          {loading ? <div className="loading-state"><Spinner /></div> : (
          <>
          <div className="grid-stats">
            <div className="stat-card">
              <div className="stat-icon indigo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="stat-content">
                <div className="lbl">Students</div>
                <div className="val">{stats?.students ?? '0'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="stat-content">
                <div className="lbl">Teachers</div>
                <div className="val">{stats?.teachers ?? '0'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div className="stat-content">
                <div className="lbl">Courses</div>
                <div className="val">{stats?.courses ?? '0'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className="stat-content">
                <div className="lbl">Classes</div>
                <div className="val">{stats?.classes ?? '0'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="stat-content">
                <div className="lbl">Pending</div>
                <div className="val text-danger">{stats?.pending_results ?? '0'}</div>
              </div>
            </div>
          </div>

          <h3 className="section-title">Quick Actions</h3>
          <div className="quick-actions">
            <button type="button" className="quick-action-btn hover-up" onClick={() => setTab('users')}>
              <div className="quick-action-icon indigo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
              </div>
              Add User
            </button>
            <button type="button" className="quick-action-btn hover-up" onClick={() => setTab('courses')}>
              <div className="quick-action-icon green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              Add Course
            </button>
            <button type="button" className="quick-action-btn hover-up" onClick={() => setTab('results')}>
              <div className="quick-action-icon warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              Review Results
            </button>
            <button type="button" className="quick-action-btn hover-up" onClick={() => setTab('enrollments')}>
              <div className="quick-action-icon info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
              </div>
              Enrollments
            </button>
          </div>
          
          <div className="card glass info-banner">
             <div className="info-icon">💡</div>
             <p>Use the navigation panel on the left to manage the institution's users, academic structure, and course offerings. You can also monitor real-time activity and approve grading results.</p>
          </div>
          </>
          )}
        </div>
      )}

      {/* ═══ USERS ═══ */}
      {tab === 'users' && (
        <>
          <h1 className="page-title">Teachers & Students</h1>

          {/* Edit Modal */}
          {editingUser && (
            <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <div className="card-header"><h3>Edit User: {editingUser.full_name}</h3><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>Cancel</button></div>
              <form onSubmit={updateUser} className="form-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="form-row">
                  <label>Full name <input className="inp" name="full_name" defaultValue={editingUser.full_name} required /></label>
                  <label>Phone <input className="inp" name="phone" defaultValue={editingUser.phone || ''} /></label>
                  <label>Student code <input className="inp" name="student_code" defaultValue={editingUser.student_code || ''} /></label>
                  <label>Employee code <input className="inp" name="employee_code" defaultValue={editingUser.employee_code || ''} /></label>
                  <label>New password <input className="inp" name="password" type="password" placeholder="Leave blank to keep" /></label>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          )}

          <div className="card">
            <h3>Add User</h3>
            <form onSubmit={createUser} className="form-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="form-row">
                <label>Role <select className="inp" name="role" required><option value="teacher">Teacher</option><option value="student">Student</option></select></label>
                <label>Full name <input className="inp" name="full_name" required /></label>
                <label>Email <input className="inp" name="email" type="email" required /></label>
                <label>Password <input className="inp" name="password" placeholder="optional" /></label>
                <label>Phone <input className="inp" name="phone" /></label>
                <label>Student code <input className="inp" name="student_code" /></label>
                <label>Employee code <input className="inp" name="employee_code" /></label>
              </div>
              <button type="submit" className="btn btn-primary">Create User</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>Filter <select className="inp" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}><option value="">All</option><option value="teacher">Teachers</option><option value="student">Students</option></select></label>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadUsers().catch((e) => setErr(e.message))}>Refresh</button>
            </div>
            {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Codes</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td><span className="badge badge-approved" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                      <td className="muted">{u.student_code || u.employee_code || '—'}</td>
                      <td><span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingUser(u)}>Edit</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleUserActive(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
                          {u.role !== 'admin' && <button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDeleteUser(u)}>Delete</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* ═══ CLASSES ═══ */}
      {tab === 'classes' && (
        <>
          <h1 className="page-title">Classes & Sections</h1>

          {editingClass && (
            <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <div className="card-header"><h3>Edit Class: {editingClass.name}</h3><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingClass(null)}>Cancel</button></div>
              <form onSubmit={updateClass} className="form-row">
                <label>Name <input className="inp" name="name" defaultValue={editingClass.name} required /></label>
                <label>Program <input className="inp" name="program" defaultValue={editingClass.program || ''} /></label>
                <label>Year level <input className="inp" name="year_level" defaultValue={editingClass.year_level || ''} /></label>
                <button type="submit" className="btn btn-primary">Save</button>
              </form>
            </div>
          )}

          <div className="card">
            <h3>New Class</h3>
            <form onSubmit={createClass} className="form-row">
              <label>Name <input className="inp" name="name" required /></label>
              <label>Program <input className="inp" name="program" /></label>
              <label>Year level <input className="inp" name="year_level" /></label>
              <button type="submit" className="btn btn-primary">Add Class</button>
            </form>
          </div>
          <div className="card">
            <h3>All Classes</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Program</th><th>Year</th><th>Actions</th></tr></thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.program || '—'}</td>
                      <td>{c.year_level || '—'}</td>
                      <td><div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingClass(c)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDeleteClass(c)}>Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3>Sections</h3>
            <label>Select class <select className="inp" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Choose a class</option>
              {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select></label>
            {classId && (
              <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { await api('sections', { method: 'POST', body: { class_id: Number(classId), name: fd.get('name'), capacity: fd.get('capacity') || 50 } }); e.target.reset(); toast('Section added'); await loadSections(); } catch (ex) { setErr(ex.message); } }} className="form-row" style={{ marginTop: '0.75rem' }}>
                <label>Section name <input className="inp" name="name" placeholder="e.g. A" required /></label>
                <label>Capacity <input className="inp" name="capacity" type="number" defaultValue={50} /></label>
                <button type="submit" className="btn btn-primary">Add Section</button>
              </form>
            )}
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data">
                <thead><tr><th>Section</th><th>Capacity</th><th>Actions</th></tr></thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.capacity}</td>
                      <td><button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDeleteSection(s)}>Delete</button></td>
                    </tr>
                  ))}
                  {sections.length === 0 && <tr><td colSpan={3} className="muted" style={{ textAlign: 'center' }}>{classId ? 'No sections yet' : 'Select a class above'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ COURSES ═══ */}
      {tab === 'courses' && (
        <>
          <h1 className="page-title">Courses</h1>
          {editingCourse && (
            <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <div className="card-header"><h3>Edit: {editingCourse.code}</h3><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(null)}>Cancel</button></div>
              <form onSubmit={updateCourse} className="form-row">
                <label>Code <input className="inp" name="code" defaultValue={editingCourse.code} required /></label>
                <label>Title <input className="inp" name="title" defaultValue={editingCourse.title} required /></label>
                <label>Credits <input className="inp" name="credits" type="number" step="0.5" defaultValue={editingCourse.credits} /></label>
                <label style={{ flex: '1 1 220px' }}>Description <textarea className="inp" name="description" rows={2} defaultValue={editingCourse.description || ''} /></label>
                <button type="submit" className="btn btn-primary">Save</button>
              </form>
            </div>
          )}
          <div className="card">
            <h3>New Course</h3>
            <form onSubmit={createCourse} className="form-row">
              <label>Code <input className="inp" name="code" required /></label>
              <label>Title <input className="inp" name="title" required /></label>
              <label>Credits <input className="inp" name="credits" type="number" step="0.5" defaultValue={3} /></label>
              <label style={{ flex: '1 1 220px' }}>Description <textarea className="inp" name="description" rows={2} /></label>
              <button type="submit" className="btn btn-primary">Add Course</button>
            </form>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Code</th><th>Title</th><th>Credits</th><th>Actions</th></tr></thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.code}</td>
                      <td>{c.title}</td>
                      <td>{c.credits}</td>
                      <td><div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(c)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDeleteCourse(c)}>Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ OFFERINGS ═══ */}
      {tab === 'offerings' && (
        <>
          <h1 className="page-title">Course Offerings</h1>
          <div className="card">
            <h3>Schedule Offering</h3>
            <p className="muted" style={{ marginTop: 0 }}>Link a course to a class section and assign a teacher for the term.</p>
            <OfferingsSectionPicker classes={classes} courses={courses} teachers={teachers} onError={setErr} onDone={() => { loadOfferings(); toast('Offering created'); }} />
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Course</th><th>Class / Section</th><th>Teacher</th><th>Term</th><th>Actions</th></tr></thead>
                <tbody>
                  {offerings.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.course_code} — {o.course_title}</td>
                      <td>{o.class_name} / {o.section_name}</td>
                      <td>{o.teacher_name}</td>
                      <td>{o.semester} {o.academic_year}</td>
                      <td><button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDeleteOffering(o)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ ENROLLMENTS ═══ */}
      {tab === 'enrollments' && (
        <>
          <h1 className="page-title">All Enrollments</h1>
          <div className="card">
            {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Course</th><th>Teacher</th><th>Term</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.student_name}</td>
                      <td>{e.course_code} — {e.course_title}</td>
                      <td>{e.teacher_name}</td>
                      <td>{e.semester} {e.academic_year}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                      <td>
                        {e.status === 'pending' && (
                          <div className="row-actions">
                            <button type="button" className="btn btn-success btn-sm" onClick={() => adminEnrollmentDecide(e.id, 'approved')}>Approve</button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => adminEnrollmentDecide(e.id, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No enrollments yet.</td></tr>}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* ═══ RESULTS ═══ */}
      {tab === 'results' && (
        <>
          <h1 className="page-title">Approve Final Results</h1>
          <div className="card">
            {loading ? <Spinner /> : (
            <>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Course</th><th>Teacher</th><th>Total</th><th>Grade</th><th>Actions</th></tr></thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                      <td>{r.course_code}</td>
                      <td>{r.teacher_name}</td>
                      <td>{r.total_marks}</td>
                      <td>{r.grade || '—'}</td>
                      <td><div className="row-actions">
                        <button type="button" className="btn btn-success btn-sm" onClick={() => onApproveResult(r.id, 'approve')}>Approve</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => onApproveResult(r.id, 'reject')}>Reject</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pending.length === 0 && <div className="empty-state"><p>No pending approvals.</p></div>}
            </>
            )}
          </div>
        </>
      )}

      {/* ═══ SETTINGS ═══ */}
      {tab === 'settings' && (
        <>
          <h1 className="page-title">Site Settings</h1>
          <div className="card">
            <form onSubmit={saveSettings} className="stack" style={{ maxWidth: 400 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Site name
                <input className="inp" name="site_name" key={settings.site_name} defaultValue={settings.site_name || ''} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Academic year
                <input className="inp" name="academic_year" key={settings.academic_year} defaultValue={settings.academic_year || ''} />
              </label>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Settings</button>
            </form>
          </div>
        </>
      )}

      {/* ═══ ACTIVITY ═══ */}
      {tab === 'activity' && (
        <>
          <h1 className="page-title">Activity Log</h1>
          <div className="card">
            {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>When</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                <tbody>
                  {activity.map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{a.created_at}</td>
                      <td>{a.email || '—'}</td>
                      <td><span className="badge badge-draft">{a.action}</span></td>
                      <td className="muted">{a.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* ═══ MONITORING DASHBOARD ═══ */}
      {tab === 'monitoring' && <MonitoringDashboard />}

      {/* ═══ FINANCE MODULE ═══ */}
      {tab === 'finance' && <FinanceDashboard />}
    </DashboardLayout>

    <Modal open={modal.open} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal(m => ({ ...m, open: false }))} confirmText={modal.danger ? 'Delete' : 'Confirm'} danger={modal.danger} />
    </>
  );
}

/* ── Offerings Section Picker sub-component ── */
function OfferingsSectionPicker({ classes, courses, teachers, onError, onDone }) {
  const [cid, setCid] = useState('');
  const [secs, setSecs] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [semester, setSemester] = useState('Fall');
  const [year, setYear] = useState('2025-2026');

  useEffect(() => {
    if (!cid) { setSecs([]); return; }
    api('sections', { params: { class_id: cid } }).then((d) => setSecs(d.sections || [])).catch((e) => onError(e.message));
  }, [cid, onError]);

  async function submit(e) {
    e.preventDefault();
    try {
      await api('offerings', { method: 'POST', body: { course_id: Number(courseId), section_id: Number(sectionId), teacher_id: Number(teacherId), semester, academic_year: year } });
      onDone();
    } catch (ex) { onError(ex.message); }
  }

  return (
    <form onSubmit={submit} className="form-row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
      <label>Class <select className="inp" value={cid} onChange={(e) => setCid(e.target.value)} required><option value="">Select</option>{classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></label>
      <label>Section <select className="inp" value={sectionId} onChange={(e) => setSectionId(e.target.value)} required><option value="">Select</option>{secs.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></label>
      <label>Course <select className="inp" value={courseId} onChange={(e) => setCourseId(e.target.value)} required><option value="">Select</option>{courses.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.title}</option>))}</select></label>
      <label>Teacher <select className="inp" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required><option value="">Select</option>{teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}</select></label>
      <label>Semester <input className="inp" value={semester} onChange={(e) => setSemester(e.target.value)} /></label>
      <label>Year <input className="inp" value={year} onChange={(e) => setYear(e.target.value)} /></label>
      <button type="submit" className="btn btn-primary">Create Offering</button>
    </form>
  );
}
