/**
 * Sanity check to verify testing infrastructure is working.
 */
describe('Testing Infrastructure', () => {
  it('should have vitest globals available', () => {
    expect(true).toBe(true);
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
    localStorage.removeItem('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should have matchMedia mock', () => {
    const mql = window.matchMedia('(min-width: 768px)');
    expect(mql.matches).toBe(false);
    expect(mql.media).toBe('(min-width: 768px)');
  });

  it('should have ResizeObserver mock', () => {
    const ro = new ResizeObserver(() => {});
    expect(ro).toBeDefined();
    ro.observe(document.body);
    ro.disconnect();
  });

  it('should have IntersectionObserver mock', () => {
    const io = new IntersectionObserver(() => {});
    expect(io).toBeDefined();
    io.observe(document.body);
    io.disconnect();
  });

  it('should have jest-dom matchers available', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello';
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    document.body.removeChild(div);
  });
});
