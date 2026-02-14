/**
 * Factory functions for creating realistic SharePoint Graph API response shapes.
 * Used by tester agents to generate test data that matches actual API behavior.
 */

/** Create a raw SharePoint list item as returned by Graph API (pre-mapping) */
export function makeSharePointItem(
  id: number,
  fields: Record<string, unknown> = {},
) {
  return {
    id: String(id),
    fields: {
      // SharePoint always includes a string `id` in fields — this is the known overwrite trap
      id: `item-field-id-${id}`,
      Title: `Item ${id}`,
      Created: '2026-01-15T10:00:00Z',
      Modified: '2026-01-15T10:00:00Z',
      ...fields,
    },
  };
}

/** Create a raw Company item as returned by Graph API (with lookup fields as LookupId strings) */
export function makeCompanyItem(
  id: number,
  overrides: Record<string, unknown> = {},
) {
  return makeSharePointItem(id, {
    Title: `Company ${id}`,
    tss_companyCode: `C${String(id).padStart(3, '0')}`,
    tss_industry: 'Oil & Gas E&P',
    tss_isActive: true,
    tss_countryIdLookupId: '1',
    tss_companyType: 'Operator',
    ...overrides,
  });
}

/** Create a raw Contact item as returned by Graph API */
export function makeContactItem(
  id: number,
  overrides: Record<string, unknown> = {},
) {
  return makeSharePointItem(id, {
    Title: `Contact ${id}`,
    tss_firstName: 'John',
    tss_lastName: `Doe ${id}`,
    tss_email: `contact${id}@example.com`,
    tss_companyIdLookupId: '1',
    tss_isActive: true,
    ...overrides,
  });
}

/** Create a raw Opportunity item as returned by Graph API */
export function makeOpportunityItem(
  id: number,
  overrides: Record<string, unknown> = {},
) {
  return makeSharePointItem(id, {
    Title: `OPP-TEST-2026-01-${String(id).padStart(3, '0')}`,
    tss_stage: 'Lead',
    tss_companyIdLookupId: '1',
    tss_primaryContactIdLookupId: '1',
    tss_isActive: true,
    tss_estimatedRevenue: 50000,
    ...overrides,
  });
}

/** Create a Graph API paginated response wrapper */
export function makeListResponse(
  items: ReturnType<typeof makeSharePointItem>[],
  nextLink?: string,
) {
  return {
    value: items,
    ...(nextLink ? { '@odata.nextLink': nextLink } : {}),
  };
}
