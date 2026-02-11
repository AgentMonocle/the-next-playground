#!/usr/bin/env tsx
/**
 * Seed TSS_Contact list with customer contact data.
 *
 * Resolves company by tss_companyCode to set tss_companyIdLookupId.
 * Idempotent: skips contacts that already exist (matched by tss_email).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedContacts.ts
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

const CONTACT_LIST = 'TSS_Contact';
const COMPANY_LIST = 'TSS_Company';

interface ContactData {
  fullName: string;
  email: string;
  phone: string;
  mobile: string;
  jobTitle: string;
  department: string;
  companyCode: string;
  isDecisionMaker: boolean;
  isInfluencer: boolean;
}

async function main() {
  console.log('👤 Seeding TSS_Contact list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/contacts.json');
  const contacts: ContactData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${contacts.length} contacts from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // ─── Build company lookup map ──────────────────────────────────────────────
  console.log('\n  Building company lookup map...');
  const companyItems = await getAllListItems(client, siteId, COMPANY_LIST);
  const companyMap = new Map<string, number>(); // companyCode -> SharePoint item ID
  for (const item of companyItems) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_companyCode) {
      companyMap.set(fields.tss_companyCode as string, Number(item.id));
    }
  }
  console.log(`  Found ${companyMap.size} companies for lookup resolution`);

  // ─── Get existing contacts ─────────────────────────────────────────────────
  const existing = await getAllListItems(client, siteId, CONTACT_LIST);
  const existingEmails = new Set<string>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_email) {
      existingEmails.add((fields.tss_email as string).toLowerCase());
    }
  }
  console.log(`  Found ${existingEmails.size} existing contacts in SharePoint`);

  // ─── Filter and create new contacts ────────────────────────────────────────
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
  if (newContacts.length === 0) {
    console.log('\n  ✅ All contacts already exist — nothing to do');
    return;
  }

  console.log(`\n  Creating ${newContacts.length} new contacts...\n`);

  // Map to SharePoint fields
  const items: Record<string, unknown>[] = [];
  for (const contact of newContacts) {
    const fields: Record<string, unknown> = {
      Title: contact.fullName,
      tss_email: contact.email,
      tss_phone: contact.phone,
      tss_mobile: contact.mobile,
      tss_jobTitle: contact.jobTitle,
      tss_department: contact.department,
      tss_isDecisionMaker: contact.isDecisionMaker,
      tss_isInfluencer: contact.isInfluencer,
      tss_isActive: true,
    };

    // Resolve company lookup
    const companyId = companyMap.get(contact.companyCode);
    if (companyId) {
      fields.tss_companyIdLookupId = companyId;
    } else {
      console.warn(`  ⚠️  Company code "${contact.companyCode}" not found for ${contact.fullName}`);
    }

    items.push(fields);
  }

  // Batch create
  const created = await batchCreateItems(client, siteId, CONTACT_LIST, items);

  console.log(`\n================================`);
  console.log(`✅ Seeded ${created} of ${newContacts.length} contacts`);
}

main().catch((err) => {
  console.error('\n❌ Contact seeding failed:', err);
  process.exit(1);
});
