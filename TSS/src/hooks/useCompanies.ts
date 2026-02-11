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
  buildFilter,
  setLookupField,
  type ListQueryOptions,
  type FilterCondition,
} from '@/lib/graph/lists';
import type { Company, CompanyFormData } from '@/types';

const LIST_NAME = 'TSS_Company';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters: UseCompaniesOptions) => [...companyKeys.lists(), filters] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: number) => [...companyKeys.details(), id] as const,
  tree: (id: number) => [...companyKeys.all, 'tree', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export interface UseCompaniesOptions {
  search?: string;
  industry?: string;
  companyType?: string;
  basin?: string;
  isActive?: boolean;
  top?: number;
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: companyKeys.list(options),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const conditions: FilterCondition[] = [];
      if (options.industry) conditions.push({ field: 'tss_industry', operator: 'eq', value: options.industry });
      if (options.companyType) conditions.push({ field: 'tss_companyType', operator: 'eq', value: options.companyType });
      if (options.basin) conditions.push({ field: 'tss_basin', operator: 'eq', value: options.basin });
      if (options.isActive !== undefined) conditions.push({ field: 'tss_isActive', operator: 'eq', value: options.isActive });

      const queryOptions: ListQueryOptions = {
        filter: conditions.length > 0 ? buildFilter(conditions) : undefined,
        orderBy: 'fields/Title',
        top: options.top ?? 200,
      };

      const result = await getListItems<Company>(client, LIST_NAME, queryOptions);
      let items = result.items;

      // Client-side search (SharePoint OData contains is limited)
      if (options.search) {
        const term = options.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.Title.toLowerCase().includes(term) ||
            c.tss_companyCode.toLowerCase().includes(term)
        );
      }

      return items;
    },
  });
}

export function useCompany(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: companyKeys.detail(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getListItem<Company>(client, LIST_NAME, id!);
    },
    enabled: id !== undefined,
  });
}

export function useCompanyTree(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: companyKeys.tree(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const allCompanies = await getAllListItems<Company>(client, LIST_NAME);

      // Find the root company
      const root = allCompanies.find((c) => c.id === id);
      if (!root) return [];

      // Find all subsidiaries (children where parentCompanyId matches)
      const subsidiaries = allCompanies.filter(
        (c) => c.tss_parentCompanyId?.LookupId === id
      );

      return subsidiaries;
    },
    enabled: id !== undefined,
  });
}

export function useCreateCompany() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = {
        Title: data.Title,
        tss_companyCode: data.tss_companyCode,
        tss_industry: data.tss_industry,
        tss_isSubsidiary: data.tss_isSubsidiary,
        tss_website: data.tss_website || undefined,
        tss_phone: data.tss_phone,
        tss_address: data.tss_address,
        tss_companyType: data.tss_companyType,
        tss_basin: data.tss_basin,
        tss_notes: data.tss_notes,
        tss_isActive: data.tss_isActive ?? true,
        ...setLookupField('tss_countryId', data.tss_countryId),
        ...setLookupField('tss_parentCompanyId', data.tss_parentCompanyId),
      };

      return createListItem<Company>(client, LIST_NAME, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useUpdateCompany() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CompanyFormData> }) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = { ...data };

      // Handle lookup fields
      if ('tss_countryId' in data) {
        delete fields.tss_countryId;
        Object.assign(fields, setLookupField('tss_countryId', data.tss_countryId));
      }
      if ('tss_parentCompanyId' in data) {
        delete fields.tss_parentCompanyId;
        Object.assign(fields, setLookupField('tss_parentCompanyId', data.tss_parentCompanyId));
      }

      await updateListItem(client, LIST_NAME, id, fields);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
    },
  });
}

export function useDeleteCompany() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const client = getGraphClient(instance);
      await softDeleteListItem(client, LIST_NAME, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}
