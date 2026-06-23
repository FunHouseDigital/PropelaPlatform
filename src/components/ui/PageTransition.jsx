/**
 * PageTransition - A lightweight CSS-transition wrapper that animates
 * page entry with an opacity + translateY fade-in using Tailwind classes.
 */
export default function PageTransition({ children, className = '' }) {
  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
}
