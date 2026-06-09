// signup-form.jsx — Nurse Sign-up Form, Step 3: Experience
const { useState } = React;

const STEPS = ['Personal', 'Credentials', 'Experience', 'Documents', 'Review'];
const CURRENT_STEP = 2;

const SPECIALISATIONS = [
  'Select specialisation…', 'ICU', 'Emergency/A&E', 'Medical/Surgical',
  'Mental Health', 'Midwifery', 'Paediatrics', 'Oncology', 'Theatre', 'Renal', 'PHC', 'Other'
];
const YEARS_OPTS = ['Select…', 'Less than 1 year', '1–2 years', '3–5 years', '5+ years'];
const HOSPITAL_OPTS = ['Select…', 'None', 'Less than 1 year', '1–2 years', '3–5 years', '5+ years'];

/* ── tiny SVG icons ── */
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7.5L5.5 10L11 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="#DC3545" strokeWidth="1.5"/>
    <path d="M9 5v4M9 12h.01" stroke="#DC3545" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const ChevronDown = ({ color = '#9CA3AF' }) => (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ pointerEvents: 'none' }}>
    <path d="M1 1.5L6 6.5L11 1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── reusable field components ── */
function FormSelect({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={sfS.label}>{label} {required && <span style={{ color: '#DC3545' }}>*</span>}</label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={onChange} style={{
          ...sfS.input,
          appearance: 'none', WebkitAppearance: 'none',
          color: value && value !== options[0] ? '#1A1A2E' : '#9CA3AF',
          paddingRight: 36,
        }}>
          {options.map(o => <option key={o} value={o === options[0] ? '' : o}>{o}</option>)}
        </select>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={sfS.label}>{label} {required && <span style={{ color: '#DC3545' }}>*</span>}</label>
      <input type="text" value={value} onChange={onChange} placeholder={placeholder}
        style={sfS.input} />
    </div>
  );
}

/* ── main component ── */
function SignupForm() {
  const [form, setForm] = useState({
    specialisation: '', yearsTotal: '', yearsHospital: '', employer: '', ward: ''
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={sfS.container}>
      {/* ── Logo bar ── */}
      <div style={sfS.logoBar}>
        <span style={sfS.logoMark}>P</span>
        <span style={sfS.logoText}>propela</span>
      </div>

      {/* ── Progress bar ── */}
      <div style={sfS.progressWrap}>
        <div style={sfS.progressTrack}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && (
                <div style={{
                  flex: 1, height: 2, borderRadius: 1,
                  background: i <= CURRENT_STEP ? '#5B2D8E' : '#E0D6EC',
                  marginTop: -14,
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.3s',
                  ...(i < CURRENT_STEP ? { background: '#5B2D8E', color: '#fff' } :
                    i === CURRENT_STEP ? { background: '#5B2D8E', color: '#fff', boxShadow: '0 0 0 4px rgba(91,45,142,0.2)' } :
                    { background: '#F3EDF9', color: '#9B8BB4' }),
                }}>
                  {i < CURRENT_STEP ? <CheckIcon /> : i + 1}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: i === CURRENT_STEP ? 600 : 400,
                  color: i <= CURRENT_STEP ? '#5B2D8E' : '#9B8BB4',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: 0.2,
                }}>{s}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── SANC error banner ── */}
      <div style={sfS.errorBanner}>
        <AlertIcon />
        <div style={{ flex: 1 }}>
          <div style={sfS.errorTitle}>Your SANC number is required to proceed.</div>
          <div style={sfS.errorLink}>← Return to Step 2: Credentials</div>
        </div>
      </div>

      {/* ── Form content ── */}
      <div style={sfS.formArea}>
        <div style={sfS.stepHeader}>
          <h2 style={sfS.formTitle}>Experience</h2>
          <p style={sfS.formSub}>Tell us about your clinical background</p>
        </div>

        <FormSelect label="Primary specialisation" value={form.specialisation}
          onChange={set('specialisation')} options={SPECIALISATIONS} required />
        <FormSelect label="Total years of nursing experience" value={form.yearsTotal}
          onChange={set('yearsTotal')} options={YEARS_OPTS} required />
        <FormSelect label="Years in hospital / acute care" value={form.yearsHospital}
          onChange={set('yearsHospital')} options={HOSPITAL_OPTS} required />
        <FormInput label="Current employer" value={form.employer}
          onChange={set('employer')} placeholder="Hospital, clinic, agency, or unemployed" required />
        <FormInput label="Current ward or unit" value={form.ward}
          onChange={set('ward')} placeholder="e.g. ICU, A&E, Ward 6 Medical" required />
      </div>

      {/* ── Sticky continue bar ── */}
      <div style={sfS.bottomBar}>
        <button style={sfS.continueBtn}
          onMouseEnter={e => e.currentTarget.style.background = '#4A2375'}
          onMouseLeave={e => e.currentTarget.style.background = '#5B2D8E'}>
          Continue
        </button>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#9B8BB4', fontFamily: 'Poppins, sans-serif' }}>Step 3 of 5</span>
        </div>
      </div>
    </div>
  );
}

