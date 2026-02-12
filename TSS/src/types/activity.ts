import { z } from 'zod';
import type { LookupField } from './company.js';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  'Email',
  'Call',
  'Meeting',
  'Site Visit',
  'Trade Show',
  'Training',
  'Internal Note',
  'Quote Sent',
  'PO Received',
  'Shipment',
] as const;

export const ACTIVITY_DIRECTIONS = ['Inbound', 'Outbound', 'Internal'] as const;

export const ACTIVITY_SOURCES = ['Manual', 'Email Auto-Link', 'JotForm', 'Calendar Sync'] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityDirection = (typeof ACTIVITY_DIRECTIONS)[number];
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Activity {
  id: number;
  Title: string;                           // Subject
  tss_activityType: ActivityType;
  tss_activityDate: string;                // ISO 8601
  tss_companyId?: LookupField;
  tss_contactId?: LookupField;
  tss_opportunityId?: LookupField;
  tss_owner: string;
  tss_direction?: ActivityDirection;
  tss_duration?: number;
  tss_description?: string;
  tss_source?: ActivitySource;
  tss_isAutoCreated?: boolean;
  tss_emailMessageId?: string;
  // SharePoint metadata
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const activityFormSchema = z.object({
  Title: z.string().min(1, 'Subject is required').max(255),
  tss_activityType: z.enum(ACTIVITY_TYPES),
  tss_activityDate: z.string().min(1, 'Date is required'),
  tss_companyId: z.number().optional(),
  tss_contactId: z.number().optional(),
  tss_opportunityId: z.number().optional(),
  tss_owner: z.string().min(1, 'Owner is required'),
  tss_direction: z.enum(ACTIVITY_DIRECTIONS).optional(),
  tss_duration: z.number().min(0).optional(),
  tss_description: z.string().optional(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;
