"use client";

import Link from "next/link";
import { FileSearch, Mail, Bell, Download } from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  description: string;
}

interface QuickActionsProps {
  pendingReviews: number;
  pendingOET: number;
}

export function QuickActions({ pendingReviews, pendingOET }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: "Review Applications",
      href: "/nurses",
      icon: FileSearch,
      badge: pendingReviews,
      description: "Applications awaiting review",
    },
    {
      label: "Chase OET Results",
      href: "/nurses",
      icon: Mail,
      badge: pendingOET,
      description: "Nurses pending OET follow-up",
    },
    {
      label: "Send Reminders",
      href: "/nurses",
      icon: Bell,
      description: "Send batch reminders to nurses",
    },
    {
      label: "Export Report",
      href: "/nurses",
      icon: Download,
      description: "Download pipeline summary",
    },
  ];

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 rounded-lg border border-gray-100 p-4 transition-all hover:border-propela-purple-mid hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-propela-purple-light">
              <action.icon className="h-5 w-5 text-propela-purple" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {action.label}
                </p>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-propela-purple px-1.5 text-xs font-medium text-white">
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
