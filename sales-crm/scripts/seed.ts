/**
 * Standalone script to seed CRM data from PM site
 * Run with: npx ts-node scripts/seed.ts
 */

import { PublicClientApplication, AccountInfo } from '@azure/msal-node';
import { shell } from 'electron';

// We can't use electron shell in a standalone script, so we'll just log the URL
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

import { Client } from '@microsoft/microsoft-graph-client';

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
    deviceCodeCallback: (response: { message: string; userCode: string; verificationUri: string }) => {
      console.log('\n' + response.message);
      console.log('\nPlease open this URL in your browser:', response.verificationUri);
      console.log('And enter code:', response.userCode);
    },
  };

  const authResult = await msalClient.acquireTokenByDeviceCode(deviceCodeRequest);
  if (!authResult || !authResult.accessToken) {
    console.error('Authentication failed');
    process.exit(1);
  }

  console.log('\nAuthenticated as:', authResult.account?.username);

  // Create Graph client
  const graphClient = Client.init({
    authProvider: (done) => done(null, authResult.accessToken),
  });

  // Get site IDs
  console.log('\nGetting site IDs...');
  const pmSite = await graphClient.api(`/sites/${SHAREPOINT_CONFIG.pmSite}`).get();
  const salesSite = await graphClient.api(`/sites/${SHAREPOINT_CONFIG.salesSite}`).get();

  console.log('PM Site ID:', pmSite.id);
  console.log('Sales Site ID:', salesSite.id);

  // Seed Countries
  console.log('\n=== Seeding Countries ===');
  await seedCountries(graphClient, pmSite.id, salesSite.id);

  // Seed Companies
  console.log('\n=== Seeding Companies ===');
  await seedCompanies(graphClient, pmSite.id, salesSite.id);

  // Seed Contacts
  console.log('\n=== Seeding Contacts ===');
  await seedContacts(graphClient, pmSite.id, salesSite.id);

  console.log('\n=== Seeding Complete ===');
}

async function seedCountries(client: Client, pmSiteId: string, salesSiteId: string) {
  // Get countries from PM site
  const pmCountries = await client.api(`/sites/${pmSiteId}/lists/Countries/items`).expand('fields').get();
  console.log(`Found ${pmCountries.value.length} countries in PM site`);

  // Check existing
  const existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Countries/items`).expand('fields').get();
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
    } catch (error: any) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} countries`);
}

async function seedCompanies(client: Client, pmSiteId: string, salesSiteId: string) {
  // Get companies from PM site
  const pmCompanies = await client.api(`/sites/${pmSiteId}/lists/TPID - Company Records/items`).expand('fields').get();
  console.log(`Found ${pmCompanies.value.length} companies in PM site`);

  // Check existing
  const existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Companies/items`).expand('fields').get();
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
    } catch (error: any) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} companies`);
}

async function seedContacts(client: Client, pmSiteId: string, salesSiteId: string) {
  // Get contacts from PM site
  const pmContacts = await client.api(`/sites/${pmSiteId}/lists/TPID - Client Records/items`).expand('fields').get();
  console.log(`Found ${pmContacts.value.length} contacts in PM site`);

  // Check existing
  const existing = await client.api(`/sites/${salesSiteId}/lists/CRM_Contacts/items`).expand('fields').get();
  if (existing.value.length > 0) {
    console.log(`CRM_Contacts already has ${existing.value.length} items. Skipping...`);
    return;
  }

  // Create contacts
  let created = 0;
  for (const contact of pmContacts.value) {
    const fields = contact.fields;
    try {
      await client.api(`/sites/${salesSiteId}/lists/CRM_Contacts/items`).post({
        fields: {
          Title: fields.Full_x0020_Name || fields.Title,
          Email: fields.Primary_x0020_Email || '',
          Phone: fields.Primary_x0020_Phone || '',
          PreferredName: fields.Preferred_x0020_Name || '',
        },
      });
      created++;
      if (created % 10 === 0) {
        console.log(`Created ${created}/${pmContacts.value.length} contacts...`);
      }
    } catch (error: any) {
      console.error(`Failed to create ${fields.Title}:`, error.message);
    }
  }
  console.log(`Created ${created} contacts`);
}

main().catch(console.error);
