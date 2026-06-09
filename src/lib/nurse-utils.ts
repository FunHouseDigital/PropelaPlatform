import { Nurse, ReadinessStatus, NextAction, PipelineStage } from '@/types/nurse';

export function getReadinessColor(status: ReadinessStatus): string {
  switch (status) {
    case 'Not Ready':
      return 'bg-gray-100 text-not-ready';
    case 'Placement Ready':
      return 'bg-green-100 text-placement-ready';
    case 'Placed':
      return 'bg-propela-purple-light text-placed';
    case 'Dropped Out':
      return 'bg-dropped-out-bg text-red-700';
    case 'Deferred':
      return 'bg-deferred-bg text-yellow-700';
    case 'Not Selected':
      return 'bg-gray-100 text-not-ready';
    case 'Recommended Pathway':
      return 'bg-gray-100 text-not-ready';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getNextActionColor(action: NextAction | null): string {
  if (!action || action === 'No action required') {
    return 'bg-gray-100 text-no-action';
  }

  // Overdue/urgent actions
  const overdueActions: NextAction[] = [
    'Needs: Non-selection email',
    'Needs: Non-selection email (English pathway)',
    'Needs: Chase commitment fee',
  ];
  if (overdueActions.includes(action)) {
    return 'bg-red-100 text-overdue';
  }

  // Due today actions
  const dueTodayActions: NextAction[] = [
    'Needs: Review',
    'Needs: Shortlist email (writing task)',
  ];
  if (dueTodayActions.includes(action)) {
    return 'bg-amber-100 text-due-today';
  }

  // All other actions are upcoming
  return 'bg-teal-100 text-upcoming';
}

export function calculateCvScore(nurse: Nurse): number {
  const score =
    ((nurse.hospitalExp * 3 +
      nurse.sancStatusScore * 3 +
      nurse.qualifications * 2 +
      nurse.specialisation * 1) /
      9) *
    5;
  return Math.round(Math.min(score, 5.0) * 10) / 10;
}

export function calculateFinalScore(nurse: Nurse): number {
  const score =
    (nurse.hospitalExp * 3 +
      nurse.sancStatusScore * 3 +
      nurse.englishProficiency * 2 +
      nurse.qualifications * 2 +
      nurse.specialisation * 1 +
      nurse.validPassportScore * 1 +
      nurse.financialReadiness * 1 +
      nurse.motivationScore * 2) /
    15;
  return Math.round(score * 10) / 10;
}

export function getTier(finalScore: number): string {
  if (finalScore >= 4.0) return 'Tier 1 Priority';
  if (finalScore >= 3.0) return 'Tier 1 Standard';
  if (finalScore >= 2.0) return 'Tier 2 Development';
  if (finalScore >= 1.0) return 'Tier 3';
  return 'Not Suitable';
}

export function getTierColor(finalScore: number): string {
  if (finalScore >= 4.0) return 'bg-propela-purple text-white';
  if (finalScore >= 3.0) return 'bg-propela-purple-light text-propela-purple';
  if (finalScore >= 2.0) return 'bg-amber-100 text-amber-700';
  if (finalScore >= 1.0) return 'bg-gray-100 text-gray-600';
  return 'bg-red-100 text-red-700';
}

export function getReadinessFromStage(pipelineStage: PipelineStage): ReadinessStatus {
  switch (pipelineStage) {
    case 'Placement Ready':
      return 'Placement Ready';
    case 'Placed':
      return 'Placed';
    case 'Dropped Out':
      return 'Dropped Out';
    case 'Deferred':
      return 'Deferred';
    case 'Not Selected':
    case "Didn't Qualify":
      return 'Not Selected';
    case 'Recommended Pathway':
      return 'Recommended Pathway';
    default:
      return 'Not Ready';
  }
}
