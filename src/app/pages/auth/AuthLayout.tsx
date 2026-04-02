import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Header, Scroll, Spinner, Text, color } from 'folds';
import {
  Outlet,
  generatePath,
  matchPath,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import classNames from 'classnames';
import { createClient } from 'matrix-js-sdk';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import {
  clientAllowedServer,
  clientDefaultServer,
  getOidcStaticClientId,
  useClientConfig,
} from '../../hooks/useClientConfig';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { LOGIN_PATH, OIDC_CALLBACK_PATH, REGISTER_PATH, RESET_PASSWORD_PATH } from '../paths';
import ElevoLogo from '../../../../public/res/apple/apple-touch-icon-144x144.png';
import { ServerPicker } from './ServerPicker';
import { AutoDiscoveryAction, autoDiscovery } from '../../cs-api';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AuthFlowsLoader } from '../../components/AuthFlowsLoader';
import { AuthFlowsProvider } from '../../hooks/useAuthFlows';
import { AuthServerProvider } from '../../hooks/useAuthServer';
import { tryDecodeURIComponent } from '../../utils/dom';
import { OidcIssuerProvider } from '../../hooks/useOidcIssuer';

const currentAuthPath = (pathname: string): string => {
  if (matchPath(LOGIN_PATH, pathname)) {
    return LOGIN_PATH;
  }
  if (matchPath(RESET_PASSWORD_PATH, pathname)) {
    return RESET_PASSWORD_PATH;
  }
  if (matchPath(REGISTER_PATH, pathname)) {
    return REGISTER_PATH;
  }
  return LOGIN_PATH;
};

function AuthLayoutLoading({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Spinner size="100" variant="Secondary" />
      <Text align="Center" size="T300">
        {message}
      </Text>
    </Box>
  );
}

function AuthLayoutError({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Text align="Center" style={{ color: color.Critical.Main }} size="T300">
        {message}
      </Text>
    </Box>
  );
}

/**
 * Fetches OIDC metadata from the homeserver via MatrixClient#getAuthMetadata()
 * (supports both /auth_metadata and the legacy /auth_issuer + well-known fallback)
 * and provides the issuer URL via OidcIssuerProvider.
 * Resolves to undefined when the server does not support delegated OIDC auth.
 */
function OidcMetadataLoader({
  baseUrl,
  server,
  children,
}: {
  baseUrl: string;
  server: string;
  children: ReactNode;
}) {
  const clientConfig = useClientConfig();
  const [issuer, setIssuer] = useState<string | undefined>(undefined);

  useEffect(() => {
    // OIDC login is only enabled when a static client_id is configured
    // for the current homeserver in config.json.
    const staticClientId = getOidcStaticClientId(clientConfig, server);
    if (!staticClientId) {
      setIssuer(undefined);
      return;
    }

    const client = createClient({ baseUrl });
    client
      .getAuthMetadata()
      .then((config) => setIssuer(config.issuer))
      .catch(() => setIssuer(undefined));
  }, [baseUrl, clientConfig, server]);

  return <OidcIssuerProvider value={issuer}>{children}</OidcIssuerProvider>;
}

