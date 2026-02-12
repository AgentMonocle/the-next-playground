import type { ListDefinition } from '../lib/graphAdmin.js';

export const basinRegionCountryList: ListDefinition = {
  displayName: 'TSS_BasinRegionCountry',
  description: 'Junction list: BasinRegion ↔ Country (many-to-many)',
  columns: [
    {
      name: 'tss_basinRegionId',
      displayName: 'Basin/Region',
      type: 'lookup',
      lookupListName: 'TSS_BasinRegion',
      lookupColumnName: 'Title',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_countryId',
      displayName: 'Country',
      type: 'lookup',
      lookupListName: 'TSS_Country',
      lookupColumnName: 'Title',
      required: true,
      indexed: true,
    },
  ],
};
