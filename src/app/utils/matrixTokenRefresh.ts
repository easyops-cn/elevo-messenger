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
