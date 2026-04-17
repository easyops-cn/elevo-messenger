import React, { useCallback } from 'react';
import { Box, Text, Switch, Button, color, Spinner } from 'folds';
import { useTranslation } from 'react-i18next';
import { IPusherRequest } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useNotificationPermissionState } from '../../../hooks/usePermission';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  isNotificationSupported,
  requestNotificationPermission as requestSystemNotificationPermission,
} from '../../../utils/notification';

function EmailNotification() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [result, refreshResult] = useEmailNotifications();

  const [setState, setEnable] = useAsyncCallback(
    useCallback(
      async (email: string, enable: boolean) => {
        if (enable) {
          await mx.setPusher({
            kind: 'email',
            app_id: 'm.email',
            pushkey: email,
            app_display_name: 'Email Notifications',
            device_display_name: email,
            lang: 'en',
            data: {
              brand: 'Elevo Messenger',
            },
            append: true,
          });
          return;
        }
        await mx.setPusher({
          pushkey: email,
          app_id: 'm.email',
          kind: null,
        } as unknown as IPusherRequest);
      },
      [mx]
    )
  );

  const handleChange = (value: boolean) => {
    if (result && result.email) {
      setEnable(result.email, value).then(() => {
        refreshResult();
      });
    }
  };

  return (
    <SettingTile
      title={t('settings.notificationSettings.emailNotification')}
      description={
        <>
          {result && !result.email && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              {t('settings.notificationSettings.emailNoAccount')}
            </Text>
          )}
          {result && result.email && (
            <>
              {t('settings.notificationSettings.emailNotificationDesc')} {`("${result.email}")`}
            </>
          )}
          {result === null && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              {t('settings.notificationSettings.unexpectedError')}
            </Text>
          )}
          {result === undefined && t('settings.notificationSettings.emailNotificationDesc')}
        </>
      }
      after={
        <>
          {setState.status !== AsyncStatus.Loading &&
            typeof result === 'object' &&
            result?.email && <Switch value={result.enabled} onChange={handleChange} />}
          {(setState.status === AsyncStatus.Loading || result === undefined) && (
            <Spinner variant="Secondary" />
          )}
        </>
      }
    />
  );
}

export function SystemNotification() {
  const { t } = useTranslation();
  const notifPermission = useNotificationPermissionState();
  const notificationSupported = isNotificationSupported();
  const [showNotifications, setShowNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [isNotificationSounds, setIsNotificationSounds] = useSetting(
    settingsAtom,
    'isNotificationSounds'
  );

  const handleRequestNotificationPermission = () => {
    requestSystemNotificationPermission().catch(() => {
      // Permission state is refreshed by the hook when focus returns.
    });
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('settings.notificationSettings.system')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('settings.notificationSettings.desktopNotifications')}
          description={
            notifPermission === 'denied' ? (
              <Text as="span" style={{ color: color.Critical.Main }} size="T200">
                {notificationSupported
                  ? t('settings.notificationSettings.desktopNotificationsBlocked')
                  : t('settings.notificationSettings.desktopNotificationsUnsupported')}
              </Text>
            ) : (
              <span>{t('settings.notificationSettings.desktopNotificationsDesc')}</span>
            )
          }
          after={
            notifPermission === 'prompt' ? (
              <Button size="300" radii="300" onClick={handleRequestNotificationPermission}>
                <Text size="B300">{t('common.enable')}</Text>
              </Button>
            ) : (
              <Switch
                disabled={notifPermission !== 'granted'}
                value={showNotifications}
                onChange={setShowNotifications}
              />
            )
          }
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('settings.notificationSettings.notificationSound')}
          description={t('settings.notificationSettings.notificationSoundDesc')}
          after={<Switch value={isNotificationSounds} onChange={setIsNotificationSounds} />}
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <EmailNotification />
      </SequenceCard>
    </Box>
  );
}
