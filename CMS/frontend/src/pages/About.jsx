import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

const VALUES = [
  { icon: '🎯', title: 'about_val_mission_title', desc: 'about_val_mission_desc' },
  { icon: '👁️', title: 'about_val_vision_title', desc: 'about_val_vision_desc' },
  { icon: '💡', title: 'about_val_approach_title', desc: 'about_val_approach_desc' },
];

const TEAM = [
  { name: 'Dr. Sana Ullah Khan', role: 'Academic Director', initials: 'SK' },
  { name: 'Dr. Tahir Naaem', role: 'Technical Lead', initials: 'TN' },
  { name: 'Mr. Kashif Khan', role: 'Student Affairs', initials: 'KK' },
];

const HIGHLIGHTS = [
  { icon: '🏫', title: 'about_high_multi_title', desc: 'about_high_multi_desc' },
  { icon: '📱', title: 'about_high_resp_title', desc: 'about_high_resp_desc' },
  { icon: '🔐', title: 'about_high_secure_title', desc: 'about_high_secure_desc' },
  { icon: '📈', title: 'about_high_stats_title', desc: 'about_high_stats_desc' },
];

export default function About() {
  const { t } = useLanguage();
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="about-hero">
        <h1>{t('about_hero_title', 'About Shah College')}</h1>
        <p>{t('about_hero_desc', "We're building the future...")}</p>
      </section>

      {/* Values */}
      <div className="about-content">
        <div className="about-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="about-card">
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{v.icon}</div>
              <h3>{t(v.title)}</h3>
              <p>{t(v.desc)}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="section-header" style={{ marginTop: '2rem' }}>
          <h2>{t('about_why_choose', 'Why Choose Us')}</h2>
          <p>{t('about_why_desc', 'Built with reliable technology.')}</p>
        </div>
        <div className="features-grid" style={{ maxWidth: '100%' }}>
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="feature-card">
              <div className="feature-icon indigo">{h.icon}</div>
              <h3>{t(h.title)}</h3>
              <p>{t(h.desc)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <section className="team-section">
        <div className="section-header">
          <h2>{t('about_leadership', 'Leadership Team')}</h2>
          <p>{t('about_leadership_desc', 'Meet the people behind Shah College.')}</p>
        </div>
        <div className="team-grid">
          {TEAM.map((t_meta) => (
            <div key={t_meta.name} className="team-card">
              <div className="team-avatar">{t_meta.initials}</div>
              <h4>{t_meta.name}</h4>
              <div className="team-role">{t_meta.role}</div>
              <p>{t('about_leadership_desc', 'Meet the people...')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Shah College. {t('home_footer_rights', 'All rights reserved.')}</p>
      </footer>
    </>
  );
}
