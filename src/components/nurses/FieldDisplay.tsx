"use client";

import { Badge } from "@/components/ui/badge";

type FieldType = "text" | "badge" | "date" | "link" | "boolean";

interface FieldDisplayProps {
  label: string;
  value: string | number | boolean | Date | null | undefined;
  type?: FieldType;
  href?: string;
  badgeClassName?: string;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FieldDisplay({
  label,
  value,
  type = "text",
  href,
  badgeClassName,
}: FieldDisplayProps) {
  const renderValue = () => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400">--</span>;
    }

    switch (type) {
      case "boolean":
        return (
          <Badge
            variant="secondary"
            className={
              value
                ? "bg-green-100 text-green-700 border-0"
                : "bg-gray-100 text-gray-500 border-0"
            }
          >
            {value ? "Yes" : "No"}
          </Badge>
        );

      case "date":
        return (
          <span className="text-sm text-gray-900">
            {formatDate(value as Date | string)}
          </span>
        );

      case "link":
        return (
          <a
            href={href || String(value)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {String(value)}
          </a>
        );

      case "badge":
        return (
          <Badge
            variant="secondary"
            className={badgeClassName || "border-0"}
          >
            {String(value)}
          </Badge>
        );

      default:
        return <span className="text-sm text-gray-900">{String(value)}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {renderValue()}
    </div>
  );
}
