import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';

const ROLE_PANELS = [
  { key: 'admin', label: 'Admin', icon: '🛡️', emailHint: 'admin@cms.local' },
  { key: 'teacher', label: 'Teacher', icon: '🧑‍🏫', emailHint: 'teacher@cms.local' },
  { key: 'student', label: 'Student', icon: '🎓', emailHint: 'student@cms.local' },
];

export default function Login() {
  const { user, login, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const resetToken = params.get('token') || '';
  const initialMode = params.get('mode') === 'reset' && resetToken ? 'reset' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [activeRole, setActiveRole] = useState('admin');
  const [email, setEmail] = useState('admin@cms.local');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function onForgotSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await api('auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail },
      });
      setNotice(data.message || 'If this email is registered, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to process your request');
    } finally {
      setBusy(false);
    }
  }

  async function onResetSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setBusy(true);
    try {
      const data = await api('auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, password: newPassword },
      });
      setNotice(data.message || 'Password reset successful. Please login.');
      setMode('login');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setBusy(false);
    }
  }

  function handleRoleSelect(role) {
    setActiveRole(role.key);
    setError('');
    if (!email || email.endsWith('@cms.local')) {
      setEmail(role.emailHint);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">C</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>Shah College</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Management System</div>
          </div>
        </div>
        {mode === 'login' && (
          <>
            <h1>{t('login_welcome', 'Welcome back')}</h1>
            <p className="sub">{t('login_select_panel', 'Select your panel and sign in with your institutional account.')}</p>
            <p className="login-active-role">{ROLE_PANELS.find((role) => role.key === activeRole)?.label} Panel</p>

            <div className="role-panels">
              {ROLE_PANELS.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className={`role-panel role-${role.key}${activeRole === role.key ? ' active' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <span className="role-panel-icon">{role.icon}</span>
                  <span className="role-panel-label">{role.label}</span>
                </button>
              ))}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-ok">{notice}</div>}

            <form onSubmit={onSubmit}>
              <label htmlFor="login-email">{t('login_email', 'Email address')}</label>
              <input
                id="login-email"
                className="inp"
                type="email"
                autoComplete="username"
                placeholder={ROLE_PANELS.find((role) => role.key === activeRole)?.emailHint || 'you@institution.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="login-password">{t('login_password', 'Password')}</label>
              <input
                id="login-password"
                className="inp"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="login-btn" disabled={busy}>
                {busy ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                    {t('login_signing_in', 'Signing in…')}
                  </span>
                ) : t('login_signin', 'Sign In')}
              </button>
            </form>
            <button type="button" className="forgot-link" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>
              {t('login_forgot', 'Forgot password?')}
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1>{t('login_forgot_title', 'Forgot Password')}</h1>
            <p className="sub">{t('login_forgot_sub', 'Enter your registered email to receive a password reset link.')}</p>
            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-ok">{notice}</div>}
            <form onSubmit={onForgotSubmit}>
              <label htmlFor="forgot-email">{t('login_email', 'Email address')}</label>
              <input
                id="forgot-email"
                className="inp"
                type="email"
                autoComplete="email"
                placeholder="you@institution.edu"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <button type="submit" className="login-btn" disabled={busy}>
                {busy ? t('login_sending_reset', 'Sending reset link…') : t('login_send_reset', 'Send reset link')}
              </button>
            </form>
            <button type="button" className="forgot-link" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>
              {t('login_back_signin', 'Back to sign in')}
            </button>
          </>
        )}

        {mode === 'reset' && (
          <>
            <h1>{t('login_reset_title', 'Reset Password')}</h1>
            <p className="sub">{t('login_reset_sub', 'Set a new password for your account.')}</p>
            {!resetToken && <div className="alert alert-error">Reset token is missing.</div>}
            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-ok">{notice}</div>}
            <form onSubmit={onResetSubmit}>
              <label htmlFor="new-password">{t('login_new_password', 'New password')}</label>
              <input
                id="new-password"
                className="inp"
                type="password"
                autoComplete="new-password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <label htmlFor="confirm-password">{t('login_confirm_password', 'Confirm password')}</label>
              <input
                id="confirm-password"
                className="inp"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="submit" className="login-btn" disabled={busy || !resetToken}>
                {busy ? t('login_resetting', 'Resetting password…') : t('login_reset_btn', 'Reset password')}
              </button>
            </form>
            <button type="button" className="forgot-link" onClick={() => { setMode('login'); setError(''); setNotice(''); navigate('/login', { replace: true }); }}>
              {t('login_back_signin', 'Back to sign in')}
            </button>
          </>
        )}

        <div className="login-footer">
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Default admin: <strong>admin@cms.local</strong> / <strong>Admin@123</strong>
          </p>
          <Link to="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
