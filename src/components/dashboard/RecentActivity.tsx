"use client";

import { Clock, UserCheck, FileText, TrendingUp } from "lucide-react";

export interface ActivityItem {
  id: number;
  description: string;
  date: string;
  type: "stage_change" | "contact" | "application" | "placement";
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const typeIcons = {
  stage_change: TrendingUp,
  contact: Clock,
  application: FileText,
  placement: UserCheck,
};

const typeColors = {
  stage_change: "bg-blue-100 text-blue-600",
  contact: "bg-amber-100 text-amber-600",
  application: "bg-green-100 text-green-600",
  placement: "bg-propela-purple-light text-propela-purple",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = typeIcons[activity.type];
          const colorClass = typeColors[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{activity.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
