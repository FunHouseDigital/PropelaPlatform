import { useNavigate } from 'react-router-dom'
import { MapPin, Flag } from 'lucide-react'
import StarRating from '../shared/StarRating.jsx'
import Badge from '../shared/Badge.jsx'
import { getNextActionColour, getFlagCount } from '../../utils/calculations.js'

function NurseAvatar({ nurse, size = 64 }) {
  const initials = (nurse.fullName || '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (nurse.photoUrl) {
    return (
      <img
        src={nurse.photoUrl}
        alt={nurse.fullName}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: '#5B2D8E', fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function getReadinessVariant(status) {
  switch (status) {
    case 'Placement Ready': return 'green'
    case 'Placed': return 'purple'
    case 'Dropped Out': return 'red'
    case 'Deferred': return 'yellow'
    default: return 'grey'
  }
}

function NurseGalleryCard({ nurse }) {
  const navigate = useNavigate()
  const actionColour = getNextActionColour(nurse.nextAction, nurse.followUpDate)
  const flagCount = getFlagCount(nurse.notes)
  const readinessStatus = nurse.readinessStatus || 'Not Ready'

  return (
    <div
      onClick={() => navigate(`/nurses/${nurse.id}`)}
      className="bg-white border border-border rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-purple/30 transition-all duration-200 flex flex-col items-center text-center"
    >
      <NurseAvatar nurse={nurse} size={72} />

      <h3 className="text-sm font-semibold text-dark mt-3 truncate w-full">{nurse.fullName}</h3>

      <div className="mt-2">
        <StarRating score={nurse.cvScore || 0} size={14} />
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap justify-center">
        {nurse.yearsOfClinicalExperience && (
          <span className="inline-flex items-center justify-center bg-purple-light text-purple text-xs font-medium rounded-full px-2 py-0.5">
            {nurse.yearsOfClinicalExperience}
          </span>
        )}
        {nurse.primaryClinicalSpecialty && (
          <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
            {nurse.primaryClinicalSpecialty}
          </span>
        )}
      </div>

      {(nurse.city || nurse.province) && (
        <div className="flex items-center gap-1 mt-2 text-xs text-grey">
          <MapPin className="w-3 h-3" />
          <span>{[nurse.city, nurse.province].filter(Boolean).join(', ')}</span>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5 w-full">
        <Badge variant={getReadinessVariant(readinessStatus)} size="sm">
          {readinessStatus}
        </Badge>

        {nurse.nextAction && nurse.nextAction !== 'No action required' && (
          <Badge bgColor={actionColour.bg} textColor={actionColour.text} size="sm">
            {nurse.nextAction}
          </Badge>
        )}
      </div>

      {flagCount > 0 && (
        <div className="flex items-center gap-1 mt-2 text-red">
          <Flag className="w-3.5 h-3.5 fill-red" />
          <span className="text-xs font-medium">{flagCount}</span>
        </div>
      )}
    </div>
  )
}

export default function GalleryView({ nurses, groupedNurses, groupBy, onGroupByChange, sortBy, onSortByChange }) {
  if (groupBy && groupedNurses) {
    return (
      <div className="space-y-6">
        {Object.entries(groupedNurses).map(([group, groupNurses]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-dark mb-3 flex items-center gap-2">
              {group}
              <span className="text-xs font-normal text-grey bg-gray-100 rounded-full px-2 py-0.5">
                {groupNurses.length}
              </span>
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {groupNurses.map(nurse => (
                <NurseGalleryCard key={nurse.id} nurse={nurse} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {nurses.map(nurse => (
        <NurseGalleryCard key={nurse.id} nurse={nurse} />
      ))}
    </div>
  )
}

export { NurseAvatar, getReadinessVariant }
