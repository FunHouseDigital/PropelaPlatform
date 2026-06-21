import { Star, StarHalf, MapPin, Flag } from 'lucide-react';

function getNextActionColor(nurse) {
  if (!nurse.nextAction || nurse.nextAction === 'No action required') {
    return { bg: 'bg-gray-100', text: 'text-gray-500' };
  }
  if (nurse.nextActionDueDate) {
    const due = new Date(nurse.nextActionDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return { bg: 'bg-red-100', text: 'text-red-700' };
    if (due.getTime() === today.getTime()) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  }
  return { bg: 'bg-teal-100', text: 'text-teal-700' };
}

function getReadinessColor(status) {
  switch (status) {
    case 'Placement Ready':
      return 'bg-green-100 text-green-700';
    case 'Placed':
      return 'bg-blue-100 text-blue-700';
    case 'Dropped Out':
      return 'bg-red-100 text-red-700';
    case 'Deferred':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getYearsColor(years) {
  if (years === '5+ years') return 'bg-green-500';
  if (years === '3-5 years') return 'bg-blue-500';
  if (years === '1-2 years') return 'bg-amber-500';
  return 'bg-gray-400';
}

function renderStars(score) {
  const stars = [];
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.3 && score - fullStars < 0.8;
  const fullExtra = score - fullStars >= 0.8 ? 1 : 0;

  for (let i = 0; i < fullStars + fullExtra; i++) {
    stars.push(<Star key={`full-${i}`} size={12} className="fill-amber-400 text-amber-400" />);
  }
  if (hasHalf) {
    stars.push(<StarHalf key="half" size={12} className="fill-amber-400 text-amber-400" />);
  }
  const remaining = 5 - (fullStars + fullExtra + (hasHalf ? 1 : 0));
  for (let i = 0; i < remaining; i++) {
    stars.push(<Star key={`empty-${i}`} size={12} className="text-gray-300" />);
  }
  return stars;
}

function NurseGalleryCard({ nurse, onClick }) {
  const naColor = getNextActionColor(nurse);
  const isExitState = ['Dropped Out', 'Deferred'].includes(nurse.pipelineStage);
  const initials = nurse.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      onClick={() => onClick(nurse)}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${
        nurse.pipelineStage === 'Dropped Out'
          ? 'border-red-200 bg-red-50'
          : nurse.pipelineStage === 'Deferred'
          ? 'border-yellow-200 bg-yellow-50'
          : nurse.pipelineStage === 'Not Selected'
          ? 'border-gray-200 opacity-70'
          : 'border-gray-100'
      }`}
    >
      {/* Next Action - Most Prominent */}
      <div className={`px-3 py-2 ${naColor.bg}`}>
        <p className={`text-xs font-semibold ${naColor.text} truncate`}>
          {nurse.nextAction || 'No action required'}
        </p>
      </div>

      <div className="p-4">
        {/* Photo + Name */}
        <div className="flex items-center gap-3 mb-3">
          {nurse.photoURL ? (
            <img
              src={nurse.photoURL}
              alt={nurse.fullName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-propela-purple flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{nurse.fullName}</p>
            <div className="flex items-center gap-1 mt-0.5">{renderStars(nurse.cvScore)}</div>
          </div>
        </div>

        {/* Info Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {/* Years Experience Circle */}
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getYearsColor(
              nurse.yearsOfClinicalExperience
            )}`}
            title={nurse.yearsOfClinicalExperience}
          >
            {nurse.yearsOfClinicalExperience === '5+ years'
              ? '5+'
              : nurse.yearsOfClinicalExperience === '3-5 years'
              ? '3'
              : nurse.yearsOfClinicalExperience === '1-2 years'
              ? '2'
              : '1'}
          </span>

          {/* Specialty */}
          <span className="text-xs bg-propela-purple-light text-propela-purple px-2 py-0.5 rounded-full truncate max-w-[120px]">
            {nurse.primaryClinicalSpecialty}
          </span>

          {/* Flag indicator */}
          {nurse.flags > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-red-600">
              <Flag size={11} className="fill-red-600" />
              {nurse.flags}
            </span>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin size={11} />
          <span className="truncate">
            {nurse.city}, {nurse.province}
          </span>
        </div>

        {/* Readiness Badge */}
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            isExitState
              ? nurse.pipelineStage === 'Dropped Out'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
              : getReadinessColor(nurse.readinessStatus)
          }`}
        >
          {isExitState ? nurse.pipelineStage : nurse.readinessStatus}
        </span>
      </div>
    </div>
  );
}

export default function GalleryView({ nurses, groupBy, onNurseClick }) {
  // Group nurses
  const groups = {};
  nurses.forEach((nurse) => {
    let key;
    switch (groupBy) {
      case 'pipelineStage':
        key = nurse.pipelineStage;
        break;
      case 'cohort':
        key = nurse.cohortAssigned || 'Unassigned';
        break;
      case 'readinessStatus':
        key = nurse.readinessStatus;
        break;
      default:
        key = nurse.primaryClinicalSpecialty;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(nurse);
  });

  const sortedKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      {sortedKeys.map((groupName) => (
        <div key={groupName}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">{groupName}</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {groups[groupName].length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups[groupName].map((nurse) => (
              <NurseGalleryCard
                key={nurse.id}
                nurse={nurse}
                onClick={onNurseClick}
              />
            ))}
          </div>
        </div>
      ))}
      {nurses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No nurses match the current filters.</p>
        </div>
      )}
    </div>
  );
}
