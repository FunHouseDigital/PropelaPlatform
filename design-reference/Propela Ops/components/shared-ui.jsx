// shared-ui.jsx — Propela Platform shared components & constants

/* ── Color system ── */
const C = {
  purple: '#5B2D8E', purpleDark: '#3D1D5E', purpleLight: '#F3EDF9',
  purpleMid: '#7B4BAE', purplePale: '#E8DDF5',
  green: '#28A745', greenBg: 'rgba(40,167,69,0.08)',
  orange: '#FF9800', orangeDark: '#E68A00', orangeBg: 'rgba(255,152,0,0.08)',
  red: '#DC3545', redBg: '#FEF2F2', redBorder: '#FECACA',
  dark: '#1A1A2E', text: '#374151', grey: '#6B7280', greyLight: '#9CA3AF',
  border: '#E0D6EC', bg: '#F8F7FC', white: '#FFFFFF',
};
const F = "'Poppins', sans-serif";

/* ── Reusable tiny SVG icons ── */
const Icon = {
  check: (s=16, c=C.green) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill={c} opacity="0.12"/><path d="M4.5 8.5l2.5 2.5 4.5-4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  warn: (s=16, c=C.orange) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill={c} opacity="0.12"/><path d="M8 5v3M8 10.5h.01" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  alert: (s=16, c=C.red) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={c} strokeWidth="1.4"/><path d="M8 4.5v3.5M8 10.5h.01" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>,
  chevDown: (s=12, c=C.greyLight) => <svg width={s} height={Math.round(s*0.67)} viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevRight: (s=8, c=C.greyLight) => <svg width={s} height={Math.round(s*1.75)} viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  calendar: (c=C.purple) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke={c} strokeWidth="1.4"/><path d="M1 6h14M5 1v2M11 1v2" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>,
  upload: (c=C.purple) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 5l3-3 3 3M8 2v8" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  download: (c=C.purple) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 7l3 3 3-3M8 10V2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  whatsapp: (c='#25D366') => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9c0 1.33.35 2.58.96 3.66L1.5 16.5l3.96-.96A7.47 7.47 0 009 16.5c4.14 0 7.5-3.36 7.5-7.5S13.14 1.5 9 1.5z" fill={c}/><path d="M6.5 5.5s.5-.3.8.2l.8 1.2s.2.4-.1.7l-.5.5s-.1.3.4.9c.5.6.8.5.8.5l.5-.5c.3-.3.6-.1.6-.1l1.2.8c.4.3.2.8.2.8s-.4 1.2-1.8 1c-1.4-.2-3-1.8-3.6-3-.6-1.2-.3-2.1-.3-2.1z" fill="#fff"/></svg>,
};

/* ── nav icon paths ── */
const NAV_PATHS = {
  home: 'M3 10.5V19a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-8.5M1 12l11-9 11 9',
  book: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  people: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  heart: 'M12 21c0 0-9-5.5-9-11a5 5 0 0110-1 5 5 0 0110 1c0 5.5-9 11-9 11z',
};

/* ── Bottom Navigation (5-tab) ── */
function MobileNav({ active, onNav }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: NAV_PATHS.home },
    { id: 'prep', label: 'Prep Hub', path: NAV_PATHS.book },
    { id: 'docs', label: 'Documents', path: NAV_PATHS.folder },
    { id: 'community', label: 'Community', path: NAV_PATHS.people },
    { id: 'support', label: 'Support', path: NAV_PATHS.heart },
  ];
  return (
    <div style={navS.bar}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{ ...navS.tab, color: isActive ? C.purple : C.greyLight }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d={t.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, marginTop: 1 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
const navS = {
  bar: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '5px 0 16px', background: C.white, borderTop: `1px solid ${C.purpleLight}`, flexShrink: 0 },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: '4px 6px' },
};

