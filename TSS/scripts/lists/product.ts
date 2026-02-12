import type { ListDefinition } from '../lib/graphAdmin.js';

export const productList: ListDefinition = {
  displayName: 'TSS_Product',
  description: 'Tejas product catalog',
  columns: [
    {
      name: 'tss_productCode',
      displayName: 'Product Code',
      type: 'text',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_productLine',
      displayName: 'Product Line',
      type: 'choice',
      required: true,
      indexed: true,
      choices: [
        'Well Intervention',
        'New Completions',
        'Green Energy',
        'Engineering Service',
        'Testing Service',
        'Training',
      ],
    },
    {
      name: 'tss_category',
      displayName: 'Category',
      type: 'choice',
      choices: [
        'Safety Valve',
        'Packer',
        'Anchor',
        'Lock',
        'Nipple',
        'Cementing Tool',
        'Frac Sleeve',
        'Service',
      ],
    },
    {
      name: 'tss_isActive',
      displayName: 'Is Active',
      type: 'boolean',
      required: true,
    },
    {
      name: 'tss_description',
      displayName: 'Description',
      type: 'note',
    },
    {
      name: 'tss_basePrice',
      displayName: 'Base Price',
      type: 'currency',
    },
    {
      name: 'tss_unit',
      displayName: 'Unit',
      type: 'choice',
      choices: ['Each', 'Set', 'Project', 'Day', 'Hour'],
    },
  ],
};
