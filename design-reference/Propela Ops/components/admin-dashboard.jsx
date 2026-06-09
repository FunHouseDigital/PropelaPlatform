// admin-dashboard.jsx — Admin Dashboard (Desktop — Aya's View)
const { useState } = React;

const CANDIDATES = [
  { name: 'Lilian Majola', stage: 'Training', tier: 'Tier 1 Priority', dest: 'UK', efset: 60, ready: true, updated: '19 May 2026' },
  { name: 'Webson Madawo', stage: 'Assessed', tier: 'Tier 2 Dev', dest: 'Open', efset: 53, ready: false, updated: '18 May 2026' },
  { name: 'Shoemeney Cloete', stage: 'Training', tier: 'Tier 1 Standard', dest: 'Ireland', efset: 75, ready: false, updated: '17 May 2026' },
  { name: 'Laura Mosiah', stage: 'Exam Ready', tier: 'Tier 1 Standard', dest: 'UK', efset: 76, ready: true, updated: '16 May 2026' },
  { name: 'Ndalama Shekaba', stage: 'Assessed', tier: 'Tier 2 Dev', dest: 'Ireland', efset: 69, ready: false, updated: '15 May 2026' },
  { name: 'Emily Plaatjies', stage: 'Training', tier: 'Tier 1 Standard', dest: 'UK', efset: 72, ready: false, updated: '14 May 2026' },
];

const FILTERS = ['All Stages', 'Training', 'Assessed', 'Exam Ready'];
const NAV_ITEMS = [
  { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', label: 'Dashboard' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'Candidates' },
  { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Cohorts' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Reports' },
  { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings' },
];

function stageBadge(stage) {
  const map = {
    'Training': { bg: 'rgba(91,45,142,0.1)', color: '#5B2D8E' },
    'Assessed': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
    'Exam Ready': { bg: 'rgba(40,167,69,0.1)', color: '#28A745' },
  };
  const s = map[stage] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{stage}</span>
  );
}

function tierBadge(tier) {
  const map = {
    'Tier 1 Priority': { bg: '#5B2D8E', color: '#fff' },
    'Tier 1 Standard': { bg: '#F3EDF9', color: '#5B2D8E' },
    'Tier 2 Dev': { bg: '#FFF3E0', color: '#E68A00' },
  };
  const s = map[tier] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{tier}</span>
  );
}