/* ── Reusable card wrapper ── */
function PropCard({ children, style = {} }) {
  return <div style={{ background: C.white, borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 12px rgba(91,45,142,0.06)', ...style }}>{children}</div>;
}

/* ── Screen header inside phone ── */
function ScreenHeader({ title, subtitle, style = {} }) {
  return (
    <div style={{ padding: '52px 20px 16px', background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleMid} 100%)`, borderRadius: '0 0 24px 24px', ...style }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.white, lineHeight: 1.3, fontFamily: F }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontFamily: F }}>{subtitle}</div>}
    </div>
  );
}

/* ── Simple header (no gradient) ── */
function SimpleHeader({ title, subtitle }) {
  return (
    <div style={{ padding: '52px 20px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1.3, fontFamily: F }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.grey, marginTop: 3, fontFamily: F }}>{subtitle}</div>}
    </div>
  );
}

/* ── Badge helpers ── */
function GreenBadge({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: C.green, background: C.greenBg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>;
}
function OrangeBadge({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: C.orangeDark, background: C.orangeBg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>;
}
function RedBadge({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: C.red, background: C.redBg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>;
}
function PurpleBadge({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: C.purple, background: C.purpleLight, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>;
}

/* ── Purple button ── */
function PurpleBtn({ children, onClick, style = {}, full = true }) {
  return (
    <button onClick={onClick}
      style={{ width: full ? '100%' : 'auto', padding: '12px 20px', border: 'none', borderRadius: 10, background: C.purple, color: C.white, fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer', boxShadow: '0 4px 14px rgba(91,45,142,0.2)', transition: 'background 0.2s', ...style }}
      onMouseEnter={e => e.currentTarget.style.background = '#4A2375'}
      onMouseLeave={e => e.currentTarget.style.background = C.purple}>
      {children}
    </button>
  );
}

/* ── Status row ── */
function StatusRow({ icon, label, badge, border = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: border ? `1px solid ${C.purpleLight}` : 'none' }}>
      {icon}
      <span style={{ flex: 1, fontSize: 14, color: C.text, fontWeight: 500, fontFamily: F }}>{label}</span>
      {badge}
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ value, max, height = 6 }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ height, borderRadius: height / 2, background: C.purpleLight, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: height / 2, background: `linear-gradient(90deg, ${C.purple}, ${C.purpleMid})`, transition: 'width 0.5s ease' }} />
    </div>
  );
}

/* ── Urgency tag ── */
function UrgencyTag({ level, text }) {
  const colors = { red: { bg: C.redBg, color: C.red, border: C.redBorder }, orange: { bg: C.orangeBg, color: C.orangeDark, border: 'rgba(255,152,0,0.2)' }, green: { bg: C.greenBg, color: C.green, border: 'rgba(40,167,69,0.2)' } };
  const s = colors[level] || colors.orange;
  return <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap' }}>{text}</span>;
}

/* ── Mobile screen shell (scroll + nav) ── */
function MobileShell({ children, navActive, onNav, showNav = true, bg = C.bg }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg, fontFamily: F, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      {showNav && <MobileNav active={navActive} onNav={onNav} />}
    </div>
  );
}

/* ── Form select ── */
function PropSelect({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, fontFamily: F }}>{label} {required && <span style={{ color: C.red }}>*</span>}</label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={onChange} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 36px 12px 14px', fontSize: 15, fontFamily: F, border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', color: value ? C.dark : C.greyLight, background: '#FAFAFA', appearance: 'none', WebkitAppearance: 'none' }}>
          {options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}
        </select>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>{Icon.chevDown()}</div>
      </div>
    </div>
  );
}

function PropInput({ label, value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, fontFamily: F }}>{label} {required && <span style={{ color: C.red }}>*</span>}</label>
      <input type="text" value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 15, fontFamily: F, border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', color: C.dark, background: '#FAFAFA' }} />
    </div>
  );
}

// Global focus styles
if (!document.getElementById('propela-global-styles')) {
  const s = document.createElement('style');
  s.id = 'propela-global-styles';
  s.textContent = `
    select:focus, input:focus, textarea:focus { border-color: ${C.purple} !important; box-shadow: 0 0 0 3px rgba(91,45,142,0.12) !important; background: #fff !important; }
    * { scrollbar-width: thin; scrollbar-color: ${C.border} transparent; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  `;
  document.head.appendChild(s);
}

// Export everything
Object.assign(window, { C, F, Icon, MobileNav, MobileShell, PropCard, ScreenHeader, SimpleHeader, GreenBadge, OrangeBadge, RedBadge, PurpleBadge, PurpleBtn, StatusRow, ProgressBar, UrgencyTag, PropSelect, PropInput });
