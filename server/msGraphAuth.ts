/**
 * server/msGraphAuth.ts
 *
 * Implements server-side application (app-only) authentication for Microsoft Graph
 * using the OAuth 2.0 client credentials grant.
 *
 * In-memory caching ensures that tokens are reused until nearing expiration,
 * preventing unnecessary token requests to Microsoft identity platform.
 */

export interface GraphAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  serviceAccount: string;
  displayName: string;
}

export function getGraphConfig(): GraphAuthConfig {
  return {
    tenantId: (process.env.MICROSOFT_GRAPH_TENANT_ID || '').trim(),
    clientId: (process.env.MICROSOFT_GRAPH_CLIENT_ID || '').trim(),
    clientSecret: (process.env.MICROSOFT_GRAPH_CLIENT_SECRET || '').trim(),
    serviceAccount: (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || '').trim(),
    displayName: (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || 'Outreach Flow').trim()
  };
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedToken: CachedToken | null = null;
let tokenFetchPromise: Promise<string> | null = null;

/**
 * Returns an application-level access token for Microsoft Graph.
 * Caches token in memory and automatically re-fetches when nearing expiration (5m buffer).
 */
export async function getAppAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  // Buffer of 5 minutes (300,000 ms) before expiry
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 300000) {
    return cachedToken.accessToken;
  }

  // Prevent duplicate concurrent requests while a fetch is already in flight
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const config = getGraphConfig();

      if (!config.tenantId) {
        throw new Error('MICROSOFT_GRAPH_TENANT_ID environment variable is missing.');
      }
      if (!config.clientId) {
        throw new Error('MICROSOFT_GRAPH_CLIENT_ID environment variable is missing.');
      }
      if (!config.clientSecret) {
        throw new Error('MICROSOFT_GRAPH_CLIENT_SECRET environment variable is missing.');
      }

      const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError: any;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { error_description: errorText };
        }
        const errorMsg =
          parsedError.error_description ||
          parsedError.error ||
          `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Microsoft Graph OAuth client credentials failed (${response.status}): ${errorMsg}`);
      }

      const data = await response.json();
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3599;
      const accessToken = data.access_token;

      if (!accessToken) {
        throw new Error('No access_token returned by Microsoft identity platform.');
      }

      cachedToken = {
        accessToken,
        expiresAt: Date.now() + expiresInSec * 1000
      };

      return accessToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Diagnostic helper to inspect authentication status
 */
export async function getAuthDiagnostics(): Promise<{
  configured: boolean;
  tenantId: string;
  clientId: string;
  hasClientSecret: boolean;
  serviceAccount: string;
  displayName: string;
  hasCachedToken: boolean;
  tokenExpiresInSec: number;
}> {
  const config = getGraphConfig();
  const now = Date.now();
  const configured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );
  const tokenExpiresInSec =
    cachedToken && cachedToken.expiresAt > now
      ? Math.round((cachedToken.expiresAt - now) / 1000)
      : 0;

  return {
    configured,
    tenantId: config.tenantId ? `${config.tenantId.substring(0, 8)}...` : '',
    clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : '',
    hasClientSecret: Boolean(config.clientSecret),
    serviceAccount: config.serviceAccount,
    displayName: config.displayName,
    hasCachedToken: Boolean(cachedToken && cachedToken.expiresAt > now),
    tokenExpiresInSec
  };
}

export function clearTokenCache(): void {
  cachedToken = null;
}
