/**
 * CRM Data Seeding Script
 * Run with: node scripts/seed-data.mjs
 *
 * This script:
 * 1. Authenticates via device code flow
 * 2. Creates missing columns in CRM lists
 * 3. Seeds data from PM site to Sales CRM lists
 */

import { PublicClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

const AZURE_CONFIG = {
  clientId: 'b390a2d0-4b65-4944-9b30-90ad7d171a20',
  tenantId: 'b274090c-1d9c-4722-8c7e-554c3aafd2b2',
};

const graphScopes = [
  'User.Read',
  'Sites.ReadWrite.All',
];

const SHAREPOINT_CONFIG = {
  pmSite: 'tejasre.sharepoint.com:/sites/pm',
  salesSite: 'tejasre.sharepoint.com:/sites/sales',
};

async function main() {
  console.log('=== CRM Data Seeding Script ===\n');

  // Initialize MSAL
  const msalConfig = {
    auth: {
      clientId: AZURE_CONFIG.clientId,
      authority: `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}`,
    },
  };

  const msalClient = new PublicClientApplication(msalConfig);

  // Get token via device code flow
  console.log('Starting authentication...');
  const deviceCodeRequest = {
    scopes: graphScopes,
    deviceCodeCallback: (response) => {
      console.log('\n' + response.message);
      console.log('\nPlease open this URL in your browser:', response.verificationUri);
      console.log('And enter code:', response.userCode);
    },
  };

  let authResult;
  try {
    authResult = await msalClient.acquireTokenByDeviceCode(deviceCodeRequest);
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }

  if (!authResult || !authResult.accessToken) {
    console.error('No access token received');
    process.exit(1);
  }

  console.log('\nAuthenticated as:', authResult.account?.username);

  // Create Graph client
  const client = Client.init({
    authProvider: (done) => done(null, authResult.accessToken),
  });

  // Get site IDs
  console.log('\nGetting site IDs...');
  const pmSite = await client.api(`/sites/${SHAREPOINT_CONFIG.pmSite}`).get();
  const salesSite = await client.api(`/sites/${SHAREPOINT_CONFIG.salesSite}`).get();

  console.log('PM Site ID:', pmSite.id);
  console.log('Sales Site ID:', salesSite.id);

  // Create missing columns
  console.log('\n=== Creating Missing Columns ===');
  await createMissingColumns(client, salesSite.id);

  // Seed Countries
  console.log('\n=== Seeding Countries ===');
  await seedCountries(client, pmSite.id, salesSite.id);

  // Seed Companies
  console.log('\n=== Seeding Companies ===');
  await seedCompanies(client, pmSite.id, salesSite.id);

  // Seed Contacts
  console.log('\n=== Seeding Contacts ===');
  await seedContacts(client, pmSite.id, salesSite.id);

  console.log('\n=== Seeding Complete ===');
}

async function createMissingColumns(client, siteId) {
  // CRM_Contacts columns
  const contactColumns = [
    { name: 'Email', text: {} },
    { name: 'Phone', text: {} },
    { name: 'PreferredName', text: {} },
  ];

  // CRM_Companies columns
  const companyColumns = [
    { name: 'Subsidiary', boolean: {} },
  ];

  // Add columns to CRM_Contacts
  console.log('Adding columns to CRM_Contacts...');
  for (const col of contactColumns) {
    try {
      await client.api(`/sites/${siteId}/lists/CRM_Contacts/columns`).post(col);
      console.log(`  Created column: ${col.name}`);
    } catch (error) {
      if (error.code === 'nameAlreadyExists' || error.message?.includes('already exists')) {
        console.log(`  Column ${col.name} already exists`);
      } else {
        console.log(`  Failed to create ${col.name}: ${error.message}`);
      }
    }
  }

  // Add columns to CRM_Companies
  console.log('Adding columns to CRM_Companies...');
  for (const col of companyColumns) {
    try {
      await client.api(`/sites/${siteId}/lists/CRM_Companies/columns`).post(col);
      console.log(`  Created column: ${col.name}`);
    } catch (error) {
      if (error.code === 'nameAlreadyExists' || error.message?.includes('already exists')) {
        console.log(`  Column ${col.name} already exists`);
      } else {
        console.log(`  Failed to create ${col.name}: ${error.message}`);
      }
    }
  }
}

async function seedCountries(client, pmSiteId, salesSiteId) {
  // Get countries from PM site
  let pmCountries;
  try {
    pmCountries = await client.api(`/sites/${pmSiteId}/lists/Countries/items?$expand=fields&$top=500`).get();
  } catch (error) {
    console.error('Failed to get countries from PM site:', error.message);
    return;
  }
  console.log(`Found ${pmCountries.value.length} countries in PM site`);

  // Check existing
  let existing;
  try {
    existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Countries/items?$expand=fields`).get();
  } catch (error) {
    console.error('Failed to get existing countries:', error.message);
    return;
  }

  if (existing.value.length > 0) {
    console.log(`CRM_Countries already has ${existing.value.length} items. Skipping...`);
    return;
  }

  // Create countries
  let created = 0;
  for (const country of pmCountries.value) {
    const fields = country.fields;
    try {
      await client.api(`/sites/${salesSiteId}/lists/CRM_Countries/items`).post({
        fields: {
          Title: fields.Title,
          CountryCode: fields.Country_x0020_Code || '',
          Region: fields.Region || '',
        },
      });
      created++;
      if (created % 20 === 0) {
        console.log(`Created ${created}/${pmCountries.value.length} countries...`);
      }
    } catch (error) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} countries`);
}

async function seedCompanies(client, pmSiteId, salesSiteId) {
  // Get companies from PM site (TPID - Company Records)
  let pmCompanies;
  try {
    pmCompanies = await client.api(`/sites/${pmSiteId}/lists/TPID - Company Records/items?$expand=fields&$top=500`).get();
  } catch (error) {
    console.error('Failed to get companies from PM site:', error.message);
    return;
  }
  console.log(`Found ${pmCompanies.value.length} companies in PM site`);

  // Check existing
  let existing;
  try {
    existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Companies/items?$expand=fields`).get();
  } catch (error) {
    console.error('Failed to get existing companies:', error.message);
    return;
  }

  if (existing.value.length > 0) {
    console.log(`CRM_Companies already has ${existing.value.length} items. Skipping...`);
    return;
  }

  // Create companies
  let created = 0;
  for (const company of pmCompanies.value) {
    const fields = company.fields;
    try {
      await client.api(`/sites/${salesSiteId}/lists/CRM_Companies/items`).post({
        fields: {
          Title: fields.Company_x0020_Name || fields.Title,
          CompanyCode: fields.Company_x0020_Code || '',
          Subsidiary: fields.Subsidiary || false,
        },
      });
      created++;
      if (created % 20 === 0) {
        console.log(`Created ${created}/${pmCompanies.value.length} companies...`);
      }
    } catch (error) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} companies`);
}

async function seedContacts(client, pmSiteId, salesSiteId) {
  // Get contacts from PM site (TPID - Client Records)
  let pmContacts;
  try {
    pmContacts = await client.api(`/sites/${pmSiteId}/lists/TPID - Client Records/items?$expand=fields&$top=500`).get();
  } catch (error) {
    console.error('Failed to get contacts from PM site:', error.message);
    return;
  }
  console.log(`Found ${pmContacts.value.length} contacts in PM site`);

  // Check existing
  let existing;
  try {
    existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Contacts/items?$expand=fields`).get();
  } catch (error) {
    console.error('Failed to get existing contacts:', error.message);
    return;
  }

  if (existing.value.length > 0) {
    console.log(`CRM_Contacts already has ${existing.value.length} items. Skipping...`);
    return;
  }

  // Create contacts (only Title field since Email/Phone/PreferredName columns may not exist yet)
  let created = 0;
  for (const contact of pmContacts.value) {
    const fields = contact.fields;
    try {
      await client.api(`/sites/${salesSiteId}/lists/CRM_Contacts/items`).post({
        fields: {
          Title: fields.Full_x0020_Name || fields.Title,
        },
      });
      created++;
      if (created % 10 === 0) {
        console.log(`Created ${created}/${pmContacts.value.length} contacts...`);
      }
    } catch (error) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} contacts`);
}

main().catch(console.error);
