import { create } from 'zustand';

interface UserAccount {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: UserAccount | null;
  error: string | null;

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  account: null,
  error: null,

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.auth.login();
      if (result.success && result.account) {
        set({
          isAuthenticated: true,
          account: result.account as UserAccount,
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          error: result.error || 'Login failed',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await window.electronAPI.auth.logout();
      set({
        isAuthenticated: false,
        account: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Try silent login first
      const result = await window.electronAPI.auth.silentLogin();
      if (result.success && result.account) {
        set({
          isAuthenticated: true,
          account: result.account as UserAccount,
          isLoading: false,
        });
      } else {
        // No cached session
        set({
          isAuthenticated: false,
          account: null,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        account: null,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
