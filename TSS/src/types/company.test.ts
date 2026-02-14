import { describe, it, expect } from 'vitest';
import { companyFormSchema } from './company';

describe('companyFormSchema', () => {
  const validData = {
    Title: 'Chevron',
    tss_companyCode: 'CVX',
    tss_industry: 'Oil & Gas E&P' as const,
    tss_companyType: 'Operator' as const,
    tss_isActive: true,
  };

  it('accepts valid company data', () => {
    const result = companyFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  // ─── Required Fields ────────────────────────────────────────────────────────

  it('rejects missing Title', () => {
    const { Title: _, ...data } = validData;
    const result = companyFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty Title', () => {
    const result = companyFormSchema.safeParse({ ...validData, Title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing companyCode', () => {
    const { tss_companyCode: _, ...data } = validData;
    const result = companyFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ─── Company Code Validation ────────────────────────────────────────────────

  it('rejects companyCode shorter than 2 characters', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects companyCode longer than 6 characters', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'ABCDEFG' });
    expect(result.success).toBe(false);
  });

  it('rejects lowercase companyCode', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'cvx' });
    expect(result.success).toBe(false);
  });

  it('rejects companyCode with special characters', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'CV-X' });
    expect(result.success).toBe(false);
  });

  it('accepts 2-character companyCode', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'AB' });
    expect(result.success).toBe(true);
  });

  it('accepts 6-character companyCode', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'ABCDEF' });
    expect(result.success).toBe(true);
  });

  it('accepts alphanumeric companyCode', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyCode: 'A1B2' });
    expect(result.success).toBe(true);
  });

  // ─── Optional Fields ────────────────────────────────────────────────────────

  it('accepts valid website URL', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_website: 'https://chevron.com' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for website', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_website: '' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid website URL', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_website: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts valid industry enum value', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_industry: 'Geothermal' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid industry value', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_industry: 'Crypto Mining' });
    expect(result.success).toBe(false);
  });

  it('accepts valid companyType enum value', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyType: 'Distributor' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid companyType value', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_companyType: 'Startup' });
    expect(result.success).toBe(false);
  });

  // ─── Defaults ───────────────────────────────────────────────────────────────

  it('defaults tss_isSubsidiary to false', () => {
    const result = companyFormSchema.safeParse({
      Title: 'Test',
      tss_companyCode: 'TST',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tss_isSubsidiary).toBe(false);
    }
  });

  it('defaults tss_isActive to true', () => {
    const result = companyFormSchema.safeParse({
      Title: 'Test',
      tss_companyCode: 'TST',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tss_isActive).toBe(true);
    }
  });

  it('accepts optional countryId as number', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_countryId: 42 });
    expect(result.success).toBe(true);
  });

  it('accepts optional parentCompanyId as number', () => {
    const result = companyFormSchema.safeParse({ ...validData, tss_parentCompanyId: 10 });
    expect(result.success).toBe(true);
  });
});
