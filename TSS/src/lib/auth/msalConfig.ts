import { type Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error: console.error(message); break;
          case LogLevel.Warning: console.warn(message); break;
          case LogLevel.Info: console.info(message); break;
          case LogLevel.Verbose: console.debug(message); break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite'],
};

export const graphScopes = {
  sharePoint: ['Sites.ReadWrite.All'],
  userProfile: ['User.Read'],
  mail: ['Mail.Read', 'Mail.Send'],
  calendar: ['Calendars.ReadWrite'],
};
