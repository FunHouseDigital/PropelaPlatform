import { getTemplateById } from "@/lib/data";
import { TemplateDetail } from "@/components/templates/TemplateDetail";
import { notFound } from "next/navigation";

interface TemplateDetailPageProps {
  params: { id: string };
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const template = await getTemplateById(params.id);

  if (!template) {
    notFound();
  }

  return (
    <div className="p-6">
      <TemplateDetail template={template} />
    </div>
  );
}
