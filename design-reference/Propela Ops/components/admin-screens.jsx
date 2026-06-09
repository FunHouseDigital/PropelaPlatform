// admin-screens.jsx — B1 Admin Pipeline Dashboard, B2 Exam Tracker
const { useState } = React;

/* ── Shared admin data ── */
const CANDIDATES = [
  { name: 'Lilian Majola', init: 'LM', stage: 'Training', tier: 'Tier 1 Priority', dest: 'UK', exam: 'OET', efset: 60, ready: true, updated: '19 May 2026' },
  { name: 'Webson Madawo', init: 'WM', stage: 'Assessed', tier: 'Tier 2 Dev', dest: 'Open', exam: 'OET', efset: 53, ready: false, updated: '18 May 2026' },
  { name: 'Shoemeney Cloete', init: 'SC', stage: 'Training', tier: 'Tier 1 Standard', dest: 'Ireland', exam: 'IELTS', efset: 75, ready: false, updated: '17 May 2026' },
  { name: 'Laura Mosiah', init: 'LMo', stage: 'Exam Ready', tier: 'Tier 1 Standard', dest: 'UK', exam: 'OET', efset: 76, ready: true, updated: '16 May 2026' },
  { name: 'Ndalama Shekaba', init: 'NS', stage: 'Assessed', tier: 'Tier 2 Dev', dest: 'Ireland', exam: 'OET', efset: 69, ready: false, updated: '15 May 2026' },
  { name: 'Emily Plaatjies', init: 'EP', stage: 'Training', tier: 'Tier 1 Standard', dest: 'UK', exam: 'OET', efset: 72, ready: false, updated: '14 May 2026' },
];

