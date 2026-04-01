import React, { useCallback } from 'react';
import { Button, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { generateOidcAuthorizationUrl } from 'matrix-js-sdk/lib/oidc';
import { secureRandomString } from 'matrix-js-sdk/lib/randomstring';
import { createClient } from 'matrix-js-sdk';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { getOidcCallbackPath } from '../../pathUtils';
import { getOrRegisterOidcClientId } from '../../../utils/oidcClientRegistration';
import {
  canUseDeepLinkSSO,
  DEEP_LINK_SCHEME,
  OIDC_CALLBACK_HOST,
} from '../../../plugins/useTauriDeepLink';
import { openExternalUrlInSystemBrowser } from '../../../plugins/useTauriOpener';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';

type OidcLoginProps = {
  issuer: string;
};

export function OidcLogin({ issuer }: OidcLoginProps) {
  const { t } = useTranslation();
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const webCallbackPath = usePathWithOrigin(getOidcCallbackPath());
  const desktopCallbackUri = `${DEEP_LINK_SCHEME}://${OIDC_CALLBACK_HOST}`;

  const redirectUri = canUseDeepLinkSSO ? desktopCallbackUri : webCallbackPath;

  const [loginState, startOidcLogin] = useAsyncCallback(
    useCallback(async () => {
      const tempClient = createClient({ baseUrl });
      const oidcConfig = await tempClient.getAuthMetadata();
      const clientId = await getOrRegisterOidcClientId(issuer, oidcConfig, redirectUri);
      const nonce = secureRandomString(8);
      const authUrl = await generateOidcAuthorizationUrl({
        metadata: oidcConfig,
        clientId,
        redirectUri,
        homeserverUrl: baseUrl,
        nonce,
      });

      if (canUseDeepLinkSSO) {
        openExternalUrlInSystemBrowser(authUrl);
      } else {
        window.location.href = authUrl;
      }
    }, [issuer, redirectUri, baseUrl])
  );

  const isLoading = loginState.status === AsyncStatus.Loading;

  return (
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
  );
}
