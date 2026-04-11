import React, { MouseEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  Icon,
  Icons,
  IconButton,
  Button,
  Spinner,
  Scroll,
  Badge,
  config,
  color,
  Menu,
  PopOut,
  RectCords,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';
import { useWorkspaceToken } from '../../../hooks/useWorkspaceToken';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { stopPropagation } from '../../../utils/keyboard';

type LinksProps = {
  requestClose: () => void;
};

export function Links({ requestClose }: LinksProps) {
  const { t } = useTranslation();
  const { connected, expired, connection, connect, disconnect } = useWorkspaceToken();
  const [error, setError] = useState<string | null>(null);
  const [menuCords, setMenuCords] = useState<RectCords>();

  const [connectState, startConnect] = useAsyncCallback(
    React.useCallback(async () => {
      setError(null);
      await connect();
    }, [connect])
  );

  const [disconnectState, startDisconnect] = useAsyncCallback(
    React.useCallback(async () => {
      setError(null);
      await disconnect();
    }, [disconnect])
  );

  const isLoading =
    connectState.status === AsyncStatus.Loading || disconnectState.status === AsyncStatus.Loading;

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleDisconnect = () => {
    setMenuCords(undefined);
    startDisconnect().catch((e) => setError(e.message ?? String(e)));
  };

  const isConnected = connected && connection;

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {t('settings.links')}
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              {error && (
                <Box
                  style={{
                    backgroundColor: color.Critical.Container,
                    color: color.Critical.OnContainer,
                    padding: config.space.S300,
                    borderRadius: config.radii.R400,
                  }}
                  direction="Column"
                  gap="300"
                >
                  <Box justifyContent="Start" alignItems="Start" gap="300">
                    <Icon size="300" filled src={Icons.Warning} />
                    <Box direction="Column" gap="100">
                      <Text size="L400">{t('links.connectionFailed')}</Text>
                      <Text size="T300">
                        <b>{error}</b>
                      </Text>
                    </Box>
                  </Box>
                </Box>
              )}

              <Box direction="Column" gap="100">
                <Text size="L400">{t('links.connectionList')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={t('links.workspaceTitle')}
                    after={
                      isConnected ? (
                        <Box alignItems="Center" gap="200">
                          <Box as="span" gap="100" alignItems="Center">
                            <Badge variant="Success" fill="Solid" size="200" radii="Pill" />
                            <Text
                              as="span"
                              size="L400"
                              style={{ color: color.Success.Main }}
                            >
                              {t('links.connected')}
                            </Text>
                          </Box>
                          <IconButton
                            aria-pressed={!!menuCords}
                            size="300"
                            variant="Secondary"
                            radii="300"
                            onClick={handleMenu}
                          >
                            <Icon size="100" src={Icons.VerticalDots} />
                          </IconButton>
                          <PopOut
                            anchor={menuCords}
                            offset={5}
                            position="Bottom"
                            align="End"
                            content={
                              <FocusTrap
                                focusTrapOptions={{
                                  initialFocus: false,
                                  onDeactivate: () => setMenuCords(undefined),
                                  clickOutsideDeactivates: true,
                                  isKeyForward: (evt: KeyboardEvent) =>
                                    evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                                  isKeyBackward: (evt: KeyboardEvent) =>
                                    evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                                  escapeDeactivates: stopPropagation,
                                }}
                              >
                                <Menu style={{ padding: config.space.S100 }}>
                                  <Button
                                    size="300"
                                    variant="Critical"
                                    fill="Soft"
                                    radii="300"
                                    onClick={handleDisconnect}
                                    disabled={isLoading}
                                    before={
                                      disconnectState.status === AsyncStatus.Loading ? (
                                        <Spinner size="100" variant="Secondary" />
                                      ) : (
                                        <Icon src={Icons.Cross} size="100" />
                                      )
                                    }
                                  >
                                    <Text size="B300">{t('links.disconnect')}</Text>
                                  </Button>
                                </Menu>
                              </FocusTrap>
                            }
                          />
                        </Box>
                      ) : expired ? (
                        <Box alignItems="Center" gap="200">
                          <Box as="span" gap="100" alignItems="Center">
                            <Badge variant="Critical" fill="Solid" size="200" radii="Pill" />
                            <Text
                              as="span"
                              size="L400"
                              style={{ color: color.Critical.Main }}
                            >
                              {t('links.expired')}
                            </Text>
                          </Box>
                          {isDesktopTauri && (
                            <Button
                              size="300"
                              variant="Primary"
                              fill="Solid"
                              radii="300"
                              onClick={() =>
                                startConnect().catch((e) => setError(e.message ?? String(e)))
                              }
                              disabled={isLoading}
                              before={
                                connectState.status === AsyncStatus.Loading ? (
                                  <Spinner size="100" variant="Secondary" />
                                ) : (
                                  <Icon src={Icons.Link} size="100" />
                                )
                              }
                            >
                              <Text size="B300">{t('links.reconnect')}</Text>
                            </Button>
                          )}
                        </Box>
                      ) : isDesktopTauri ? (
                        <Button
                          size="300"
                          variant="Primary"
                          fill="Solid"
                          radii="300"
                          onClick={() =>
                            startConnect().catch((e) => setError(e.message ?? String(e)))
                          }
                          disabled={isLoading}
                          before={
                            connectState.status === AsyncStatus.Loading ? (
                              <Spinner size="100" variant="Secondary" />
                            ) : (
                              <Icon src={Icons.Link} size="100" />
                            )
                          }
                        >
                          <Text size="B300">{t('links.connectWorkspace')}</Text>
                        </Button>
                      ) : undefined
                    }
                  />
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
