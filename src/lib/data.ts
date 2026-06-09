import { Nurse } from '@/types/nurse';
import { Cohort } from '@/types/cohort';
import { AcquisitionSource, OutreachLead } from '@/types/acquisition';
import { Template } from '@/types/template';
import { mockNurses } from './mock-data';
import { mockCohorts } from './mock-cohorts';
import { mockAcquisitionSources, mockOutreachLeads } from './mock-acquisition';
import { mockTemplates } from './mock-templates';

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

export async function getAcquisitionSources(): Promise<AcquisitionSource[]> {
  return mockAcquisitionSources;
}

export async function getAcquisitionSourceById(id: string): Promise<AcquisitionSource | undefined> {
  return mockAcquisitionSources.find((source) => source.id === id);
}

export async function getOutreachLeads(): Promise<OutreachLead[]> {
  return mockOutreachLeads;
}

export async function getTemplates(): Promise<Template[]> {
  return mockTemplates;
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  return mockTemplates.find((template) => template.id === id);
}
