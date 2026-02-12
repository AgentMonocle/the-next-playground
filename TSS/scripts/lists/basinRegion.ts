import type { ListDefinition } from '../lib/graphAdmin.js';

export const basinRegionList: ListDefinition = {
  displayName: 'TSS_BasinRegion',
  description: 'Basin/Region reference data for TSS — each basin maps to a country',
  columns: [
    {
      name: 'tss_basinCode',
      displayName: 'Basin Code',
      type: 'text',
      required: true,
      indexed: true,
      maxLength: 6,
    },
    {
      name: 'tss_countryId',
      displayName: 'Country',
      type: 'lookup',
      lookupListName: 'TSS_Country',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_description',
      displayName: 'Description',
      type: 'note',
    },
    {
      name: 'tss_isActive',
      displayName: 'Is Active',
      type: 'boolean',
      required: true,
    },
  ],
};
