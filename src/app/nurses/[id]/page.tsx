import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNurseById } from "@/lib/data";
import { NurseCardDetail } from "@/components/nurses/NurseCardDetail";

interface NurseDetailPageProps {
  params: { id: string };
}

export default async function NurseDetailPage({
  params,
}: NurseDetailPageProps) {
  const nurseId = parseInt(params.id, 10);
  const nurse = await getNurseById(nurseId);

  if (!nurse) {
    return (
      <div className="p-6">
        <Link
          href="/nurses"
          className="inline-flex items-center gap-1.5 text-sm text-propela-purple hover:text-propela-purple-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Nurse Database
        </Link>
        <div className="mt-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Nurse Not Found
          </h1>
          <p className="mt-2 text-muted-foreground">
            The nurse profile you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        href="/nurses"
        className="inline-flex items-center gap-1.5 text-sm text-propela-purple hover:text-propela-purple-dark transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Nurse Database
      </Link>
      <NurseCardDetail nurse={nurse} />
    </div>
  );
}
