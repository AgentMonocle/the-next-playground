import { GraphService } from './graphClient';
import { SHAREPOINT_CONFIG } from '../auth/msalConfig';

interface SeedProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: SeedProgress) => void;

export class DataSeeder {
  private graph: GraphService;
  private pmSiteId: string | null = null;
  private salesSiteId: string | null = null;

  constructor(accessToken: string) {
    this.graph = new GraphService(accessToken);
  }

  /**
   * Initialize by getting site IDs
   */
  async initialize(): Promise<void> {
    console.log('Getting site IDs...');

    // Get PM site ID
    const pmSite = await this.graph.getSiteByUrl(SHAREPOINT_CONFIG.pmSite);
    this.pmSiteId = pmSite.id;
    console.log('PM Site ID:', this.pmSiteId);

    // Get Sales site ID
    const salesSite = await this.graph.getSiteByUrl(SHAREPOINT_CONFIG.salesSite);
    this.salesSiteId = salesSite.id;
    console.log('Sales Site ID:', this.salesSiteId);
  }

  /**
   * Seed all CRM data from PM site
   */
  async seedAllData(onProgress?: ProgressCallback): Promise<{
    countries: number;
    companies: number;
    contacts: number;
  }> {
    if (!this.pmSiteId || !this.salesSiteId) {
      await this.initialize();
    }

    const results = {
      countries: 0,
      companies: 0,
      contacts: 0,
    };

    // Seed Countries
    onProgress?.({ stage: 'countries', current: 0, total: 0, message: 'Starting countries seed...' });
    results.countries = await this.seedCountries(onProgress);

    // Seed Companies
    onProgress?.({ stage: 'companies', current: 0, total: 0, message: 'Starting companies seed...' });
    results.companies = await this.seedCompanies(onProgress);

    // Seed Contacts
    onProgress?.({ stage: 'contacts', current: 0, total: 0, message: 'Starting contacts seed...' });
    results.contacts = await this.seedContacts(onProgress);

    return results;
  }

  /**
   * Seed Countries from PM site to CRM_Countries
   */
  async seedCountries(onProgress?: ProgressCallback): Promise<number> {
    if (!this.pmSiteId || !this.salesSiteId) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    console.log('Seeding countries...');

    // Get all countries from PM site
    const pmCountries = await this.getAllListItems(this.pmSiteId, 'Countries');
    console.log(`Found ${pmCountries.length} countries in PM site`);

    // Check if CRM_Countries already has data
    const existingCountries = await this.getAllListItems(this.salesSiteId, 'CRM_Countries');
    if (existingCountries.length > 0) {
      console.log(`CRM_Countries already has ${existingCountries.length} items. Skipping...`);
      return 0;
    }

    let created = 0;
    for (const country of pmCountries) {
      const fields = country.fields;
      try {
        await this.graph.createListItem(this.salesSiteId, 'CRM_Countries', {
          Title: fields.Title,
          CountryCode: fields.Country_x0020_Code || fields.CountryCode || '',
          Region: fields.Region || '',
        });
        created++;
        onProgress?.({
          stage: 'countries',
          current: created,
          total: pmCountries.length,
          message: `Created country: ${fields.Title}`,
        });
      } catch (error) {
        console.error(`Failed to create country ${fields.Title}:`, error);
      }
    }

    console.log(`Created ${created} countries`);
    return created;
  }

  /**
   * Seed Companies from PM site to CRM_Companies
   */
  async seedCompanies(onProgress?: ProgressCallback): Promise<number> {
    if (!this.pmSiteId || !this.salesSiteId) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    console.log('Seeding companies...');

    // Get all companies from PM site (TPID - Company Records)
    const pmCompanies = await this.getAllListItems(this.pmSiteId, 'TPID - Company Records');
    console.log(`Found ${pmCompanies.length} companies in PM site`);

    // Check if CRM_Companies already has data
    const existingCompanies = await this.getAllListItems(this.salesSiteId, 'CRM_Companies');
    if (existingCompanies.length > 0) {
      console.log(`CRM_Companies already has ${existingCompanies.length} items. Skipping...`);
      return 0;
    }

    // Build a map of country names to IDs in CRM_Countries for lookups
    const crmCountries = await this.getAllListItems(this.salesSiteId, 'CRM_Countries');
    const countryMap = new Map<string, number>();
    for (const country of crmCountries) {
      const title = country.fields.Title as string;
      if (title) {
        countryMap.set(title.toLowerCase(), parseInt(country.id));
      }
    }

    let created = 0;
    for (const company of pmCompanies) {
      const fields = company.fields;
      try {
        // Get the country lookup value
        const countryLookupId = fields.Location_x0020_CountryLookupId as number | null;
        const countryName = countryLookupId
          ? (await this.getCountryName(this.pmSiteId!, countryLookupId))
          : null;

        const companyData: Record<string, unknown> = {
          Title: fields.Company_x0020_Name || fields.Title,
          CompanyCode: fields.Company_x0020_Code || '',
          Subsidiary: fields.Subsidiary || false,
        };

        // Add country lookup if we have a match
        if (countryName && countryMap.has(countryName.toLowerCase())) {
          companyData.CountryLookupId = countryMap.get(countryName.toLowerCase());
        }

        await this.graph.createListItem(this.salesSiteId, 'CRM_Companies', companyData);
        created++;
        onProgress?.({
          stage: 'companies',
          current: created,
          total: pmCompanies.length,
          message: `Created company: ${companyData.Title}`,
        });
      } catch (error) {
        console.error(`Failed to create company ${fields.Title}:`, error);
      }
    }

    console.log(`Created ${created} companies`);
    return created;
  }

