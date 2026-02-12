import { z } from 'zod';
import type { LookupField } from './company.js';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const DEPARTMENTS = [
  'Engineering',
  'Operations',
  'Procurement',
  'Management',
  'HSE',
  'Other',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Contact {
  id: number;
  Title: string;                    // Full name ("First Last")
  tss_preferredName?: string;
  tss_email?: string;
  tss_phone?: string;
  tss_mobile?: string;
  tss_jobTitle?: string;
  tss_department?: Department;
  tss_companyId: LookupField;
  tss_isDecisionMaker?: boolean;
  tss_isInfluencer?: boolean;
  tss_isActive: boolean;
  tss_notes?: string;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const contactFormSchema = z.object({
  Title: z.string().min(1, 'Full name is required'),
  tss_preferredName: z.string().optional(),
  tss_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  tss_phone: z.string().optional(),
  tss_mobile: z.string().optional(),
  tss_jobTitle: z.string().optional(),
  tss_department: z.enum(DEPARTMENTS).optional(),
  tss_companyId: z.number({ error: 'Company is required' }),
  tss_isDecisionMaker: z.boolean().default(false),
  tss_isInfluencer: z.boolean().default(false),
  tss_isActive: z.boolean().default(true),
  tss_notes: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
