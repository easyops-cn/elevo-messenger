import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const WORKSPACE_OAUTH_REDIRECT_URI = 'vip.elevo.messenger://workspace-oauth-callback';

export type OAuthServerConfig = {
  serverUrl: string;
  clientId: string;
};

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type WorkspaceOAuthResult = {
  accessToken: string;
  expiresIn: number;
  scope: string;
};

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function arrayToBase64Url(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = arrayToBase64Url(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = arrayToBase64Url(new Uint8Array(hash));

  return { codeVerifier, codeChallenge };
}

function buildAuthorizationUrl(
  config: OAuthServerConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: WORKSPACE_OAUTH_REDIRECT_URI,
    scope: 'shares:read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${config.serverUrl}/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(
  config: OAuthServerConfig,
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    redirect_uri: WORKSPACE_OAUTH_REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${config.serverUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: HTTP ${res.status}`);
  return res.json();
}

export async function performWorkspaceOAuth(
  config: OAuthServerConfig
): Promise<WorkspaceOAuthResult> {
  const state = generateState();
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const authUrl = buildAuthorizationUrl(config, state, codeChallenge);

  await invoke('open_oauth_window', { authUrl, title: 'Link with Elevo Workspace' });

  return new Promise<WorkspaceOAuthResult>((resolve, reject) => {
    const unlistenPromises: Promise<() => void>[] = [];

    const cleanup = async () => {
      const unlisteners = await Promise.all(unlistenPromises);
      unlisteners.forEach((fn) => fn());
    };

    unlistenPromises.push(
      listen<{ code?: string; state?: string; error?: string; errorDescription?: string }>(
        'oauth-callback',
        async (event) => {
          const { code, state: returnedState, error, errorDescription } = event.payload;

          if (error) {
            await cleanup();
            reject(new Error(errorDescription || error));
            return;
          }

          if (!code || !returnedState) {
            await cleanup();
            reject(new Error('Missing authorization code or state parameter.'));
            return;
          }

          if (returnedState !== state) {
            await cleanup();
            reject(new Error('State mismatch - possible CSRF attack.'));
            return;
          }

          try {
            const tokenResponse = await exchangeCodeForToken(config, code, codeVerifier);
            await cleanup();
            resolve({
              accessToken: tokenResponse.access_token,
              expiresIn: tokenResponse.expires_in,
              scope: tokenResponse.scope,
            });
          } catch (err) {
            await cleanup();
            reject(err);
          }
        }
      )
    );

    unlistenPromises.push(
      listen('oauth-window-closed', () => {
        cleanup();
        reject(new Error('OAuth window was closed before authentication completed.'));
      })
    );
  });
}
