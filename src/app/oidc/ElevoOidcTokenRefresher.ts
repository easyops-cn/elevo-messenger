import { OidcTokenRefresher } from 'matrix-js-sdk/lib/oidc/tokenRefresher';
import { getOidcSession, OidcSessionData } from '../state/sessions';

/**
 * Elevo-specific OIDC token refresher.
 * Overrides persistTokens() to write refreshed tokens back to localStorage
 * so they survive page reloads.
 */
export class ElevoOidcTokenRefresher extends OidcTokenRefresher {
  // eslint-disable-next-line class-methods-use-this
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
    localStorage.setItem('elevo_access_token', accessToken);
    localStorage.setItem('elevo_oidc_session', JSON.stringify(updated));
  }
}
