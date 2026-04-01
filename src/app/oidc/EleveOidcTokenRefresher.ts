import { type IdTokenClaims } from 'oidc-client-ts';
import { OidcTokenRefresher } from 'matrix-js-sdk/lib/oidc/tokenRefresher';
import { getOidcSession, setOidcSession, OidcSessionData } from '../state/sessions';

/**
 * Elevo-specific OIDC token refresher.
 * Overrides persistTokens() to write refreshed tokens back to localStorage
 * so they survive page reloads.
 */
export class EleveOidcTokenRefresher extends OidcTokenRefresher {
  public constructor(
    issuer: string,
    clientId: string,
    redirectUri: string,
    deviceId: string,
    idTokenClaims: IdTokenClaims,
  ) {
    super(issuer, clientId, redirectUri, deviceId, idTokenClaims);
  }

  public override async persistTokens({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken?: string;
  }): Promise<void> {
    const existing = getOidcSession();
    if (!existing) return;

    const updated: OidcSessionData = {
      ...existing,
      refreshToken: refreshToken ?? existing.refreshToken,
    };

    // Update access token stored in the fallback session fields
    localStorage.setItem('cinny_access_token', accessToken);
    localStorage.setItem('elevo_oidc_session', JSON.stringify(updated));
  }
}
