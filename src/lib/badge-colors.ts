/**
 * Shared badge color helpers for consistent status and category styling
 * across CohortCard, CohortDetail, TemplateCard, TemplateDetail, and NurseProgressTable.
 */

/**
 * Returns Tailwind classes for cohort status badges.
 */
export function getCohortStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 border-green-200";
    case "Planned":
      return "bg-propela-purple-light text-propela-purple border-propela-purple/20";
    case "Completed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Archived":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

/**
 * Returns Tailwind classes for template status badges.
 */
export function getTemplateStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Draft":
      return "bg-amber-100 text-amber-700";
    case "Archived":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Returns Tailwind classes for template category badges.
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case "Email":
      return "bg-blue-100 text-blue-700";
    case "WhatsApp":
      return "bg-green-100 text-green-700";
    case "Letter":
      return "bg-propela-purple-light text-propela-purple";
    case "SMS":
      return "bg-amber-100 text-amber-700";
    case "Document":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Returns Tailwind classes for pipeline stage badges in NurseProgressTable.
 */
export function getPipelineBadgeColor(stage: string): string {
  switch (stage) {
    case "Placed":
      return "bg-green-100 text-green-700";
    case "Placement Ready":
      return "bg-blue-100 text-blue-700";
    case "Training Active":
    case "OET Registered":
      return "bg-propela-purple-light text-propela-purple";
    case "OET Passed":
      return "bg-emerald-100 text-emerald-700";
    case "OET Failed":
      return "bg-red-100 text-red-700";
    case "Dropped Out":
      return "bg-gray-100 text-gray-600";
    case "Deferred":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/**
 * Returns Tailwind classes for OET status text color.
 */
export function getOetStatusColor(status: string | null): string {
  switch (status) {
    case "Passed":
      return "text-green-700";
    case "Failed":
      return "text-red-600";
    case "Registered":
      return "text-propela-purple";
    case "Not Registered":
      return "text-gray-500";
    default:
      return "text-gray-400";
  }
}

/**
 * Returns Tailwind classes for placement status text color.
 */
export function getPlacementStatusColor(status: string | null): string {
  switch (status) {
    case "Placed":
      return "text-green-700";
    case "Matching":
      return "text-blue-600";
    default:
      return "text-gray-400";
  }
}