const ADMIN_NAV = [
  { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', label: 'Dashboard' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'Candidates' },
  { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Cohorts' },
  { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: 'Exam Tracker' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Reports' },
  { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings' },
];

function AdminSidebar({ activeIdx, onNav }) {
  return (
    <div style={admS.sidebar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 32 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>P</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>propela</span>
      </div>
      {ADMIN_NAV.map((item, i) => (
        <button key={item.label} onClick={() => onNav(i)} style={{ ...admS.navBtn, background: activeIdx === i ? 'rgba(255,255,255,0.15)' : 'transparent', opacity: activeIdx === i ? 1 : 0.7 }}
          onMouseEnter={e => { if (activeIdx !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { if (activeIdx !== i) e.currentTarget.style.background = 'transparent'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d={item.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {item.label}
        </button>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>A</div>
        <div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Aya</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Admin</div></div>
      </div>
    </div>
  );
}

function stageBadge(stage) {
  const m = { Training: { bg: 'rgba(91,45,142,0.1)', c: C.purple }, Assessed: { bg: 'rgba(37,99,235,0.1)', c: '#2563EB' }, 'Exam Ready': { bg: C.greenBg, c: C.green }, Applied: { bg: '#f3f4f6', c: C.grey }, Placed: { bg: C.greenBg, c: C.green } };
  const s = m[stage] || m.Applied;
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.c, whiteSpace: 'nowrap' }}>{stage}</span>;
}

function tierBadge(tier) {
  const m = { 'Tier 1 Priority': { bg: C.purple, c: '#fff' }, 'Tier 1 Standard': { bg: C.purpleLight, c: C.purple }, 'Tier 2 Dev': { bg: C.orangeBg, c: C.orangeDark } };
  const s = m[tier] || { bg: '#f3f4f6', c: C.grey };
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.c, whiteSpace: 'nowrap' }}>{tier}</span>;
}

/* ═══════════════════════════════════════════
   B1 — Admin Pipeline Dashboard
   ═══════════════════════════════════════════ */
const FILTERS = ['All', 'Applied', 'Assessed', 'Training', 'Exam Ready', 'Placed'];

function AdminPipeline({ onAdminNav }) {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [notes, setNotes] = useState('Lilian is highly motivated and has strong ICU experience. Discussed timeline for OET booking — aiming for July window. WhatsApp follow-up scheduled for 23 May.');

  const filtered = filter === 'All' ? CANDIDATES : CANDIDATES.filter(c => c.stage === filter);
  const detail = CANDIDATES[selected];

  return (
    <div style={admS.shell}>
      <AdminSidebar activeIdx={1} onNav={i => { if (i === 3 && onAdminNav) onAdminNav('examtracker'); }} />
      <div style={admS.main}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: 0, fontFamily: F }}>Cohort 1 — Candidate Pipeline</h1>
            <p style={{ fontSize: 13, color: C.grey, margin: '2px 0 0', fontFamily: F }}>6 candidates · Last synced 2 minutes ago</p>
          </div>
          <button style={admS.exportBtn}>{Icon.download(C.purple)} Export CSV</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, fontFamily: F, cursor: 'pointer', border: `1.5px solid ${filter === f ? C.purple : C.border}`, background: filter === f ? C.purple : C.white, color: filter === f ? '#fff' : C.purple, transition: 'all 0.15s' }}>{f}</button>
          ))}
        </div>

        {/* Table + Panel */}
        <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(91,45,142,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Name', 'Stage', 'Tier', 'Dest', 'Exam Track', 'EF SET', 'Ready', 'Updated'].map(h => (
                      <th key={h} style={admS.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const idx = CANDIDATES.indexOf(c);
                    const isSel = idx === selected;
                    return (
                      <tr key={c.name} onClick={() => { setSelected(idx); setPanelOpen(true); }} style={{ cursor: 'pointer', background: isSel ? C.purpleLight : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#FAFAFE'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                        <td style={admS.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 15, background: isSel ? C.purple : C.purplePale, color: isSel ? '#fff' : C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.init}</div>
                            <span style={{ fontWeight: 600, color: C.dark }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={admS.td}>{stageBadge(c.stage)}</td>
                        <td style={admS.td}>{tierBadge(c.tier)}</td>
                        <td style={admS.td}>{c.dest}</td>
                        <td style={admS.td}><span style={{ fontSize: 12, fontWeight: 600, color: c.exam === 'IELTS' ? '#2563EB' : c.exam === 'PTE' ? C.orangeDark : C.purple }}>{c.exam}</span></td>
                        <td style={admS.td}><span style={{ fontWeight: 600, color: c.efset >= 61 ? C.green : c.efset >= 51 ? C.purple : C.orangeDark }}>{c.efset}</span></td>
                        <td style={admS.td}>{c.ready ? <GreenBadge>Yes</GreenBadge> : <span style={{ fontSize: 12, fontWeight: 600, color: C.greyLight, background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>No</span>}</td>
                        <td style={{ ...admS.td, color: C.grey, fontSize: 13 }}>{c.updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {panelOpen && (
            <div style={admS.panel}>
              <button onClick={() => setPanelOpen(false)} style={admS.panelClose}>✕</button>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, margin: '8px auto 10px' }}>{detail.init}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.dark, textAlign: 'center', margin: '0 0 6px', fontFamily: F }}>{detail.name}</h3>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
                {tierBadge(detail.tier)}
                {stageBadge(detail.stage)}
              </div>

              <div style={admS.section}>
                <h4 style={admS.secTitle}>Scores summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[{ l: 'EF SET', v: detail.efset, m: 100 }, { l: 'CV Score', v: '4.2', m: 5 }, { l: 'Final', v: '4.5', m: 5 }].map(s => (
                    <div key={s.l} style={{ textAlign: 'center', padding: '8px 4px', background: C.bg, borderRadius: 10 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{s.v}<span style={{ fontSize: 11, color: '#9B8BB4' }}>/{s.m}</span></div>
                      <div style={{ fontSize: 10, color: C.grey, marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={admS.section}>
                <h4 style={admS.secTitle}>Exam track</h4>
                <div style={{ padding: '8px 12px', background: C.bg, borderRadius: 10, fontSize: 13, fontFamily: F }}>
                  <span style={{ fontWeight: 600, color: C.purple }}>{detail.exam}</span> · EF SET {detail.efset} · {detail.efset >= 61 ? 'C1/C2 level' : detail.efset >= 51 ? 'B2 level' : 'B1 level'}
                </div>
              </div>

              <div style={admS.section}>
                <h4 style={admS.secTitle}>Red flags</h4>
                <div style={{ padding: '8px 12px', background: C.greenBg, borderRadius: 10, color: C.green, fontSize: 13, fontWeight: 500 }}>✓ No red flags identified</div>
              </div>

              <div style={admS.section}>
                <h4 style={admS.secTitle}>Documents</h4>
                {['CV', 'SANC Certificate', 'Passport', 'Qualification cert', 'References'].map((d, i) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 4 ? `1px solid ${C.purpleLight}` : 'none' }}>
                    {i < 3 ? Icon.check(14) : <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="#E5E7EB"/><circle cx="7" cy="7" r="2" fill={C.greyLight}/></svg>}
                    <span style={{ flex: 1, fontSize: 13, color: C.text }}>{d}</span>
                    <span style={{ fontSize: 10, color: i < 3 ? C.green : C.greyLight }}>{i < 3 ? 'Received' : 'Pending'}</span>
                  </div>
                ))}
              </div>

              <div style={admS.section}>
                <h4 style={admS.secTitle}>Internal notes</h4>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} style={admS.notes} placeholder="Add notes…" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   B2 — Exam Tracker
   ═══════════════════════════════════════════ */
const EXAM_DATA = [
  { name: 'Lilian Majola', init: 'LM', exam: 'OET', booked: true, date: '12 Jul 2026', result: 'Pending', attempt: 1, refund: 'N/A' },
  { name: 'Webson Madawo', init: 'WM', exam: 'OET', booked: false, date: '—', result: 'Not yet booked', attempt: 0, refund: 'N/A' },
  { name: 'Shoemeney Cloete', init: 'SC', exam: 'IELTS', booked: true, date: '20 Jul 2026', result: 'Pending', attempt: 1, refund: 'N/A' },
  { name: 'Laura Mosiah', init: 'LMo', exam: 'OET', booked: true, date: '28 Jun 2026', result: 'Pass', attempt: 1, refund: 'Yes' },
  { name: 'Ndalama Shekaba', init: 'NS', exam: 'OET', booked: false, date: '—', result: 'Not yet booked', attempt: 0, refund: 'N/A' },
  { name: 'Emily Plaatjies', init: 'EP', exam: 'OET', booked: true, date: '12 Jul 2026', result: 'Pending', attempt: 1, refund: 'N/A' },
];

function ExamTracker({ onAdminNav }) {
  const bookedCount = EXAM_DATA.filter(e => e.booked).length;
  const passCount = EXAM_DATA.filter(e => e.result === 'Pass').length;

  return (
    <div style={admS.shell}>
      <AdminSidebar activeIdx={3} onNav={i => { if (i === 1 && onAdminNav) onAdminNav('pipeline'); }} />
      <div style={admS.main}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.dark, margin: '0 0 14px', fontFamily: F }}>Exam Tracker — Cohort 1</h1>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: '16px 20px', background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(91,45,142,0.06)' }}>
            <div style={{ fontSize: 13, color: C.grey, fontFamily: F }}>Exams booked</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.purple, fontFamily: F }}>{bookedCount}<span style={{ fontSize: 16, fontWeight: 400, color: C.greyLight }}> of {EXAM_DATA.length}</span></div>
          </div>
          <div style={{ flex: 1, padding: '16px 20px', background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(91,45,142,0.06)' }}>
            <div style={{ fontSize: 13, color: C.grey, fontFamily: F }}>First-attempt passes</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.green, fontFamily: F }}>{passCount}</div>
          </div>
          <button style={{ padding: '16px 24px', background: C.purple, borderRadius: 14, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(91,45,142,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Send exam reminder
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(91,45,142,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Name', 'Exam Type', 'Booked', 'Exam Date', 'Result', 'Attempt', 'Refund Eligible', 'Notes'].map(h => (
                    <th key={h} style={admS.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXAM_DATA.map(e => (
                  <tr key={e.name} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#FAFAFE'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={admS.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 15, background: C.purplePale, color: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{e.init}</div>
                        <span style={{ fontWeight: 600, color: C.dark }}>{e.name}</span>
                      </div>
                    </td>
                    <td style={admS.td}><span style={{ fontWeight: 600, color: e.exam === 'IELTS' ? '#2563EB' : C.purple }}>{e.exam}</span></td>
                    <td style={admS.td}>{e.booked ? <GreenBadge>Yes</GreenBadge> : <span style={{ fontSize: 12, fontWeight: 600, color: C.greyLight, background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>No</span>}</td>
                    <td style={admS.td}>{e.date}</td>
                    <td style={admS.td}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                        ...(e.result === 'Pass' ? { background: C.greenBg, color: C.green } :
                          e.result === 'Fail' ? { background: C.redBg, color: C.red } :
                          e.result === 'Pending' ? { background: C.orangeBg, color: C.orangeDark } :
                          { background: '#f3f4f6', color: C.greyLight }),
                      }}>{e.result}</span>
                    </td>
                    <td style={admS.td}>{e.attempt || '—'}</td>
                    <td style={admS.td}>{e.refund === 'Yes' ? <GreenBadge>Yes</GreenBadge> : <span style={{ fontSize: 12, color: C.greyLight }}>{e.refund}</span>}</td>
                    <td style={admS.td}><span style={{ fontSize: 12, color: C.greyLight }}>—</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin shared styles ── */
const admS = {
  shell: { width: '100%', height: '100%', display: 'flex', fontFamily: F, background: C.bg, overflow: 'hidden' },
  sidebar: { width: 210, background: `linear-gradient(180deg, ${C.purple} 0%, ${C.purpleDark} 100%)`, display: 'flex', flexDirection: 'column', padding: '18px 12px', flexShrink: 0 },
  navBtn: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: F, cursor: 'pointer', color: '#fff', transition: 'background 0.15s', textAlign: 'left', marginBottom: 1 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 22px', minWidth: 0, overflow: 'hidden' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, fontSize: 13, fontWeight: 600, color: C.purple, fontFamily: F, cursor: 'pointer' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.grey, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.purpleLight}`, background: '#FAFAFE', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', borderBottom: `1px solid ${C.purpleLight}`, fontSize: 13, color: C.text, whiteSpace: 'nowrap' },
  panel: { width: 320, background: C.white, borderRadius: 16, boxShadow: '-4px 0 24px rgba(91,45,142,0.08)', flexShrink: 0, position: 'relative', padding: '18px', overflow: 'auto' },
  panelClose: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, border: 'none', background: C.purpleLight, color: C.purple, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F },
  section: { marginBottom: 16 },
  secTitle: { fontSize: 11, fontWeight: 600, color: C.grey, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px', fontFamily: F },
  notes: { width: '100%', boxSizing: 'border-box', minHeight: 80, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 12, fontFamily: F, color: C.text, resize: 'vertical', outline: 'none', lineHeight: 1.5 },
};

window.AdminPipeline = AdminPipeline;
window.ExamTracker = ExamTracker;
