import { Star, StarHalf } from 'lucide-react'

export default function StarRating({ score = 0, size = 16 }) {
  const stars = []
  const fullStars = Math.floor(score)
  const hasHalf = score - fullStars >= 0.3 && score - fullStars < 0.8
  const roundedUp = score - fullStars >= 0.8

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars + (roundedUp ? 1 : 0)) {
      stars.push(
        <Star key={i} size={size} className="text-amber-400 fill-amber-400" />
      )
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(
        <StarHalf key={i} size={size} className="text-amber-400 fill-amber-400" />
      )
    } else {
      stars.push(
        <Star key={i} size={size} className="text-gray-300" />
      )
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-xs text-grey ml-1">{score.toFixed(1)}</span>
    </div>
  )
}
