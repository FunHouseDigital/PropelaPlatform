export type CohortStatus = 'Active' | 'Planned' | 'Completed' | 'Archived';

export interface CohortBudget {
  allocated: number;
  spent: number;
  remaining: number;
}

export interface CohortOutcomeTargets {
  placementTarget: number;
  currentPlacements: number;
  passRate: number;
}

export interface CohortNurseSummary {
  id: number;
  fullName: string;
  pipelineStage: string;
  oetStatus: string | null;
  placementStatus: string | null;
}

export interface Cohort {
  id: string;
  name: string;
  status: CohortStatus;
  startDate: string;
  endDate: string;
  trainingProvider: string;
  budget: CohortBudget;
  outcomeTargets: CohortOutcomeTargets;
  nurses: CohortNurseSummary[];
  description: string;
  notes: string | null;
}
