"use client";

import { Users, GraduationCap, TrendingUp, AlertCircle } from "lucide-react";
import { StatCard } from "./StatCard";
import { CohortPipelineChart } from "./CohortPipelineChart";
import { RecentActivity, ActivityItem } from "./RecentActivity";
import { QuickActions } from "./QuickActions";

interface DashboardProps {
  totalNurses: number;
  activeCohorts: number;
  placementRate: number;
  pendingActions: number;
  pipelineData: { stage: string; count: number }[];
  activities: ActivityItem[];
  pendingReviews: number;
  pendingOET: number;
}

export function Dashboard({
  totalNurses,
  activeCohorts,
  placementRate,
  pendingActions,
  pipelineData,
  activities,
  pendingReviews,
  pendingOET,
}: DashboardProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-xl bg-gradient-to-r from-propela-purple to-propela-purple-mid p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="mt-1 text-sm text-white/80">{formattedDate}</p>
        <p className="mt-2 text-sm text-white/70">
          Here is your pipeline summary for today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Nurses"
          value={totalNurses}
          trend="All registered nurses"
        />
        <StatCard
          icon={GraduationCap}
          label="Active Cohorts"
          value={activeCohorts}
          trend="Currently in training"
        />
        <StatCard
          icon={TrendingUp}
          label="Placement Rate"
          value={`${placementRate}%`}
          trend="Nurses successfully placed"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Actions"
          value={pendingActions}
          trend="Require follow-up"
        />
      </div>

      {/* Pipeline Chart + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CohortPipelineChart data={pipelineData} />
        </div>
        <div>
          <RecentActivity activities={activities} />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions pendingReviews={pendingReviews} pendingOET={pendingOET} />
    </div>
  );
}
