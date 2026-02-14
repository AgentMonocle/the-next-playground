import { describe, it, expect } from 'vitest';
import {
  buildFilter,
  setLookupField,
  escapeOData,
  extractSkipToken,
  type FilterCondition,
} from './lists';

// ─── buildFilter ─────────────────────────────────────────────────────────────

describe('buildFilter', () => {
  it('builds eq filter for string values', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_companyCode', operator: 'eq', value: 'CVX' },
    ];
    expect(buildFilter(conditions)).toBe("fields/tss_companyCode eq 'CVX'");
  });

  it('builds eq filter for numeric values', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_estimatedRevenue', operator: 'eq', value: 50000 },
    ];
    expect(buildFilter(conditions)).toBe('fields/tss_estimatedRevenue eq 50000');
  });

  it('builds ne filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_stage', operator: 'ne', value: 'Closed' },
    ];
    expect(buildFilter(conditions)).toBe("fields/tss_stage ne 'Closed'");
  });

  it('builds contains filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'Title', operator: 'contains', value: 'Chevron' },
    ];
    expect(buildFilter(conditions)).toBe("contains(fields/Title,'Chevron')");
  });

  it('builds startsWith filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'Title', operator: 'startsWith', value: 'OPP' },
    ];
    expect(buildFilter(conditions)).toBe("startsWith(fields/Title,'OPP')");
  });

  it('builds gt filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_estimatedRevenue', operator: 'gt', value: 10000 },
    ];
    expect(buildFilter(conditions)).toBe('fields/tss_estimatedRevenue gt 10000');
  });

  it('builds lt filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_estimatedRevenue', operator: 'lt', value: 100000 },
    ];
    expect(buildFilter(conditions)).toBe('fields/tss_estimatedRevenue lt 100000');
  });

  it('builds ge filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_estimatedRevenue', operator: 'ge', value: 5000 },
    ];
    expect(buildFilter(conditions)).toBe('fields/tss_estimatedRevenue ge 5000');
  });

  it('builds le filter', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_estimatedRevenue', operator: 'le', value: 99999 },
    ];
    expect(buildFilter(conditions)).toBe('fields/tss_estimatedRevenue le 99999');
  });

  it('joins multiple conditions with AND', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_stage', operator: 'eq', value: 'Lead' },
      { field: 'tss_estimatedRevenue', operator: 'gt', value: 10000 },
    ];
    expect(buildFilter(conditions)).toBe(
      "fields/tss_stage eq 'Lead' and fields/tss_estimatedRevenue gt 10000",
    );
  });

  it('skips conditions with undefined value', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_stage', operator: 'eq', value: 'Lead' },
      { field: 'tss_owner', operator: 'eq', value: undefined },
    ];
    expect(buildFilter(conditions)).toBe("fields/tss_stage eq 'Lead'");
  });

  it('skips conditions with null value', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_stage', operator: 'eq', value: 'Lead' },
      { field: 'tss_owner', operator: 'eq', value: null },
    ];
    expect(buildFilter(conditions)).toBe("fields/tss_stage eq 'Lead'");
  });

  it('skips conditions with empty string value', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_stage', operator: 'eq', value: 'Lead' },
      { field: 'Title', operator: 'contains', value: '' },
    ];
    expect(buildFilter(conditions)).toBe("fields/tss_stage eq 'Lead'");
  });

  it('returns empty string for no valid conditions', () => {
    const conditions: FilterCondition[] = [
      { field: 'tss_owner', operator: 'eq', value: undefined },
    ];
    expect(buildFilter(conditions)).toBe('');
  });

  it('escapes single quotes in string values', () => {
    const conditions: FilterCondition[] = [
      { field: 'Title', operator: 'eq', value: "O'Brien" },
    ];
    expect(buildFilter(conditions)).toBe("fields/Title eq 'O''Brien'");
  });
});

// ─── escapeOData ─────────────────────────────────────────────────────────────

describe('escapeOData', () => {
  it('escapes single quotes by doubling them', () => {
    expect(escapeOData("O'Brien")).toBe("O''Brien");
  });

  it('escapes multiple single quotes', () => {
    expect(escapeOData("it's a 'test'")).toBe("it''s a ''test''");
  });

  it('returns unchanged string with no single quotes', () => {
    expect(escapeOData('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeOData('')).toBe('');
  });
});

// ─── extractSkipToken ────────────────────────────────────────────────────────

describe('extractSkipToken', () => {
  it('extracts $skipToken from a nextLink URL', () => {
    const nextLink =
      'https://graph.microsoft.com/v1.0/sites/xxx/lists/yyy/items?$skipToken=Paged%3DTRUE%26p_ID%3D100';
    expect(extractSkipToken(nextLink)).toBe('Paged=TRUE&p_ID=100');
  });

  it('returns undefined for URL without $skipToken', () => {
    const nextLink = 'https://graph.microsoft.com/v1.0/sites/xxx/lists/yyy/items?$top=100';
    expect(extractSkipToken(nextLink)).toBeUndefined();
  });

  it('returns undefined for invalid URL', () => {
    expect(extractSkipToken('not-a-url')).toBeUndefined();
  });
});

// ─── setLookupField ──────────────────────────────────────────────────────────

describe('setLookupField', () => {
  it('returns {fieldName}LookupId with numeric value', () => {
    expect(setLookupField('tss_companyId', 42)).toEqual({
      tss_companyIdLookupId: 42,
    });
  });

  it('returns empty object when value is undefined', () => {
    expect(setLookupField('tss_companyId', undefined)).toEqual({});
  });

  it('handles zero as a valid lookup ID', () => {
    expect(setLookupField('tss_countryId', 0)).toEqual({
      tss_countryIdLookupId: 0,
    });
  });
});
