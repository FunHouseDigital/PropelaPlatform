// nurse-screens-1.jsx — A1 Sign-up, A2 Dashboard, A3 Salary Calculator
const { useState, Fragment } = React;

/* ═══════════════════════════════════════════
   A1 — Sign-up Form (Step 3: Experience)
   ═══════════════════════════════════════════ */
const STEPS = ['Personal', 'Credentials', 'Experience', 'Documents', 'Review'];
const SPECS = ['', 'ICU', 'Emergency/A&E', 'Medical/Surgical', 'Mental Health', 'Midwifery', 'Paediatrics', 'Oncology', 'Theatre', 'Renal', 'PHC', 'Other'];
const YRS = ['', 'Less than 1 year', '1–2 years', '3–5 years', '5+ years'];
const HOSP = ['', 'None', 'Less than 1 year', '1–2 years', '3–5 years', '5+ years'];

function SignupForm() {
  const [form, setForm] = useState({ spec: '', yrs: '', hosp: '', employer: '', ward: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const cur = 2;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.white, fontFamily: F, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '52px 20px 8px' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>P</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.purple, letterSpacing: -0.5 }}>propela</span>
      </div>

      {/* Progress */}
      <div style={{ padding: '10px 14px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <div style={{ flex: 1, height: 2, borderRadius: 1, background: i <= cur ? C.purple : C.border, marginTop: 14 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontFamily: F, color: '#fff',
                background: i < cur ? C.purple : i === cur ? C.purple : C.purpleLight,
                boxShadow: i === cur ? '0 0 0 4px rgba(91,45,142,0.18)' : 'none',
                ...(i > cur ? { color: '#9B8BB4' } : {}),
              }}>
                {i < cur ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, fontWeight: i === cur ? 600 : 400, color: i <= cur ? C.purple : '#9B8BB4', fontFamily: F }}>{s}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* SANC Error */}
      <div style={{ margin: '0 16px 10px', padding: '11px 13px', background: C.redBg, borderRadius: 12, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {Icon.alert(18, C.red)}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.red, lineHeight: 1.4, fontFamily: F }}>Your SANC number is required — please go back and complete Step 2.</div>
          <div style={{ fontSize: 12, color: C.red, opacity: 0.7, marginTop: 2, cursor: 'pointer', textDecoration: 'underline', fontFamily: F }}>← Return to Credentials</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 16px', WebkitOverflowScrolling: 'touch' }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: C.dark, margin: '0 0 3px', fontFamily: F }}>Experience</h2>
        <p style={{ fontSize: 13, color: C.grey, margin: '0 0 18px', fontFamily: F }}>Tell us about your clinical background</p>
        <PropSelect label="Primary specialisation" value={form.spec} onChange={set('spec')} options={SPECS.map(s => ({ value: s, label: s || 'Select specialisation…' }))} required />
        <PropSelect label="Total years of nursing experience" value={form.yrs} onChange={set('yrs')} options={YRS.map(s => ({ value: s, label: s || 'Select…' }))} required />
        <PropSelect label="Years in hospital / acute care" value={form.hosp} onChange={set('hosp')} options={HOSP.map(s => ({ value: s, label: s || 'Select…' }))} required />
        <PropInput label="Current employer" value={form.employer} onChange={set('employer')} placeholder="Hospital, clinic, agency, or unemployed" required />
        <PropInput label="Current ward or unit" value={form.ward} onChange={set('ward')} placeholder="e.g. ICU, A&E, Ward 6 Medical" required />
      </div>

      {/* Continue */}
      <div style={{ padding: '10px 20px 14px', borderTop: `1px solid ${C.purpleLight}`, background: C.white }}>
        <PurpleBtn>Continue</PurpleBtn>
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: '#9B8BB4', fontFamily: F }}>Step 3 of 5</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   A2 — Nurse Dashboard
   ═══════════════════════════════════════════ */
const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'assessed', label: 'Assessed' },
  { key: 'training', label: 'Training' },
  { key: 'exam', label: 'Exam Ready' },
  { key: 'placed', label: 'Placed' },
];

