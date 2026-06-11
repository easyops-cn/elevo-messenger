// Transparent Matrix access-token refresh for the bridge-explorer window.
//
// The explorer receives its initial Matrix access token at window-open time.
// That token can expire while the window stays open. The main window owns the
// Matrix client (which auto-refreshes via OIDC), so on a 401 we ask it for a
// currently-valid token over the SDK bridge and retry.

import { onSdkMessage, sendSdkMessage } from './sdkBridge';

const REQUEST_CHANNEL = 'bridge_token_refresh_request';
const RESPONSE_CHANNEL = 'bridge_token_refresh_response';
const REFRESH_TIMEOUT_MS = 15000;

type RefreshResponse = { requestId: string; token?: string; error?: string };

let currentToken = '';
let nextRequestId = 0;
let inFlight: Promise<string> | null = null;
let listening = false;
const pending = new Map<string, { resolve: (token: string) => void; reject: (e: Error) => void }>();

function ensureListening(): void {
  if (listening) return;
  listening = true;
  onSdkMessage(RESPONSE_CHANNEL, (data) => {
    const res = data as RefreshResponse;
    const waiter = pending.get(res.requestId);
    if (!waiter) return;
    pending.delete(res.requestId);
    if (res.token) {
      waiter.resolve(res.token);
    } else {
      waiter.reject(new Error(res.error || 'Token refresh failed'));
    }
  });
}

/** Seed the token cache with the value injected at window-open time. */
export function initToken(token: string): void {
  currentToken = token;
}

/** The currently cached access token. */
export function getToken(): string {
  return currentToken;
}

/**
 * Ask the main window for a fresh access token. Concurrent callers share a
 * single in-flight request. On success the cached token is updated.
 */
export function refreshToken(): Promise<string> {
  if (inFlight) return inFlight;
  ensureListening();

  const requestId = `${Date.now()}-${nextRequestId}`;
  nextRequestId += 1;
  inFlight = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Token refresh timed out'));
    }, REFRESH_TIMEOUT_MS);

    pending.set(requestId, {
      resolve: (token) => {
        clearTimeout(timer);
        resolve(token);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });

    sendSdkMessage(REQUEST_CHANNEL, { requestId }).catch((e) => {
      clearTimeout(timer);
      pending.delete(requestId);
      reject(e instanceof Error ? e : new Error('Failed to request token refresh'));
    });
  })
    .then((token) => {
      currentToken = token;
      return token;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
