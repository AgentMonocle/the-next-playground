import { z } from 'zod';

// ─── Regions ────────────────────────────────────────────────────────────────

export const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Middle East',
  'Asia',
  'Africa',
  'Oceania',
] as const;

export type Region = (typeof REGIONS)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Country {
  id: number;
  Title: string;          // Country name
  tss_countryCode: string;
  tss_region: Region;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const countryFormSchema = z.object({
  Title: z.string().min(1, 'Country name is required'),
  tss_countryCode: z.string().length(2, 'Country code must be 2 characters'),
  tss_region: z.enum(REGIONS),
});

export type CountryFormData = z.infer<typeof countryFormSchema>;
