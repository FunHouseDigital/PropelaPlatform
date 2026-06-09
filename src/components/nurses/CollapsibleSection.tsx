"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  return (
    <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: isExpanded ? contentHeight ?? "none" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-5 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
