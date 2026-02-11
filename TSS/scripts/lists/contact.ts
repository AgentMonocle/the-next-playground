import type { ListDefinition } from '../lib/graphAdmin.js';

export const contactList: ListDefinition = {
  displayName: 'TSS_Contact',
  description: 'Customer contacts and key personnel',
  columns: [
    {
      name: 'tss_preferredName',
      displayName: 'Preferred Name',
      type: 'text',
    },
    {
      name: 'tss_email',
      displayName: 'Email',
      type: 'text',
      indexed: true,
    },
    {
      name: 'tss_phone',
      displayName: 'Phone',
      type: 'text',
    },
    {
      name: 'tss_mobile',
      displayName: 'Mobile',
      type: 'text',
    },
    {
      name: 'tss_jobTitle',
      displayName: 'Job Title',
      type: 'text',
    },
    {
      name: 'tss_department',
      displayName: 'Department',
      type: 'choice',
      choices: [
        'Engineering',
        'Operations',
        'Procurement',
        'Management',
        'HSE',
        'Other',
      ],
    },
    {
      name: 'tss_companyId',
      displayName: 'Company',
      type: 'lookup',
      required: true,
      indexed: true,
      lookupListName: 'TSS_Company',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_isDecisionMaker',
      displayName: 'Is Decision Maker',
      type: 'boolean',
    },
    {
      name: 'tss_isInfluencer',
      displayName: 'Is Influencer',
      type: 'boolean',
    },
    {
      name: 'tss_isActive',
      displayName: 'Is Active',
      type: 'boolean',
      required: true,
    },
    {
      name: 'tss_notes',
      displayName: 'Notes',
      type: 'note',
    },
  ],
};
