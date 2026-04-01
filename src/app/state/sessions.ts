// import { atom } from 'jotai';
// import {
//   atomWithLocalStorage,
//   getLocalStorageItem,
//   setLocalStorageItem,
// } from './utils/atomWithLocalStorage';

export type Session = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  expiresInMs?: number;
  refreshToken?: string;
  fallbackSdkStores?: boolean;
};

export type Sessions = Session[];
export type SessionStoreName = {
  sync: string;
  crypto: string;
};

/**
 * Migration code for old session
 */
// const FALLBACK_STORE_NAME: SessionStoreName = {
//   sync: 'web-sync-store',
//   crypto: 'crypto-store',
// } as const;

export function setFallbackSession(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  localStorage.setItem('elevo_access_token', accessToken);
  localStorage.setItem('elevo_device_id', deviceId);
  localStorage.setItem('elevo_user_id', userId);
  localStorage.setItem('elevo_hs_base_url', baseUrl);
}
export const removeFallbackSession = () => {
  localStorage.removeItem('elevo_hs_base_url');
  localStorage.removeItem('elevo_user_id');
  localStorage.removeItem('elevo_device_id');
  localStorage.removeItem('elevo_access_token');
};
export const getFallbackSession = (): Session | undefined => {
  const baseUrl = localStorage.getItem('elevo_hs_base_url');
  const userId = localStorage.getItem('elevo_user_id');
  const deviceId = localStorage.getItem('elevo_device_id');
  const accessToken = localStorage.getItem('elevo_access_token');

  if (baseUrl && userId && deviceId && accessToken) {
    const session: Session = {
      baseUrl,
      userId,
      deviceId,
      accessToken,
      fallbackSdkStores: true,
    };

    return session;
  }

  return undefined;
};
/**
 * End of migration code for old session
 */

// ── OIDC session data ────────────────────────────────────────────────────────

const OIDC_SESSION_KEY = 'elevo_oidc_session';

export type OidcSessionData = {
  issuer: string;
  clientId: string;
  redirectUri: string;
  deviceId: string;
  refreshToken: string;
  idTokenClaims: Record<string, unknown>;
};

export const setOidcSession = (
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string,
  oidcData: OidcSessionData
): void => {
  setFallbackSession(accessToken, deviceId, userId, baseUrl);
  localStorage.setItem(OIDC_SESSION_KEY, JSON.stringify(oidcData));
};

export const getOidcSession = (): OidcSessionData | null => {
  const raw = localStorage.getItem(OIDC_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OidcSessionData;
  } catch {
    return null;
  }
};

export const clearOidcSession = (): void => {
  localStorage.removeItem(OIDC_SESSION_KEY);
};

// export const getSessionStoreName = (session: Session): SessionStoreName => {
//   if (session.fallbackSdkStores) {
//     return FALLBACK_STORE_NAME;
//   }

//   return {
//     sync: `sync${session.userId}`,
//     crypto: `crypto${session.userId}`,
//   };
// };

// export const MATRIX_SESSIONS_KEY = 'matrixSessions';
// const baseSessionsAtom = atomWithLocalStorage<Sessions>(
//   MATRIX_SESSIONS_KEY,
//   (key) => {
//     const defaultSessions: Sessions = [];
//     const sessions = getLocalStorageItem(key, defaultSessions);

//     // Before multi account support session was stored
//     // as multiple item in local storage.
//     // So we need these migration code.
//     const fallbackSession = getFallbackSession();
//     if (fallbackSession) {
//       removeFallbackSession();
//       sessions.push(fallbackSession);
//       setLocalStorageItem(key, sessions);
//     }
//     return sessions;
//   },
//   (key, value) => {
//     setLocalStorageItem(key, value);
//   }
// );

// export type SessionsAction =
//   | {
//       type: 'PUT';
//       session: Session;
//     }
//   | {
//       type: 'DELETE';
//       session: Session;
//     };

// export const sessionsAtom = atom<Sessions, [SessionsAction], undefined>(
//   (get) => get(baseSessionsAtom),
//   (get, set, action) => {
//     if (action.type === 'PUT') {
//       const sessions = [...get(baseSessionsAtom)];
//       const sessionIndex = sessions.findIndex(
//         (session) => session.userId === action.session.userId
//       );
//       if (sessionIndex === -1) {
//         sessions.push(action.session);
//       } else {
//         sessions.splice(sessionIndex, 1, action.session);
//       }
//       set(baseSessionsAtom, sessions);
//       return;
//     }
//     if (action.type === 'DELETE') {
//       const sessions = get(baseSessionsAtom).filter(
//         (session) => session.userId !== action.session.userId
//       );
//       set(baseSessionsAtom, sessions);
//     }
//   }
// );
