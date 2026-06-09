import { Nurse } from '@/types/nurse';
import { Cohort } from '@/types/cohort';
import { mockNurses } from './mock-data';
import { mockCohorts } from './mock-cohorts';

export async function getNurses(): Promise<Nurse[]> {
  return mockNurses;
}

export async function getNurseById(id: number): Promise<Nurse | undefined> {
  return mockNurses.find((nurse) => nurse.id === id);
}

export async function getCohorts(): Promise<Cohort[]> {
  return mockCohorts;
}

export async function getCohortById(id: string): Promise<Cohort | undefined> {
  return mockCohorts.find((cohort) => cohort.id === id);
}
