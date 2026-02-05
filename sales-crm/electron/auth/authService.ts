import {
  PublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-node';
import { msalConfig, graphScopes } from './msalConfig';
import { shell } from 'electron';

export class AuthService {
  private msalClient: PublicClientApplication;
  private account: AccountInfo | null = null;

  constructor() {
    this.msalClient = new PublicClientApplication(msalConfig);
  }

  /**
   * Interactive login - opens browser for user authentication
   */
  async login(): Promise<AccountInfo | null> {
    try {
      // Use device code flow for Electron (more reliable than redirect)
      const deviceCodeRequest = {
        scopes: graphScopes,
        deviceCodeCallback: (response: { message: string; userCode: string; verificationUri: string }) => {
          console.log('Device Code Response:', response.message);
          // Open the verification URL in the default browser
          shell.openExternal(response.verificationUri);
          // The user will see the code in their terminal/console
          // In production, you'd show this in a UI dialog
        },
      };

      const authResult = await this.msalClient.acquireTokenByDeviceCode(deviceCodeRequest);

      if (authResult && authResult.account) {
        this.account = authResult.account;
        console.log('Login successful:', this.account.username);
      }

      return this.account;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Try to acquire token silently (for returning users)
   */
  async silentLogin(): Promise<AccountInfo | null> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();

      if (accounts.length === 0) {
        console.log('No cached accounts found');
        return null;
      }

      // Try to acquire token silently for the first account
      const silentRequest = {
        scopes: graphScopes,
        account: accounts[0],
      };

      const authResult = await this.msalClient.acquireTokenSilent(silentRequest);

      if (authResult.account) {
        this.account = authResult.account;
        console.log('Silent login successful:', this.account.username);
      }

      return this.account;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        console.log('Silent login failed, interaction required');
        return null;
      }
      console.error('Silent login error:', error);
      return null;
    }
  }

  /**
   * Get access token for Graph API calls
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.account) {
      console.log('No account available for token acquisition');
      return null;
    }

    try {
      const silentRequest = {
        scopes: graphScopes,
        account: this.account,
      };

      const authResult = await this.msalClient.acquireTokenSilent(silentRequest);
      return authResult.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Token expired, need to re-authenticate
        console.log('Token expired, re-authentication required');
        await this.login();
        return this.getAccessToken();
      }
      console.error('Error acquiring access token:', error);
      return null;
    }
  }

  /**
   * Logout and clear cached tokens
   */
  async logout(): Promise<void> {
    if (this.account) {
      try {
        await this.msalClient.getTokenCache().removeAccount(this.account);
        this.account = null;
        console.log('Logout successful');
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    }
  }

  /**
   * Get current account info
   */
  getAccount(): AccountInfo | null {
    return this.account;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.account !== null;
  }
}
