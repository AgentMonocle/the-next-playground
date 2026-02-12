import type { ListDefinition } from '../lib/graphAdmin.js';

export const contactBasinList: ListDefinition = {
  displayName: 'TSS_ContactBasin',
  description: 'Junction list: Contact ↔ BasinRegion (many-to-many)',
  columns: [
    {
      name: 'tss_contactId',
      displayName: 'Contact',
      type: 'lookup',
      lookupListName: 'TSS_Contact',
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
