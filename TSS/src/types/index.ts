// ─── Re-exports ─────────────────────────────────────────────────────────────

export type { Country, Region, CountryFormData } from './country.js';
export { REGIONS, countryFormSchema } from './country.js';

export type { Product, ProductLine, ProductCategory, ProductUnit, ProductFormData } from './product.js';
export { PRODUCT_LINES, PRODUCT_CATEGORIES, PRODUCT_UNITS, productFormSchema } from './product.js';

export type { Company, CompanyType, Industry, LookupField, CompanyFormData } from './company.js';
export { INDUSTRIES, COMPANY_TYPES, companyFormSchema } from './company.js';

export type { Contact, Department, ContactFormData } from './contact.js';
export { DEPARTMENTS, contactFormSchema } from './contact.js';

export type { Opportunity, OpportunityStage, CloseStatus, PursuitDecision, OpportunityFormData } from './opportunity.js';
export { OPPORTUNITY_STAGES, CLOSE_STATUSES, PURSUIT_DECISIONS, STAGE_COLORS, opportunityFormSchema } from './opportunity.js';

export type { InternalTeamMember, TeamRole, InternalTeamFormData } from './internalTeam.js';
export { TEAM_ROLES, internalTeamFormSchema } from './internalTeam.js';

export type { BasinRegion, CompanyBasin, ContactBasin, OpportunityBasin, BasinRegionFormData } from './basinRegion.js';
export { basinRegionFormSchema } from './basinRegion.js';

// ─── Shared Types ───────────────────────────────────────────────────────────

/** Base fields present on every SharePoint list item */
export interface SharePointItem {
  id: number;
  Title: string;
  Created: string;
  Modified: string;
  Author?: { LookupId: number; LookupValue: string };
  Editor?: { LookupId: number; LookupValue: string };
}

/** Paginated response from SharePoint list queries */
export interface PaginatedResponse<T> {
  items: T[];
  nextLink?: string;
  totalCount?: number;
}
