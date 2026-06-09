import { getCohortById } from "@/lib/data";
import { CohortDetail } from "@/components/cohorts/CohortDetail";
import { notFound } from "next/navigation";

interface CohortDetailPageProps {
  params: { id: string };
}

export default async function CohortDetailPage({
  params,
}: CohortDetailPageProps) {
  const cohort = await getCohortById(params.id);

  if (!cohort) {
    notFound();
  }

  return (
    <div className="p-6">
      <CohortDetail cohort={cohort} />
    </div>
  );
}
