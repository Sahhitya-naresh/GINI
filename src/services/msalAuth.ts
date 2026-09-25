import {
  PublicClientApplication,
  AccountInfo,
  Configuration,
  LogLevel
} from '@azure/msal-browser';

// Microsoft Graph Scopes required by Outreach Flow
export const MSAL_SCOPES = [
  'Mail.Send',
  'Mail.Read',
  'User.Read',
  'offline_access'
];

export interface MsalUser {
  uid: string;
  email: string;
  displayName: string;
  username: string;
}

// Storage keys for user configured Azure AD App credentials
export const MSAL_CLIENT_ID_KEY = 'outreach_flow_msal_client_id';
export const MSAL_TENANT_ID_KEY = 'outreach_flow_msal_tenant_id';

export function getMsalClientId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(MSAL_CLIENT_ID_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  const env = (import.meta as any).env;
  return (env?.VITE_MSAL_CLIENT_ID || '').trim();
}

export function setMsalClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    if (clientId.trim()) {
      localStorage.setItem(MSAL_CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(MSAL_CLIENT_ID_KEY);
    }
  }
}

export function getMsalTenantId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(MSAL_TENANT_ID_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  const env = (import.meta as any).env;
  return (env?.VITE_MSAL_TENANT_ID || 'common').trim();
}

export function setMsalTenantId(tenantId: string): void {
  if (typeof window !== 'undefined') {
    if (tenantId.trim()) {
      localStorage.setItem(MSAL_TENANT_ID_KEY, tenantId.trim());
    } else {
      localStorage.removeItem(MSAL_TENANT_ID_KEY);
    }
  }
}

let msalInstance: PublicClientApplication | null = null;
let msalInitPromise: Promise<PublicClientApplication> | null = null;
let cachedAccessToken: string | null = null;
let cachedUser: MsalUser | null = null;

function getMsalConfig(): Configuration {
  const clientId = getMsalClientId() || 'placeholder-client-id';
  const tenantId = getMsalTenantId() || 'common';
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  const redirectUri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return {
    auth: {
      clientId,
      authority,
      redirectUri
    },
    cache: {
      cacheLocation: 'localStorage'
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        loggerCallback: (level, message, containsPii) => {
          if (!containsPii && level <= LogLevel.Warning) {
            console.warn('[MSAL]', message);
          }
        }
      }
    }
  };
}

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance;
  }
  if (msalInitPromise) {
    return msalInitPromise;
  }

  msalInitPromise = (async () => {
    const config = getMsalConfig();
    const instance = new PublicClientApplication(config);
    await instance.initialize();
    msalInstance = instance;
    return instance;
  })();

  return msalInitPromise;
}

/**
 * Resets MSAL instance whenever Client ID or Tenant ID is updated in Settings
 */
export async function resetMsalInstance(): Promise<PublicClientApplication> {
  msalInstance = null;
  msalInitPromise = null;
  return getMsalInstance();
}

function accountToMsalUser(account: AccountInfo): MsalUser {
  return {
    uid: account.homeAccountId || account.localAccountId,
    email: account.username,
    displayName: account.name || account.username,
    username: account.username
  };
}

/**
 * Initializes authentication and listens / restores existing session
 */
export const initAuth = (
  onAuthSuccess?: (user: MsalUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  let isMounted = true;

  (async () => {
    try {
      const clientId = getMsalClientId();
      if (!clientId || clientId === 'placeholder-client-id') {
        if (isMounted && onAuthFailure) onAuthFailure();
        return;
      }

      const instance = await getMsalInstance();
      const accounts = instance.getAllAccounts();

      if (accounts.length > 0) {
        const activeAccount = accounts[0];
        instance.setActiveAccount(activeAccount);

        // Attempt silent token acquisition
        try {
          const silentRes = await instance.acquireTokenSilent({
            scopes: MSAL_SCOPES,
            account: activeAccount
          });

          cachedAccessToken = silentRes.accessToken;
          cachedUser = accountToMsalUser(activeAccount);

          if (isMounted && onAuthSuccess) {
            onAuthSuccess(cachedUser, cachedAccessToken);
          }
          return;
        } catch (silentErr) {
          console.warn('[MSAL] Silent token acquisition failed:', silentErr);
        }
      }

      if (isMounted && onAuthFailure) {
        onAuthFailure();
      }
    } catch (err) {
      console.warn('[MSAL] initAuth error:', err);
      if (isMounted && onAuthFailure) {
        onAuthFailure();
      }
    }
  })();

  return () => {
    isMounted = false;
  };
};

/**
 * Signs in using Microsoft popup
 */
export const microsoftSignIn = async (): Promise<{ user: MsalUser; accessToken: string } | null> => {
  const clientId = getMsalClientId();
  if (!clientId || clientId === 'placeholder-client-id') {
    throw new Error('Azure AD Application (Client) ID is required. Please provide it in Settings or set VITE_MSAL_CLIENT_ID.');
  }

  const instance = await getMsalInstance();

  try {
    const loginResponse = await instance.loginPopup({
      scopes: MSAL_SCOPES,
      prompt: 'select_account'
    });

    if (!loginResponse || !loginResponse.account) {
      throw new Error('No account returned from Microsoft sign-in.');
    }

    instance.setActiveAccount(loginResponse.account);

    // Get access token for Microsoft Graph
    let accessToken = loginResponse.accessToken;
    if (!accessToken) {
      const tokenRes = await instance.acquireTokenSilent({
        scopes: MSAL_SCOPES,
        account: loginResponse.account
      });
      accessToken = tokenRes.accessToken;
    }

    cachedAccessToken = accessToken;
    cachedUser = accountToMsalUser(loginResponse.account);

    return {
      user: cachedUser,
      accessToken
    };
  } catch (error: any) {
    console.error('[MSAL] Sign-in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;

  try {
    const instance = await getMsalInstance();
    const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (activeAccount) {
      const tokenRes = await instance.acquireTokenSilent({
        scopes: MSAL_SCOPES,
        account: activeAccount
      });
      cachedAccessToken = tokenRes.accessToken;
      return cachedAccessToken;
    }
  } catch (err) {
    console.warn('[MSAL] getAccessToken error:', err);
  }

  return null;
};

export const getCurrentUser = (): MsalUser | null => {
  return cachedUser;
};

export const logout = async (): Promise<void> => {
  try {
    const instance = await getMsalInstance();
    const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (activeAccount) {
      await instance.logoutPopup({
        account: activeAccount
      });
    }
  } catch (err) {
    console.warn('[MSAL] logout error:', err);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
  }
};

// Aliases matching MSAL naming conventions
export const initMsalAuth = initAuth;
export const msalSignIn = microsoftSignIn;
export const msalSignOut = logout;
export const getMsalAccessToken = getAccessToken;

