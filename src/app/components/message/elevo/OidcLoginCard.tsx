import React, { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Icon, Icons, Text, color } from 'folds';
import { invoke } from '@tauri-apps/api/core';
import classNames from 'classnames';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';
import * as css from './OidcLoginCard.css';

const OidcLoginSchema = z.object({
  provider: z.string(),
  url: z.string().optional(),
  done: z.boolean().optional(),
  userId: z.string().optional(),
});

export type OidcLoginData = z.infer<typeof OidcLoginSchema>;

export function parseOidcLogin(content: Record<string, unknown>): OidcLoginData | undefined {
  const result = OidcLoginSchema.safeParse(content['vip.elevo.oidc_login']);
  if (!result.success) return undefined;
  const { done, url } = result.data;
  if (done === true || url) return result.data;
  return undefined;
}

type OidcLoginCardProps = {
  data: OidcLoginData;
  style?: CSSProperties;
};

export function OidcLoginCard({ data, style }: OidcLoginCardProps) {
  const { t } = useTranslation();

  const cardContent = (
    <>
      <Icon src={Icons.ShieldUser} size="300" />
      <Box grow="Yes" direction="Column" gap="100">
        <Text size="T300" priority="400">
          <b>{t('oidcLogin.title', { provider: data.provider })}</b>
        </Text>
        <Text size="T200" priority="300">
          {t(data.done ? 'oidcLogin.doneDescription' : 'oidcLogin.description', {
            provider: data.provider,
          })}
        </Text>
      </Box>
      <Icon
        src={data.done ? Icons.Check : Icons.ArrowRight}
        size="200"
        style={data.done ? { color: color.Success.Main } : undefined}
      />
    </>
  );

  const handleOidcClick = () => {
    if (isDesktopTauri && data.url) {
      invoke('open_oauth_window', { authUrl: data.url, label: 'oauth-elevo-bridge' }).catch(
        (err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to open OAuth window, falling back to browser:', err);
          window.open(data.url, '_blank', 'noopener,noreferrer');
        },
      );
    }
  };

  if (data.done) {
    return (
      <Box style={style}>
        <div className={css.OidcCard}>{cardContent}</div>
      </Box>
    );
  }

  if (isDesktopTauri) {
    return (
      <Box style={style}>
        <div
          role="button"
          tabIndex={0}
          className={classNames(css.OidcCard, css.OidcCardClickable)}
          onClick={handleOidcClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOidcClick();
            }
          }}
        >
          {cardContent}
        </div>
      </Box>
    );
  }

  return (
    <Box style={style}>
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer noopener"
        className={classNames(css.OidcCard, css.OidcCardClickable)}
      >
        {cardContent}
      </a>
    </Box>
  );
}
