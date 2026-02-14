import { http, HttpResponse } from 'msw';

const MOCK_SITE_ID = 'mock-tenant.sharepoint.com,site-guid,web-guid';

/** Default MSW handlers for Microsoft Graph API */
export const handlers = [
  // Site resolution: GET /sites/{hostname}:/{path}
  http.get('https://graph.microsoft.com/v1.0/sites/*', () => {
    return HttpResponse.json({ id: MOCK_SITE_ID });
  }),

  // List items: GET /sites/{siteId}/lists/{listName}/items
  http.get(
    `https://graph.microsoft.com/v1.0/sites/${MOCK_SITE_ID}/lists/:listName/items`,
    () => {
      return HttpResponse.json({ value: [] });
    },
  ),
];