function NurseDashboard({ onNav }) {
  return (
    <MobileShell navActive="dashboard" onNav={onNav}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleMid} 100%)`, paddingTop: 52, borderRadius: '0 0 24px 24px' }}>
        <div style={{ padding: '14px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: F }}>Welcome back, Lilian 👋</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontFamily: F }}>Your journey is progressing</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F }}>LM</div>
        </div>
      </div>

      {/* Stage pathway */}
      <div style={{ padding: '14px 14px 10px', background: C.white, margin: '-12px 16px 0', borderRadius: 16, boxShadow: '0 4px 20px rgba(91,45,142,0.08)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 6px' }}>
          {STAGES.map((s, i) => {
            const done = i < 2, active = i === 2, future = i > 2;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div style={{ flex: 1, height: 3, borderRadius: 2, minWidth: 10, background: done ? C.green : active ? `linear-gradient(90deg, ${C.green}, ${C.purple})` : C.border }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: active ? 34 : 28, height: active ? 34 : 28, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: active ? 12 : 10, fontWeight: 700, fontFamily: F, color: '#fff', background: done ? C.green : active ? C.purple : '#D4C6E6', boxShadow: active ? '0 0 0 4px rgba(91,45,142,0.15)' : 'none', transition: 'all 0.3s' }}>
                    {done ? '✓' : active ? '◆' : i + 1}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: done ? C.green : active ? C.purple : '#9B8BB4', fontFamily: F, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '14px 16px 20px' }}>
        {/* Card 1: Next step */}
        <PropCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📚</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: F }}>Your next step</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: C.grey, fontFamily: F }}>Lesson progress</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.purple, fontFamily: F }}>3 of 10</span>
          </div>
          <ProgressBar value={3} max={10} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, marginTop: 12, marginBottom: 12, padding: '10px 12px', background: C.bg, borderRadius: 10, fontFamily: F }}>
            {Icon.calendar()}
            <span>Next lesson: <strong>Thursday 22 May</strong> at <strong>10:00</strong></span>
          </div>
          <PurpleBtn>Book / Reschedule</PurpleBtn>
        </PropCard>

        {/* Card 2: Status */}
        <PropCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: F }}>Your status</span>
          </div>
          <StatusRow icon={Icon.check(18)} label="Commitment fee" badge={<GreenBadge>Paid</GreenBadge>} />
          <StatusRow icon={Icon.warn(18)} label="Agreement" badge={<OrangeBadge>Not yet signed</OrangeBadge>} border={false} />
          <div style={{ marginTop: 8 }}>
            <PurpleBtn style={{ background: C.orange, boxShadow: '0 4px 14px rgba(255,152,0,0.2)' }} onClick={() => {}}>Sign Now</PurpleBtn>
          </div>
        </PropCard>

        {/* Card 3: Documents */}
        <PropCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: F }}>Your documents</span>
          </div>
          <StatusRow icon={Icon.check(18)} label="CV" badge={<GreenBadge>Uploaded</GreenBadge>} />
          <StatusRow icon={Icon.check(18)} label="SANC Certificate" badge={<GreenBadge>Uploaded</GreenBadge>} />
          <StatusRow icon={Icon.warn(18)} label="Passport" badge={<OrangeBadge>Upload needed</OrangeBadge>} border={false} />
        </PropCard>

        {/* Quick links */}
        <PropCard style={{ background: C.purpleLight, boxShadow: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, marginBottom: 10, fontFamily: F }}>Explore</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ label: '💰 Salary Calculator', id: 'salary' }, { label: '📋 While You Wait', id: 'waitlist' }, { label: '🏥 Employer Previews', id: 'employers' }].map(l => (
              <button key={l.id} onClick={() => onNav && onNav(l.id)} style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${C.purple}`, background: C.white, color: C.purple, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>{l.label}</button>
            ))}
          </div>
        </PropCard>
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A3 — Salary & Life Calculator
   ═══════════════════════════════════════════ */
const SALARY_DATA = {
  UK: {
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds'],
    band5: { entry: 32073, top: 39043 },
    band6: { entry: 39964, top: 48113 },
    londonExtra: 2500,
    tax: 0.28, // effective rate including NI + pension for this band
    costOfLiving: { London: 1350, Manchester: 870, Birmingham: 820, Leeds: 800 },
    currency: 'GBP', symbol: '£', toZAR: 22.73,
  },
  Ireland: {
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick'],
    staffNurse: { entry: 35500, senior: 44600 },
    tax: 0.30,
    costOfLiving: { Dublin: 1250, Cork: 950, Galway: 880, Limerick: 820 },
    currency: 'EUR', symbol: '€', toZAR: 19.35,
  },
};

