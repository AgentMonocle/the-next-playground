import { Client } from '@microsoft/microsoft-graph-client';
import type { IPublicClientApplication } from '@azure/msal-browser';
import { graphScopes } from '@/lib/auth/msalConfig';

export function getGraphClient(msalInstance: IPublicClientApplication): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const account = msalInstance.getActiveAccount();
        if (!account) throw new Error('No active account');

        const response = await msalInstance.acquireTokenSilent({
          scopes: [
            ...graphScopes.sharePoint,
            ...graphScopes.userProfile,
            ...graphScopes.mail,
            ...graphScopes.calendar,
          ],
          account,
        });

        return response.accessToken;
      },
    },
  });
}
