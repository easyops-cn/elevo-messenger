import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Header, Scroll, Spinner, Text, config, color } from 'folds';
import classNames from 'classnames';
import { IMyDevice } from 'matrix-js-sdk';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useCrossSigningActive } from '../hooks/useCrossSigning';
import {
  useDeviceVerificationStatus,
  VerificationStatus,
} from '../hooks/useDeviceVerificationStatus';
import {
  useSecretStorageDefaultKeyId,
  useSecretStorageKeyContent,
} from '../hooks/useSecretStorage';
import { useDeviceList, useSplitCurrentDevice } from '../hooks/useDeviceList';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../utils/time';
import { BreakWord } from '../styles/Text.css';
import { ManualVerificationTile } from './ManualVerification';
import { ReceiveSelfDeviceVerification } from './DeviceVerification';
import { AutoRestoreBackupOnVerification } from './BackupRestore';
import { InfoCard } from './info-card';
import { SplashScreen } from './splash-screen';
import { AuthFooter } from '../pages/auth/AuthFooter';
import * as authCss from '../pages/auth/styles.css';
import * as PatternsCss from '../styles/Patterns.css';
import ElevoLogo from '../../../public/res/apple/apple-touch-icon-144x144.png';
import { logoutClient, clearLoginData } from '../../client/initMatrix';
import { useElevoConfig } from '../hooks/useElevoConfig';

function VerificationGateLoading() {
  return (
    <SplashScreen>
      <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
        <Spinner variant="Secondary" size="600" />
      </Box>
    </SplashScreen>
  );
}

function CurrentDeviceInfo({ device }: { device: IMyDevice }) {
  const { t } = useTranslation();
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const activeTs = device.last_seen_ts;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('verification_gate.current_device')}</Text>
      <Box direction="Column" gap="100">
        <Text className={BreakWord} size="T300">
          {device.display_name ?? device.device_id}
        </Text>
        <Text className={BreakWord} size="T200" priority="300">
          {t('settings.deviceSettings.deviceId')}
          <i>{device.device_id}</i>
        </Text>
        {typeof device.last_seen_ip === 'string' && (
          <Text className={BreakWord} size="T200" priority="300">
            {t('settings.deviceSettings.ipAddress')}
            <i>{device.last_seen_ip}</i>
          </Text>
        )}
        {typeof activeTs === 'number' && (
          <Text className={BreakWord} size="T200" priority="300">
            {t('settings.deviceSettings.lastActivity')}
            {today(activeTs) && t('settings.deviceSettings.today')}
            {yesterday(activeTs) && t('settings.deviceSettings.yesterday')}
            {!today(activeTs) && !yesterday(activeTs) && timeDayMonYear(activeTs, dateFormatString)}{' '}
            {timeHourMinute(activeTs, hour24Clock)}
          </Text>
        )}
      </Box>
    </Box>
  );
}

function VerificationGateScreen() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const defaultSecretStorageKeyId = useSecretStorageDefaultKeyId();
  const defaultSecretStorageKeyContent = useSecretStorageKeyContent(
    defaultSecretStorageKeyId ?? ''
  );

  const [devices] = useDeviceList();
  const [currentDevice] = useSplitCurrentDevice(devices);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logoutClient(mx);
    } catch {
      await clearLoginData();
    }
  }, [mx]);

  const hasSecretStorage = !!defaultSecretStorageKeyId && !!defaultSecretStorageKeyContent;

  return (
    <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
      <Box
        className={classNames(authCss.AuthLayout, PatternsCss.BackgroundDotPattern)}
        direction="Column"
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="400"
      >
        <Box direction="Column" className={authCss.AuthCard}>
          <Header className={authCss.AuthHeader} size="600" variant="Surface">
            <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
              <img className={authCss.AuthLogo} src={ElevoLogo} alt={t('auth.elevoLogo')} />
              <Text size="H3">{t('auth.elevoMessenger')}</Text>
            </Box>
          </Header>
          <Box className={authCss.AuthCardContent} direction="Column" justifyContent="Start">
            <Box direction="Column" gap="400">
              <Box direction="Column" gap="100">
                <Text size="H4">{t('verification_gate.title')}</Text>
                <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                  {t('verification_gate.description')}
                </Text>
              </Box>

              {hasSecretStorage && (
                <ManualVerificationTile
                  secretStorageKeyId={defaultSecretStorageKeyId}
                  secretStorageKeyContent={defaultSecretStorageKeyContent}
                />
              )}

              <InfoCard
                variant="Secondary"
                title={t('verification_gate.cross_device_title')}
                description={t('verification_gate.cross_device_description')}
              >
                <Text as="div" size="T200">
                  <ul style={{ margin: `${config.space.S100} 0`, paddingLeft: config.space.S400 }}>
                    <li>{t('verification_gate.step_open_device')}</li>
                    <li>{t('verification_gate.step_open_settings')}</li>
                    <li>{t('verification_gate.step_find_device')}</li>
                    <li>{t('verification_gate.step_initiate')}</li>
                  </ul>
                </Text>
              </InfoCard>

              {currentDevice && (
                <CurrentDeviceInfo device={currentDevice} />
              )}

              <Button
                variant="Critical"
                fill="None"
                size="400"
                radii="300"
                onClick={handleLogout}
                disabled={loggingOut}
                before={loggingOut ? <Spinner size="200" variant="Critical" /> : undefined}
              >
                <Text as="span" size="B400">
                  {t('verification_gate.logout')}
                </Text>
              </Button>
            </Box>
          </Box>
        </Box>
        <AuthFooter />
        <ReceiveSelfDeviceVerification />
        <AutoRestoreBackupOnVerification />
      </Box>
    </Scroll>
  );
}

type DeviceVerificationGateProps = {
  children: JSX.Element;
};
export function DeviceVerificationGate({ children }: DeviceVerificationGateProps) {
  const mx = useMatrixClient();
  const elevoConfig = useElevoConfig();
  const crypto = mx.getCrypto();
  const crossSigningActive = useCrossSigningActive();
  const verificationStatus = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    mx.getDeviceId() ?? undefined
  );

  const shouldAllow =
    !elevoConfig.features.deviceVerification ||
    (
    !crossSigningActive ||
    verificationStatus === VerificationStatus.Verified ||
    verificationStatus === VerificationStatus.Unsupported
    );
  const [allowed, setAllowed] = useState(shouldAllow);

  // Do not show verification gate screen once allowed.
  useEffect(() => {
    if (shouldAllow) {
      setAllowed(true);
    }
  }, [shouldAllow]);

  if (allowed) return children;

  if (verificationStatus === VerificationStatus.Unknown) return <VerificationGateLoading />;

  return <VerificationGateScreen />;
}
