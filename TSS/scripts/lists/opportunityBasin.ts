import type { ListDefinition } from '../lib/graphAdmin.js';

export const opportunityBasinList: ListDefinition = {
  displayName: 'TSS_OpportunityBasin',
  description: 'Junction list: Opportunity ↔ BasinRegion (many-to-many)',
  columns: [
    {
      name: 'tss_opportunityId',
      displayName: 'Opportunity',
      type: 'lookup',
      lookupListName: 'TSS_Opportunity',
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
