import React, { useMemo } from 'react';
import { Box, Text, color } from 'folds';
import { Link, useSearchParams } from 'react-router-dom';
import { SSOAction } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { PasswordLoginForm } from './PasswordLoginForm';
import { SSOLogin } from '../SSOLogin';
import { TokenLogin } from './TokenLogin';
import { OrDivider } from '../OrDivider';
import { getLoginPath, getRegisterPath, withSearchParam } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { LoginPathSearchParams } from '../../paths';
import { useClientConfig, getOidcStaticClientId } from '../../../hooks/useClientConfig';
import { useOidcIssuer } from '../../../hooks/useOidcIssuer';
import { OidcLogin } from '../oidc/OidcLogin';

const getLoginTokenSearchParam = () => {
  // when using hasRouter query params in existing route
  // gets ignored by react-router, so we need to read it ourself
  // we only need to read loginToken as it's the only param that
  // is provided by external entity. example: SSO login
  const parmas = new URLSearchParams(window.location.search);
  const loginToken = parmas.get('loginToken');
  return loginToken ?? undefined;
};

const useLoginSearchParams = (searchParams: URLSearchParams): LoginPathSearchParams =>
  useMemo(
    () => ({
      username: searchParams.get('username') ?? undefined,
      email: searchParams.get('email') ?? undefined,
      loginToken: searchParams.get('loginToken') ?? undefined,
    }),
    [searchParams]
  );

export function Login() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const { hashRouter, ...clientConfig } = useClientConfig();
  const { loginFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const loginSearchParams = useLoginSearchParams(searchParams);
  const webSsoRedirectUrl = usePathWithOrigin(getLoginPath(server));
  const ssoRedirectUrl = webSsoRedirectUrl;
  const loginTokenForHashRouter = getLoginTokenSearchParam();
  const absoluteLoginPath = usePathWithOrigin(getLoginPath(server));
  const oidcIssuer = useOidcIssuer();

  if (hashRouter?.enabled && loginTokenForHashRouter) {
    window.location.replace(
      withSearchParam(absoluteLoginPath, {
        loginToken: loginTokenForHashRouter,
      })
    );
  }

  const parsedFlows = useParsedLoginFlows(loginFlows.flows);

  // OIDC-first: when the homeserver delegates auth to an OIDC provider
  // and a static client_id is configured in config.json,
  // skip legacy SSO / password flows entirely.
  if (oidcIssuer) {
    const clientId = getOidcStaticClientId(clientConfig, server);
    if (clientId) {
      return (
        <Box direction="Column" gap="500">
          <Text size="H2" priority="400">
            {t('auth.login')}
          </Text>
          <OidcLogin clientId={clientId} />
          <span data-spacing-node />
          <Text align="Center">
            {t('auth.noAccount')}{' '}
            <Link to={getRegisterPath(server)}>{t('auth.register')}</Link>
          </Text>
        </Box>
      );
    }
  }

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        {t('auth.login')}
      </Text>
      {parsedFlows.token && loginSearchParams.loginToken && (
        <TokenLogin token={loginSearchParams.loginToken} />
      )}
      {!parsedFlows.sso && parsedFlows.password && (
        <>
          <PasswordLoginForm
            defaultUsername={loginSearchParams.username}
            defaultEmail={loginSearchParams.email}
          />
          <span data-spacing-node />
          {parsedFlows.sso && <OrDivider />}
        </>
      )}
      {parsedFlows.sso && (
        <>
          <SSOLogin
            providers={parsedFlows.sso.identity_providers}
            redirectUrl={ssoRedirectUrl}
            action={SSOAction.LOGIN}
            saveScreenSpace={parsedFlows.password !== undefined}
          />
          <span data-spacing-node />
        </>
      )}
      {!parsedFlows.password && !parsedFlows.sso && (
        <>
          <Text style={{ color: color.Critical.Main }}>
            {t('auth.errors.loginNotSupported', { server })}
          </Text>
          <span data-spacing-node />
        </>
      )}
      <Text align="Center">
        {t('auth.noAccount')} <Link to={getRegisterPath(server)}>{t('auth.register')}</Link>
      </Text>
    </Box>
  );
}
