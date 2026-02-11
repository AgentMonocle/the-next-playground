import type { Client } from '@microsoft/microsoft-graph-client';

const SITE_URL = import.meta.env.VITE_SHAREPOINT_SITE_URL;

function parseSiteUrl(url: string): { hostname: string; sitePath: string } {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    sitePath: parsed.pathname,
  };
}

let cachedSiteId: string | null = null;

export async function getSiteId(client: Client): Promise<string> {
  if (cachedSiteId) return cachedSiteId;

  const { hostname, sitePath } = parseSiteUrl(SITE_URL);
  const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
  cachedSiteId = site.id;
  return site.id;
}
