#!/usr/bin/env tsx
/**
 * TSS SharePoint Provisioning Script
 *
 * Creates all SharePoint lists required for Stage 1 with correct schema.
 * Idempotent: safe to run multiple times — skips existing lists/columns.
 *
 * Usage:
 *   cd TSS/scripts
 *   npm install
 *   npx tsx provision.ts
 *
 * Prerequisites:
 *   - `az login` with an account that has Sites.ReadWrite.All or SharePoint Admin access
 */
import { getAdminClient, getSiteId, ensureList, type ListDefinition } from './lib/graphAdmin.js';
import { countryList } from './lists/country.js';
import { productList } from './lists/product.js';
import { companyList } from './lists/company.js';
import { contactList } from './lists/contact.js';
import { internalTeamList } from './lists/internalTeam.js';
import { opportunityList } from './lists/opportunity.js';
import { sequenceList } from './lists/sequence.js';

async function main() {
  console.log('🚀 TSS SharePoint Provisioning');
  console.log('================================\n');

  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Map to track list IDs for lookup column resolution
  const listIdLookup = new Map<string, string>();

  // Provisioning order matters for lookup columns:
  // 1. Reference data lists (no lookups to other TSS lists)
  // 2. Core entity lists (lookups to reference data)
  // 3. Complex entity lists (lookups to core entities)
  const listsInOrder: ListDefinition[] = [
    countryList,        // No lookups
    productList,        // No lookups
    internalTeamList,   // No lookups
    sequenceList,       // No lookups
    companyList,        // Lookups: Country, self-ref
    contactList,        // Lookups: Company
    opportunityList,    // Lookups: Company, Contact, self-ref
  ];

  for (const listDef of listsInOrder) {
    await ensureList(client, siteId, listDef, listIdLookup);
  }

  console.log('\n================================');
  console.log('✅ Provisioning complete!');
  console.log(`   ${listsInOrder.length} lists processed`);
}

main().catch((err) => {
  console.error('\n❌ Provisioning failed:', err);
  process.exit(1);
});
