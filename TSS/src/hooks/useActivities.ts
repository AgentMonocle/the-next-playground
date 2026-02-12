import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import {
  getListItems,
  getListItem,
  createListItem,
  updateListItem,
  deleteListItem,
  buildFilter,
  setLookupField,
  type ListQueryOptions,
  type FilterCondition,
} from '@/lib/graph/lists';
import type { Activity, ActivityFormData } from '@/types';

const LIST_NAME = 'TSS_Activity';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: UseActivitiesOptions) => [...activityKeys.lists(), filters] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: number) => [...activityKeys.details(), id] as const,
  byCompany: (companyId: number) => [...activityKeys.all, 'byCompany', companyId] as const,
  byContact: (contactId: number) => [...activityKeys.all, 'byContact', contactId] as const,
  byOpportunity: (oppId: number) => [...activityKeys.all, 'byOpportunity', oppId] as const,
  recent: (limit: number) => [...activityKeys.all, 'recent', limit] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export interface UseActivitiesOptions {
  search?: string;
  activityType?: string;
  companyId?: number;
  contactId?: number;
  opportunityId?: number;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
  top?: number;
}

export function useActivities(options: UseActivitiesOptions = {}) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.list(options),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const conditions: FilterCondition[] = [];
      if (options.activityType) conditions.push({ field: 'tss_activityType', operator: 'eq', value: options.activityType });
      if (options.companyId) conditions.push({ field: 'tss_companyIdLookupId', operator: 'eq', value: options.companyId });
      if (options.contactId) conditions.push({ field: 'tss_contactIdLookupId', operator: 'eq', value: options.contactId });
      if (options.opportunityId) conditions.push({ field: 'tss_opportunityIdLookupId', operator: 'eq', value: options.opportunityId });
      if (options.dateFrom) conditions.push({ field: 'tss_activityDate', operator: 'ge', value: `'${options.dateFrom}'` });
      if (options.dateTo) conditions.push({ field: 'tss_activityDate', operator: 'le', value: `'${options.dateTo}'` });

      const queryOptions: ListQueryOptions = {
        filter: conditions.length > 0 ? buildFilter(conditions) : undefined,
        orderBy: 'fields/tss_activityDate desc',
        top: options.top ?? 200,
      };

      const result = await getListItems<Activity>(client, LIST_NAME, queryOptions);
      let items = result.items;

      // Client-side text search on Title
      if (options.search) {
        const term = options.search.toLowerCase();
        items = items.filter(
          (a) =>
            a.Title.toLowerCase().includes(term) ||
            (a.tss_description ?? '').toLowerCase().includes(term)
        );
      }

      // Client-side owner filter (exact match)
      if (options.owner) {
        const ownerLower = options.owner.toLowerCase();
        items = items.filter((a) => a.tss_owner.toLowerCase().includes(ownerLower));
      }

      return items;
    },
  });
}

export function useActivity(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.detail(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getListItem<Activity>(client, LIST_NAME, id!);
    },
    enabled: id !== undefined,
  });
}

export function useActivitiesByCompany(companyId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.byCompany(companyId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<Activity>(client, LIST_NAME, {
        filter: buildFilter([
          { field: 'tss_companyIdLookupId', operator: 'eq', value: companyId! },
        ]),
        orderBy: 'fields/tss_activityDate desc',
        top: 200,
      });
      return result.items;
    },
    enabled: companyId !== undefined,
  });
}

export function useActivitiesByContact(contactId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.byContact(contactId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<Activity>(client, LIST_NAME, {
        filter: buildFilter([
          { field: 'tss_contactIdLookupId', operator: 'eq', value: contactId! },
        ]),
        orderBy: 'fields/tss_activityDate desc',
        top: 200,
      });
      return result.items;
    },
    enabled: contactId !== undefined,
  });
}

export function useActivitiesByOpportunity(oppId: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.byOpportunity(oppId!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<Activity>(client, LIST_NAME, {
        filter: buildFilter([
          { field: 'tss_opportunityIdLookupId', operator: 'eq', value: oppId! },
        ]),
        orderBy: 'fields/tss_activityDate desc',
        top: 200,
      });
      return result.items;
    },
    enabled: oppId !== undefined,
  });
}

export function useRecentActivities(limit: number = 10) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: activityKeys.recent(limit),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const result = await getListItems<Activity>(client, LIST_NAME, {
        orderBy: 'fields/tss_activityDate desc',
        top: limit,
      });
      return result.items;
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateActivity() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = {
        Title: data.Title,
        tss_activityType: data.tss_activityType,
        tss_activityDate: data.tss_activityDate,
        tss_owner: data.tss_owner,
        tss_direction: data.tss_direction,
        tss_duration: data.tss_duration,
        tss_description: data.tss_description,
        tss_source: 'Manual',
        tss_isAutoCreated: false,
        ...setLookupField('tss_companyId', data.tss_companyId),
        ...setLookupField('tss_contactId', data.tss_contactId),
        ...setLookupField('tss_opportunityId', data.tss_opportunityId),
      };

      return createListItem<Activity>(client, LIST_NAME, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useUpdateActivity() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ActivityFormData> }) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = { ...data };

      // Handle lookup fields
      for (const lookupField of ['tss_companyId', 'tss_contactId', 'tss_opportunityId']) {
        if (lookupField in data) {
          delete fields[lookupField];
          Object.assign(fields, setLookupField(lookupField, data[lookupField as keyof typeof data] as number | undefined));
        }
      }

      await updateListItem(client, LIST_NAME, id, fields);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(id) });
    },
  });
}

export function useDeleteActivity() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const client = getGraphClient(instance);
      await deleteListItem(client, LIST_NAME, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}
