import type { ListDefinition } from '../lib/graphAdmin.js';

export const activityList: ListDefinition = {
  displayName: 'TSS_Activity',
  description: 'Customer interactions and internal actions',
  columns: [
    // Title is built-in — used as Subject
    {
      name: 'tss_activityType',
      displayName: 'Activity Type',
      type: 'choice',
      required: true,
      indexed: true,
      choices: [
        'Email',
        'Call',
        'Meeting',
        'Site Visit',
        'Trade Show',
        'Training',
        'Internal Note',
        'Quote Sent',
        'PO Received',
        'Shipment',
      ],
    },
    {
      name: 'tss_activityDate',
      displayName: 'Activity Date',
      type: 'dateTime',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_companyId',
      displayName: 'Company',
      type: 'lookup',
      lookupListName: 'TSS_Company',
      lookupColumnName: 'Title',
      indexed: true,
    },
    {
      name: 'tss_contactId',
      displayName: 'Contact',
      type: 'lookup',
      lookupListName: 'TSS_Contact',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_opportunityId',
      displayName: 'Opportunity',
      type: 'lookup',
      lookupListName: 'TSS_Opportunity',
      lookupColumnName: 'Title',
      indexed: true,
    },
    {
      name: 'tss_owner',
      displayName: 'Owner',
      type: 'text',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_direction',
      displayName: 'Direction',
      type: 'choice',
      choices: ['Inbound', 'Outbound', 'Internal'],
    },
    {
      name: 'tss_duration',
      displayName: 'Duration (minutes)',
      type: 'number',
    },
    {
      name: 'tss_description',
      displayName: 'Description',
      type: 'note',
    },
    {
      name: 'tss_source',
      displayName: 'Source',
      type: 'choice',
      choices: ['Manual', 'Email Auto-Link', 'JotForm', 'Calendar Sync'],
    },
    {
      name: 'tss_isAutoCreated',
      displayName: 'Is Auto-Created',
      type: 'boolean',
    },
    {
      name: 'tss_emailMessageId',
      displayName: 'Email Message ID',
      type: 'text',
    },
  ],
};
