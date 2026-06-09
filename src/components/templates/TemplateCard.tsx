"use client";

import Link from "next/link";
import { Mail, MessageCircle, FileText, MessageSquare, File, Clock, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Template, TemplateCategory } from "@/types/template";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: Template;
}

function getCategoryIcon(category: TemplateCategory) {
  switch (category) {
    case "Email":
      return Mail;
    case "WhatsApp":
      return MessageCircle;
    case "Letter":
      return FileText;
    case "SMS":
      return MessageSquare;
    case "Document":
      return File;
  }
}

function getCategoryColor(category: TemplateCategory): string {
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
  }
}

function getStatusColor(status: string): string {
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

function truncateBody(body: string, lines: number = 2): string {
  const splitLines = body.split("\n").filter((line) => line.trim() !== "");
  const truncated = splitLines.slice(0, lines).join(" ");
  return truncated.length > 120 ? truncated.slice(0, 120) + "..." : truncated;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const CategoryIcon = getCategoryIcon(template.category);

  return (
    <Link href={`/templates/${template.id}`}>
      <div className="group rounded-xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-gray-200 cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {template.name}
            </h3>
          </div>
          <Badge
            variant="secondary"
            className={cn("text-[10px] font-medium shrink-0", getStatusColor(template.status))}
          >
            {template.status}
          </Badge>
        </div>

        {/* Category Badge */}
        <div className="mt-2">
          <Badge
            variant="secondary"
            className={cn("text-[10px] font-medium", getCategoryColor(template.category))}
          >
            {template.category}
          </Badge>
        </div>

        {/* Subject (for emails) */}
        {template.subject && (
          <p className="mt-2 text-xs font-medium text-gray-700 truncate">
            {template.subject}
          </p>
        )}

        {/* Body Preview */}
        <p className="mt-2 text-xs text-gray-500 line-clamp-2 flex-1">
          {truncateBody(template.body)}
        </p>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600 border border-gray-200"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50 pt-2">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            <span>{template.usageCount} uses</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{template.lastModified}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
