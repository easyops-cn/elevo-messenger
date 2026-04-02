import { createClient, MatrixClient, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';

import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { pushSessionToSW } from '../sw-session';
import { getOidcSession, clearOidcSession, OidcSessionData } from '../app/state/sessions';
import { ElevoOidcTokenRefresher } from '../app/oidc/ElevoOidcTokenRefresher';

type Session = {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
};

export const initClient = async (session: Session): Promise<MatrixClient> => {
  const indexedDBStore = new IndexedDBStore({
    indexedDB: global.indexedDB,
    localStorage: global.localStorage,
    dbName: 'web-sync-store',
  });

  const legacyCryptoStore = new IndexedDBCryptoStore(global.indexedDB, 'crypto-store');

  const oidcData = getOidcSession();
  const tokenRefresher = oidcData
    ? new ElevoOidcTokenRefresher(
        oidcData.issuer,
        oidcData.clientId,
        oidcData.redirectUri,
        oidcData.deviceId,
        oidcData.idTokenClaims as any,
      )
    : undefined;

  const mx = createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    store: indexedDBStore,
    cryptoStore: legacyCryptoStore,
    deviceId: session.deviceId,
    timelineSupport: true,
    cryptoCallbacks: cryptoCallbacks as any,
    verificationMethods: ['m.sas.v1'],
    refreshToken: oidcData?.refreshToken,
    tokenRefreshFunction: tokenRefresher
      ? tokenRefresher.doRefreshAccessToken.bind(tokenRefresher)
      : undefined,
  });

  await indexedDBStore.startup();
  await mx.initRustCrypto();

  mx.setMaxListeners(50);

  return mx;
};

export const startClient = async (mx: MatrixClient) => {
  await mx.startClient({
    lazyLoadMembers: true,
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

/**
 * Revoke the OIDC refresh token at the issuer's revocation endpoint.
 * This tells the MAS/OIDC provider to destroy the server-side session.
 */
const revokeOidcRefreshToken = async (
  oidcData: OidcSessionData,
  revocationEndpoint: string
): Promise<void> => {
  try {
    const params = new URLSearchParams();
    params.set('token', oidcData.refreshToken);
    params.set('token_type_hint', 'refresh_token');
    params.set('client_id', oidcData.clientId);

    await fetch(revocationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch {
    // Best-effort: do not block logout if revocation fails
  }
};

export const logoutClient = async (
  mx: MatrixClient,
  revocationEndpoint?: string
) => {
  pushSessionToSW();
  mx.stopClient();

  // Revoke OIDC refresh token before calling Matrix logout,
  // so the access token is still valid for the revocation request.
  const oidcData = getOidcSession();
  if (oidcData?.refreshToken && revocationEndpoint) {
    await revokeOidcRefreshToken(oidcData, revocationEndpoint);
  }

  try {
    await mx.logout();
  } catch {
    // ignore if failed to logout
  }
  await mx.clearStores();
  clearOidcSession();
  window.localStorage.clear();
  window.location.reload();
};

export const clearLoginData = async () => {
  const dbs = await window.indexedDB.databases();

  dbs.forEach((idbInfo) => {
    const { name } = idbInfo;
    if (name) {
      window.indexedDB.deleteDatabase(name);
    }
  });

  window.localStorage.clear();
  window.location.reload();
};
