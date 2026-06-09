"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  FileText,
  MessageSquare,
  File,
  Copy,
  Check,
  Clock,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Template, TemplateCategory } from "@/types/template";
import { cn } from "@/lib/utils";
import { getCategoryColor, getTemplateStatusColor } from "@/lib/badge-colors";

interface TemplateDetailProps {
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

function renderBodyWithHighlights(body: string) {
  const parts = body.split(/({{[^}]+}})/g);
  return parts.map((part, index) => {
    if (part.match(/^{{[^}]+}}$/)) {
      return (
        <span
          key={index}
          className="inline-block rounded bg-propela-purple-light px-1 py-0.5 font-mono text-xs font-semibold text-propela-purple"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function TemplateDetail({ template }: TemplateDetailProps) {
  const [copied, setCopied] = useState(false);
  const CategoryIcon = getCategoryIcon(template.category);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-propela-purple transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      {/* Header Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-propela-purple-light">
              <CategoryIcon className="h-5 w-5 text-propela-purple" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {template.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-medium",
                    getCategoryColor(template.category)
                  )}
                >
                  {template.category}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-medium",
                    getTemplateStatusColor(template.status)
                  )}
                >
                  {template.status}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-propela-purple hover:text-propela-purple"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Body
              </>
            )}
          </button>
        </div>

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{template.usageCount} times used</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Last modified: {template.lastModified}</span>
          </div>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600 border border-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subject (for emails) */}
      {template.subject && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Subject Line</h2>
          <p className="mt-2 text-sm text-gray-900">
            {renderBodyWithHighlights(template.subject)}
          </p>
        </div>
      )}

      {/* Template Body */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Template Body
          </h2>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
            {renderBodyWithHighlights(template.body)}
          </pre>
        </div>
      </div>
    </div>
  );
}
