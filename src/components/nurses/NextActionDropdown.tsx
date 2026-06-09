"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateNurseNextAction } from "@/app/nurses/actions";
import { cn } from "@/lib/utils";

const NEXT_ACTION_OPTIONS = [
  "Needs: Chase CV, then scoring",
  "Needs: Chase EF SET, then shortlist email",
  "Needs: Shortlist email (writing task)",
  "Needs: Non-selection email",
  "Needs: Non-selection email (English pathway)",
  "Needs: Review",
  "Needs: Send agreement",
  "Needs: Chase commitment fee",
  "Needs: OET registration",
  "Needs: Chase OET results",
  "Needs: Placement outreach",
  "No action required",
] as const;

function getActionColorClass(action: string | null): string {
  if (!action || action === "No action required") {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }
  if (
    action.includes("Non-selection") ||
    action.includes("Chase commitment fee")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (action.includes("Review") || action.includes("Shortlist email")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-teal-50 text-teal-700 border-teal-200";
}

interface NextActionDropdownProps {
  nurseId: number;
  currentAction: string | null;
}

export function NextActionDropdown({
  nurseId,
  currentAction,
}: NextActionDropdownProps) {
  const [value, setValue] = useState(currentAction || "");
  const [isPending, startTransition] = useTransition();

  const handleChange = (newValue: string) => {
    setValue(newValue);
    startTransition(async () => {
      await updateNurseNextAction(nurseId, newValue);
    });
  };

  return (
    <div className="w-full">
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger
          className={cn(
            "w-full text-sm font-semibold rounded-lg border-2 h-auto py-2.5 px-3",
            getActionColorClass(value),
            isPending && "opacity-70"
          )}
        >
          <SelectValue placeholder="Select next action..." />
        </SelectTrigger>
        <SelectContent>
          {NEXT_ACTION_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
