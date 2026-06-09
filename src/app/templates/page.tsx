import { getTemplates } from "@/lib/data";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="p-6">
      <TemplateLibrary templates={templates} />
    </div>
  );
}
