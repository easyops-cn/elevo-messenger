import type { MatrixClient } from 'matrix-js-sdk';

/**
 * Refresh the main-window Matrix access token through matrix-js-sdk's OIDC
 * refresh flow. whoami() triggers the SDK refresh when the token is stale.
 */
export async function refreshMatrixToken(mx: MatrixClient): Promise<string> {
  await mx.whoami();
  const token = mx.getAccessToken();
  if (!token) {
    throw new Error('No access token after refresh');
  }
  return token;
}

/**
 * Refresh the Matrix token when possible, but return the currently cached token
 * if the refresh request itself fails. This is only for bridge-window handoff
 * paths where a still-valid current token is better than failing the open/reply.
 */
export async function refreshMatrixTokenOrCurrent(mx: MatrixClient): Promise<string> {
  try {
    return await refreshMatrixToken(mx);
  } catch (error) {
    const token = mx.getAccessToken();
    if (token) return token;
    throw error;
  }
}
