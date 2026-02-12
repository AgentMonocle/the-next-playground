import { z } from 'zod';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const TEAM_ROLES = [
  'Sales',
  'Engineering',
  'Operations',
  'Management',
  'Testing',
  'Finance',
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InternalTeamMember {
  id: number;
  Title: string;            // Team member name
  tss_email: string;
  tss_role: TeamRole;
  tss_isActive: boolean;
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const internalTeamFormSchema = z.object({
  Title: z.string().min(1, 'Name is required'),
  tss_email: z.string().email('Invalid email format'),
  tss_role: z.enum(TEAM_ROLES),
  tss_isActive: z.boolean().default(true),
});

export type InternalTeamFormData = z.infer<typeof internalTeamFormSchema>;