function SalaryCalculator({ onNav }) {
  const [dest, setDest] = useState('UK');
  const [exp, setExp] = useState('3-5');
  const [city, setCity] = useState('');
  const d = SALARY_DATA[dest];

  const calcCity = city || d.cities[0];
  const isLondon = dest === 'UK' && calcCity === 'London';

  // Calculate gross annual
  let gross;
  if (dest === 'UK') {
    gross = exp === '5+' ? d.band6.entry : exp === '3-5' ? d.band5.top : d.band5.entry;
    if (isLondon) gross += d.londonExtra;
  } else {
    gross = exp === '5+' ? d.staffNurse.senior : exp === '3-5' ? 40000 : d.staffNurse.entry;
  }

  const monthlyGross = Math.round(gross / 12);
  const monthlyNet = Math.round(monthlyGross * (1 - d.tax));
  const col = d.costOfLiving[calcCity] || d.costOfLiving[d.cities[0]];
  const remittance = monthlyNet - col;
  const remittanceZAR = Math.round(remittance * d.toZAR);
  const paybackMonths = Math.ceil(3000 / remittanceZAR) || 1;

  return (
    <MobileShell navActive="dashboard" onNav={onNav}>
      <SimpleHeader title="See what your move could look like" subtitle="Estimate your earnings and living costs" />
      <div style={{ padding: '0 16px 24px' }}>
        {/* Destination toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: C.purpleLight, borderRadius: 12, padding: 3 }}>
          {['UK', 'Ireland'].map(d2 => (
            <button key={d2} onClick={() => { setDest(d2); setCity(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: dest === d2 ? C.purple : 'transparent', color: dest === d2 ? '#fff' : C.purple, fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s' }}>{d2 === 'UK' ? '🇬🇧 United Kingdom' : '🇮🇪 Ireland'}</button>
          ))}
        </div>

        <PropSelect label="Years of experience" value={exp} onChange={e => setExp(e.target.value)} options={[{ value: '1-2', label: '1–2 years' }, { value: '3-5', label: '3–5 years' }, { value: '5+', label: '5+ years' }]} />
        <PropSelect label="Destination city" value={city} onChange={e => setCity(e.target.value)} options={[{ value: '', label: 'Select city…' }, ...d.cities.map(c2 => ({ value: c2, label: c2 }))]} />

        {/* Results */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          <PropCard style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 11, color: C.grey, fontFamily: F, marginBottom: 4 }}>Monthly take-home</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.purple, fontFamily: F }}>{d.symbol}{monthlyNet.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.greyLight, fontFamily: F }}>{dest === 'UK' ? 'NHS Band 5/6' : 'HSE Staff Nurse'}</div>
          </PropCard>
          <PropCard style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 11, color: C.grey, fontFamily: F, marginBottom: 4 }}>Cost of living</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.orangeDark, fontFamily: F }}>{d.symbol}{col.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.greyLight, fontFamily: F }}>{calcCity} (single, shared)</div>
          </PropCard>
          <PropCard style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 11, color: C.grey, fontFamily: F, marginBottom: 4 }}>Monthly remittance</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: F }}>R{remittanceZAR.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.greyLight, fontFamily: F }}>≈ {d.symbol}{remittance > 0 ? remittance.toLocaleString() : '—'} sent home</div>
          </PropCard>
          <PropCard style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 11, color: C.grey, fontFamily: F, marginBottom: 4 }}>R3,000 payback</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.purple, fontFamily: F }}>{paybackMonths}</div>
            <div style={{ fontSize: 11, color: C.greyLight, fontFamily: F }}>{paybackMonths === 1 ? 'month' : 'months'} to recover fee</div>
          </PropCard>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 14, padding: '12px 14px', background: C.purpleLight, borderRadius: 12, fontSize: 12, color: C.grey, lineHeight: 1.5, fontFamily: F }}>
          These are realistic estimates based on {dest === 'UK' ? 'NHS Band 5/6 scales (2026/27, 3.3% uplift)' : 'HSE Staff Nurse scales (2026)'} and current exchange rates (1 {d.currency} ≈ R{d.toZAR}). Propela updates these quarterly.
        </div>
      </div>
    </MobileShell>
  );
}

window.SignupForm = SignupForm;
window.NurseDashboard = NurseDashboard;
window.SalaryCalculator = SalaryCalculator;
