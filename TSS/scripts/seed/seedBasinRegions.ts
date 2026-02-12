#!/usr/bin/env tsx
/**
 * Seed TSS_BasinRegion list with basin/region reference data,
 * then create TSS_BasinRegionCountry junction records for the
 * one-to-many Basin ↔ Country relationship.
 *
 * Idempotent: skips basins that already exist (matched by tss_basinCode),
 * and skips junction records that already exist.
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
} from '../lib/graphAdmin.js';

const BASIN_LIST = 'TSS_BasinRegion';
const COUNTRY_LIST = 'TSS_Country';
const JUNCTION_LIST = 'TSS_BasinRegionCountry';

interface BasinRegionData {
  name: string;
  code: string;
  countryCodes: string[];
  description: string;
}

async function main() {
  console.log('🏔️  Seeding TSS_BasinRegion + TSS_BasinRegionCountry');
  console.log('=====================================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/basinRegions.json');
  const basins: BasinRegionData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${basins.length} basin/regions from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // ─── Step 1: Seed basin records ──────────────────────────────────────────

  const existing = await getAllListItems(client, siteId, BASIN_LIST);
  const existingCodes = new Map<string, number>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_basinCode) {
      existingCodes.set(fields.tss_basinCode as string, Number(item.id));
    }
  }
  console.log(`  Found ${existingCodes.size} existing basins in SharePoint`);

  const newBasins = basins.filter((b) => !existingCodes.has(b.code));
  if (newBasins.length > 0) {
    console.log(`  Creating ${newBasins.length} new basin/regions...\n`);

    const items = newBasins.map((b) => ({
      Title: b.name,
      tss_basinCode: b.code,
      tss_description: b.description,
      tss_isActive: true,
    }));

    await batchCreateItems(client, siteId, BASIN_LIST, items);

    // Refresh existing basins to get IDs for newly created ones
    const refreshed = await getAllListItems(client, siteId, BASIN_LIST);
    for (const item of refreshed) {
      const fields = item.fields as Record<string, unknown> | undefined;
      if (fields?.tss_basinCode) {
        existingCodes.set(fields.tss_basinCode as string, Number(item.id));
      }
    }
  } else {
    console.log('  ✅ All basin/regions already exist');
  }

  // ─── Step 2: Build country lookup ────────────────────────────────────────

  const countries = await getAllListItems(client, siteId, COUNTRY_LIST);
  const countryCodeToId = new Map<string, number>();
  for (const item of countries) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_countryCode) {
      countryCodeToId.set(fields.tss_countryCode as string, Number(item.id));
    }
  }

  // ─── Step 3: Seed junction records ───────────────────────────────────────

  const existingJunctions = await getAllListItems(client, siteId, JUNCTION_LIST);
  const junctionSet = new Set<string>();
  for (const item of existingJunctions) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields) {
      const basinId = fields.tss_basinRegionIdLookupId;
      const countryId = fields.tss_countryIdLookupId;
      if (basinId && countryId) {
        junctionSet.add(`${basinId}-${countryId}`);
      }
    }
  }
  console.log(`  Found ${junctionSet.size} existing basin-country junctions`);

  const newJunctions: Record<string, unknown>[] = [];
  for (const b of basins) {
    const basinId = existingCodes.get(b.code);
    if (!basinId) continue;

    for (const cc of b.countryCodes) {
      const countryId = countryCodeToId.get(cc);
      if (!countryId) {
        console.warn(`  ⚠ Country code "${cc}" not found for basin "${b.name}" — skipping`);
        continue;
      }
      const key = `${basinId}-${countryId}`;
      if (!junctionSet.has(key)) {
        newJunctions.push({
          Title: `${b.code}-${cc}`,
          tss_basinRegionIdLookupId: basinId,
          tss_countryIdLookupId: countryId,
        });
      }
    }
  }

  if (newJunctions.length > 0) {
    console.log(`  Creating ${newJunctions.length} basin-country junctions...\n`);
    await batchCreateItems(client, siteId, JUNCTION_LIST, newJunctions);
  } else {
    console.log('  ✅ All basin-country junctions already exist');
  }

  console.log(`\n=====================================================`);
  console.log(`✅ Basin/Region seeding complete`);
}

main().catch((err) => {
  console.error('\n❌ Basin/Region seeding failed:', err);
  process.exit(1);
});
