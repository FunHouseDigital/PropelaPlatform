import { getCohorts } from "@/lib/data";
import { CohortManager } from "@/components/cohorts/CohortManager";

export default async function CohortsPage() {
  const cohorts = await getCohorts();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-propela-purple">
          Cohort Manager
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage training cohorts, budgets, and nurse progress.
        </p>
      </div>
      <CohortManager cohorts={cohorts} />
    </div>
  );
}
