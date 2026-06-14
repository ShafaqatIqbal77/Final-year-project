import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bwMode, setBwMode] = useState(() => localStorage.getItem('landing-bw-mode') === 'on');
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location]);

  useEffect(() => {
    document.body.classList.toggle('landing-bw', bwMode);
    localStorage.setItem('landing-bw-mode', bwMode ? 'on' : 'off');
    return () => document.body.classList.remove('landing-bw');
  }, [bwMode]);

  return (
    <nav className={`public-nav${scrolled ? ' scrolled' : ''}`}>
      <Link to="/" className="nav-logo">
        <div className="nav-logo-icon">C</div>
        <span>Shah College</span>
      </Link>
      <button type="button" className="nav-mobile-toggle" onClick={() => setOpen(!open)} aria-label={t('dashboard_menu', 'Menu')}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open
            ? <><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></>
            : <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>
          }
        </svg>
      </button>
      <div className={`nav-links${open ? ' open' : ''}`}>
        <Link to="/" className={`nav-link${location.pathname === '/' ? ' active' : ''}`}>{t('nav_home', 'Home')}</Link>
        <Link to="/about" className={`nav-link${location.pathname === '/about' ? ' active' : ''}`}>{t('nav_about', 'About')}</Link>
        <label className="nav-lang-wrap">
          <span className="sr-only">{t('nav_language', 'Language')}</span>
          <select
            className="nav-lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t('nav_language', 'Language')}
          >
            <option value="en">English</option>
            <option value="ur">اردو</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
        <button
          type="button"
          className={`nav-link nav-bw-toggle${bwMode ? ' active' : ''}`}
          onClick={() => setBwMode((prev) => !prev)}
          aria-pressed={bwMode}
          aria-label={t('nav_bw_title', 'Toggle black and white mode')}
          title={t('nav_bw_title', 'Toggle black and white mode')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17V3.5z" fill="currentColor" />
          </svg>
        </button>
        <Link to="/login" className="nav-link-cta">{t('nav_signin', 'Sign In')}</Link>
      </div>
    </nav>
  );
}
