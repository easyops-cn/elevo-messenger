import React, { useMemo } from 'react';
import { Box, Text, color } from 'folds';
import { Link, useSearchParams } from 'react-router-dom';
import { SSOAction } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { RegisterFlowStatus, useAuthFlows } from '../../../hooks/useAuthFlows';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { PasswordRegisterForm, SUPPORTED_REGISTER_STAGES } from '../register/PasswordRegisterForm';
import { OrDivider } from '../OrDivider';
import { SSOLogin } from '../SSOLogin';
import { SupportedUIAFlowsLoader } from '../../../components/SupportedUIAFlowsLoader';
import { getLoginPath } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { RegisterPathSearchParams } from '../../paths';
import { useClientConfig, getOidcStaticClientId } from '../../../hooks/useClientConfig';
import { useOidcIssuer } from '../../../hooks/useOidcIssuer';
import { OidcLogin } from '../oidc/OidcLogin';

const useRegisterSearchParams = (searchParams: URLSearchParams): RegisterPathSearchParams =>
  useMemo(
    () => ({
      username: searchParams.get('username') ?? undefined,
      email: searchParams.get('email') ?? undefined,
      token: searchParams.get('token') ?? undefined,
    }),
    [searchParams]
  );

export function Register() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const { loginFlows, registerFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const registerSearchParams = useRegisterSearchParams(searchParams);
  const { sso } = useParsedLoginFlows(loginFlows.flows);
  const clientConfig = useClientConfig();
  const oidcIssuer = useOidcIssuer();
  const oidcClientId = oidcIssuer ? getOidcStaticClientId(clientConfig, server) : undefined;
  const hasSsoOrOidc = !!sso || !!oidcClientId;

  // redirect to /login because only that path handle m.login.token
  const webSsoRedirectUrl = usePathWithOrigin(getLoginPath(server));
  const ssoRedirectUrl = webSsoRedirectUrl;

  let ssoLoginElement: React.ReactNode = null;
  if (oidcClientId) {
    ssoLoginElement = <OidcLogin clientId={oidcClientId} />;
  } else if (sso) {
    ssoLoginElement = (
      <SSOLogin
        providers={sso.identity_providers}
        redirectUrl={ssoRedirectUrl}
        action={SSOAction.REGISTER}
        saveScreenSpace={registerFlows.status === RegisterFlowStatus.FlowRequired}
      />
    );
  }

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        {t('auth.register')}
      </Text>
      {registerFlows.status === RegisterFlowStatus.RegistrationDisabled && !hasSsoOrOidc && (
        <Text style={{ color: color.Critical.Main }} size="T300">
          {t('auth.errors.registrationDisabled')}
        </Text>
      )}
      {registerFlows.status === RegisterFlowStatus.RateLimited && !hasSsoOrOidc && (
        <Text style={{ color: color.Critical.Main }} size="T300">
          {t('auth.errors.registrationRateLimited')}
        </Text>
      )}
      {registerFlows.status === RegisterFlowStatus.InvalidRequest && !hasSsoOrOidc && (
        <Text style={{ color: color.Critical.Main }} size="T300">
          {t('auth.errors.registrationInvalidRequest')}
        </Text>
      )}
      {registerFlows.status === RegisterFlowStatus.FlowRequired && (
        <>
          <SupportedUIAFlowsLoader
            flows={registerFlows.data.flows ?? []}
            supportedStages={SUPPORTED_REGISTER_STAGES}
          >
            {(supportedFlows) =>
              supportedFlows.length === 0 ? (
                <Text style={{ color: color.Critical.Main }} size="T300">
                  {t('auth.errors.registrationNotSupported')}
                </Text>
              ) : (
                <PasswordRegisterForm
                  authData={registerFlows.data}
                  uiaFlows={supportedFlows}
                  defaultUsername={registerSearchParams.username}
                  defaultEmail={registerSearchParams.email}
                  defaultRegisterToken={registerSearchParams.token}
                />
              )
            }
          </SupportedUIAFlowsLoader>
          <span data-spacing-node />
          {hasSsoOrOidc && <OrDivider />}
        </>
      )}
      {ssoLoginElement && (
        <>
          {ssoLoginElement}
          <span data-spacing-node />
        </>
      )}
      <Text align="Center">
        {t('auth.hasAccount')} <Link to={getLoginPath(server)}>{t('auth.login')}</Link>
      </Text>
    </Box>
  );
}
