import React, { useCallback, useEffect } from 'react';
import {
  Box,
  Icon,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { completeAuthorizationCodeGrant } from 'matrix-js-sdk/lib/oidc';
import { createClient } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { setOidcSession, OidcSessionData } from '../../../state/sessions';
import { getHomePath, getLoginPath, getOidcCallbackPath } from '../../pathUtils';
import {
  canUseDeepLinkSSO,
  DEEP_LINK_SCHEME,
  OIDC_CALLBACK_HOST,
} from '../../../plugins/useTauriDeepLink';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';

function OidcCallbackError({ message }: { message: string }) {
  return (
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
            <b>{message}</b>
          </Text>
        </Box>
      </Box>
      <Link to={getLoginPath()}>Return to login</Link>
    </Box>
  );
}

export function OidcCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const webCallbackUri = usePathWithOrigin(getOidcCallbackPath());
  const redirectUri = canUseDeepLinkSSO
    ? `${DEEP_LINK_SCHEME}://${OIDC_CALLBACK_HOST}`
    : webCallbackUri;

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const [callbackState, runCallback] = useAsyncCallback(
    useCallback(
      async (authCode: string, authState: string) => {
        const result = await completeAuthorizationCodeGrant(authCode, authState);
        const { tokenResponse, homeserverUrl, oidcClientSettings, idTokenClaims } = result;

        // Retrieve user identity using the new access token
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
          redirectUri,
          deviceId,
          refreshToken: tokenResponse.refresh_token ?? '',
          idTokenClaims: idTokenClaims as Record<string, unknown>,
        };

        setOidcSession(tokenResponse.access_token, deviceId, userId, homeserverUrl, oidcData);

        return getHomePath();
      },
      [redirectUri]
    )
  );

  useEffect(() => {
    if (code && state) {
      runCallback(code, state);
    }
  }, [code, state, runCallback]);

  useEffect(() => {
    if (callbackState.status === AsyncStatus.Success) {
      navigate(callbackState.data, { replace: true });
    }
  }, [callbackState, navigate]);

  if (!code || !state) {
    return <OidcCallbackError message="Missing authorization code or state parameter." />;
  }

  return (
    <>
      {callbackState.status === AsyncStatus.Error && (
        <OidcCallbackError
          message={
            callbackState.error instanceof Error
              ? callbackState.error.message
              : 'An unexpected error occurred during login.'
          }
        />
      )}
      <Overlay
        open={callbackState.status !== AsyncStatus.Error}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <Spinner size="600" variant="Secondary" />
        </OverlayCenter>
      </Overlay>
    </>
  );
}
