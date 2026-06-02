import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

const FEATURES = [
  { icon: '📚', title: 'feature_course_title', desc: 'feature_course_desc', color: 'indigo' },
  { icon: '👨‍🎓', title: 'feature_enroll_title', desc: 'feature_enroll_desc', color: 'blue' },
  { icon: '📝', title: 'feature_assign_title', desc: 'feature_assign_desc', color: 'green' },
  { icon: '📊', title: 'feature_attend_title', desc: 'feature_attend_desc', color: 'amber' },
  { icon: '🏆', title: 'feature_result_title', desc: 'feature_result_desc', color: 'red' },
  { icon: '🔒', title: 'feature_role_title', desc: 'feature_role_desc', color: 'indigo' },
];

const STATS = [
  { num: '500+', label: 'home_stats_students' },
  { num: '50+', label: 'home_stats_courses' },
  { num: '30+', label: 'home_stats_teachers' },
  { num: '99.9%', label: 'home_stats_uptime' },
];

const QUICK_LINKS = [
  { icon: '🚀', title: 'login_select_panel', desc: 'home_quick_access_desc', to: '/login', color: 'indigo' },
  { icon: '🧑‍🏫', title: 'dashboard_menu', desc: 'home_quick_access_desc', to: '/login', color: 'green' },
  { icon: '🎯', title: 'nav_signin', desc: 'home_quick_access_desc', to: '/login', color: 'info' },
  { icon: '📘', title: 'nav_about', desc: 'about_why_desc', to: '/about', color: 'warning' },
];

const FAQS = [
  {
    q: 'faq_q1',
    a: 'faq_a1',
  },
  {
    q: 'faq_q2',
    a: 'faq_a2',
  },
  {
    q: 'faq_q3',
    a: 'faq_a3',
  },
  {
    q: 'faq_q4',
    a: 'faq_a4',
  },
];

export default function Home() {
  const { t } = useLanguage();
  const [faqQuery, setFaqQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(0);

  const filteredFaqs = useMemo(() => {
    const normalized = faqQuery.trim().toLowerCase();
    if (!normalized) return FAQS;
    return FAQS.filter((item) => item.q.toLowerCase().includes(normalized) || item.a.toLowerCase().includes(normalized));
  }, [faqQuery]);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-background">
          <img
            src="https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Shah College campus"
            className="hero-bg-image"
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">{t('home_hero_badge', '🎓 Shah College')}</div>
          <h1>{t('home_hero_title', 'Manage Your Institution Effortlessly').split(' ').map((w, i) => w === 'Institution' || w === 'ادارے' ? <span key={i}>{w} </span> : w + ' ')}</h1>
          <p>{t('home_hero_desc', 'A comprehensive platform...')}</p>
          <div className="hero-actions">
            <Link to="/login" className="hero-btn hero-btn-primary">
              {t('home_get_started', 'Get Started →')}
            </Link>
            <Link to="/about" className="hero-btn hero-btn-secondary">
              {t('home_learn_more', 'Learn More')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-header">
          <h2>{t('home_features_title', 'Everything You Need')}</h2>
          <p>{t('home_features_desc', 'Powerful features designed to simplify academic management.')}</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <h3>{t(f.title)}</h3>
              <p>{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Smart Tools */}
      <section className="landing-tools-section">
        <div className="section-header">
          <h2>{t('home_quick_access_title', 'Smart Quick Access')}</h2>
          <p>{t('home_quick_access_desc', 'Jump into the right module.')}</p>
        </div>
        <div className="quick-actions">
          {QUICK_LINKS.map((item) => (
            <Link key={item.title} to={item.to} className="quick-action-btn">
              <span className={`quick-action-icon ${item.color}`}>{item.icon}</span>
              <span>
                <strong>{t(item.title)}</strong>
                <small className="quick-action-desc">{t(item.desc)}</small>
              </span>
            </Link>
          ))}
        </div>
        <div className="info-banner">
          <div className="info-icon">💡</div>
          <p>
            <strong>{t('home_info_banner_new', 'New:')}</strong> {t('home_info_banner_text', 'Admissions workflows...')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-block">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{t(s.label)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="gallery-section">
        <div className="section-header">
          <h2>{t('home_gallery_title', 'Our Campus')}</h2>
          <p>{t('home_gallery_desc', 'Explore the vibrant learning environment.')}</p>
        </div>
        <div className="gallery-grid">
          <div className="gallery-item gallery-item-large">
            <img src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80" alt={t('gallery_entrance')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_entrance')}</span>
            </div>
          </div>
          <div className="gallery-item">
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=80" alt={t('gallery_library')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_library')}</span>
            </div>
          </div>
          <div className="gallery-item">
            <img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=700&q=80" alt={t('gallery_sports')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_sports')}</span>
            </div>
          </div>
          <div className="gallery-item">
            <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=700&q=80" alt={t('gallery_classroom')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_classroom')}</span>
            </div>
          </div>
          <div className="gallery-item">
            <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=700&q=80" alt={t('gallery_lab')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_lab')}</span>
            </div>
          </div>
          <div className="gallery-item gallery-item-large">
            <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80" alt={t('gallery_auditorium')} className="gallery-image" />
            <div className="gallery-overlay">
              <span>{t('gallery_auditorium')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-header">
          <h2>{t('home_faq_title', 'Frequently Asked Questions')}</h2>
          <p>{t('home_faq_desc', 'Quick answers to common queries.')}</p>
        </div>
        <div className="faq-wrap">
          <input
            className="inp faq-search"
            type="text"
            placeholder={t('home_faq_search', 'Search a question...')}
            value={faqQuery}
            onChange={(e) => setFaqQuery(e.target.value)}
          />
          <div className="faq-list">
            {filteredFaqs.length === 0 ? (
              <p className="faq-empty">{t('home_faq_empty', 'No matching questions found.')}</p>
            ) : (
              filteredFaqs.map((item, idx) => {
                const isOpen = idx === activeFaq;
                return (
                  <div key={item.q} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button type="button" className="faq-question" onClick={() => setActiveFaq(isOpen ? -1 : idx)}>
                      <span>{t(item.q)}</span>
                      <span>{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && <p className="faq-answer">{t(item.a)}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>{t('home_cta_title', 'Ready to Transform Your Institution?')}</h2>
        <p>{t('home_cta_desc', 'Join hundreds of organizations already using Shah College.')}</p>
        <Link to="/login" className="hero-btn hero-btn-primary">
          {t('home_cta_btn', 'Sign In to Dashboard →')}
        </Link>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Shah College. {t('home_footer_rights', 'All rights reserved.')}</p>
      </footer>
    </>
  );
}
