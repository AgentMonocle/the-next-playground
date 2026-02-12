import { useQuery } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import { getAllListItems } from '@/lib/graph/lists';
import type { Country, Product, InternalTeamMember } from '@/types';

// Reference data changes infrequently — long stale time
const REFERENCE_STALE_TIME = 60 * 60 * 1000; // 1 hour

// ─── Countries ──────────────────────────────────────────────────────────────

export function useCountries() {
  const { instance } = useMsal();

  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      const items = await getAllListItems<Country>(client, 'TSS_Country');
      return items.sort((a, b) => a.Title.localeCompare(b.Title));
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

// ─── Products ───────────────────────────────────────────────────────────────

export function useProducts(activeOnly = true) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: ['products', { activeOnly }],
    queryFn: async () => {
      const client = getGraphClient(instance);
      const items = await getAllListItems<Product>(client, 'TSS_Product');
      if (activeOnly) {
        return items.filter((p) => p.tss_isActive);
      }
      return items;
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

// ─── Internal Team ──────────────────────────────────────────────────────────

export function useInternalTeam(activeOnly = true) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: ['internalTeam', { activeOnly }],
    queryFn: async () => {
      const client = getGraphClient(instance);
      const items = await getAllListItems<InternalTeamMember>(client, 'TSS_InternalTeam');
      if (activeOnly) {
        return items.filter((m) => m.tss_isActive);
      }
      return items.sort((a, b) => a.Title.localeCompare(b.Title));
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}
