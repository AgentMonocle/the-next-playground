#!/usr/bin/env tsx
/**
 * Seed TSS_Company list with oil & gas company data.
 *
 * TWO PASS approach:
 *   Pass 1: Create all companies without parent links. Resolves country lookups.
 *   Pass 2: For subsidiaries, find parent by tss_companyCode and set tss_parentCompanyIdLookupId.
 *
 * Idempotent: skips companies that already exist (matched by tss_companyCode).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedCompanies.ts
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  getAdminClient,
  getSiteId,
  getAllListItems,
  createListItem,
  findItemByField,
  updateListItemFields,
} from '../lib/graphAdmin.js';

const COMPANY_LIST = 'TSS_Company';
const COUNTRY_LIST = 'TSS_Country';

interface CompanyData {
  name: string;
  companyCode: string;
  industry: string;
  countryCode: string;
  companyType: string;
  basin: string;
  isSubsidiary: boolean;
  parentCompanyCode: string | null;
  website: string | null;
  phone: string | null;
}

async function main() {
  console.log('🏢 Seeding TSS_Company list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/companies.json');
  const companies: CompanyData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${companies.length} companies from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // ─── Build country lookup map ──────────────────────────────────────────────
  console.log('\n  Building country lookup map...');
  const countryItems = await getAllListItems(client, siteId, COUNTRY_LIST);
  const countryMap = new Map<string, number>(); // countryCode -> SharePoint item ID
  for (const item of countryItems) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_countryCode) {
      countryMap.set(fields.tss_countryCode as string, Number(item.id));
    }
  }
  console.log(`  Found ${countryMap.size} countries for lookup resolution`);

  // ─── Get existing companies ────────────────────────────────────────────────
  const existing = await getAllListItems(client, siteId, COMPANY_LIST);
  const existingCodes = new Set<string>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_companyCode) {
      existingCodes.add(fields.tss_companyCode as string);
    }
  }
  console.log(`  Found ${existingCodes.size} existing companies in SharePoint`);

  // ─── PASS 1: Create companies (without parent links) ──────────────────────
  const newCompanies = companies.filter(c => !existingCodes.has(c.companyCode));
  if (newCompanies.length === 0) {
    console.log('\n  All companies already exist — checking parent links...');
  } else {
    console.log(`\n  PASS 1: Creating ${newCompanies.length} new companies...\n`);

    let pass1Created = 0;
    for (const company of newCompanies) {
      const fields: Record<string, unknown> = {
        Title: company.name,
        tss_companyCode: company.companyCode,
        tss_industry: company.industry,
        tss_companyType: company.companyType,
        tss_basin: company.basin,
        tss_isSubsidiary: company.isSubsidiary,
        tss_isActive: true,
      };

      // Resolve country lookup
      const countryId = countryMap.get(company.countryCode);
      if (countryId) {
        fields.tss_countryIdLookupId = countryId;
      } else {
        console.warn(`  ⚠️  Country code "${company.countryCode}" not found for ${company.companyCode}`);
      }

      // Optional fields
      if (company.website) {
        fields.tss_website = {
          Url: company.website,
          Description: company.name,
        };
      }
      if (company.phone) {
        fields.tss_phone = company.phone;
      }

      try {
        await createListItem(client, siteId, COMPANY_LIST, fields);
        pass1Created++;
        if (pass1Created % 20 === 0) {
          console.log(`    ... created ${pass1Created} of ${newCompanies.length}`);
          // Small delay to avoid throttling
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error(`  ❌ Failed to create ${company.companyCode}: ${error.message ?? 'Unknown error'}`);
      }
    }

    console.log(`\n  ✅ Pass 1 complete: created ${pass1Created} companies`);
  }

  // ─── PASS 2: Link subsidiaries to parents ──────────────────────────────────
  const subsidiaries = companies.filter(c => c.isSubsidiary && c.parentCompanyCode);
  if (subsidiaries.length === 0) {
    console.log('\n  No subsidiaries to link');
  } else {
    console.log(`\n  PASS 2: Linking ${subsidiaries.length} subsidiaries to parents...\n`);

    // Build company code -> item ID map from current state
    const companyItems = await getAllListItems(client, siteId, COMPANY_LIST);
    const companyIdMap = new Map<string, string>(); // companyCode -> itemId
    for (const item of companyItems) {
      const fields = item.fields as Record<string, unknown> | undefined;
      if (fields?.tss_companyCode) {
        companyIdMap.set(fields.tss_companyCode as string, item.id as string);
      }
    }

    let linked = 0;
    for (const sub of subsidiaries) {
      const subItemId = companyIdMap.get(sub.companyCode);
      const parentItemId = companyIdMap.get(sub.parentCompanyCode as string);

      if (!subItemId) {
        console.warn(`  ⚠️  Subsidiary ${sub.companyCode} not found in SharePoint`);
        continue;
      }
      if (!parentItemId) {
        console.warn(`  ⚠️  Parent ${sub.parentCompanyCode} not found for ${sub.companyCode}`);
        continue;
      }

      try {
        await updateListItemFields(client, siteId, COMPANY_LIST, subItemId, {
          tss_parentCompanyIdLookupId: Number(parentItemId),
        });
        linked++;
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error(`  ❌ Failed to link ${sub.companyCode} -> ${sub.parentCompanyCode}: ${error.message ?? 'Unknown error'}`);
      }
    }

    console.log(`\n  ✅ Pass 2 complete: linked ${linked} of ${subsidiaries.length} subsidiaries`);
  }

  console.log('\n================================');
  console.log('✅ Company seeding complete!');
}

main().catch((err) => {
  console.error('\n❌ Company seeding failed:', err);
  process.exit(1);
});
