"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
}

export function StarRating({ rating, maxStars = 5 }: StarRatingProps) {
  const stars = [];
  const clampedRating = Math.min(Math.max(rating, 0), maxStars);

  for (let i = 1; i <= maxStars; i++) {
    const fill = clampedRating - (i - 1);

    if (fill >= 1) {
      // Full star
      stars.push(
        <Star
          key={i}
          className="h-4 w-4 fill-amber-400 text-amber-400"
        />
      );
    } else if (fill >= 0.5) {
      // Half star
      stars.push(
        <div key={i} className="relative h-4 w-4">
          <Star className="absolute h-4 w-4 text-gray-300" />
          <div className="absolute overflow-hidden" style={{ width: "50%" }}>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
        </div>
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          className="h-4 w-4 text-gray-300"
        />
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}