export function AuthLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { server: urlEncodedServer } = useParams();

  const clientConfig = useClientConfig();

  const defaultServer = clientDefaultServer(clientConfig);
  let server: string = urlEncodedServer ? tryDecodeURIComponent(urlEncodedServer) : defaultServer;

  if (!clientAllowedServer(clientConfig, server)) {
    server = defaultServer;
  }

  const [discoveryState, discoverServer] = useAsyncCallback(
    useCallback(async (serverName: string) => {
      const response = await autoDiscovery(fetch, serverName);
      return {
        serverName,
        response,
      };
    }, [])
  );

  useEffect(() => {
    if (server) discoverServer(server);
  }, [discoverServer, server]);

  // if server is mismatches with path server, update path
  useEffect(() => {
    // For OIDC callback, no server param is present in the URL
    if (matchPath(OIDC_CALLBACK_PATH, location.pathname)) {
      return;
    }

    if (!urlEncodedServer || tryDecodeURIComponent(urlEncodedServer) !== server) {
      navigate(
        generatePath(currentAuthPath(location.pathname), {
          server: encodeURIComponent(server),
        }),
        { replace: true }
      );
    }
  }, [urlEncodedServer, navigate, location, server]);

  const selectServer = useCallback(
    (newServer: string) => {
      if (newServer === server) {
        if (discoveryState.status === AsyncStatus.Loading) return;
        discoverServer(server);
        return;
      }
      navigate(
        generatePath(currentAuthPath(location.pathname), { server: encodeURIComponent(newServer) })
      );
    },
    [navigate, location, discoveryState, server, discoverServer]
  );

  const [autoDiscoveryError, autoDiscoveryInfo] =
    discoveryState.status === AsyncStatus.Success ? discoveryState.data.response : [];

  return (
    <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
      <Box
        className={classNames(css.AuthLayout, PatternsCss.BackgroundDotPattern)}
        direction="Column"
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="400"
      >
        <Box direction="Column" className={css.AuthCard}>
          <Header className={css.AuthHeader} size="600" variant="Surface">
            <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
              <img className={css.AuthLogo} src={ElevoLogo} alt={t('auth.elevoLogo')} />
              <Text size="H3">{t('auth.elevo')}</Text>
            </Box>
          </Header>
          <Box className={css.AuthCardContent} direction="Column">
            <Box direction="Column" gap="100">
              <Text as="label" size="L400" priority="300">
                {t('auth.homeserver')}
              </Text>
              <ServerPicker
                server={server}
                serverList={clientConfig.homeserverList ?? []}
                allowCustomServer={clientConfig.allowCustomHomeservers}
                onServerChange={selectServer}
              />
            </Box>
            {discoveryState.status === AsyncStatus.Loading && (
              <AuthLayoutLoading message={t('auth.lookingForHomeserver')} />
            )}
            {discoveryState.status === AsyncStatus.Error && (
              <AuthLayoutError message={t('auth.failedFindHomeserver')} />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_PROMPT && (
              <AuthLayoutError
                message={t('auth.failedConnectUnusable', { host: autoDiscoveryError.host })}
              />
            )}
            {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_ERROR && (
              <AuthLayoutError message={t('auth.failedConnectInvalidUrl')} />
            )}
            {discoveryState.status === AsyncStatus.Success && autoDiscoveryInfo && (
              <AuthServerProvider value={discoveryState.data.serverName}>
                <AutoDiscoveryInfoProvider value={autoDiscoveryInfo}>
                  <SpecVersionsLoader
                    baseUrl={autoDiscoveryInfo['m.homeserver'].base_url}
                    fallback={() => (
                      <AuthLayoutLoading
                        message={t('auth.connectingTo', { url: autoDiscoveryInfo['m.homeserver'].base_url })}
                      />
                    )}
                    error={() => (
                      <AuthLayoutError message={t('auth.failedConnectUnavailable')} />
                    )}
                  >
                    {(specVersions) => (
                      <SpecVersionsProvider value={specVersions}>
                        <AuthFlowsLoader
                          fallback={() => (
                            <AuthLayoutLoading message={t('auth.loadingAuthFlow')} />
                          )}
                          error={() => (
                            <AuthLayoutError message={t('auth.failedAuthFlow')} />
                          )}
                        >
                          {(authFlows) => (
                            <AuthFlowsProvider value={authFlows}>
                              <OidcMetadataLoader
                                baseUrl={autoDiscoveryInfo['m.homeserver'].base_url}
                                server={server}
                              >
                                <Outlet />
                              </OidcMetadataLoader>
                            </AuthFlowsProvider>
                          )}
                        </AuthFlowsLoader>
                      </SpecVersionsProvider>
                    )}
                  </SpecVersionsLoader>
                </AutoDiscoveryInfoProvider>
              </AuthServerProvider>
            )}
          </Box>
        </Box>
        <AuthFooter />
      </Box>
    </Scroll>
  );
}
