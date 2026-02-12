import { z } from 'zod';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const INDUSTRIES = [
  'Oil & Gas E&P',
  'Oil & Gas Services',
  'CCS/CCUS',
  'Geothermal',
  'Engineering',
  'Government/Research',
  'Other',
] as const;

export const COMPANY_TYPES = [
  'Operator',
  'Service Company',
  'Engineering Client',
  'Testing Client',
  'Government/Research',
  'Distributor',
] as const;

export type Industry = (typeof INDUSTRIES)[number];
export type CompanyType = (typeof COMPANY_TYPES)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

/** SharePoint lookup field shape */
export interface LookupField {
  LookupId: number;
  LookupValue: string;
}

export interface Company {
  id: number;
  Title: string;                    // Company name
  tss_companyCode: string;
  tss_industry?: Industry;
  tss_countryId?: LookupField;
  tss_isSubsidiary?: boolean;
  tss_parentCompanyId?: LookupField;
  tss_website?: string;
  tss_phone?: string;
  tss_address?: string;
  tss_owner?: { LookupId: number; LookupValue: string; Email?: string };
  tss_companyType?: CompanyType;
  tss_basin?: string;              // Legacy Choice field (use junction list now)
  tss_notes?: string;
  tss_isActive: boolean;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const companyFormSchema = z.object({
  Title: z.string().min(1, 'Company name is required'),
  tss_companyCode: z
    .string()
    .min(2, 'Code must be 2-6 characters')
    .max(6, 'Code must be 2-6 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters/numbers'),
  tss_industry: z.enum(INDUSTRIES).optional(),
  tss_countryId: z.number().optional(),        // Lookup ID
  tss_isSubsidiary: z.boolean().default(false),
  tss_parentCompanyId: z.number().optional(),  // Lookup ID
  tss_website: z.string().url('Invalid URL').optional().or(z.literal('')),
  tss_phone: z.string().optional(),
  tss_address: z.string().optional(),
  tss_companyType: z.enum(COMPANY_TYPES).optional(),
  tss_notes: z.string().optional(),
  tss_isActive: z.boolean().default(true),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;
