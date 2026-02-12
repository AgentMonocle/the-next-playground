import type { ListDefinition } from '../lib/graphAdmin.js';

export const countryList: ListDefinition = {
  displayName: 'TSS_Country',
  description: 'ISO 3166-1 country reference data for TSS',
  columns: [
    {
      name: 'tss_countryCode',
      displayName: 'Country Code',
      type: 'text',
      required: true,
      indexed: true,
      maxLength: 2,
    },
    {
      name: 'tss_region',
      displayName: 'Region',
      type: 'choice',
      required: true,
      indexed: true,
      choices: [
        'North America',
        'South America',
        'Europe',
        'Middle East',
        'Asia',
        'Africa',
        'Oceania',
      ],
    },
  ],
};
