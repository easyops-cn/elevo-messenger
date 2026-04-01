import { OidcClientConfig, registerOidcClient } from 'matrix-js-sdk/lib/oidc';

const OIDC_CLIENT_ID_KEY_PREFIX = 'elevo_oidc_client_';

const getStorageKey = (issuer: string): string =>
  `${OIDC_CLIENT_ID_KEY_PREFIX}${issuer}`;

/**
 * Retrieves a previously registered client ID from localStorage, or performs
 * dynamic client registration against the OIDC provider and caches the result.
 *
 * @param issuer  - The OIDC issuer URL (used as cache key)
 * @param oidcConfig - Validated OIDC metadata from discoverAndValidateOIDCIssuerWellKnown
 * @param redirectUri - The redirect URI to register
 * @returns Promise resolving to the client ID string
 */
export const getOrRegisterOidcClientId = async (
  issuer: string,
  oidcConfig: OidcClientConfig,
  redirectUri: string,
): Promise<string> => {
  const storageKey = getStorageKey(issuer);
  const cached = localStorage.getItem(storageKey);
  if (cached) return cached;

  const isNative = redirectUri.startsWith('vip.elevo.messenger://');

  const clientId = await registerOidcClient(oidcConfig, {
    clientName: 'Elevo Messenger',
    clientUri: isNative ? 'https://messenger.elevo.vip/' : `${window.location.origin}/`,
    applicationType: isNative ? 'native' : 'web',
    redirectUris: [redirectUri],
    contacts: [],
    tosUri: undefined as any,
    policyUri: undefined as any,
  });

  localStorage.setItem(storageKey, clientId);
  return clientId;
};
