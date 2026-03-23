import React, {
  ChangeEventHandler,
  FormEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, IconButton, Icons, Input, Spinner, Text, config } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAccountData } from '../../../hooks/useAccountData';
import { AccountDataEvent, ConnectorsContent } from '../../../../types/matrix/accountData';

export function JavisConnector() {
  const { t } = useTranslation();
  const mx = useMatrixClient();

  const connectorEvent = useAccountData(AccountDataEvent.ElevoConnectors);
  const savedToken = connectorEvent?.getContent<ConnectorsContent>()?.javis?.accessToken ?? '';

  const [accessToken, setAccessToken] = useState<string>(savedToken);

  useEffect(() => {
    setAccessToken(savedToken);
  }, [savedToken]);

  const [saveState, save] = useAsyncCallback(
    useCallback(
      async (token: string) => {
        const existing = connectorEvent?.getContent<ConnectorsContent>() ?? {};
        const content: ConnectorsContent = {
          ...existing,
          javis: { accessToken: token },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await mx.setAccountData(AccountDataEvent.ElevoConnectors as any, content as any);
      },
      [mx, connectorEvent]
    )
  );
  const saving = saveState.status === AsyncStatus.Loading;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setAccessToken(evt.currentTarget.value);
  };

  const handleReset = () => {
    setAccessToken(savedToken);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (saving) return;
    const target = evt.target as HTMLFormElement | undefined;
    const input = target?.accessTokenInput as HTMLInputElement | undefined;
    const token = input?.value ?? '';
    save(token);
  };

  const hasChanges = accessToken !== savedToken;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('settings.connectorSettings.javis')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={
            <Text as="span" size="L400">
              {t('settings.connectorSettings.accessToken')}
            </Text>
          }
          description={t('settings.connectorSettings.accessTokenDesc')}
        >
          <Box as="form" onSubmit={handleSubmit} gap="200" aria-disabled={saving}>
            <Box grow="Yes" direction="Column">
              <Input
                name="accessTokenInput"
                type="password"
                value={accessToken}
                onChange={handleChange}
                variant="Secondary"
                radii="300"
                style={{ paddingRight: config.space.S200 }}
                readOnly={saving}
                after={
                  hasChanges &&
                  !saving && (
                    <IconButton
                      type="reset"
                      onClick={handleReset}
                      size="300"
                      radii="300"
                      variant="Secondary"
                    >
                      <Icon src={Icons.Cross} size="100" />
                    </IconButton>
                  )
                }
              />
            </Box>
            <Button
              size="400"
              variant={hasChanges ? 'Success' : 'Secondary'}
              fill={hasChanges ? 'Solid' : 'Soft'}
              outlined
              radii="300"
              disabled={!hasChanges || saving}
              type="submit"
            >
              {saving && <Spinner variant="Success" fill="Solid" size="300" />}
              <Text size="B400">{t('common.save')}</Text>
            </Button>
          </Box>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
