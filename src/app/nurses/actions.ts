"use server";

import { PipelineStage } from "@/types/nurse";

export async function updateNursePipelineStage(
  nurseId: number,
  newStage: PipelineStage
): Promise<{ success: boolean }> {
  // In the future this will use Prisma to persist the change.
  // For now, return success since we manage state client-side.
  console.log(
    `[Server Action] updateNursePipelineStage: nurse ${nurseId} -> ${newStage}`
  );
  return { success: true };
}

export async function updateNurseNextAction(
  nurseId: number,
  nextAction: string
): Promise<{ success: boolean }> {
  // In the future this will use Prisma to persist the change.
  // For now, return success since we manage state client-side.
  console.log(
    `[Server Action] updateNurseNextAction: nurse ${nurseId} -> ${nextAction}`
  );
  return { success: true };
}
