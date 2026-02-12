#!/usr/bin/env tsx
/**
 * Migrate existing tss_basin Choice field data on Companies and Opportunities
 * into the new TSS_CompanyBasin / TSS_OpportunityBasin junction lists.
 *
 * Idempotent: checks for existing junction records before creating.
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/migrateBasins.ts
 */
import {
  getAdminClient,
  getSiteId,
  getAllListItems,
  batchCreateItems,
} from '../lib/graphAdmin.js';

async function main() {
  console.log('🔄 Migrating Basin Choice fields → Junction records');
  console.log('====================================================\n');

  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Load basin/region lookup: basin name → SharePoint ID
  const basins = await getAllListItems(client, siteId, 'TSS_BasinRegion');
  const basinNameToId = new Map<string, number>();
  for (const item of basins) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.Title) {
      basinNameToId.set(fields.Title as string, Number(item.id));
    }
  }
  console.log(`  Loaded ${basinNameToId.size} basin/regions`);

  if (basinNameToId.size === 0) {
    console.log('\n  ⚠️  No basin/regions found. Run seedBasinRegions.ts first.');
    return;
  }

  // ── Migrate Companies ─────────────────────────────────────────────────────
  console.log('\n  📦 Migrating Companies...');
  const companies = await getAllListItems(client, siteId, 'TSS_Company');
  const existingCompanyBasins = await getAllListItems(client, siteId, 'TSS_CompanyBasin');

  // Build set of existing junction records: "companyId-basinId"
  const existingCBKeys = new Set<string>();
  for (const item of existingCompanyBasins) {
    const fields = item.fields as Record<string, unknown> | undefined;
    const cId = fields?.tss_companyIdLookupId;
    const bId = fields?.tss_basinRegionIdLookupId;
    if (cId && bId) existingCBKeys.add(`${cId}-${bId}`);
  }

  const companyJunctions: Record<string, unknown>[] = [];
  for (const company of companies) {
    const fields = company.fields as Record<string, unknown> | undefined;
    const basinName = fields?.tss_basin as string | undefined;
    if (!basinName) continue;

    const basinId = basinNameToId.get(basinName);
    if (!basinId) {
      console.log(`    ⚠️  Unknown basin "${basinName}" on company ${fields?.Title}`);
      continue;
    }

    const key = `${company.id}-${basinId}`;
    if (existingCBKeys.has(key)) continue;

    companyJunctions.push({
      Title: `${fields?.Title} — ${basinName}`,
      tss_companyIdLookupId: Number(company.id),
      tss_basinRegionIdLookupId: basinId,
    });
  }

  if (companyJunctions.length > 0) {
    const created = await batchCreateItems(client, siteId, 'TSS_CompanyBasin', companyJunctions);
    console.log(`    Created ${created} company-basin junction records`);
  } else {
    console.log('    ✅ No new company-basin junctions needed');
  }

  // ── Migrate Opportunities ─────────────────────────────────────────────────
  console.log('\n  📦 Migrating Opportunities...');
  const opportunities = await getAllListItems(client, siteId, 'TSS_Opportunity');
  const existingOppBasins = await getAllListItems(client, siteId, 'TSS_OpportunityBasin');

  const existingOBKeys = new Set<string>();
  for (const item of existingOppBasins) {
    const fields = item.fields as Record<string, unknown> | undefined;
    const oId = fields?.tss_opportunityIdLookupId;
    const bId = fields?.tss_basinRegionIdLookupId;
    if (oId && bId) existingOBKeys.add(`${oId}-${bId}`);
  }

  const oppJunctions: Record<string, unknown>[] = [];
  for (const opp of opportunities) {
    const fields = opp.fields as Record<string, unknown> | undefined;
    const basinName = fields?.tss_basin as string | undefined;
    if (!basinName) continue;

    const basinId = basinNameToId.get(basinName);
    if (!basinId) {
      console.log(`    ⚠️  Unknown basin "${basinName}" on opportunity ${fields?.Title}`);
      continue;
    }

    const key = `${opp.id}-${basinId}`;
    if (existingOBKeys.has(key)) continue;

    oppJunctions.push({
      Title: `${fields?.Title} — ${basinName}`,
      tss_opportunityIdLookupId: Number(opp.id),
      tss_basinRegionIdLookupId: basinId,
    });
  }

  if (oppJunctions.length > 0) {
    const created = await batchCreateItems(client, siteId, 'TSS_OpportunityBasin', oppJunctions);
    console.log(`    Created ${created} opportunity-basin junction records`);
  } else {
    console.log('    ✅ No new opportunity-basin junctions needed');
  }

  console.log('\n====================================================');
  console.log('✅ Basin migration complete!');
}

main().catch((err) => {
  console.error('\n❌ Basin migration failed:', err);
  process.exit(1);
});
