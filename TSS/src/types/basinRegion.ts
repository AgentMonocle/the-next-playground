import { z } from 'zod';
import type { LookupField } from './company.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BasinRegion {
  id: number;
  Title: string;                    // Basin/region name (e.g., "Permian")
  tss_basinCode: string;            // Short code (e.g., "PERM")
  tss_countryId?: LookupField;      // Legacy 1:1 column (use junction now)
  tss_description?: string;
  tss_isActive: boolean;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Junction Types ─────────────────────────────────────────────────────────

export interface BasinRegionCountry {
  id: number;
  Title: string;
  tss_basinRegionId: LookupField;
  tss_countryId: LookupField;
}

export interface CompanyBasin {
  id: number;
  Title: string;
  tss_companyId: LookupField;
  tss_basinRegionId: LookupField;
}

export interface ContactBasin {
  id: number;
  Title: string;
  tss_contactId: LookupField;
  tss_basinRegionId: LookupField;
}

export interface OpportunityBasin {
  id: number;
  Title: string;
  tss_opportunityId: LookupField;
  tss_basinRegionId: LookupField;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const basinRegionFormSchema = z.object({
  Title: z.string().min(1, 'Basin/Region name is required'),
  tss_basinCode: z
    .string()
    .min(2, 'Code must be 2-6 characters')
    .max(6, 'Code must be 2-6 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters/numbers'),
  tss_description: z.string().optional(),
  tss_isActive: z.boolean().default(true),
});

export type BasinRegionFormData = z.infer<typeof basinRegionFormSchema>;
