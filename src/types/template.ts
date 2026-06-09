export type TemplateCategory = 'Email' | 'WhatsApp' | 'Letter' | 'SMS' | 'Document';

export type TemplateStatus = 'Active' | 'Draft' | 'Archived';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  tags: string[];
  status: TemplateStatus;
  lastModified: string;
  usageCount: number;
}
