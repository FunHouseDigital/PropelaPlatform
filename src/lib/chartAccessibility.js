/**
 * Color-blind safe palette for charts.
 * These 8 colors are distinguishable across protanopia, deuteranopia, and tritanopia.
 * Based on the Wong (2011) color-blind friendly palette with adjustments for chart use.
 */
export const ACCESSIBLE_CHART_COLORS = [
  '#0077BB', // Blue
  '#EE7733', // Orange
  '#009988', // Teal
  '#CC3311', // Red
  '#33BBEE', // Cyan
  '#EE3377', // Magenta
  '#BBBBBB', // Grey
  '#AA3377', // Purple
];

/**
 * Pattern definitions for secondary visual differentiation in charts.
 * Can be used alongside colors to ensure accessibility for
 * users who cannot distinguish colors at all.
 */
export const CHART_PATTERNS = [
  { id: 'solid', type: 'solid', label: 'Solid' },
  { id: 'diagonal', type: 'diagonal', angle: 45, spacing: 6, label: 'Diagonal lines' },
  { id: 'dots', type: 'dots', radius: 2, spacing: 8, label: 'Dots' },
  { id: 'crosshatch', type: 'crosshatch', spacing: 6, label: 'Crosshatch' },
  { id: 'horizontal', type: 'horizontal', spacing: 6, label: 'Horizontal lines' },
  { id: 'vertical', type: 'vertical', spacing: 6, label: 'Vertical lines' },
  { id: 'zigzag', type: 'zigzag', amplitude: 4, spacing: 8, label: 'Zigzag' },
  { id: 'waves', type: 'waves', amplitude: 3, spacing: 8, label: 'Waves' },
];
