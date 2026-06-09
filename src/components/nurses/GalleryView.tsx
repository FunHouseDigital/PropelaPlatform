"use client";

import { Nurse } from "@/types/nurse";
import { NurseGalleryCard } from "./NurseGalleryCard";

interface GalleryViewProps {
  nurses: Nurse[];
}

export function GalleryView({ nurses }: GalleryViewProps) {
  if (nurses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-lg font-medium">No nurses found</p>
        <p className="text-sm">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nurses.map((nurse) => (
        <NurseGalleryCard key={nurse.id} nurse={nurse} />
      ))}
    </div>
  );
}
