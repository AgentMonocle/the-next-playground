import type { ListDefinition } from '../lib/graphAdmin.js';

export const companyBasinList: ListDefinition = {
  displayName: 'TSS_CompanyBasin',
  description: 'Junction list: Company ↔ BasinRegion (many-to-many)',
  columns: [
    {
      name: 'tss_companyId',
      displayName: 'Company',
      type: 'lookup',
      lookupListName: 'TSS_Company',
      lookupColumnName: 'Title',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_basinRegionId',
      displayName: 'Basin/Region',
      type: 'lookup',
      lookupListName: 'TSS_BasinRegion',
      lookupColumnName: 'Title',
      required: true,
      indexed: true,
    },
  ],
};
