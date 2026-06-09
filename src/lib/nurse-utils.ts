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
  if (!action || action === 'No Action Required') {
    return 'bg-gray-100 text-no-action';
  }

  // Overdue/urgent actions
  const overdueActions: NextAction[] = [
    'Follow Up Agreement',
    'Follow Up Payment',
    'Schedule OET Retake',
  ];
  if (overdueActions.includes(action)) {
    return 'bg-red-100 text-overdue';
  }

  // Due today actions
  const dueTodayActions: NextAction[] = [
    'Confirm Commitment Fee',
    'Confirm OET Results',
    'Confirm Placement',
  ];
  if (dueTodayActions.includes(action)) {
    return 'bg-amber-100 text-due-today';
  }

  // All other actions are upcoming
  return 'bg-teal-100 text-upcoming';
}

export function calculateCvScore(nurse: Nurse): number {
  const score =
    (nurse.hospitalExp * 3 +
      nurse.sancStatusScore * 3 +
      nurse.qualifications * 2 +
      nurse.specialisation * 1) /
    9 *
    5;
  return Math.min(score, 5);
}

export function calculateFinalScore(nurse: Nurse): number {
  return (
    nurse.hospitalExp +
    nurse.sancStatusScore +
    nurse.englishProficiency +
    nurse.qualifications +
    nurse.specialisation +
    nurse.validPassportScore +
    nurse.financialReadiness +
    nurse.motivationScore
  );
}

export function getTier(finalScore: number): string {
  if (finalScore >= 70) return 'Tier 1';
  if (finalScore >= 50) return 'Tier 2';
  return 'Tier 3';
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
