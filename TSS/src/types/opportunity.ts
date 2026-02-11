import { z } from 'zod';
import type { LookupField, Basin } from './company.js';
import type { ProductLine } from './product.js';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const OPPORTUNITY_STAGES = [
  'Lead',
  'Qualification',
  'Quotation',
  'Negotiation',
  'Close',
  'After Action',
] as const;

export const CLOSE_STATUSES = ['Won', 'Lost', 'Cancelled'] as const;

export const PURSUIT_DECISIONS = ['Pursue', 'No-Bid', 'Pending'] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type CloseStatus = (typeof CLOSE_STATUSES)[number];
export type PursuitDecision = (typeof PURSUIT_DECISIONS)[number];

/** Stage colors for badges and pipeline columns */
export const STAGE_COLORS: Record<OpportunityStage, string> = {
  Lead: 'informative',
  Qualification: 'warning',
  Quotation: 'severe',
  Negotiation: 'important',
  Close: 'success',
  'After Action': 'subtle',
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Opportunity {
  id: number;
  Title: string;                           // Opportunity name
  tss_opportunityId: string;               // OPP-CVX-2026-03-001
  tss_companyId: LookupField;
  tss_primaryContactId?: LookupField;
  tss_stage: OpportunityStage;
  tss_closeStatus?: CloseStatus;
  tss_closeReason?: string;
  tss_probability?: number;
  tss_revenue?: number;
  tss_bidDueDate?: string;
  tss_deliveryDate?: string;
  tss_closeDate?: string;
  tss_owner?: string;  // Text field (changed from Person type)
  tss_productLine?: ProductLine;
  tss_basin?: Basin;
  tss_isRelated?: boolean;
  tss_relatedOpportunityId?: LookupField;
  tss_pursuitDecision?: PursuitDecision;
  tss_pursuitRationale?: string;
  tss_poNumber?: string;
  tss_isTaxExempt?: boolean;
  tss_taxDocumentLink?: string;
  tss_notes?: string;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const opportunityFormSchema = z.object({
  Title: z.string().min(1, 'Opportunity name is required'),
  tss_companyId: z.number({ error: 'Company is required' }),
  tss_primaryContactId: z.number().optional(),
  tss_stage: z.enum(OPPORTUNITY_STAGES).default('Lead'),
  tss_closeStatus: z.enum(CLOSE_STATUSES).optional(),
  tss_closeReason: z.string().optional(),
  tss_probability: z.number().min(0).max(100).optional(),
  tss_revenue: z.number().min(0).optional(),
  tss_bidDueDate: z.string().optional(),
  tss_deliveryDate: z.string().optional(),
  tss_closeDate: z.string().optional(),
  tss_productLine: z.enum([
    'Well Intervention',
    'New Completions',
    'Green Energy',
    'Engineering Service',
    'Testing Service',
  ] as const).optional(),
  tss_basin: z.enum([
    'Permian',
    'Eagle Ford',
    'DJ Basin',
    'Bakken',
    'GoM',
    'Marcellus',
    'International',
    'Other',
  ] as const).optional(),
  tss_isRelated: z.boolean().default(false),
  tss_relatedOpportunityId: z.number().optional(),
  tss_pursuitDecision: z.enum(PURSUIT_DECISIONS).optional(),
  tss_pursuitRationale: z.string().optional(),
  tss_poNumber: z.string().optional(),
  tss_isTaxExempt: z.boolean().default(false),
  tss_notes: z.string().optional(),
});

export type OpportunityFormData = z.infer<typeof opportunityFormSchema>;
