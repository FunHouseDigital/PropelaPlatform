import { getNurses } from "@/lib/data";
import { NurseDatabase } from "@/components/nurses/NurseDatabase";

export default async function NursesPage() {
  const nurses = await getNurses();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-propela-purple">
          Nurse Database
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your nurse profiles and placements.
        </p>
      </div>
      <NurseDatabase nurses={nurses} />
    </div>
  );
}
