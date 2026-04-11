import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Icon, Icons, Spinner, Text, color, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { generateOidcAuthorizationUrl, completeAuthorizationCodeGrant } from 'matrix-js-sdk/lib/oidc';
import { secureRandomString } from 'matrix-js-sdk/lib/randomstring';
import { createClient } from 'matrix-js-sdk';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { getHomePath, getOidcCallbackPath } from '../../pathUtils';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';
import { setOidcSession, OidcSessionData } from '../../../state/sessions';

const TAURI_OAUTH_REDIRECT_URI = 'vip.elevo.messenger://oauth-callback';

type OidcLoginProps = {
  clientId: string;
};

export function OidcLogin({ clientId }: OidcLoginProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const webCallbackUri = usePathWithOrigin(getOidcCallbackPath());
  const redirectUri = isDesktopTauri ? TAURI_OAUTH_REDIRECT_URI : webCallbackUri;

  const [oauthPending, setOauthPending] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const settledRef = useRef(false);

  const [loginState, startOidcLogin] = useAsyncCallback(
    useCallback(async () => {
      setCallbackError(null);
      const tempClient = createClient({ baseUrl });
      const oidcConfig = await tempClient.getAuthMetadata();
      const nonce = secureRandomString(8);
      const authUrl = await generateOidcAuthorizationUrl({
        metadata: oidcConfig,
        clientId,
        redirectUri,
        homeserverUrl: baseUrl,
        nonce,
      });

      if (isDesktopTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_oauth_window', { authUrl, label: 'oauth-matrix' });
        settledRef.current = false;
        setOauthPending(true);
      } else {
        window.location.href = authUrl;
      }
    }, [clientId, redirectUri, baseUrl])
  );

  // Listen for OAuth callback events from the Rust backend (Tauri only).
  useEffect(() => {
    if (!isDesktopTauri) return undefined;

    let cancelled = false;
    const unlistenPromises: Promise<() => void>[] = [];

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      if (cancelled) return;

      // Handle the OAuth callback with code/state or error.
      unlistenPromises.push(
        listen<{ code?: string; state?: string; error?: string; errorDescription?: string }>(
          'oauth-matrix--callback',
          async (event) => {
            if (settledRef.current) return;
            settledRef.current = true;

            const { code, state, error, errorDescription } = event.payload;

            if (error) {
              setCallbackError(errorDescription || error);
              setOauthPending(false);
              return;
            }

            if (!code || !state) {
              setCallbackError('Missing authorization code or state parameter.');
              setOauthPending(false);
              return;
            }

            try {
              const result = await completeAuthorizationCodeGrant(code, state);
              const { tokenResponse, homeserverUrl, oidcClientSettings, idTokenClaims } = result;

              const tempClient = createClient({
                baseUrl: homeserverUrl,
                accessToken: tokenResponse.access_token,
              });
              const { user_id: userId, device_id: deviceId } = await tempClient.whoami();

              if (!userId || !deviceId) {
                throw new Error('Failed to retrieve user identity from homeserver.');
              }

              const oidcData: OidcSessionData = {
                issuer: oidcClientSettings.issuer,
                clientId: oidcClientSettings.clientId,
                redirectUri: TAURI_OAUTH_REDIRECT_URI,
                deviceId,
                refreshToken: tokenResponse.refresh_token ?? '',
                idTokenClaims: idTokenClaims as Record<string, unknown>,
              };

              setOidcSession(tokenResponse.access_token, deviceId, userId, homeserverUrl, oidcData);
              navigate(getHomePath(), { replace: true });
            } catch (err) {
              setCallbackError(
                err instanceof Error ? err.message : 'An unexpected error occurred during login.'
              );
            } finally {
              setOauthPending(false);
            }
          }
        )
      );

      // Handle user manually closing the OAuth window.
      unlistenPromises.push(
        listen('oauth-matrix--window-closed', () => {
          if (settledRef.current) return;
          settledRef.current = true;
          setOauthPending(false);
        })
      );
    };

    setup();

    return () => {
      cancelled = true;
      unlistenPromises.forEach((p) => p.then((fn) => fn()));
    };
  }, [navigate]);

  const isLoading = loginState.status === AsyncStatus.Loading || oauthPending;

  return (
    <>
      {callbackError && (
        <Box
          style={{
            backgroundColor: color.Critical.Container,
            color: color.Critical.OnContainer,
            padding: config.space.S300,
            borderRadius: config.radii.R400,
          }}
          direction="Column"
          gap="300"
        >
          <Box justifyContent="Start" alignItems="Start" gap="300">
            <Icon size="300" filled src={Icons.Warning} />
            <Box direction="Column" gap="100">
              <Text size="L400">OIDC Login Failed</Text>
              <Text size="T300">
                <b>{callbackError}</b>
              </Text>
            </Box>
          </Box>
        </Box>
      )}
      <Button
        style={{ width: '100%' }}
        type="button"
        onClick={() => startOidcLogin()}
        size="500"
        variant="Primary"
        fill="Solid"
        disabled={isLoading}
        before={isLoading ? <Spinner size="200" variant="Secondary" /> : undefined}
      >
        <Text align="Center" size="B500" truncate>
          {isLoading ? t('auth.connectingToProvider') : t('auth.continueWithSSO')}
        </Text>
      </Button>
    </>
  );
}
