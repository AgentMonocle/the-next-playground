#!/usr/bin/env tsx
/**
 * Seed TSS_Country list with ISO 3166-1 country reference data.
 *
 * Idempotent: skips countries that already exist (matched by tss_countryCode).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedCountries.ts
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

const LIST_NAME = 'TSS_Country';

interface CountryData {
  name: string;
  code: string;
  region: string;
}

async function main() {
  console.log('🌍 Seeding TSS_Country list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/countries.json');
  const countries: CountryData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${countries.length} countries from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Get existing items to avoid duplicates
  const existing = await getAllListItems(client, siteId, LIST_NAME);
  const existingCodes = new Set<string>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_countryCode) {
      existingCodes.add(fields.tss_countryCode as string);
    }
  }
  console.log(`  Found ${existingCodes.size} existing countries in SharePoint`);

  // Filter to only new countries
  const newCountries = countries.filter(c => !existingCodes.has(c.code));
  if (newCountries.length === 0) {
    console.log('\n  ✅ All countries already exist — nothing to do');
    return;
  }

  console.log(`  Creating ${newCountries.length} new countries...\n`);

  // Map to SharePoint fields
  const items = newCountries.map(c => ({
    Title: c.name,
    tss_countryCode: c.code,
    tss_region: c.region,
  }));

  // Batch create
  const created = await batchCreateItems(client, siteId, LIST_NAME, items);

  console.log(`\n================================`);
  console.log(`✅ Seeded ${created} of ${newCountries.length} countries`);
}

main().catch((err) => {
  console.error('\n❌ Country seeding failed:', err);
  process.exit(1);
});
