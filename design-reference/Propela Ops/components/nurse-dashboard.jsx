// nurse-dashboard.jsx — Candidate Dashboard (Mobile)
const { useState } = React;

const STAGES = [
  { key: 'applied', label: 'Applied', icon: '✓' },
  { key: 'assessed', label: 'Assessed', icon: '✓' },
  { key: 'training', label: 'Training', icon: '3' },
  { key: 'exam', label: 'Exam Ready', icon: '4' },
  { key: 'placed', label: 'Placed', icon: '5' },
];
const ACTIVE_STAGE = 2;

const GreenTick = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#28A745" opacity="0.12"/>
    <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#28A745" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const OrangeWarn = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#FF9800" opacity="0.12"/>
    <path d="M9 6v3.5M9 12h.01" stroke="#FF9800" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const NavIcon = ({ d, active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d={d} stroke={active ? '#5B2D8E' : '#9CA3AF'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function NurseDashboard() {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div style={ndS.shell}>
      {/* ── Header ── */}
      <div style={ndS.header}>
        <div style={ndS.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={ndS.welcome}>Welcome back, Lilian 👋</div>
              <div style={ndS.subtitle}>Your journey is progressing</div>
            </div>
            <div style={ndS.avatar}>LM</div>
          </div>
        </div>
      </div>

      {/* ── Stage pathway ── */}
      <div style={ndS.pathwayWrap}>
        <div style={ndS.pathway}>
          {STAGES.map((s, i) => {
            const completed = i < ACTIVE_STAGE;
            const active = i === ACTIVE_STAGE;
            const future = i > ACTIVE_STAGE;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div style={{
                    flex: 1, height: 3, borderRadius: 2, minWidth: 12,
                    background: completed ? '#28A745' : active ? 'linear-gradient(90deg, #28A745, #5B2D8E)' : '#E0D6EC',
                    marginTop: 0,
                  }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: active ? 36 : 30, height: active ? 36 : 30,
                    borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: active ? 13 : 11, fontWeight: 700,
                    fontFamily: 'Poppins, sans-serif',
                    color: '#fff',
                    background: completed ? '#28A745' : active ? '#5B2D8E' : '#D4C6E6',
                    boxShadow: active ? '0 0 0 4px rgba(91,45,142,0.18)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {completed ? '✓' : active ? '◆' : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: active ? 700 : 500,
                    color: completed ? '#28A745' : active ? '#5B2D8E' : '#9B8BB4',
                    fontFamily: 'Poppins, sans-serif',
                    whiteSpace: 'nowrap',
                  }}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Cards area ── */}
      <div style={ndS.cardsArea}>

        {/* Card 1: Next Step */}
        <div style={ndS.card}>
          <div style={ndS.cardHeader}>
            <span style={ndS.cardIcon}>📚</span>
            <span style={ndS.cardTitle}>Your next step</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={ndS.cardLabel}>Lesson progress</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5B2D8E', fontFamily: 'Poppins, sans-serif' }}>3 of 10</span>
            </div>
            <div style={ndS.progressBg}>
              <div style={{ ...ndS.progressFill, width: '30%' }} />
            </div>
          </div>
          <div style={ndS.nextLesson}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <rect x="1" y="2" width="14" height="13" rx="2" stroke="#5B2D8E" strokeWidth="1.4"/>
              <path d="M1 6h14M5 1v2M11 1v2" stroke="#5B2D8E" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span>Next lesson: <strong>Thursday 22 May</strong> at <strong>10:00</strong></span>
          </div>
          <button style={ndS.purpleBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#4A2375'}
            onMouseLeave={e => e.currentTarget.style.background = '#5B2D8E'}>
            Book / Reschedule
          </button>
        </div>

        {/* Card 2: Status */}
        <div style={ndS.card}>
          <div style={ndS.cardHeader}>
            <span style={ndS.cardIcon}>📋</span>
            <span style={ndS.cardTitle}>Your status</span>
          </div>
          <div style={ndS.statusRow}>
            <GreenTick />
            <span style={ndS.statusLabel}>Commitment fee</span>
            <span style={ndS.statusBadgeGreen}>Paid</span>
          </div>
          <div style={{ ...ndS.statusRow, borderBottom: 'none' }}>
            <OrangeWarn />
            <span style={ndS.statusLabel}>Agreement</span>
            <span style={ndS.statusBadgeOrange}>Not yet signed</span>
          </div>
          <button style={ndS.orangeBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#E68A00'}
            onMouseLeave={e => e.currentTarget.style.background = '#FF9800'}>
            Sign Now
          </button>
        </div>

        {/* Card 3: Documents */}
        <div style={ndS.card}>
          <div style={ndS.cardHeader}>
            <span style={ndS.cardIcon}>📄</span>
            <span style={ndS.cardTitle}>Your documents</span>
          </div>
          {[
            { name: 'CV', status: 'uploaded', ok: true },
            { name: 'SANC Certificate', status: 'uploaded', ok: true },
            { name: 'Passport', status: 'Upload needed', ok: false },
          ].map((doc, i, arr) => (
            <div key={doc.name} style={{ ...ndS.statusRow, borderBottom: i < arr.length - 1 ? '1px solid #F3EDF9' : 'none' }}>
              {doc.ok ? <GreenTick /> : <OrangeWarn />}
              <span style={ndS.statusLabel}>{doc.name}</span>
              <span style={doc.ok ? ndS.statusBadgeGreen : ndS.statusBadgeOrange}>
                {doc.ok ? 'Uploaded' : doc.status}
              </span>
            </div>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* ── Bottom nav ── */}
      <div style={ndS.bottomNav}>
        {[
          { label: 'Dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
          { label: 'Documents', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { label: 'FAQs', d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01' },
          { label: 'Contact', d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        ].map((item, i) => (
          <button key={item.label}
            onClick={() => setActiveNav(i)}
            style={{ ...ndS.navItem, color: activeNav === i ? '#5B2D8E' : '#9CA3AF' }}>
            <NavIcon d={item.d} active={activeNav === i} />
            <span style={{ fontSize: 10, fontWeight: activeNav === i ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const ndS = {
  shell: {
    height: '100%', display: 'flex', flexDirection: 'column',
    background: '#F8F7FC', fontFamily: 'Poppins, sans-serif',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #5B2D8E 0%, #7B4BAE 100%)',
    paddingTop: 52, borderRadius: '0 0 24px 24px',
  },
  headerInner: {
    padding: '16px 20px 20px',
  },
  welcome: {
    fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3,
  },
  subtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: 400,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 14, fontWeight: 700,
  },
  pathwayWrap: {
    padding: '16px 16px 8px',
    background: '#fff', margin: '-12px 16px 0',
    borderRadius: 16, boxShadow: '0 4px 20px rgba(91,45,142,0.08)',
    position: 'relative', zIndex: 2,
  },
  pathway: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 0 8px',
  },
  cardsArea: {
    flex: 1, overflow: 'auto', padding: '16px 16px 0',
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '16px 16px 14px',
    marginBottom: 12, boxShadow: '0 2px 12px rgba(91,45,142,0.06)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  cardIcon: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1A1A2E' },
  cardLabel: { fontSize: 13, color: '#6B7280' },
  progressBg: {
    height: 6, borderRadius: 3, background: '#F3EDF9', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    background: 'linear-gradient(90deg, #5B2D8E, #7B4BAE)',
    transition: 'width 0.5s ease',
  },
  nextLesson: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: '#374151', marginBottom: 14,
    padding: '10px 12px', background: '#F8F7FC', borderRadius: 10,
    fontFamily: 'Poppins, sans-serif',
  },
  purpleBtn: {
    width: '100%', padding: '11px', border: 'none', borderRadius: 10,
    background: '#5B2D8E', color: '#fff',
    fontSize: 14, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  orangeBtn: {
    width: '100%', padding: '11px', border: 'none', borderRadius: 10,
    background: '#FF9800', color: '#fff',
    fontSize: 14, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer', transition: 'background 0.2s', marginTop: 4,
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid #F3EDF9',
  },
  statusLabel: {
    flex: 1, fontSize: 14, color: '#374151', fontWeight: 500,
  },
  statusBadgeGreen: {
    fontSize: 12, fontWeight: 600, color: '#28A745',
    background: 'rgba(40,167,69,0.08)', padding: '3px 10px', borderRadius: 20,
  },
  statusBadgeOrange: {
    fontSize: 12, fontWeight: 600, color: '#E68A00',
    background: 'rgba(255,152,0,0.08)', padding: '3px 10px', borderRadius: 20,
  },
  bottomNav: {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '6px 0 18px', background: '#fff',
    borderTop: '1px solid #F3EDF9',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
  },
  navItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif', padding: '4px 8px',
  },
};

window.NurseDashboard = NurseDashboard;
