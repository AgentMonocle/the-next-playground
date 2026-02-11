import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { msalConfig } from '@/lib/auth/msalConfig';
import { router } from './routes';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

async function bootstrap() {
  // MSAL v5 requires explicit initialization
  await msalInstance.initialize();

  // Handle redirect promise (processes login response after redirect)
  const response = await msalInstance.handleRedirectPromise();
  if (response?.account) {
    msalInstance.setActiveAccount(response.account);
  }

  // If no active account set yet, try to pick one from cache
  if (!msalInstance.getActiveAccount()) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  }

  // Listen for future login events
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const account = (event.payload as { account: Parameters<typeof msalInstance.setActiveAccount>[0] }).account;
      msalInstance.setActiveAccount(account);
    }
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <FluentProvider theme={webLightTheme}>
            <RouterProvider router={router} />
          </FluentProvider>
        </QueryClientProvider>
      </MsalProvider>
    </React.StrictMode>
  );
}

bootstrap();
