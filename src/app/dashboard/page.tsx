import { getNurses, getCohorts } from "@/lib/data";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ActivityItem } from "@/components/dashboard/RecentActivity";

export default async function DashboardPage() {
  const nurses = await getNurses();
  const cohorts = await getCohorts();

  // Compute stats
  const totalNurses = nurses.length;
  const activeCohorts = cohorts.filter((c) => c.status === "Active").length;
  const placedNurses = nurses.filter((n) => n.pipelineStage === "Placed").length;
  const placementRate =
    totalNurses > 0 ? Math.round((placedNurses / totalNurses) * 100) : 0;
  const pendingActions = nurses.filter(
    (n) => n.nextAction && n.nextAction !== "No action required"
  ).length;

  // Pipeline data - group nurses by stage
  const stageMap = new Map<string, number>();
  nurses.forEach((n) => {
    const stage = n.pipelineStage;
    stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
  });
  const pipelineData = Array.from(stageMap.entries()).map(([stage, count]) => ({
    stage,
    count,
  }));

  // Derive recent activity from nurse data
  const activities: ActivityItem[] = [];
  let activityId = 1;

  // Sort nurses by lastContacted descending for recent contacts
  const recentlyContacted = [...nurses]
    .filter((n) => n.lastContacted)
    .sort(
      (a, b) =>
        new Date(b.lastContacted!).getTime() -
        new Date(a.lastContacted!).getTime()
    )
    .slice(0, 8);

  for (const nurse of recentlyContacted) {
    const date = new Date(nurse.lastContacted!).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (nurse.pipelineStage === "Placed") {
      activities.push({
        id: activityId++,
        description: `${nurse.fullName} was successfully placed`,
        date,
        type: "placement",
      });
    } else if (nurse.pipelineStage === "Applied") {
      activities.push({
        id: activityId++,
        description: `${nurse.fullName} submitted a new application`,
        date,
        type: "application",
      });
    } else {
      activities.push({
        id: activityId++,
        description: `${nurse.fullName} moved to ${nurse.pipelineStage}`,
        date,
        type: "stage_change",
      });
    }
  }

  // Pending reviews count
  const pendingReviews = nurses.filter(
    (n) => n.pipelineStage === "Under Review"
  ).length;
  // Pending OET count
  const pendingOET = nurses.filter(
    (n) =>
      n.nextAction === "Needs: Chase OET results" ||
      n.nextAction === "Needs: OET registration"
  ).length;

  return (
    <div className="p-6">
      <Dashboard
        totalNurses={totalNurses}
        activeCohorts={activeCohorts}
        placementRate={placementRate}
        pendingActions={pendingActions}
        pipelineData={pipelineData}
        activities={activities}
        pendingReviews={pendingReviews}
        pendingOET={pendingOET}
      />
    </div>
  );
}
