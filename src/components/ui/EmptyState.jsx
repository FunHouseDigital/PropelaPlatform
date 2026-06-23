/**
 * EmptyState - A reusable empty-state component for pages/sections
 * that have no data to display.
 *
 * @param {Object} props
 * @param {import('lucide-react').LucideIcon} props.icon - A lucide-react icon component
 * @param {string} props.title - The heading text
 * @param {string} props.description - Supporting description text
 * @param {string} [props.actionLabel] - Optional button label
 * @param {Function} [props.onAction] - Optional button click handler
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-propela-purple/10 p-4">
          <Icon className="h-10 w-10 text-propela-purple" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-propela-purple text-white text-sm font-medium hover:bg-propela-purple/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
