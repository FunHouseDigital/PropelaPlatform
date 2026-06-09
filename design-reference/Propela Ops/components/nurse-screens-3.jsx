// nurse-screens-3.jsx — A7 Employer Preview, A8 Community, A9 Exam Outcome, A10 Post-Placement
const { useState } = React;

/* ═══════════════════════════════════════════
   A7 — Employer Preview Cards
   ═══════════════════════════════════════════ */
const EMPLOYERS = [
  { name: 'St George\'s University Hospital NHS Trust', location: 'London, United Kingdom', flag: '🇬🇧', wards: ['ICU', 'Medical', 'A&E'], culture: 'Supportive of international nurses — dedicated buddy system and monthly socials for new arrivals.', placed: 4, dest: 'UK' },
  { name: 'Cork University Hospital', location: 'Cork, Ireland', flag: '🇮🇪', wards: ['ICU', 'Surgical', 'Paediatrics'], culture: 'Strong Irish nursing community. Active international staff network and language support programme.', placed: 2, dest: 'Ireland' },
  { name: 'Manchester Royal Infirmary', location: 'Manchester, United Kingdom', flag: '🇬🇧', wards: ['Emergency', 'Medical/Surgical', 'Renal'], culture: 'One of the UK\'s largest trusts — structured preceptorship and career progression pathways for SA nurses.', placed: 3, dest: 'UK' },
];

