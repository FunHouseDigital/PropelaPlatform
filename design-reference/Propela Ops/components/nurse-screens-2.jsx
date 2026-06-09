// nurse-screens-2.jsx — A4 While You Wait, A5 Exam Prep Hub, A6 Document Hub
const { useState, Fragment: Frag } = React;

/* ═══════════════════════════════════════════
   A4 — While You Wait Checklist
   ═══════════════════════════════════════════ */
const CHECKLIST = [
  { id: 'police', name: 'Police Clearance Certificate', urgency: 'red', time: 'Allow 6 weeks', done: false, how: 'Apply at your nearest SAPS office. Take your ID, proof of address, and a set of fingerprints. The certificate takes 4–6 weeks to process. Do not wait — this is the longest lead-time item.' },
  { id: 'sanc', name: 'SANC Certificate of Good Standing', urgency: 'red', time: 'Allow 3 weeks', done: false, how: 'Log in to the SANC e-Services portal. Apply for a Certificate of Good Standing under "Applications." Pay the fee online (approximately R300). Processing takes 2–3 weeks.' },
  { id: 'certified', name: 'Certified copies of qualification certificate', urgency: 'orange', time: 'Allow 1 week', done: false, how: 'Take your original certificate to a Commissioner of Oaths (police station, attorney, or bank). They will certify copies. You need at least 3 certified copies.' },
  { id: 'refs', name: 'Reference letters from last two employers', urgency: 'orange', time: 'Allow 2 weeks', done: false, how: 'Ask your current and most recent supervisor for a signed reference letter on hospital/clinic letterhead. Letters should confirm your role, dates of employment, and clinical competence.' },
  { id: 'passport', name: 'Passport valid for 3+ years', urgency: 'green', time: 'Done', done: true, how: 'Your passport is valid. No action needed.' },
  { id: 'nmc', name: 'Begin NMC/NMBI online account setup', urgency: 'orange', time: '30 minutes online', done: false, how: 'Go to nmc.org.uk and create an NMC Online account. For Ireland, go to nmbi.ie. You don\'t need to submit your full application yet — just set up the account so it\'s ready when the time comes.' },
];

