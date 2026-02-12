#!/usr/bin/env tsx
/**
 * Seed TSS_Activity list with sample activity data.
 *
 * Resolves company lookups by tss_companyCode.
 * Idempotent: skips activities that already exist (matched by Title + tss_activityDate).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedActivities.ts
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  getAdminClient,
  getSiteId,
  getAllListItems,
  createListItem,
} from '../lib/graphAdmin.js';

const ACTIVITY_LIST = 'TSS_Activity';
const COMPANY_LIST = 'TSS_Company';

interface ActivityData {
  subject: string;
  type: string;
  date: string;
  companyCode: string | null;
  contactEmail: string | null;
  direction: string;
  duration: number | null;
  owner: string;
  description: string;
}

async function main() {
  console.log('📋 Seeding TSS_Activity list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/activities.json');
  const activities: ActivityData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${activities.length} activities from seed data.\n`);

  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Build company code → ID map
  console.log('Building company lookup map...');
  const companyItems = await getAllListItems(client, siteId, COMPANY_LIST);
  const companyCodeMap = new Map<string, number>();
  for (const item of companyItems) {
    const fields = item.fields as Record<string, unknown>;
    const code = fields.tss_companyCode as string;
    if (code) companyCodeMap.set(code, Number(item.id));
  }
  console.log(`  Found ${companyCodeMap.size} companies.\n`);

  // Check existing activities for dedup
  console.log('Checking existing activities...');
  const existingItems = await getAllListItems(client, siteId, ACTIVITY_LIST);
  const existingKeys = new Set<string>();
  for (const item of existingItems) {
    const fields = item.fields as Record<string, unknown>;
    const key = `${fields.Title}|${fields.tss_activityDate}`;
    existingKeys.add(key);
  }
  console.log(`  Found ${existingKeys.size} existing activities.\n`);

  // Create activities
  let created = 0;
  let skipped = 0;

  for (const activity of activities) {
    const dedupKey = `${activity.subject}|${activity.date}`;
    if (existingKeys.has(dedupKey)) {
      console.log(`  SKIP: "${activity.subject}" (already exists)`);
      skipped++;
      continue;
    }

    const fields: Record<string, unknown> = {
      Title: activity.subject,
      tss_activityType: activity.type,
      tss_activityDate: activity.date,
      tss_owner: activity.owner,
      tss_direction: activity.direction,
      tss_source: 'Manual',
      tss_isAutoCreated: false,
    };

    if (activity.duration != null) {
      fields.tss_duration = activity.duration;
    }

    if (activity.description) {
      fields.tss_description = activity.description;
    }

    // Resolve company lookup
    if (activity.companyCode) {
      const companyId = companyCodeMap.get(activity.companyCode);
      if (companyId) {
        fields.tss_companyIdLookupId = companyId;
      } else {
        console.log(`  WARN: Company code "${activity.companyCode}" not found, skipping lookup`);
      }
    }

    try {
      await createListItem(client, siteId, ACTIVITY_LIST, fields);
      console.log(`  CREATED: "${activity.subject}" (${activity.type})`);
      created++;
    } catch (err) {
      console.error(`  ERROR: "${activity.subject}":`, (err as Error).message);
    }
  }

  console.log('\n================================');
  console.log(`✅ Seeding complete! Created: ${created}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
