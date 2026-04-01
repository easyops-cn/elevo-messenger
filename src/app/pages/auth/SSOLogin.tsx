import { Avatar, AvatarImage, Box, Button, Text } from 'folds';
import { IIdentityProvider, SSOAction, createClient } from 'matrix-js-sdk';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { isDesktopTauri, openExternalUrlInSystemBrowser } from '../../plugins/useTauriOpener';
import { canUseDeepLinkSSO } from '../../plugins/useTauriDeepLink';

type SSOLoginProps = {
  providers?: IIdentityProvider[];
  redirectUrl: string;
  action?: SSOAction;
  saveScreenSpace?: boolean;
};
export function SSOLogin({ providers, redirectUrl, action, saveScreenSpace }: SSOLoginProps) {
  const { t } = useTranslation();
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const getSSOIdUrl = (ssoId?: string): string =>
    mx.getSsoLoginUrl(redirectUrl, 'sso', ssoId, action);

  const openSSOUrl = (ssoId?: string) => {
    const ssoUrl = getSSOIdUrl(ssoId);
    if (canUseDeepLinkSSO) {
      // Desktop (production or Linux/Windows dev): open in system browser;
      // the IdP will redirect back via the elevo:// deep link.
      openExternalUrlInSystemBrowser(ssoUrl);
    } else {
      // Web browser or macOS dev mode: open in the current page/webview.
      window.location.href = ssoUrl;
    }
  };

  const withoutIcon = providers
    ? providers.find(
        (provider) => !provider.icon || !mx.mxcUrlToHttp(provider.icon, 96, 96, 'crop', false)
      )
    : true;

  const renderAsIcons = withoutIcon ? false : saveScreenSpace && providers && providers.length > 2;

  const renderProvider = (provider: IIdentityProvider) => {
    const { id, name, icon } = provider;
    const iconUrl = (icon && mx.mxcUrlToHttp(icon, 96, 96, 'crop', false)) || undefined;
    const buttonTitle = t('auth.continueWith', { name });
    const iconAvatar = iconUrl ? (
      <AvatarImage src={iconUrl} alt={name} title={buttonTitle} />
    ) : null;

    if (renderAsIcons && iconUrl) {
      if (isDesktopTauri) {
        return (
          <Avatar
            style={{ cursor: 'pointer' }}
            key={id}
            as="button"
            type="button"
            onClick={() => openSSOUrl(id)}
            aria-label={buttonTitle}
            size="300"
            radii="300"
          >
            {iconAvatar}
          </Avatar>
        );
      }
      return (
        <Avatar
          style={{ cursor: 'pointer' }}
          key={id}
          as="a"
          href={getSSOIdUrl(id)}
          aria-label={buttonTitle}
          size="300"
          radii="300"
        >
          {iconAvatar}
        </Avatar>
      );
    }

    const beforeSlot = iconUrl && (
      <Avatar size="200" radii="300">
        <AvatarImage src={iconUrl} alt={name} />
      </Avatar>
    );

    if (isDesktopTauri) {
      return (
        <Button
          style={{ width: '100%' }}
          key={id}
          type="button"
          onClick={() => openSSOUrl(id)}
          size="500"
          variant="Secondary"
          fill="Soft"
          outlined
          before={beforeSlot || undefined}
        >
          <Text align="Center" size="B500" truncate>
            {buttonTitle}
          </Text>
        </Button>
      );
    }
    return (
      <Button
        style={{ width: '100%' }}
        key={id}
        as="a"
        href={getSSOIdUrl(id)}
        size="500"
        variant="Secondary"
        fill="Soft"
        outlined
        before={beforeSlot || undefined}
      >
        <Text align="Center" size="B500" truncate>
          {buttonTitle}
        </Text>
      </Button>
    );
  };

  const renderGenericSSO = () => {
    if (isDesktopTauri) {
      return (
        <Button
          style={{ width: '100%' }}
          type="button"
          onClick={() => openSSOUrl()}
          size="500"
          variant="Secondary"
          fill="Soft"
          outlined
        >
          <Text align="Center" size="B500" truncate>
            {t('auth.continueWithSSO')}
          </Text>
        </Button>
      );
    }
    return (
      <Button
        style={{ width: '100%' }}
        as="a"
        href={getSSOIdUrl()}
        size="500"
        variant="Secondary"
        fill="Soft"
        outlined
      >
        <Text align="Center" size="B500" truncate>
          {t('auth.continueWithSSO')}
        </Text>
      </Button>
    );
  };

  return (
    <Box justifyContent="Center" gap="600" wrap="Wrap">
      {providers ? providers.map(renderProvider) : renderGenericSSO()}
    </Box>
  );
}
