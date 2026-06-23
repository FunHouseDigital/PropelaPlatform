/**
 * Logo component that renders the Propela brand logo as an img element.
 * Supports configurable sizes: sm (24px), md (32px), lg (48px), xl (64px).
 */

const SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function Logo({ size = 'md', className = '' }) {
  const dimension = SIZES[size] || SIZES.md;

  return (
    <img
      src="/logo.svg"
      alt="Propela logo"
      width={dimension}
      height={dimension}
      className={`inline-block ${className}`}
    />
  );
}