function WhileYouWait({ onNav }) {
  const [checks, setChecks] = useState(CHECKLIST.map(c => c.done));
  const [expanded, setExpanded] = useState(null);
  const doneCount = checks.filter(Boolean).length;

  const toggle = i => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
  };

  // Progress ring
  const pct = doneCount / CHECKLIST.length;
  const r = 38, circ = 2 * Math.PI * r;

  return (
    <MobileShell navActive="dashboard" onNav={onNav}>
      <SimpleHeader title="You're in. Here's how to use this time well." subtitle="Training starts 15 June 2026. These steps take longer than you think — start now." />

      {/* Progress ring */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 16px' }}>
        <div style={{ position: 'relative', width: 96, height: 96 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke={C.purpleLight} strokeWidth="8" />
            <circle cx="48" cy="48" r={r} fill="none" stroke={C.purple} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.purple, fontFamily: F }}>{doneCount}/{CHECKLIST.length}</span>
            <span style={{ fontSize: 10, color: C.grey, fontFamily: F }}>complete</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div style={{ padding: '0 16px 24px' }}>
        {CHECKLIST.map((item, i) => (
          <PropCard key={item.id} style={{ padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Checkbox */}
              <button onClick={() => toggle(i)} style={{ width: 24, height: 24, borderRadius: 7, border: checks[i] ? 'none' : `2px solid ${C.border}`, background: checks[i] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1, transition: 'all 0.2s' }}>
                {checks[i] && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: checks[i] ? C.greyLight : C.dark, fontFamily: F, textDecoration: checks[i] ? 'line-through' : 'none', flex: 1 }}>{item.name}</span>
                  <UrgencyTag level={checks[i] ? 'green' : item.urgency} text={checks[i] ? 'Done' : item.time} />
                </div>
                {/* Expand toggle */}
                <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ background: 'none', border: 'none', color: C.purple, fontSize: 12, fontWeight: 500, fontFamily: F, cursor: 'pointer', padding: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {expanded === i ? 'Hide details' : 'How do I do this?'}
                  <span style={{ transform: expanded === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-flex' }}>{Icon.chevDown(10, C.purple)}</span>
                </button>
                {expanded === i && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: C.bg, borderRadius: 10, fontSize: 13, color: C.text, lineHeight: 1.6, fontFamily: F }}>{item.how}</div>
                )}
              </div>
            </div>
          </PropCard>
        ))}
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A5 — Exam Prep Hub
   ═══════════════════════════════════════════ */
const COMPONENTS = ['Listening', 'Reading', 'Writing', 'Speaking'];
const COMP_DATA = {
  OET: [
    { name: 'Listening', attempts: 4, confidence: 'Building', icon: '🎧' },
    { name: 'Reading', attempts: 6, confidence: 'Building', icon: '📖' },
    { name: 'Writing', attempts: 2, confidence: 'Low', icon: '✍️' },
    { name: 'Speaking', attempts: 3, confidence: 'Building', icon: '🗣️' },
  ],
  IELTS: [
    { name: 'Listening', attempts: 2, confidence: 'Low', icon: '🎧' },
    { name: 'Reading', attempts: 3, confidence: 'Building', icon: '📖' },
    { name: 'Writing', attempts: 1, confidence: 'Low', icon: '✍️' },
    { name: 'Speaking', attempts: 2, confidence: 'Low', icon: '🗣️' },
  ],
};

function ExamPrepHub({ onNav, defaultExam = 'OET' }) {
  const [tab, setTab] = useState(defaultExam);

  return (
    <MobileShell navActive="prep" onNav={onNav}>
      <ScreenHeader title="Your exam preparation" subtitle="Track your progress across all components" />

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 0, margin: '12px 16px 0', background: C.purpleLight, borderRadius: 12, padding: 3 }}>
        {['OET', 'IELTS', 'PTE'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 10, background: tab === t ? C.white : 'transparent', color: tab === t ? C.purple : '#9B8BB4', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer', boxShadow: tab === t ? '0 2px 8px rgba(91,45,142,0.1)' : 'none', transition: 'all 0.2s' }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '14px 16px 24px' }}>
        {tab === 'PTE' ? (
          /* PTE — brief card */
          <div>
            <PropCard>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 8, fontFamily: F }}>PTE Academic</div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: '0 0 14px', fontFamily: F }}>PTE Academic is accepted by some employers. Speak to Aya before booking this exam — most Propela nurses heading to the UK take OET.</p>
              <button onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', border: 'none', borderRadius: 10, background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                {Icon.whatsapp('#fff')}
                Chat with Aya on WhatsApp
              </button>
            </PropCard>
          </div>
        ) : (
          /* OET / IELTS content */
          <div>
            {/* Overview card */}
            <PropCard style={{ background: C.purpleLight, boxShadow: 'none', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontFamily: F }}>
                {tab === 'OET'
                  ? 'OET tests your English in a healthcare context. The NMC requires Grade B or above in all four components: Listening, Reading, Writing, Speaking.'
                  : 'IELTS Academic is accepted by NMBI Ireland and some UK employers. NMC requires 7.0 overall with no band below 7.0.'}
              </div>
            </PropCard>

            {/* Component cards */}
            {(COMP_DATA[tab] || COMP_DATA.OET).map(comp => {
              const confColor = comp.confidence === 'Ready' ? C.green : comp.confidence === 'Building' ? C.orange : C.red;
              return (
                <PropCard key={comp.name} style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{comp.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, fontFamily: F }}>{comp.name}</div>
                      <div style={{ fontSize: 12, color: C.grey, fontFamily: F }}>{comp.attempts} practice attempts</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: confColor, background: confColor + '18', padding: '3px 10px', borderRadius: 12 }}>{comp.confidence}</span>
                  </div>
                  <ProgressBar value={comp.attempts} max={10} height={5} />
                  <PurpleBtn style={{ marginTop: 10, padding: '10px', fontSize: 13 }}>Practice Now</PurpleBtn>
                </PropCard>
              );
            })}

            {/* Stat card */}
            <PropCard style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, marginTop: 4 }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: F, marginBottom: 4 }}>Nurses like you</div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.5, fontFamily: F }}>Nurses with your EF SET score (60) and ICU specialisation have a <span style={{ fontSize: 22, fontWeight: 700 }}>79%</span> first-attempt {tab} pass rate at Propela.</div>
            </PropCard>

            {tab === 'IELTS' && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: C.purpleLight, borderRadius: 12, fontSize: 12, color: C.grey, lineHeight: 1.5, fontFamily: F }}>
                Not sure which exam to take? Your training track includes guidance on this. Most Propela nurses heading to the UK take OET.
              </div>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A6 — Document Preparation Hub
   ═══════════════════════════════════════════ */
