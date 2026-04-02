import React, { useCallback } from 'react';
import { Button, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { generateOidcAuthorizationUrl } from 'matrix-js-sdk/lib/oidc';
import { secureRandomString } from 'matrix-js-sdk/lib/randomstring';
import { createClient } from 'matrix-js-sdk';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { getOidcCallbackPath } from '../../pathUtils';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';

type OidcLoginProps = {
  clientId: string;
};

export function OidcLogin({ clientId }: OidcLoginProps) {
  const { t } = useTranslation();
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const redirectUri = usePathWithOrigin(getOidcCallbackPath());

  const [loginState, startOidcLogin] = useAsyncCallback(
    useCallback(async () => {
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

      window.location.href = authUrl;
    }, [clientId, redirectUri, baseUrl])
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
