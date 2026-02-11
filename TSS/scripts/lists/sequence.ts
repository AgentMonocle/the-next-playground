import type { ListDefinition } from '../lib/graphAdmin.js';

export const sequenceList: ListDefinition = {
  displayName: 'TSS_Sequence',
  description: 'ID generation counters for TSS entities',
  columns: [
    {
      name: 'tss_counter',
      displayName: 'Counter',
      type: 'number',
      required: true,
    },
  ],
};