const DOC_TABS = ['For Training', 'For Registration', 'For Deployment'];
const DOC_DATA = {
  'For Training': [
    { name: 'SANC registration proof', status: 'uploaded', ok: true },
    { name: 'ID document copy', status: 'uploaded', ok: true },
    { name: 'Commitment fee receipt', status: 'Paid', ok: true },
  ],
  'For Registration': [
    { name: 'Authenticated degree/diploma certificate', status: 'Upload needed', ok: false, urgent: true },
    { name: 'Academic transcript', status: 'Upload needed', ok: false, urgent: true },
    { name: 'SANC Certificate of Good Standing', status: 'Uploaded', ok: true },
    { name: 'Police clearance', status: 'In progress', ok: null },
    { name: 'Passport copy', status: 'Uploaded', ok: true },
    { name: 'Two professional references', status: 'Upload needed', ok: false, urgent: true },
    { name: 'Occupational health clearance', status: 'Not yet started', ok: null },
    { name: 'English exam certificate', status: 'Pending exam', ok: false },
  ],
  'For Deployment': [
    { name: 'Signed employment contract', status: 'Pending placement', ok: null },
    { name: 'Visa application form', status: 'Not yet started', ok: null },
    { name: 'Flight booking confirmation', status: 'Pending', ok: null },
    { name: 'Accommodation details', status: 'Pending', ok: null },
  ],
};

function DocumentHub({ onNav }) {
  const [tab, setTab] = useState('For Registration');

  return (
    <MobileShell navActive="docs" onNav={onNav}>
      <SimpleHeader title="Everything you'll need — start early" subtitle="Visible from Day 1. Don't wait." />

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
        {DOC_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', border: `1.5px solid ${tab === t ? C.purple : C.border}`, borderRadius: 20, background: tab === t ? C.purple : C.white, color: tab === t ? '#fff' : C.purple, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>{t}</button>
        ))}
      </div>

      {/* Banner */}
      {tab === 'For Registration' && (
        <div style={{ margin: '8px 16px', padding: '11px 13px', background: C.orangeBg, borderRadius: 12, border: '1px solid rgba(255,152,0,0.2)', fontSize: 13, color: C.orangeDark, lineHeight: 1.5, fontFamily: F }}>
          <strong>NMC registration takes 3–6 months.</strong> Documents flagged in red take the longest — start these first.
        </div>
      )}

      {/* Document list */}
      <div style={{ padding: '8px 16px 24px' }}>
        {(DOC_DATA[tab] || []).map((doc, i, arr) => (
          <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.purpleLight}` : 'none' }}>
            {doc.ok === true ? Icon.check(18) : doc.ok === false ? (doc.urgent ? Icon.alert(18, C.red) : Icon.warn(18)) : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="#E5E7EB"/><circle cx="9" cy="9" r="2.5" fill={C.greyLight}/></svg>}
            <span style={{ flex: 1, fontSize: 14, color: C.text, fontFamily: F, fontWeight: 500 }}>{doc.name}</span>
            {doc.ok === false && doc.status === 'Upload needed' ? (
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${C.purple}`, background: C.white, color: C.purple, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
                {Icon.upload(C.purple)} Upload
              </button>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: F, color: doc.ok ? C.green : doc.ok === null ? C.greyLight : C.orangeDark }}>{doc.status}</span>
            )}
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

window.WhileYouWait = WhileYouWait;
window.ExamPrepHub = ExamPrepHub;
window.DocumentHub = DocumentHub;
