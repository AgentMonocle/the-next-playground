#!/usr/bin/env tsx
/**
 * Seed TSS_BasinRegion list with basin/region reference data.
 *
 * Idempotent: skips basins that already exist (matched by tss_basinCode).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedBasinRegions.ts
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  getAdminClient,
  getSiteId,
  getAllListItems,
  batchCreateItems,
  findItemByField,
} from '../lib/graphAdmin.js';

const LIST_NAME = 'TSS_BasinRegion';
const COUNTRY_LIST = 'TSS_Country';

interface BasinRegionData {
  name: string;
  code: string;
  countryCode: string | null;
  description: string;
}

async function main() {
  console.log('🏔️  Seeding TSS_BasinRegion list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/basinRegions.json');
  const basins: BasinRegionData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${basins.length} basin/regions from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Get existing basin items to avoid duplicates
  const existing = await getAllListItems(client, siteId, LIST_NAME);
  const existingCodes = new Set<string>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_basinCode) {
      existingCodes.add(fields.tss_basinCode as string);
    }
  }
  console.log(`  Found ${existingCodes.size} existing basins in SharePoint`);

  // Build country lookup map: countryCode → SharePoint item ID
  const countries = await getAllListItems(client, siteId, COUNTRY_LIST);
  const countryCodeToId = new Map<string, number>();
  for (const item of countries) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_countryCode) {
      countryCodeToId.set(fields.tss_countryCode as string, Number(item.id));
    }
  }

  // Filter to only new basins
  const newBasins = basins.filter((b) => !existingCodes.has(b.code));
  if (newBasins.length === 0) {
    console.log('\n  ✅ All basin/regions already exist — nothing to do');
    return;
  }

  console.log(`  Creating ${newBasins.length} new basin/regions...\n`);

  // Map to SharePoint fields
  const items = newBasins.map((b) => {
    const fields: Record<string, unknown> = {
      Title: b.name,
      tss_basinCode: b.code,
      tss_description: b.description,
      tss_isActive: true,
    };
    if (b.countryCode) {
      const countryId = countryCodeToId.get(b.countryCode);
      if (countryId) {
        fields.tss_countryIdLookupId = countryId;
      }
    }
    return fields;
  });

  // Batch create
  const created = await batchCreateItems(client, siteId, LIST_NAME, items);

  console.log(`\n================================`);
  console.log(`✅ Seeded ${created} of ${newBasins.length} basin/regions`);
}

main().catch((err) => {
  console.error('\n❌ Basin/Region seeding failed:', err);
  process.exit(1);
});
