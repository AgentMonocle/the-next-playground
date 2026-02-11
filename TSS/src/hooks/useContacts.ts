import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import {
  getListItems,
  getListItem,
  createListItem,
  updateListItem,
  softDeleteListItem,
  buildFilter,
  setLookupField,
  type ListQueryOptions,
  type FilterCondition,
} from '@/lib/graph/lists';
import type { Contact, ContactFormData } from '@/types';

const LIST_NAME = 'TSS_Contact';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters: UseContactsOptions) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: number) => [...contactKeys.details(), id] as const,
  byCompany: (companyId: number) => [...contactKeys.all, 'company', companyId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export interface UseContactsOptions {
  search?: string;
  companyId?: number;
  department?: string;
  isActive?: boolean;
  top?: number;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: contactKeys.list(options),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const conditions: FilterCondition[] = [];
      if (options.companyId) conditions.push({ field: 'tss_companyIdLookupId', operator: 'eq', value: options.companyId });
      if (options.department) conditions.push({ field: 'tss_department', operator: 'eq', value: options.department });
      if (options.isActive !== undefined) conditions.push({ field: 'tss_isActive', operator: 'eq', value: options.isActive });

      const queryOptions: ListQueryOptions = {
        filter: conditions.length > 0 ? buildFilter(conditions) : undefined,
        orderBy: 'fields/Title',
        top: options.top ?? 200,
      };

      const result = await getListItems<Contact>(client, LIST_NAME, queryOptions);
      let items = result.items;

      if (options.search) {
        const term = options.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.Title.toLowerCase().includes(term) ||
            (c.tss_email?.toLowerCase().includes(term) ?? false)
        );
      }

      return items;
    },
  });
}

export function useContact(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: contactKeys.detail(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getListItem<Contact>(client, LIST_NAME, id!);
    },
    enabled: id !== undefined,
  });
}

export function useContactsByCompany(companyId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: contactKeys.byCompany(companyId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<Contact>(client, LIST_NAME, {
        filter: buildFilter([
          { field: 'tss_companyIdLookupId', operator: 'eq', value: companyId! },
          { field: 'tss_isActive', operator: 'eq', value: true },
        ]),
        orderBy: 'fields/Title',
        top: 200,
      });
      return result.items;
    },
    enabled: companyId !== undefined,
  });
}

export function useCreateContact() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContactFormData) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = {
        Title: data.Title,
        tss_preferredName: data.tss_preferredName,
        tss_email: data.tss_email || undefined,
        tss_phone: data.tss_phone,
        tss_mobile: data.tss_mobile,
        tss_jobTitle: data.tss_jobTitle,
        tss_department: data.tss_department,
        tss_isDecisionMaker: data.tss_isDecisionMaker,
        tss_isInfluencer: data.tss_isInfluencer,
        tss_isActive: data.tss_isActive ?? true,
        tss_notes: data.tss_notes,
        ...setLookupField('tss_companyId', data.tss_companyId),
      };

      return createListItem<Contact>(client, LIST_NAME, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

export function useUpdateContact() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContactFormData> }) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = { ...data };
      if ('tss_companyId' in data) {
        delete fields.tss_companyId;
        Object.assign(fields, setLookupField('tss_companyId', data.tss_companyId));
      }

      await updateListItem(client, LIST_NAME, id, fields);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
    },
  });
}

export function useDeleteContact() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const client = getGraphClient(instance);
      await softDeleteListItem(client, LIST_NAME, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}
