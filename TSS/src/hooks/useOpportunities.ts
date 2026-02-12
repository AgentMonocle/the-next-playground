import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import {
  getListItems,
  getListItem,
  getAllListItems,
  createListItem,
  updateListItem,
  buildFilter,
  setLookupField,
  type ListQueryOptions,
  type FilterCondition,
} from '@/lib/graph/lists';
import type { Opportunity, OpportunityFormData, OpportunityStage } from '@/types';

const LIST_NAME = 'TSS_Opportunity';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const opportunityKeys = {
  all: ['opportunities'] as const,
  lists: () => [...opportunityKeys.all, 'list'] as const,
  list: (filters: UseOpportunitiesOptions) => [...opportunityKeys.lists(), filters] as const,
  details: () => [...opportunityKeys.all, 'detail'] as const,
  detail: (id: number) => [...opportunityKeys.details(), id] as const,
  pipeline: () => [...opportunityKeys.all, 'pipeline'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export interface UseOpportunitiesOptions {
  search?: string;
  stage?: string;
  companyId?: number;
  productLine?: string;
  basin?: string;
  owner?: string;
  top?: number;
}

export function useOpportunities(options: UseOpportunitiesOptions = {}) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: opportunityKeys.list(options),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const conditions: FilterCondition[] = [];
      if (options.stage) conditions.push({ field: 'tss_stage', operator: 'eq', value: options.stage });
      if (options.companyId) conditions.push({ field: 'tss_companyIdLookupId', operator: 'eq', value: options.companyId });
      if (options.productLine) conditions.push({ field: 'tss_productLine', operator: 'eq', value: options.productLine });
      if (options.basin) conditions.push({ field: 'tss_basin', operator: 'eq', value: options.basin });

      const queryOptions: ListQueryOptions = {
        filter: conditions.length > 0 ? buildFilter(conditions) : undefined,
        orderBy: 'fields/Modified desc',
        top: options.top ?? 200,
      };

      const result = await getListItems<Opportunity>(client, LIST_NAME, queryOptions);
      let items = result.items;

      if (options.search) {
        const term = options.search.toLowerCase();
        items = items.filter(
          (o) =>
            o.Title.toLowerCase().includes(term) ||
            o.tss_opportunityId.toLowerCase().includes(term)
        );
      }

      return items;
    },
  });
}

export function useOpportunity(id: number | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: opportunityKeys.detail(id!),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getListItem<Opportunity>(client, LIST_NAME, id!);
    },
    enabled: id !== undefined,
  });
}

/** Returns all opportunities grouped by stage for the pipeline view. */
export function useOpportunitiesByStage() {
  const { instance } = useMsal();

  return useQuery({
    queryKey: opportunityKeys.pipeline(),
    queryFn: async () => {
      const client = getGraphClient(instance);
      const allOpps = await getAllListItems<Opportunity>(client, LIST_NAME);

      const grouped: Record<OpportunityStage, Opportunity[]> = {
        Lead: [],
        Qualification: [],
        Quotation: [],
        Negotiation: [],
        Close: [],
        'After Action': [],
      };

      for (const opp of allOpps) {
        const stage = opp.tss_stage;
        if (stage in grouped) {
          grouped[stage].push(opp);
        }
      }

      return grouped;
    },
  });
}

/** Generate an opportunity ID via the Azure Function, then create the opportunity. */
export function useCreateOpportunity() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OpportunityFormData & { companyCode: string }) => {
      const client = getGraphClient(instance);

      // Step 1: Generate opportunity ID via Azure Function (with client-side fallback)
      let opportunityId: string;
      try {
        const idResponse = await fetch('/api/generate-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'OPP',
            companyCode: data.companyCode,
          }),
        });

        if (!idResponse.ok) {
          throw new Error(`HTTP ${idResponse.status}`);
        }

        const result = (await idResponse.json()) as { id: string };
        opportunityId = result.id;
      } catch {
        // Fallback: generate ID client-side (local dev or API unavailable)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const counter = String(Date.now() % 1000).padStart(3, '0');
        opportunityId = `OPP-${data.companyCode}-${year}-${month}-${counter}`;
      }

      // Step 2: Create the opportunity in SharePoint
      const fields: Record<string, unknown> = {
        Title: data.Title,
        tss_opportunityId: opportunityId,
        tss_stage: data.tss_stage ?? 'Lead',
        tss_closeStatus: data.tss_closeStatus,
        tss_closeReason: data.tss_closeReason,
        tss_probability: data.tss_probability,
        tss_revenue: data.tss_revenue,
        tss_bidDueDate: data.tss_bidDueDate,
        tss_deliveryDate: data.tss_deliveryDate,
        tss_closeDate: data.tss_closeDate,
        tss_productLine: data.tss_productLine,
        tss_basin: data.tss_basin,
        tss_isRelated: data.tss_isRelated,
        tss_pursuitDecision: data.tss_pursuitDecision,
        tss_pursuitRationale: data.tss_pursuitRationale,
        tss_poNumber: data.tss_poNumber,
        tss_isTaxExempt: data.tss_isTaxExempt,
        tss_notes: data.tss_notes,
        ...setLookupField('tss_companyId', data.tss_companyId),
        ...setLookupField('tss_primaryContactId', data.tss_primaryContactId),
        ...setLookupField('tss_relatedOpportunityId', data.tss_relatedOpportunityId),
      };

      return createListItem<Opportunity>(client, LIST_NAME, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useUpdateOpportunity() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<OpportunityFormData> }) => {
      const client = getGraphClient(instance);

      const fields: Record<string, unknown> = { ...data };

      // Handle lookup fields
      for (const lookupField of ['tss_companyId', 'tss_primaryContactId', 'tss_relatedOpportunityId']) {
        if (lookupField in data) {
          delete fields[lookupField];
          Object.assign(fields, setLookupField(lookupField, data[lookupField as keyof typeof data] as number | undefined));
        }
      }

      await updateListItem(client, LIST_NAME, id, fields);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.detail(id) });
    },
  });
}