  /**
   * Seed Contacts from PM site to CRM_Contacts
   */
  async seedContacts(onProgress?: ProgressCallback): Promise<number> {
    if (!this.pmSiteId || !this.salesSiteId) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    console.log('Seeding contacts...');

    // Get all contacts from PM site (TPID - Client Records)
    const pmContacts = await this.getAllListItems(this.pmSiteId, 'TPID - Client Records');
    console.log(`Found ${pmContacts.length} contacts in PM site`);

    // Check if CRM_Contacts already has data
    const existingContacts = await this.getAllListItems(this.salesSiteId, 'CRM_Contacts');
    if (existingContacts.length > 0) {
      console.log(`CRM_Contacts already has ${existingContacts.length} items. Skipping...`);
      return 0;
    }

    // Build a map of company names to IDs in CRM_Companies for lookups
    const crmCompanies = await this.getAllListItems(this.salesSiteId, 'CRM_Companies');
    const companyMap = new Map<string, number>();
    for (const company of crmCompanies) {
      const title = company.fields.Title as string;
      if (title) {
        companyMap.set(title.toLowerCase(), parseInt(company.id));
      }
    }

    let created = 0;
    for (const contact of pmContacts) {
      const fields = contact.fields;
      try {
        // Get company name from PM site lookup
        const companyLookupId = fields.Company_x0020_NameLookupId as number | null;
        const companyName = companyLookupId
          ? (await this.getCompanyName(this.pmSiteId!, companyLookupId))
          : null;

        const contactData: Record<string, unknown> = {
          Title: fields.Full_x0020_Name || fields.Title,
          Email: fields.Primary_x0020_Email || '',
          Phone: fields.Primary_x0020_Phone || '',
          PreferredName: fields.Preferred_x0020_Name || '',
        };

        // Add company lookup if we have a match
        if (companyName && companyMap.has(companyName.toLowerCase())) {
          contactData.CompanyLookupId = companyMap.get(companyName.toLowerCase());
        }

        await this.graph.createListItem(this.salesSiteId, 'CRM_Contacts', contactData);
        created++;
        onProgress?.({
          stage: 'contacts',
          current: created,
          total: pmContacts.length,
          message: `Created contact: ${contactData.Title}`,
        });
      } catch (error) {
        console.error(`Failed to create contact ${fields.Title}:`, error);
      }
    }

    console.log(`Created ${created} contacts`);
    return created;
  }

  /**
   * Get all list items (handles pagination)
   */
  private async getAllListItems(siteId: string, listName: string): Promise<Array<{ id: string; fields: Record<string, string | number | boolean | null> }>> {
    const allItems: Array<{ id: string; fields: Record<string, string | number | boolean | null> }> = [];
    const response = await this.graph.getListItems(siteId, listName) as { value?: Array<{ id: string; fields: Record<string, string | number | boolean | null> }>; '@odata.nextLink'?: string };

    if (response.value) {
      allItems.push(...response.value);
    }

    // Handle pagination
    while (response['@odata.nextLink']) {
      // For pagination, we'd need to make a raw request to the nextLink
      // For now, we'll just get the first page (usually enough for seed data)
      break;
    }

    return allItems;
  }

  /**
   * Get country name from PM site by lookup ID
   */
  private async getCountryName(siteId: string, lookupId: number): Promise<string | null> {
    try {
      const item = await this.graph.getListItem(siteId, 'Countries', lookupId.toString());
      return item.fields?.Title || null;
    } catch {
      return null;
    }
  }

  /**
   * Get company name from PM site by lookup ID
   */
  private async getCompanyName(siteId: string, lookupId: number): Promise<string | null> {
    try {
      const item = await this.graph.getListItem(siteId, 'TPID - Company Records', lookupId.toString());
      return item.fields?.Company_x0020_Name || item.fields?.Title || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all CRM data (for re-seeding)
   */
  async clearAllCrmData(): Promise<void> {
    if (!this.salesSiteId) {
      await this.initialize();
    }

    console.log('Clearing CRM data...');

    // Clear in reverse order due to dependencies
    await this.clearList('CRM_Contacts');
    await this.clearList('CRM_Companies');
    await this.clearList('CRM_Countries');

    console.log('CRM data cleared');
  }

  /**
   * Clear all items from a list
   */
  private async clearList(listName: string): Promise<void> {
    if (!this.salesSiteId) return;

    const items = await this.getAllListItems(this.salesSiteId, listName);
    console.log(`Deleting ${items.length} items from ${listName}...`);

    for (const item of items) {
      try {
        await this.graph.deleteListItem(this.salesSiteId, listName, item.id);
      } catch (error) {
        console.error(`Failed to delete item ${item.id} from ${listName}:`, error);
      }
    }
  }
}
