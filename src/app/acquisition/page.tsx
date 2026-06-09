import { getAcquisitionSources, getOutreachLeads } from "@/lib/data";
import { AcquisitionHub } from "@/components/acquisition/AcquisitionHub";

export default async function AcquisitionPage() {
  const sources = await getAcquisitionSources();
  const leads = await getOutreachLeads();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-propela-purple">
          Nurse Acquisition Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage acquisition sources, track referral networks, and monitor
          outreach pipeline progress.
        </p>
      </div>
      <AcquisitionHub sources={sources} leads={leads} />
    </div>
  );
}