/* ── styles ── */
const sfS = {
  container: {
    height: '100%', display: 'flex', flexDirection: 'column',
    background: '#FFFFFF', fontFamily: 'Poppins, sans-serif',
    overflow: 'hidden',
  },
  logoBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 20px 8px', marginTop: 48,
  },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    background: 'linear-gradient(135deg, #5B2D8E, #7B4BAE)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 700,
  },
  logoText: {
    fontSize: 18, fontWeight: 700, color: '#5B2D8E', letterSpacing: -0.5,
  },
  progressWrap: {
    padding: '12px 16px 16px',
  },
  progressTrack: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  errorBanner: {
    margin: '0 16px 12px', padding: '12px 14px',
    background: '#FEF2F2', borderRadius: 12,
    border: '1px solid #FECACA',
    display: 'flex', alignItems: 'flex-start', gap: 10,
  },
  errorTitle: {
    fontSize: 13, fontWeight: 600, color: '#DC3545', lineHeight: 1.4,
  },
  errorLink: {
    fontSize: 12, color: '#DC3545', opacity: 0.75, marginTop: 3,
    cursor: 'pointer', textDecoration: 'underline',
  },
  formArea: {
    flex: 1, overflow: 'auto', padding: '0 20px 20px',
    WebkitOverflowScrolling: 'touch',
  },
  stepHeader: { marginBottom: 20 },
  formTitle: {
    fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: 0, lineHeight: 1.2,
  },
  formSub: {
    fontSize: 14, color: '#6B7280', margin: '4px 0 0', fontWeight: 400,
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
    marginBottom: 6, letterSpacing: 0.1,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px', fontSize: 15, fontFamily: 'Poppins, sans-serif',
    border: '1.5px solid #E0D6EC', borderRadius: 10,
    outline: 'none', color: '#1A1A2E',
    background: '#FAFAFA', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  bottomBar: {
    padding: '12px 20px 16px',
    borderTop: '1px solid #F3EDF9',
    background: '#fff',
  },
  continueBtn: {
    width: '100%', padding: '15px', border: 'none', borderRadius: 12,
    background: '#5B2D8E', color: '#fff',
    fontSize: 16, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer', letterSpacing: 0.3,
    boxShadow: '0 4px 14px rgba(91,45,142,0.25)',
    transition: 'background 0.2s',
  },
};

// Add focus styles via CSS
if (!document.getElementById('sf-focus-styles')) {
  const style = document.createElement('style');
  style.id = 'sf-focus-styles';
  style.textContent = `
    .sf-screen select:focus, .sf-screen input:focus {
      border-color: #5B2D8E !important;
      box-shadow: 0 0 0 3px rgba(91,45,142,0.12) !important;
      background: #fff !important;
    }
    .sf-screen select, .sf-screen input { transition: border-color 0.2s, box-shadow 0.2s; }
  `;
  document.head.appendChild(style);
}

window.SignupForm = SignupForm;
