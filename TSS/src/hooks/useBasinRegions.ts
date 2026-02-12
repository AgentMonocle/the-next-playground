import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import {
  getListItems,
  getListItem,
  getAllListItems,
  createListItem,
  updateListItem,
  softDeleteListItem,
  deleteListItem,
  buildFilter,
  setLookupField,
} from '@/lib/graph/lists';
import type {
  BasinRegion,
  BasinRegionFormData,
  CompanyBasin,
  ContactBasin,
  OpportunityBasin,
} from '@/types';

const LIST_NAME = 'TSS_BasinRegion';

// Reference data changes infrequently
const REFERENCE_STALE_TIME = 60 * 60 * 1000; // 1 hour

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const basinRegionKeys = {
  all: ['basinRegions'] as const,
  lists: () => [...basinRegionKeys.all, 'list'] as const,
  list: (filters: UseBasinRegionsOptions) => [...basinRegionKeys.lists(), filters] as const,
  details: () => [...basinRegionKeys.all, 'detail'] as const,
  detail: (id: number) => [...basinRegionKeys.details(), id] as const,
};

export const junctionKeys = {
  companyBasins: (companyId: number) => ['companyBasins', companyId] as const,
  contactBasins: (contactId: number) => ['contactBasins', contactId] as const,
  opportunityBasins: (oppId: number) => ['opportunityBasins', oppId] as const,
};

// ─── BasinRegion CRUD Hooks ─────────────────────────────────────────────────

export interface UseBasinRegionsOptions {
  search?: string;
  isActive?: boolean;
}

export function useBasinRegions(options: UseBasinRegionsOptions = {}) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: basinRegionKeys.list(options),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const items = await getAllListItems<BasinRegion>(client, LIST_NAME);

      let filtered = items;

      // Client-side boolean filter (SharePoint OData boolean filtering is unreliable)
      if (options.isActive !== undefined) {
        filtered = filtered.filter((b) => b.tss_isActive === options.isActive);
      }

      if (options.search) {
        const term = options.search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.Title.toLowerCase().includes(term) ||
            b.tss_basinCode.toLowerCase().includes(term)
        );
      }

      return filtered.sort((a, b) => a.Title.localeCompare(b.Title));
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useBasinRegion(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: basinRegionKeys.detail(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getListItem<BasinRegion>(client, LIST_NAME, id!);
    },
    enabled: id !== undefined,
  });
}

export function useCreateBasinRegion() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BasinRegionFormData) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = {
        Title: data.Title,
        tss_basinCode: data.tss_basinCode,
        tss_description: data.tss_description,
        tss_isActive: data.tss_isActive ?? true,
        ...setLookupField('tss_countryId', data.tss_countryId),
      };

      return createListItem<BasinRegion>(client, LIST_NAME, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: basinRegionKeys.all });
    },
  });
}

export function useUpdateBasinRegion() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BasinRegionFormData> }) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = { ...data };
      if ('tss_countryId' in data) {
        delete fields.tss_countryId;
        Object.assign(fields, setLookupField('tss_countryId', data.tss_countryId));
      }

      await updateListItem(client, LIST_NAME, id, fields);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: basinRegionKeys.all });
      queryClient.invalidateQueries({ queryKey: basinRegionKeys.detail(id) });
    },
  });
}

export function useDeleteBasinRegion() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const client = getGraphClient(instance);
      await softDeleteListItem(client, LIST_NAME, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: basinRegionKeys.all });
    },
  });
}

// ─── Junction Hooks: Company ↔ BasinRegion ──────────────────────────────────

export function useCompanyBasins(companyId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: junctionKeys.companyBasins(companyId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<CompanyBasin>(client, 'TSS_CompanyBasin', {
        filter: buildFilter([
          { field: 'tss_companyIdLookupId', operator: 'eq', value: companyId! },
        ]),
        top: 200,
      });
      return result.items;
    },
    enabled: companyId !== undefined,
  });
}

export function useAddCompanyBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, basinRegionId }: { companyId: number; basinRegionId: number }) => {
      const client = getGraphClient(instance);
      return createListItem<CompanyBasin>(client, 'TSS_CompanyBasin', {
        Title: `${companyId}-${basinRegionId}`,
        ...setLookupField('tss_companyId', companyId),
        ...setLookupField('tss_basinRegionId', basinRegionId),
      });
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.companyBasins(companyId) });
    },
  });
}

export function useRemoveCompanyBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ junctionId }: { junctionId: number; companyId: number }) => {
      const client = getGraphClient(instance);
      await deleteListItem(client, 'TSS_CompanyBasin', junctionId);
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.companyBasins(companyId) });
    },
  });
}

// ─── Junction Hooks: Contact ↔ BasinRegion ──────────────────────────────────

export function useContactBasins(contactId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: junctionKeys.contactBasins(contactId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<ContactBasin>(client, 'TSS_ContactBasin', {
        filter: buildFilter([
          { field: 'tss_contactIdLookupId', operator: 'eq', value: contactId! },
        ]),
        top: 200,
      });
      return result.items;
    },
    enabled: contactId !== undefined,
  });
}

export function useAddContactBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, basinRegionId }: { contactId: number; basinRegionId: number }) => {
      const client = getGraphClient(instance);
      return createListItem<ContactBasin>(client, 'TSS_ContactBasin', {
        Title: `${contactId}-${basinRegionId}`,
        ...setLookupField('tss_contactId', contactId),
        ...setLookupField('tss_basinRegionId', basinRegionId),
      });
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.contactBasins(contactId) });
    },
  });
}

export function useRemoveContactBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ junctionId }: { junctionId: number; contactId: number }) => {
      const client = getGraphClient(instance);
      await deleteListItem(client, 'TSS_ContactBasin', junctionId);
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.contactBasins(contactId) });
    },
  });
}

// ─── Junction Hooks: Opportunity ↔ BasinRegion ──────────────────────────────

export function useOpportunityBasins(oppId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: junctionKeys.opportunityBasins(oppId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<OpportunityBasin>(client, 'TSS_OpportunityBasin', {
        filter: buildFilter([
          { field: 'tss_opportunityIdLookupId', operator: 'eq', value: oppId! },
        ]),
        top: 200,
      });
      return result.items;
    },
    enabled: oppId !== undefined,
  });
}

export function useAddOpportunityBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, basinRegionId }: { opportunityId: number; basinRegionId: number }) => {
      const client = getGraphClient(instance);
      return createListItem<OpportunityBasin>(client, 'TSS_OpportunityBasin', {
        Title: `${opportunityId}-${basinRegionId}`,
        ...setLookupField('tss_opportunityId', opportunityId),
        ...setLookupField('tss_basinRegionId', basinRegionId),
      });
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.opportunityBasins(opportunityId) });
    },
  });
}

export function useRemoveOpportunityBasin() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ junctionId }: { junctionId: number; opportunityId: number }) => {
      const client = getGraphClient(instance);
      await deleteListItem(client, 'TSS_OpportunityBasin', junctionId);
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({ queryKey: junctionKeys.opportunityBasins(opportunityId) });
    },
  });
}
