import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import { getAllListItems } from '@/lib/graph/lists';
import type { Company, Contact, Country, BasinRegion, Opportunity } from '@/types';

const STALE_TIME = 60 * 60 * 1000; // 1 hour

/**
 * Shared lookup maps for resolving SharePoint lookup field display values.
 * Graph API only returns LookupId, not LookupValue, so we build maps from
 * pre-loaded reference data.
 */
export function useLookupMaps() {
  const { instance } = useMsal();

  const { data: countries } = useQuery({
    queryKey: ['lookup', 'countries'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getAllListItems<Country>(client, 'TSS_Country');
    },
    staleTime: STALE_TIME,
  });

  const { data: companies } = useQuery({
    queryKey: ['lookup', 'companies'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getAllListItems<Company>(client, 'TSS_Company');
    },
    staleTime: STALE_TIME,
  });

  const { data: contacts } = useQuery({
    queryKey: ['lookup', 'contacts'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getAllListItems<Contact>(client, 'TSS_Contact');
    },
    staleTime: STALE_TIME,
  });

  const countryMap = useMemo(() => {
    const map = new Map<number, string>();
    if (countries) for (const c of countries) map.set(c.id, c.Title);
    return map;
  }, [countries]);

  const companyMap = useMemo(() => {
    const map = new Map<number, string>();
    if (companies) for (const c of companies) map.set(c.id, c.Title);
    return map;
  }, [companies]);

  const contactMap = useMemo(() => {
    const map = new Map<number, string>();
    if (contacts) for (const c of contacts) map.set(c.id, c.Title);
    return map;
  }, [contacts]);

  const { data: opportunities } = useQuery({
    queryKey: ['lookup', 'opportunities'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getAllListItems<Opportunity>(client, 'TSS_Opportunity');
    },
    staleTime: STALE_TIME,
  });

  const opportunityMap = useMemo(() => {
    const map = new Map<number, string>();
    if (opportunities) for (const o of opportunities) map.set(o.id, o.Title);
    return map;
  }, [opportunities]);

  const { data: basinRegions } = useQuery({
    queryKey: ['lookup', 'basinRegions'],
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getAllListItems<BasinRegion>(client, 'TSS_BasinRegion');
    },
    staleTime: STALE_TIME,
  });

  const basinRegionMap = useMemo(() => {
    const map = new Map<number, string>();
    if (basinRegions) for (const b of basinRegions) map.set(b.id, b.Title);
    return map;
  }, [basinRegions]);

  return {
    countryMap,
    companyMap,
    contactMap,
    opportunityMap,
    basinRegionMap,
    resolve: (lookupId: number | undefined, map: Map<number, string>): string =>
      (lookupId && map.get(lookupId)) || '—',
  };
}
