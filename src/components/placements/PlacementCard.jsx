import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, Clock, Target } from 'lucide-react';

function getDaysColor(days) {
  if (days < 7) return 'bg-green-100 text-green-700';
  if (days <= 14) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function areEqual(prevProps, nextProps) {
  const prev = prevProps.placement;
  const next = nextProps.placement;
  return (
    prev.id === next.id &&
    prev.nurseName === next.nurseName &&
    prev.daysInStage === next.daysInStage &&
    prev.matchScore === next.matchScore &&
    prev.specialty === next.specialty &&
    prev.targetCountry === next.targetCountry &&
    prev.facilityName === next.facilityName &&
    prevProps.onClick === nextProps.onClick
  );
}

const PlacementCard = memo(function PlacementCard({ placement, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: placement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      {/* Nurse Info */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E] flex items-center justify-center text-xs font-bold">
          {getInitials(placement.nurseName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {placement.nurseName}
          </p>
          <p className="text-xs text-gray-500 truncate">{placement.specialty}</p>
        </div>
      </div>

      {/* Target Country & Facility */}
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
        <MapPin size={12} />
        <span className="truncate">
          {placement.targetCountry} - {placement.facilityName}
        </span>
      </div>

      {/* Footer: Days in Stage + Match Score */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getDaysColor(placement.daysInStage)}`}>
          <Clock size={10} />
          {placement.daysInStage}d
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Target size={10} />
          {placement.matchScore}%
        </span>
      </div>
    </div>
  );
}, areEqual);

export default PlacementCard;
