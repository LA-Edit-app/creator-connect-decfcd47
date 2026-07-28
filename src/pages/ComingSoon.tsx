import { useState } from "react";

const LOGO =
  "data:image/png;base64,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";

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.briefly-root { font-family: 'Lexend', sans-serif; background: #0D0A1A; color: #fff; overflow-x: hidden; min-height: 100vh; }
.bg-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
.bg-orb-1 { width: 700px; height: 700px; background: radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%); top: -250px; left: -200px; }
.bg-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%); bottom: -150px; right: -100px; }
.bg-grid { position: fixed; inset: 0; z-index: 0; background-image: linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; }

.b-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 20px 48px; display: flex; align-items: center; justify-content: space-between; background: rgba(13,10,26,0.75); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); }
.nav-logo { display: flex; align-items: center; gap: 10px; }
.nav-logo-name { font-family: 'Epilogue', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
.nav-login { display: inline-flex; align-items: center; gap: 8px; background: #7C3AED; color: #fff; font-family: 'Lexend', sans-serif; font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; transition: background 0.2s; }
.nav-login:hover { background: #6D28D9; }

@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
.nav-dot { width: 6px; height: 6px; border-radius: 50%; background: #7C3AED; animation: pulse 2s infinite; display: inline-block; }

.b-hero { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 140px 24px 100px; }
.hero-badge-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 32px; animation: fadeUp 0.6s 0.1s ease both; }
.hero-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.35); color: #C4B5FD; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 100px; letter-spacing: 0.08em; text-transform: uppercase; }
.hero-built { color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 400; }
.b-hero h1 { font-family: 'Epilogue', sans-serif; font-size: clamp(40px, 6vw, 72px); font-weight: 800; line-height: 1.04; letter-spacing: -0.03em; color: #fff; max-width: 760px; margin-bottom: 24px; animation: fadeUp 0.6s 0.2s ease both; }
.b-hero h1 span { color: #A78BFA; }
.hero-sub { font-size: clamp(15px, 2vw, 17px); color: rgba(255,255,255,0.48); line-height: 1.8; font-weight: 300; max-width: 520px; margin-bottom: 48px; animation: fadeUp 0.6s 0.3s ease both; }

.email-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; animation: fadeUp 0.6s 0.4s ease both; }
.email-form { display: flex; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 5px; width: 100%; max-width: 420px; }
.email-form input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 14px; font-family: 'Lexend', sans-serif; padding: 10px 14px; min-width: 0; }
.email-form input::placeholder { color: rgba(255,255,255,0.28); }
.email-form button { background: #7C3AED; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; font-family: 'Lexend', sans-serif; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
.email-form button:hover:not(:disabled) { background: #6D28D9; }
.email-form button:disabled { opacity: 0.7; cursor: not-allowed; }
.success-msg { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.28); color: #6EE7B7; font-size: 13px; padding: 10px 20px; border-radius: 8px; }
.email-note { font-size: 12px; color: rgba(255,255,255,0.22); }

.pill-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 56px; animation: fadeUp 0.6s 0.55s ease both; }
.pill { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 100px; padding: 7px 14px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.45); }
.pill-dot { width: 5px; height: 5px; border-radius: 50%; background: #7C3AED; flex-shrink: 0; }

.scroll-cue { position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.2); animation: fadeIn 1s 1s ease both; }
.scroll-arrow { width: 1px; height: 36px; background: linear-gradient(to bottom, rgba(124,58,237,0.5), transparent); }

.b-section { position: relative; z-index: 1; }
.section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #A78BFA; margin-bottom: 14px; }
.section-title { font-family: 'Epilogue', sans-serif; font-size: clamp(28px, 4vw, 42px); font-weight: 800; line-height: 1.1; letter-spacing: -0.025em; color: #fff; margin-bottom: 16px; }
.section-title span { color: #A78BFA; }
.section-sub { font-size: 15px; color: rgba(255,255,255,0.45); line-height: 1.75; font-weight: 300; max-width: 500px; }

.overview { padding: 80px 24px 100px; max-width: 1100px; margin: 0 auto; }
.overview-head { text-align: center; margin-bottom: 64px; }
.overview-head .section-sub { margin: 0 auto; }
.feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px 16px 0 0; overflow: hidden; }
.feat-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.07); border-top: none; border-radius: 0 0 16px 16px; overflow: hidden; }
.feat-cell { background: #100D20; padding: 32px 28px; transition: background 0.2s; }
.feat-cell:hover { background: #15112A; }
.feat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; font-size: 20px; }
.fi-purple { background: rgba(124,58,237,0.2); }
.fi-blue { background: rgba(59,130,246,0.15); }
.fi-teal { background: rgba(20,184,166,0.15); }
.fi-pink { background: rgba(236,72,153,0.15); }
.fi-amber { background: rgba(245,158,11,0.15); }
.feat-name { font-family: 'Epilogue', sans-serif; font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -0.01em; }
.feat-desc { font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.4); font-weight: 300; }

.mockup-section { padding: 0 24px 100px; max-width: 1000px; margin: 0 auto; }
.mockup-frame { background: #130F25; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
.mockup-topbar { background: #0D0A1A; border-bottom: 1px solid rgba(255,255,255,0.07); padding: 12px 16px; display: flex; align-items: center; gap: 8px; }
.mdot { width: 9px; height: 9px; border-radius: 50%; }
.mdot-r { background: rgba(239,68,68,0.6); }
.mdot-y { background: rgba(245,158,11,0.6); }
.mdot-g { background: rgba(34,197,94,0.6); }
.mockup-url { flex: 1; text-align: center; font-size: 11px; color: rgba(255,255,255,0.18); }
.mockup-body { padding: 24px; display: grid; grid-template-columns: 200px 1fr; gap: 20px; min-height: 360px; }
.mock-sidebar { border-right: 1px solid rgba(255,255,255,0.06); padding-right: 20px; display: flex; flex-direction: column; gap: 4px; }
.mock-nav-title { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.2); font-weight: 600; margin: 12px 0 6px; }
.mock-nav-item { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 7px; font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.35); }
.mock-nav-item.active { background: rgba(124,58,237,0.15); color: #C4B5FD; font-weight: 500; }
.mock-nav-icon { font-size: 14px; opacity: 0.7; }
.mock-main { display: flex; flex-direction: column; gap: 16px; }
.mock-header-row { display: flex; align-items: center; justify-content: space-between; }
.mock-page-title { font-family: 'Epilogue', sans-serif; font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.mock-btn { background: #7C3AED; color: #fff; font-size: 11px; font-weight: 600; font-family: 'Lexend', sans-serif; padding: 6px 12px; border-radius: 6px; border: none; cursor: default; }
.mock-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mock-kpi { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px 14px; }
.mock-kpi-val { font-family: 'Epilogue', sans-serif; font-size: 20px; font-weight: 800; color: #fff; }
.mock-kpi-lbl { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 2px; }
.mock-kpi-delta { font-size: 10px; color: #34d399; font-weight: 600; margin-top: 4px; }
.mock-table-head { display: grid; grid-template-columns: 1fr 80px 80px 70px; padding: 6px 10px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.22); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); }
.mock-row { display: grid; grid-template-columns: 1fr 80px 80px 70px; padding: 10px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: center; }
.mock-campaign-name { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8); }
.mock-campaign-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 1px; }
.mock-cell { font-size: 12px; color: rgba(255,255,255,0.55); }
.mock-status { display: inline-block; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 100px; }
.s-live { background: rgba(16,185,129,0.15); color: #34d399; }
.s-draft { background: rgba(245,158,11,0.15); color: #fbbf24; }
.s-done { background: rgba(139,92,246,0.15); color: #a78bfa; }

.who { padding: 80px 24px 100px; max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.who-text .section-sub { max-width: 420px; margin-bottom: 36px; }
.audience-list { display: flex; flex-direction: column; gap: 12px; }
.audience-item { display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 18px; transition: border-color 0.2s; }
.audience-item:hover { border-color: rgba(124,58,237,0.35); }
.audience-icon { width: 36px; height: 36px; flex-shrink: 0; border-radius: 8px; background: rgba(124,58,237,0.2); display: flex; align-items: center; justify-content: center; font-size: 17px; }
.audience-name { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.audience-desc { font-size: 12px; color: rgba(255,255,255,0.38); line-height: 1.55; font-weight: 300; }
.who-stats { display: flex; flex-direction: column; gap: 16px; }
.stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 24px 26px; }
.stat-card-val { font-family: 'Epilogue', sans-serif; font-size: 36px; font-weight: 800; color: #A78BFA; letter-spacing: -0.03em; margin-bottom: 4px; }
.stat-card-lbl { font-size: 13px; color: rgba(255,255,255,0.4); font-weight: 300; }
.stat-card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.integrations { padding: 80px 24px 100px; text-align: center; max-width: 800px; margin: 0 auto; }
.integrations .section-sub { margin: 0 auto 48px; }
.int-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.int-chip { display: flex; align-items: center; gap: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55); transition: border-color 0.2s, color 0.2s; }
.int-chip:hover { border-color: rgba(124,58,237,0.4); color: rgba(255,255,255,0.8); }
.int-chip-icon { font-size: 18px; }
.int-live { font-size: 10px; color: #34d399; font-weight: 600; }
.int-coming { font-size: 10px; color: rgba(124,58,237,0.6); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

.bottom-cta { padding: 80px 24px 60px; text-align: center; max-width: 640px; margin: 0 auto; }
.bottom-cta .section-title { margin-bottom: 14px; }
.bottom-cta .section-sub { margin: 0 auto 40px; }
.cta-form { display: flex; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 5px; width: 100%; max-width: 400px; margin: 0 auto 12px; }
.cta-form input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 14px; font-family: 'Lexend', sans-serif; padding: 10px 14px; min-width: 0; }
.cta-form input::placeholder { color: rgba(255,255,255,0.28); }
.cta-form button { background: #7C3AED; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; font-family: 'Lexend', sans-serif; cursor: pointer; transition: background 0.2s; }
.cta-form button:hover:not(:disabled) { background: #6D28D9; }
.cta-form button:disabled { opacity: 0.7; cursor: not-allowed; }
.cta-note { font-size: 12px; color: rgba(255,255,255,0.2); }

.b-footer { position: relative; z-index: 1; border-top: 1px solid rgba(255,255,255,0.06); padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; }
.footer-logo { display: flex; align-items: center; gap: 9px; }
.footer-logo-name { font-family: 'Epilogue', sans-serif; font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.footer-copy { font-size: 12px; color: rgba(255,255,255,0.2); }
.footer-links { display: flex; gap: 24px; }
.footer-links a { font-size: 12px; color: rgba(255,255,255,0.25); text-decoration: none; transition: color 0.2s; }
.footer-links a:hover { color: rgba(255,255,255,0.6); }

@media (max-width: 768px) {
  .b-nav { padding: 16px 20px; }
  .b-hero h1 { font-size: 36px; }
  .feat-grid { grid-template-columns: 1fr; border-radius: 16px 16px 0 0; }
  .feat-grid-2 { grid-template-columns: 1fr; }
  .mockup-body { grid-template-columns: 1fr; }
  .mock-sidebar { display: none; }
  .who { grid-template-columns: 1fr; gap: 48px; }
  .b-footer { flex-direction: column; gap: 16px; text-align: center; }
  .footer-links { display: none; }
}
`;

const FORMSPREE = "https://formspree.io/f/mbdblvwq";

async function submitEmail(email: string): Promise<boolean> {
  const res = await fetch(FORMSPREE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, _replyto: email, _subject: `Briefly Early Access — ${email}` }),
  });
  return res.ok;
}

const ComingSoon = () => {
  const [heroEmail, setHeroEmail] = useState("");
  const [heroOk, setHeroOk] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaOk, setCtaOk] = useState(false);
  const [ctaLoading, setCtaLoading] = useState(false);

  const handleHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroEmail.includes("@")) return;
    setHeroLoading(true);
    const ok = await submitEmail(heroEmail).catch(() => false);
    setHeroLoading(false);
    if (ok) setHeroOk(true);
  };

  const handleCta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctaEmail.includes("@")) return;
    setCtaLoading(true);
    const ok = await submitEmail(ctaEmail).catch(() => false);
    setCtaLoading(false);
    if (ok) setCtaOk(true);
  };

  return (
    <div className="briefly-root">
      <style>{CSS}</style>

      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />

      {/* Nav */}
      <nav className="b-nav">
        <div className="nav-logo">
          <img src={LOGO} alt="Briefly" style={{ height: 34, width: 34, borderRadius: 8, objectFit: "cover" }} />
          <span className="nav-logo-name">Briefly</span>
        </div>
        <a href="https://briefly-suite.vercel.app" className="nav-login" target="_blank" rel="noopener noreferrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          Log in
        </a>
      </nav>

      {/* Hero */}
      <section className="b-hero b-section">
        <div className="hero-badge-wrap">
          <div className="hero-badge">
            <span className="nav-dot" />
            Currently in private beta — limited early access
          </div>
          <span className="hero-built">Built for talent &amp; influencer agencies</span>
        </div>
        <h1>Campaign management,<br /><span>without the chaos.</span></h1>
        <p className="hero-sub">
          Briefly is the all-in-one platform for talent agencies to track campaigns, manage creators,
          measure revenue, and close the loop — without the spreadsheet chaos.
        </p>

        <div className="email-wrap">
          {heroOk ? (
            <div className="success-msg">You're on the list — we'll be in touch soon. ✓</div>
          ) : (
            <form className="email-form" onSubmit={handleHero}>
              <input
                type="email"
                required
                placeholder="Enter your work email"
                value={heroEmail}
                onChange={(e) => setHeroEmail(e.target.value)}
              />
              <button type="submit" disabled={heroLoading}>
                {heroLoading ? "Sending…" : "Get early access"}
              </button>
            </form>
          )}
          <p className="email-note">No spam. One email when we launch.</p>
        </div>

        <div className="pill-row">
          {["Campaign tracker", "Creator management", "Revenue analytics", "Task management", "Client reporting", "Xero integration"].map((f) => (
            <div key={f} className="pill"><div className="pill-dot" />{f}</div>
          ))}
        </div>

        <div className="scroll-cue">
          <span>Explore</span>
          <div className="scroll-arrow" />
        </div>
      </section>

      {/* Platform overview */}
      <section className="overview b-section">
        <div className="overview-head">
          <div className="section-label">The platform</div>
          <h2 className="section-title">Everything your agency needs,<br /><span>in one workspace.</span></h2>
          <p className="section-sub">Briefly replaces the fragmented mix of spreadsheets, email threads, and disconnected tools that slow talent agencies down.</p>
        </div>
        <div className="feat-grid">
          <div className="feat-cell">
            <div className="feat-icon fi-purple">🎯</div>
            <div className="feat-name">Campaign Tracker</div>
            <p className="feat-desc">Manage every campaign from brief to wrap — deadlines, deliverables, creator assignments, and live status in a single view.</p>
          </div>
          <div className="feat-cell">
            <div className="feat-icon fi-blue">👤</div>
            <div className="feat-name">Creator Management</div>
            <p className="feat-desc">Your full roster in one place. Track rates, platforms, availability, and performance history across every talent on your books.</p>
          </div>
          <div className="feat-cell">
            <div className="feat-icon fi-teal">📊</div>
            <div className="feat-name">Revenue Analytics</div>
            <p className="feat-desc">Real-time dashboards showing campaign revenue, margins, and forecasts — so you always know where the business stands.</p>
          </div>
        </div>
        <div className="feat-grid-2">
          <div className="feat-cell">
            <div className="feat-icon fi-pink">📋</div>
            <div className="feat-name">Client Reporting</div>
            <p className="feat-desc">Auto-generate polished post-campaign reports for clients — pulling in performance data, spend, and ROI without the manual effort.</p>
          </div>
          <div className="feat-cell">
            <div className="feat-icon fi-amber">✅</div>
            <div className="feat-name">Task Management</div>
            <p className="feat-desc">Keep your team aligned with campaign tasks, ownership, and due dates. Nothing falls through the cracks when everything is connected.</p>
          </div>
        </div>
      </section>

      {/* Dashboard mockup */}
      <section className="mockup-section b-section">
        <div className="mockup-frame">
          <div className="mockup-topbar">
            <div className="mdot mdot-r" /><div className="mdot mdot-y" /><div className="mdot mdot-g" />
            <div className="mockup-url">app.brieflysuite.com</div>
          </div>
          <div className="mockup-body">
            <div className="mock-sidebar">
              <div className="mock-nav-title">Workspace</div>
              <div className="mock-nav-item active"><span className="mock-nav-icon">🎯</span> Campaigns</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">👤</span> Creators</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">📊</span> Analytics</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">📋</span> Reports</div>
              <div className="mock-nav-title">Team</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">✅</span> Tasks</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">💬</span> Messages</div>
              <div className="mock-nav-title">Finance</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">💳</span> Invoices</div>
              <div className="mock-nav-item"><span className="mock-nav-icon">🔗</span> Xero</div>
            </div>
            <div className="mock-main">
              <div className="mock-header-row">
                <div className="mock-page-title">Campaigns</div>
                <button className="mock-btn">+ New campaign</button>
              </div>
              <div className="mock-kpis">
                <div className="mock-kpi">
                  <div className="mock-kpi-val">24</div>
                  <div className="mock-kpi-lbl">Active campaigns</div>
                  <div className="mock-kpi-delta">↑ 4 this month</div>
                </div>
                <div className="mock-kpi">
                  <div className="mock-kpi-val">£182k</div>
                  <div className="mock-kpi-lbl">Revenue (MTD)</div>
                  <div className="mock-kpi-delta">↑ 12% vs last month</div>
                </div>
                <div className="mock-kpi">
                  <div className="mock-kpi-val">91</div>
                  <div className="mock-kpi-lbl">Creators managed</div>
                  <div className="mock-kpi-delta">↑ 7 this quarter</div>
                </div>
              </div>
              <div>
                <div className="mock-table-head">
                  <span>Campaign</span><span>Status</span><span>Revenue</span><span>Due</span>
                </div>
                <div className="mock-row">
                  <div><div className="mock-campaign-name">Summer Glow × Fenty</div><div className="mock-campaign-sub">8 creators · Instagram + TikTok</div></div>
                  <div className="mock-cell"><span className="mock-status s-live">Live</span></div>
                  <div className="mock-cell">£34,500</div>
                  <div className="mock-cell" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Jun 30</div>
                </div>
                <div className="mock-row">
                  <div><div className="mock-campaign-name">Autumn Collection · ASOS</div><div className="mock-campaign-sub">12 creators · YouTube + IG</div></div>
                  <div className="mock-cell"><span className="mock-status s-draft">Draft</span></div>
                  <div className="mock-cell">£61,200</div>
                  <div className="mock-cell" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Aug 15</div>
                </div>
                <div className="mock-row">
                  <div><div className="mock-campaign-name">Festival Vibes · Klarna</div><div className="mock-campaign-sub">5 creators · TikTok</div></div>
                  <div className="mock-cell"><span className="mock-status s-done">Wrapped</span></div>
                  <div className="mock-cell">£22,750</div>
                  <div className="mock-cell" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>May 10</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="who b-section">
        <div className="who-text">
          <div className="section-label">Who it's for</div>
          <h2 className="section-title">Built for the<br /><span>people running agencies.</span></h2>
          <p className="section-sub">Whether you're managing 5 creators or 500, Briefly scales with your operation.</p>
          <div className="audience-list">
            <div className="audience-item">
              <div className="audience-icon">🏢</div>
              <div>
                <div className="audience-name">Talent &amp; influencer agencies</div>
                <div className="audience-desc">Replace disconnected spreadsheets with a single command centre for your entire roster and pipeline.</div>
              </div>
            </div>
            <div className="audience-item">
              <div className="audience-icon">📣</div>
              <div>
                <div className="audience-name">Campaign managers</div>
                <div className="audience-desc">Track every deliverable, deadline, and creator brief without juggling a dozen tools and email chains.</div>
              </div>
            </div>
            <div className="audience-item">
              <div className="audience-icon">💼</div>
              <div>
                <div className="audience-name">Finance &amp; ops leads</div>
                <div className="audience-desc">Connect revenue data directly to Xero. Close the books faster with campaign-level financial reporting built in.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="who-stats">
          <div className="stat-card">
            <div className="stat-card-val">3.2×</div>
            <div className="stat-card-lbl">faster campaign reporting vs manual methods</div>
          </div>
          <div className="stat-card-row">
            <div className="stat-card">
              <div className="stat-card-val">90%</div>
              <div className="stat-card-lbl">less time on status updates</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-val">£0</div>
              <div className="stat-card-lbl">revenue slips through the cracks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="integrations b-section">
        <div className="section-label">Integrations</div>
        <h2 className="section-title">Plays nicely with<br /><span>your existing stack.</span></h2>
        <p className="section-sub">Briefly connects to the tools your agency already relies on — no rip-and-replace required.</p>
        <div className="int-grid">
          <div className="int-chip"><span className="int-chip-icon">🟢</span> Xero <span className="int-live">Live</span></div>
          <div className="int-chip"><span className="int-chip-icon">📧</span> Gmail <span className="int-coming">Beta</span></div>
          <div className="int-chip"><span className="int-chip-icon">📅</span> Google Calendar <span className="int-coming">Beta</span></div>
          <div className="int-chip"><span className="int-chip-icon">💬</span> Slack <span className="int-coming">Coming soon</span></div>
          <div className="int-chip"><span className="int-chip-icon">📁</span> Google Drive <span className="int-coming">Coming soon</span></div>
          <div className="int-chip"><span className="int-chip-icon">📊</span> HubSpot <span className="int-coming">Coming soon</span></div>
          <div className="int-chip"><span className="int-chip-icon">📸</span> Instagram API <span className="int-coming">Coming soon</span></div>
          <div className="int-chip"><span className="int-chip-icon">🎵</span> TikTok API <span className="int-coming">Coming soon</span></div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bottom-cta b-section">
        <div className="section-label">Early access</div>
        <h2 className="section-title">Be first through<br /><span>the door.</span></h2>
        <p className="section-sub">We're opening to a small group of agencies before public launch. Join the waitlist and help shape what Briefly becomes.</p>
        {ctaOk ? (
          <div className="success-msg" style={{ maxWidth: 400, margin: "0 auto 12px" }}>You're on the list — we'll be in touch soon. ✓</div>
        ) : (
          <form className="cta-form" onSubmit={handleCta}>
            <input
              type="email"
              required
              placeholder="Enter your work email"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
            />
            <button type="submit" disabled={ctaLoading}>
              {ctaLoading ? "Sending…" : "Notify me"}
            </button>
          </form>
        )}
        <p className="cta-note">No spam. Just one email when we launch.</p>
      </section>

      {/* Footer */}
      <footer className="b-footer">
        <div className="footer-logo">
          <img src={LOGO} alt="Briefly" style={{ height: 28, width: 28, borderRadius: 6, objectFit: "cover" }} />
          <span className="footer-logo-name">Briefly</span>
        </div>
        <span className="footer-copy">© 2026 Briefly. All rights reserved.</span>
        <nav className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="https://brieflysuite.com">Website</a>
        </nav>
      </footer>
    </div>
  );
};

export default ComingSoon;
