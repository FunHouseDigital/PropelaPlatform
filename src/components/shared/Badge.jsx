import { TIER_LABELS } from '../../data/constants.js'

const STATUS_COLORS = {
  green: { bg: 'bg-green-100', text: 'text-green-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
  grey: { bg: 'bg-gray-100', text: 'text-gray-600' },
  purple: { bg: 'bg-purple-light', text: 'text-purple' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
}

export default function Badge({ children, variant = 'grey', color, bgColor, textColor, className = '', size = 'sm' }) {
  // Custom colour override
  if (bgColor || textColor) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${className}`}
        style={{ backgroundColor: bgColor || '#F3F4F6', color: textColor || '#6B7280' }}
      >
        {children}
      </span>
    )
  }

  // Tier variant
  if (variant === 'tier' && children) {
    const tier = TIER_LABELS[children]
    if (tier) {
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${className}`}
          style={{ backgroundColor: tier.bg, color: tier.textColor }}
        >
          {children}
        </span>
      )
    }
  }

  // Status variant
  const colors = STATUS_COLORS[variant] || STATUS_COLORS.grey

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${colors.bg} ${colors.text} ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${className}`}
    >
      {children}
    </span>
  )
}
