import { Nurse } from '@/types/nurse';
import { mockNurses } from './mock-data';

export async function getNurses(): Promise<Nurse[]> {
  return mockNurses;
}

export async function getNurseById(id: number): Promise<Nurse | undefined> {
  return mockNurses.find((nurse) => nurse.id === id);
}
