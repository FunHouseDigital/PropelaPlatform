export type AcquisitionSourceType = 'Organisation' | 'Referral' | 'Community' | 'Event';

export type AcquisitionSourceStatus = 'Active' | 'Prospective' | 'Inactive';

export type OutreachStage = 'Contacted' | 'Interested' | 'Applied' | 'Converted' | 'Lost';

export interface AcquisitionSource {
  id: string;
  name: string;
  type: AcquisitionSourceType;
  contactPerson: string;
  contactEmail: string;
  status: AcquisitionSourceStatus;
  leadsGenerated: number;
  conversionRate: number;
  lastContact: string;
  notes: string | null;
}

export interface OutreachLead {
  id: string;
  sourceId: string;
  sourceName: string;
  nurseFullName: string;
  stage: OutreachStage;
  contactDate: string;
  followUpDate: string | null;
  notes: string | null;
}
