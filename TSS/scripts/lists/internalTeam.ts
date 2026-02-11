import type { ListDefinition } from '../lib/graphAdmin.js';

export const internalTeamList: ListDefinition = {
  displayName: 'TSS_InternalTeam',
  description: 'Tejas staff for team assignments on opportunities',
  columns: [
    {
      name: 'tss_email',
      displayName: 'Email',
      type: 'text',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_role',
      displayName: 'Role',
      type: 'choice',
      required: true,
      choices: [
        'Sales',
        'Engineering',
        'Operations',
        'Management',
        'Testing',
        'Finance',
      ],
    },
    {
      name: 'tss_isActive',
      displayName: 'Is Active',
      type: 'boolean',
      required: true,
    },
  ],
};