function AdminDashboard() {
  const [filter, setFilter] = useState('All Stages');
  const [selected, setSelected] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeNav, setActiveNav] = useState(1);
  const [notes, setNotes] = useState('Lilian is highly motivated and has strong ICU experience. Discussed timeline for OET booking — aiming for July window. WhatsApp follow-up scheduled for 23 May.');

  const filtered = filter === 'All Stages'
    ? CANDIDATES
    : CANDIDATES.filter(c => c.stage === filter);

  const detail = CANDIDATES[selected];

  return (
    <div style={adS.shell}>
      {/* ── Sidebar ── */}
      <div style={adS.sidebar}>
        <div style={adS.sidebarLogo}>
          <span style={adS.logoMark}>P</span>
          <span style={adS.logoName}>propela</span>
        </div>
        <div style={{ marginTop: 32 }}>
          {NAV_ITEMS.map((item, i) => (
            <button key={item.label}
              onClick={() => setActiveNav(i)}
              style={{
                ...adS.navBtn,
                background: activeNav === i ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#fff', opacity: activeNav === i ? 1 : 0.7,
              }}
              onMouseEnter={e => { if (activeNav !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { if (activeNav !== i) e.currentTarget.style.background = 'transparent'; }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d={item.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {item.label}
            </button>
          ))}
        </div>
        <div style={adS.sidebarFooter}>
          <div style={adS.adminAvatar}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Aya</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Admin</div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={adS.main}>
        {/* Header */}
        <div style={adS.topBar}>
          <div>
            <h1 style={adS.pageTitle}>Cohort 1 — Candidate Pipeline</h1>
            <p style={adS.pageSubtitle}>6 candidates · Last synced 2 minutes ago</p>
          </div>
          <button style={adS.exportBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#F3EDF9'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
              <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 7l3 3 3-3M8 10V2" stroke="#5B2D8E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={adS.filterRow}>
          {FILTERS.map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                ...adS.filterChip,
                background: filter === f ? '#5B2D8E' : '#fff',
                color: filter === f ? '#fff' : '#5B2D8E',
                border: filter === f ? '1.5px solid #5B2D8E' : '1.5px solid #E0D6EC',
              }}
              onMouseEnter={e => { if (filter !== f) e.currentTarget.style.background = '#F3EDF9'; }}
              onMouseLeave={e => { if (filter !== f) e.currentTarget.style.background = '#fff'; }}>
              {f}
              {f !== 'All Stages' && (
                <span style={{
                  fontSize: 11, marginLeft: 4, opacity: 0.7,
                }}>({CANDIDATES.filter(c => f === 'All Stages' || c.stage === f).length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table + Panel */}
        <div style={adS.tablePanel}>
          {/* Table */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <div style={adS.tableCard}>
              <table style={adS.table}>
                <thead>
                  <tr>
                    {['Name', 'Stage', 'Tier', 'Destination', 'EF SET', 'Placement Ready', 'Last Updated'].map(h => (
                      <th key={h} style={adS.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const origIdx = CANDIDATES.indexOf(c);
                    const isSel = origIdx === selected;
                    return (
                      <tr key={c.name}
                        onClick={() => { setSelected(origIdx); setPanelOpen(true); }}
                        style={{
                          cursor: 'pointer',
                          background: isSel ? '#F3EDF9' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#FAFAFE'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                        <td style={adS.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 16,
                              background: isSel ? '#5B2D8E' : '#E0D6EC',
                              color: isSel ? '#fff' : '#5B2D8E',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, flexShrink: 0,
                            }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
                            <span style={{ fontWeight: 600, color: '#1A1A2E' }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={adS.td}>{stageBadge(c.stage)}</td>
                        <td style={adS.td}>{tierBadge(c.tier)}</td>
                        <td style={adS.td}>{c.dest}</td>
                        <td style={adS.td}>
                          <span style={{ fontWeight: 600, color: c.efset >= 61 ? '#28A745' : c.efset >= 51 ? '#5B2D8E' : '#E68A00' }}>{c.efset}</span>
                        </td>
                        <td style={adS.td}>
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: c.ready ? 'rgba(40,167,69,0.1)' : '#f3f4f6',
                            color: c.ready ? '#28A745' : '#9CA3AF',
                          }}>{c.ready ? 'Yes' : 'No'}</span>
                        </td>
                        <td style={{ ...adS.td, color: '#6B7280', fontSize: 13 }}>{c.updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          <div style={{
            ...adS.detailPanel,
            width: panelOpen ? 340 : 0,
            padding: panelOpen ? '20px' : '20px 0',
            opacity: panelOpen ? 1 : 0,
            overflow: panelOpen ? 'auto' : 'hidden',
          }}>
            {/* Close button */}
            <button onClick={() => setPanelOpen(false)} style={adS.panelClose}>✕</button>

            {/* Photo placeholder */}
            <div style={adS.detailAvatar}>
              {detail.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h3 style={adS.detailName}>{detail.name}</h3>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              {tierBadge(detail.tier)}
              {stageBadge(detail.stage)}
            </div>

            {/* Scores */}
            <div style={adS.detailSection}>
              <h4 style={adS.detailSectionTitle}>Scores summary</h4>
              <div style={adS.scoreGrid}>
                {[
                  { label: 'EF SET', value: detail.efset, max: 100 },
                  { label: 'CV Score', value: '4.2', max: 5 },
                  { label: 'Final Score', value: '4.5', max: 5 },
                ].map(s => (
                  <div key={s.label} style={adS.scoreItem}>
                    <div style={adS.scoreValue}>{s.value}<span style={adS.scoreMax}>/{s.max}</span></div>
                    <div style={adS.scoreLabel}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Red flags */}
            <div style={adS.detailSection}>
              <h4 style={adS.detailSectionTitle}>Red flags</h4>
              <div style={{ padding: '10px 14px', background: 'rgba(40,167,69,0.06)', borderRadius: 10, color: '#28A745', fontSize: 13, fontWeight: 500 }}>
                ✓ No red flags identified
              </div>
            </div>

            {/* Documents */}
            <div style={adS.detailSection}>
              <h4 style={adS.detailSectionTitle}>Documents checklist</h4>
              {['CV', 'SANC Certificate', 'Passport', 'Qualification cert', 'References'].map((d, i) => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                  borderBottom: i < 4 ? '1px solid #F3EDF9' : 'none' }}>
                  {i < 3 ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#28A745" opacity="0.15"/>
                      <path d="M5 8.5l2 2 4-4" stroke="#28A745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#E5E7EB"/>
                      <circle cx="8" cy="8" r="2" fill="#9CA3AF"/>
                    </svg>
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{d}</span>
                  <span style={{ fontSize: 11, color: i < 3 ? '#28A745' : '#9CA3AF' }}>
                    {i < 3 ? 'Received' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>

            {/* Internal notes */}
            <div style={adS.detailSection}>
              <h4 style={adS.detailSectionTitle}>Internal notes</h4>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={adS.notesArea}
                placeholder="Add notes about this candidate..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const adS = {
  shell: {
    width: '100%', height: '100%', display: 'flex',
    fontFamily: 'Poppins, sans-serif', background: '#F8F7FC',
    overflow: 'hidden',
  },
  /* Sidebar */
  sidebar: {
    width: 220, background: 'linear-gradient(180deg, #5B2D8E 0%, #3D1D5E 100%)',
    display: 'flex', flexDirection: 'column', padding: '20px 12px', flexShrink: 0,
  },
  sidebarLogo: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px',
  },
  logoMark: {
    width: 32, height: 32, borderRadius: 10,
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700,
  },
  logoName: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.5 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '10px 12px', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 500, fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left',
    marginBottom: 2,
  },
  sidebarFooter: {
    marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.12)',
  },
  adminAvatar: {
    width: 34, height: 34, borderRadius: 17,
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700,
  },
  /* Main */
  main: {
    flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px',
    minWidth: 0, overflow: 'hidden',
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: 0, lineHeight: 1.3,
  },
  pageSubtitle: {
    fontSize: 13, color: '#6B7280', margin: '2px 0 0', fontWeight: 400,
  },
  exportBtn: {
    display: 'flex', alignItems: 'center', padding: '9px 16px',
    border: '1.5px solid #E0D6EC', borderRadius: 10,
    background: '#fff', fontSize: 13, fontWeight: 600, color: '#5B2D8E',
    fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  filterRow: {
    display: 'flex', gap: 8, marginBottom: 16,
  },
  filterChip: {
    padding: '7px 16px', borderRadius: 20,
    fontSize: 13, fontWeight: 500, fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center',
  },
  tablePanel: {
    flex: 1, display: 'flex', gap: 16, minHeight: 0,
  },
  tableCard: {
    background: '#fff', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(91,45,142,0.06)',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
  },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '1px solid #F3EDF9', background: '#FAFAFE',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px', borderBottom: '1px solid #F3EDF9',
    fontSize: 14, color: '#374151', whiteSpace: 'nowrap',
  },
  /* Detail panel */
  detailPanel: {
    background: '#fff', borderRadius: 16,
    boxShadow: '-4px 0 24px rgba(91,45,142,0.08)',
    transition: 'width 0.3s ease, opacity 0.3s ease, padding 0.3s ease',
    flexShrink: 0, position: 'relative',
  },
  panelClose: {
    position: 'absolute', top: 12, right: 12,
    width: 28, height: 28, borderRadius: 14,
    border: 'none', background: '#F3EDF9', color: '#5B2D8E',
    fontSize: 14, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Poppins, sans-serif',
  },
  detailAvatar: {
    width: 64, height: 64, borderRadius: 32,
    background: 'linear-gradient(135deg, #5B2D8E, #7B4BAE)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, margin: '8px auto 12px',
  },
  detailName: {
    fontSize: 18, fontWeight: 700, color: '#1A1A2E', textAlign: 'center', margin: '0 0 8px',
  },
  detailSection: {
    marginBottom: 18,
  },
  detailSectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: 0.5, margin: '0 0 8px',
  },
  scoreGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
  },
  scoreItem: {
    textAlign: 'center', padding: '10px 6px',
    background: '#F8F7FC', borderRadius: 10,
  },
  scoreValue: {
    fontSize: 20, fontWeight: 700, color: '#5B2D8E',
  },
  scoreMax: { fontSize: 12, fontWeight: 400, color: '#9B8BB4' },
  scoreLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  notesArea: {
    width: '100%', boxSizing: 'border-box', minHeight: 100,
    padding: '10px 12px', border: '1.5px solid #E0D6EC', borderRadius: 10,
    fontSize: 13, fontFamily: 'Poppins, sans-serif', color: '#374151',
    resize: 'vertical', outline: 'none', lineHeight: 1.5,
    transition: 'border-color 0.2s',
  },
};

// Focus style for notes
if (!document.getElementById('ad-focus-styles')) {
  const style = document.createElement('style');
  style.id = 'ad-focus-styles';
  style.textContent = `textarea:focus { border-color: #5B2D8E !important; box-shadow: 0 0 0 3px rgba(91,45,142,0.12) !important; }`;
  document.head.appendChild(style);
}

window.AdminDashboard = AdminDashboard;
