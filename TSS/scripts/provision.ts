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
import type { Client } from '@microsoft/microsoft-graph-client';
import { getAdminClient, getSiteId, ensureList, type ListDefinition } from './lib/graphAdmin.js';
import { countryList } from './lists/country.js';
import { productList } from './lists/product.js';
import { companyList } from './lists/company.js';
import { contactList } from './lists/contact.js';
import { internalTeamList } from './lists/internalTeam.js';
import { opportunityList } from './lists/opportunity.js';
import { sequenceList } from './lists/sequence.js';
import { basinRegionList } from './lists/basinRegion.js';
import { companyBasinList } from './lists/companyBasin.js';
import { contactBasinList } from './lists/contactBasin.js';
import { opportunityBasinList } from './lists/opportunityBasin.js';
import { basinRegionCountryList } from './lists/basinRegionCountry.js';
import { activityList } from './lists/activity.js';

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
  // 4. Junction lists (lookups to core entities + reference data)
  const listsInOrder: ListDefinition[] = [
    countryList,            // No lookups
    productList,            // No lookups
    internalTeamList,       // No lookups
    sequenceList,           // No lookups
    basinRegionList,            // Lookups: Country (legacy column, unused)
    companyList,                // Lookups: Country, self-ref
    contactList,                // Lookups: Company
    opportunityList,            // Lookups: Company, Contact, self-ref
    activityList,               // Lookups: Company, Contact, Opportunity
    basinRegionCountryList,     // Lookups: BasinRegion, Country
    companyBasinList,           // Lookups: Company, BasinRegion
    contactBasinList,           // Lookups: Contact, BasinRegion
    opportunityBasinList,       // Lookups: Opportunity, BasinRegion
  ];

  for (const listDef of listsInOrder) {
    await ensureList(client, siteId, listDef, listIdLookup);
  }

  // Document Libraries
  await ensureDocumentLibrary(client, siteId, 'TSS_Backups', 'Backup snapshots for TSS list data');

  console.log('\n================================');
  console.log('✅ Provisioning complete!');
  console.log(`   ${listsInOrder.length} lists + 1 document library processed`);
}

/**
 * Ensure a document library exists. Idempotent.
 */
async function ensureDocumentLibrary(
  client: Client,
  siteId: string,
  displayName: string,
  description: string
): Promise<void> {
  console.log(`\n📁 Ensuring document library: ${displayName}`);
  try {
    await client.api(`/sites/${siteId}/lists/${displayName}`).get();
    console.log(`  Already exists`);
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 404) {
      await client.api(`/sites/${siteId}/lists`).post({
        displayName,
        description,
        list: { template: 'documentLibrary' },
      });
      console.log(`  ✅ Created`);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Provisioning failed:', err);
  process.exit(1);
});
