"use client";

import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Nurse } from "@/types/nurse";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";
import {
  getReadinessColor,
  getNextActionColor,
  calculateCvScore,
} from "@/lib/nurse-utils";

interface NurseGalleryCardProps {
  nurse: Nurse;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NurseGalleryCard({ nurse }: NurseGalleryCardProps) {
  const cvStarRating = calculateCvScore(nurse);

  return (
    <Link href={`/nurses/${nurse.id}`}>
      <div className="group relative rounded-xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-gray-200 cursor-pointer">
        {/* Flag indicator */}
        {nurse.flagCount > 0 && (
          <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-flag-red text-[10px] font-bold text-white">
            {nurse.flagCount}
          </div>
        )}

        {/* Photo / Avatar */}
        <div className="flex flex-col items-center">
          {nurse.profilePhoto ? (
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-propela-purple-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={nurse.profilePhoto}
                alt={nurse.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-propela-purple text-white text-lg font-semibold">
              {getInitials(nurse.fullName)}
            </div>
          )}

          {/* Name */}
          <h3 className="mt-3 text-sm font-bold text-gray-900 text-center">
            {nurse.fullName}
          </h3>

          {/* Star Rating */}
          <div className="mt-1">
            <StarRating rating={cvStarRating} />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-3 space-y-2">
          {/* Years Experience */}
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
            <Briefcase className="h-3 w-3" />
            <span>{nurse.yearsExperience} yrs exp</span>
          </div>

          {/* Specialty */}
          {nurse.primaryClinicalSpecialty && (
            <div className="text-center text-xs text-gray-600">
              {nurse.primaryClinicalSpecialty}
            </div>
          )}

          {/* Location */}
          {nurse.provinceCity && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{nurse.provinceCity}</span>
            </div>
          )}
        </div>

        {/* Badges Section */}
        <div className="mt-3 flex flex-col gap-2">
          {/* Readiness Badge */}
          <div className="flex justify-center">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-medium",
                getReadinessColor(nurse.readinessStatus)
              )}
            >
              {nurse.readinessStatus}
            </Badge>
          </div>

          {/* Next Action Badge - MOST PROMINENT */}
          {nurse.nextAction && (
            <div className="flex justify-center">
              <Badge
                className={cn(
                  "px-3 py-1 text-xs font-bold",
                  getNextActionColor(nurse.nextAction)
                )}
              >
                {nurse.nextAction}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