function EmployerPreview({ onNav }) {
  return (
    <MobileShell navActive="dashboard" onNav={onNav}>
      <SimpleHeader title="Where you could be placed" subtitle="Propela works with vetted employers only. Here's a preview." />
      <div style={{ padding: '0 16px 20px' }}>
        {EMPLOYERS.map((emp, i) => (
          <PropCard key={i} style={{ padding: '16px', marginBottom: 14 }}>
            {/* Hospital avatar + name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emp.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, lineHeight: 1.3, fontFamily: F }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: C.grey, fontFamily: F, marginTop: 2 }}>{emp.location}</div>
              </div>
            </div>

            {/* Wards */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {emp.wards.map(w => <PurpleBadge key={w}>{w}</PurpleBadge>)}
            </div>

            {/* Culture note */}
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, fontFamily: F, marginBottom: 10, padding: '10px 12px', background: C.bg, borderRadius: 10, fontStyle: 'italic' }}>
              "{emp.culture}"
            </div>

            {/* Placed badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex' }}>
                  {Array.from({ length: Math.min(emp.placed, 3) }).map((_, j) => (
                    <div key={j} style={{ width: 22, height: 22, borderRadius: 11, background: C.purpleMid, border: '2px solid #fff', marginLeft: j > 0 ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>P</div>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: C.grey, fontFamily: F }}>{emp.placed} Propela nurses placed here</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.purple, background: C.purpleLight, padding: '3px 8px', borderRadius: 8 }}>{emp.dest}</span>
            </div>
          </PropCard>
        ))}

        <div style={{ padding: '12px 14px', background: C.purpleLight, borderRadius: 12, fontSize: 12, color: C.grey, lineHeight: 1.5, fontFamily: F }}>
          Your match is based on your specialisation, experience, and destination preference. Vuyo will contact you when a match is confirmed.
        </div>
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A8 — Cohort Community (WhatsApp-style)
   ═══════════════════════════════════════════ */
const COHORT_MEMBERS = [
  { name: 'Lilian', initials: 'LM', color: C.purple },
  { name: 'Webson', initials: 'WM', color: '#2563EB' },
  { name: 'Ndalama', initials: 'NS', color: C.green },
  { name: 'Emily', initials: 'EP', color: C.orange },
  { name: 'Peaceful', initials: 'PM', color: '#E11D48' },
  { name: 'Nomp.', initials: 'NM', color: '#7C3AED' },
  { name: 'Anathi', initials: 'AK', color: '#0891B2' },
  { name: 'Shoe.', initials: 'SC', color: '#D97706' },
];

const PINNED = [
  { from: 'Propela', text: 'Welcome to Cohort 1! This is your space to connect, ask questions, and support each other. Aya and Vuyo are here too. 🙌', time: '15 May', pinned: true },
  { from: 'Propela', text: 'Next group session: Thursday 29 May at 14:00. Topic: "What to expect from OET Writing." Link will be shared here.', time: '18 May', pinned: true },
  { from: 'Propela', text: 'Exam tip: Practice your OET Reading under timed conditions. The time pressure is real — but it gets easier. 💪', time: '19 May', pinned: true },
];

const MESSAGES = [
  { from: 'Ndalama', initials: 'NS', color: C.green, text: 'Anyone else finding the Writing component hard? 😅 I keep running out of time on the referral letter.', time: '10:23' },
  { from: 'Emily', initials: 'EP', color: C.orange, text: 'Finished lesson 5 today — feeling good about this! The Listening practice is actually helping.', time: '11:45' },
  { from: 'Webson', initials: 'WM', color: '#2563EB', text: 'Ndalama — try starting with the key clinical info first, then add the polite bits. That helped me a lot.', time: '12:02' },
  { from: 'Lilian', initials: 'LM', color: C.purple, text: 'Good advice Webson! Also, has anyone started the NMC account setup? I found it pretty straightforward.', time: '12:30' },
];

function CommunityTab({ onNav }) {
  const [msg, setMsg] = useState('');

  return (
    <MobileShell navActive="community" onNav={onNav}>
      <ScreenHeader title="Cohort 1 — Your people" subtitle="You're not doing this alone." />

      {/* Member avatars */}
      <div style={{ padding: '12px 16px 6px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {COHORT_MEMBERS.map(m => (
            <div key={m.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: F }}>{m.initials}</div>
              <span style={{ fontSize: 10, color: C.grey, fontFamily: F }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {/* Say hello card */}
        <div style={{ padding: '10px 14px', background: C.purpleLight, borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>👋</span>
          <span style={{ fontSize: 13, color: C.purple, fontWeight: 500, fontFamily: F }}>Say hello to your cohort</span>
        </div>

        {/* Pinned posts */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.greyLight, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F }}>Pinned by Propela</span>
          {PINNED.map((p, i) => (
            <div key={i} style={{ padding: '10px 12px', margin: '6px 0', background: '#F0EBFA', borderRadius: 12, borderLeft: `3px solid ${C.purple}` }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, fontFamily: F }}>{p.text}</div>
              <div style={{ fontSize: 10, color: C.greyLight, marginTop: 4, fontFamily: F }}>{p.time}</div>
            </div>
          ))}
        </div>

        {/* Community messages — WhatsApp style */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.greyLight, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F }}>Today</span>
          {MESSAGES.map((m, i) => {
            const isMe = m.from === 'Lilian';
            return (
              <div key={i} style={{ display: 'flex', gap: 8, margin: '8px 0', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                {!isMe && <div style={{ width: 30, height: 30, borderRadius: 15, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: F, flexShrink: 0, marginTop: 2 }}>{m.initials}</div>}
                <div style={{ maxWidth: '78%', padding: '10px 12px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isMe ? C.purple : C.white, boxShadow: isMe ? 'none' : '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {!isMe && <div style={{ fontSize: 11, fontWeight: 600, color: m.color, marginBottom: 2, fontFamily: F }}>{m.from}</div>}
                  <div style={{ fontSize: 14, color: isMe ? '#fff' : C.dark, lineHeight: 1.5, fontFamily: F }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : C.greyLight, textAlign: 'right', marginTop: 3, fontFamily: F }}>{m.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message input */}
      <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${C.purpleLight}`, background: C.white, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: F, outline: 'none' }} />
        <button style={{ width: 38, height: 38, borderRadius: 19, background: C.purple, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M16 2L8 10M16 2l-5 14-3-6-6-3 14-5z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A9 — Exam Outcome (Fail State)
   ═══════════════════════════════════════════ */
function ExamOutcome({ onNav }) {
  return (
    <MobileShell navActive="prep" onNav={onNav}>
      {/* Warm purple header — not red */}
      <div style={{ background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleMid} 100%)`, paddingTop: 52, borderRadius: '0 0 24px 24px', padding: '52px 20px 22px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💜</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: F, lineHeight: 1.3 }}>This isn't the end — here's what happens</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontFamily: F }}>We know this isn't the news you wanted. Let's talk about next steps.</div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        {/* Card 1: Commitment fee */}
        <PropCard style={{ borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6, fontFamily: F }}>Your commitment fee</div>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0, fontFamily: F }}>
            Because this was your first attempt, your R3,000 is still held safely. It is refunded when you pass — there is no deadline pressure. Your money is not lost.
          </p>
        </PropCard>

        {/* Card 2: Next attempt */}
        <PropCard style={{ borderLeft: `4px solid ${C.purple}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6, fontFamily: F }}>Your next attempt</div>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0, fontFamily: F }}>
            You can rebook your OET exam when you're ready. Propela recommends waiting 4–6 weeks to give yourself proper time to prepare. Your lesson access remains open — use it.
          </p>
        </PropCard>

        {/* Card 3: Support */}
        <PropCard style={{ borderLeft: `4px solid ${C.orange}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6, fontFamily: F }}>Your support</div>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: '0 0 12px', fontFamily: F }}>
            Aya will call you within 48 hours. You don't need to reach out — we will. You are not alone in this.
          </p>
          <PurpleBtn>Book a support call</PurpleBtn>
        </PropCard>

        <button onClick={() => onNav && onNav('prep')} style={{ width: '100%', padding: '13px', border: `2px solid ${C.purple}`, borderRadius: 12, background: C.white, color: C.purple, fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer', marginTop: 4 }}>
          Review my weak components →
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: C.grey, lineHeight: 1.6, fontFamily: F }}>
          Most nurses who don't pass on their first attempt pass on their second. You've already proven you can do hard things.
        </div>
      </div>
    </MobileShell>
  );
}

/* ═══════════════════════════════════════════
   A10 — Post-Placement Support
   ═══════════════════════════════════════════ */
const SETTLE_CHECKLIST = [
  { task: 'Open UK/Irish bank account', detail: 'Recommended: Revolut or Monzo for SA nurses — both work with SA ID and can be set up before you arrive.', done: false },
  { task: 'Register with a GP', detail: 'You can register at any GP surgery near your accommodation. Bring your passport and proof of address.', done: false },
  { task: 'Apply for National Insurance number (UK) / PPS number (Ireland)', detail: 'Call the NI helpline (UK) or visit your local Intreo office (Ireland) within your first week. You need this for tax and benefits.', done: false },
  { task: 'Set up international money transfer', detail: 'Wise (formerly TransferWise) is recommended for best ZAR exchange rates. Set up recurring transfers to SA.', done: true },
  { task: 'Join your hospital\'s international nurse group', detail: 'Ask your ward manager or buddy about existing support groups for international staff. Most trusts have one.', done: false },
  { task: 'Contact Propela if anything feels wrong at work', detail: 'You are entitled to fair treatment. If something doesn\'t feel right — staffing, hours, accommodation — tell us. We will act.', done: false },
];

function PostPlacement({ onNav }) {
  const [checks, setChecks] = useState(SETTLE_CHECKLIST.map(c => c.done));
  const toggle = i => { const n = [...checks]; n[i] = !n[i]; setChecks(n); };

  return (
    <MobileShell navActive="support" onNav={onNav}>
      <ScreenHeader title="You're placed — and we're still here" subtitle="Moving to a new country is a big deal. Here's what to sort in your first 30 days." />

      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.purple, fontFamily: F }}>30-Day Settlement Checklist</span>
          <GreenBadge>{checks.filter(Boolean).length}/{checks.length}</GreenBadge>
        </div>

        {SETTLE_CHECKLIST.map((item, i) => (
          <PropCard key={i} style={{ padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <button onClick={() => toggle(i)} style={{ width: 22, height: 22, borderRadius: 6, border: checks[i] ? 'none' : `2px solid ${C.border}`, background: checks[i] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}>
                {checks[i] && <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: checks[i] ? C.greyLight : C.dark, fontFamily: F, textDecoration: checks[i] ? 'line-through' : 'none' }}>{item.task}</div>
                <div style={{ fontSize: 12, color: C.grey, lineHeight: 1.5, marginTop: 4, fontFamily: F }}>{item.detail}</div>
              </div>
            </div>
          </PropCard>
        ))}

        {/* Still have questions */}
        <PropCard style={{ background: C.purpleLight, boxShadow: 'none', marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 10, fontFamily: F }}>Still have questions?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
              {Icon.whatsapp('#fff')} Aya
            </button>
            <button style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${C.purple}`, background: C.white, color: C.purple, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
              Talk to a placed nurse
            </button>
          </div>
        </PropCard>

        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: C.grey, lineHeight: 1.5, fontFamily: F, padding: '0 8px' }}>
          Propela's duty of care does not end at placement. We are contactable.
        </div>
      </div>
    </MobileShell>
  );
}

window.EmployerPreview = EmployerPreview;
window.CommunityTab = CommunityTab;
window.ExamOutcome = ExamOutcome;
window.PostPlacement = PostPlacement;
