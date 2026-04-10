import React, { useState } from 'react';
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
} from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';
import { useWorkspaceToken } from '../../../hooks/useWorkspaceToken';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';

type LinksProps = {
  requestClose: () => void;
};

export function Links({ requestClose }: LinksProps) {
  const { t } = useTranslation();
  const { connected, expired, connection, connect, disconnect } = useWorkspaceToken();
  const [error, setError] = useState<string | null>(null);

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
                <Text size="L400">{t('links.workspaceTitle')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  {connected && connection ? (
                    <>
                      <SettingTile
                        title={t('links.workspaceConnected')}
                        description={t('links.workspaceConnectedDesc', {
                          date: new Date(connection.connectedAt).toLocaleString(),
                          scope: connection.scope,
                        })}
                        after={
                          <Badge variant="Success" size="500" fill="Soft" radii="Pill">
                            {t('links.connected')}
                          </Badge>
                        }
                      />
                      <SettingTile
                        title={t('links.serverUrl')}
                        description={connection.serverUrl}
                      />
                      <SettingTile
                        after={
                          <Button
                            size="300"
                            variant="Critical"
                            fill="None"
                            radii="300"
                            onClick={() =>
                              startDisconnect().catch((e) => setError(e.message ?? String(e)))
                            }
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
                        }
                      />
                    </>
                  ) : expired && connection ? (
                    <>
                      <SettingTile
                        title={t('links.workspaceExpired')}
                        description={t('links.workspaceExpiredDesc')}
                        after={
                          <Badge variant="Critical" size="200" fill="Soft" radii="Pill">
                            {t('links.expired')}
                          </Badge>
                        }
                      />
                      {isDesktopTauri ? (
                        <SettingTile
                          after={
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
                                isLoading ? (
                                  <Spinner size="100" variant="Secondary" />
                                ) : (
                                  <Icon src={Icons.Link} size="100" />
                                )
                              }
                            >
                              <Text size="B300">{t('links.reconnect')}</Text>
                            </Button>
                          }
                        />
                      ) : (
                        <SettingTile
                          title={t('links.desktopOnly')}
                          description={t('links.desktopOnlyDesc')}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <SettingTile
                        title={t('links.workspaceNotConnected')}
                        description={t('links.workspaceNotConnectedDesc')}
                        after={
                          <Badge variant="Secondary" size="200" fill="Soft" radii="Pill">
                            {t('links.disconnected')}
                          </Badge>
                        }
                      />
                      {isDesktopTauri ? (
                        <SettingTile
                          after={
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
                                isLoading ? (
                                  <Spinner size="100" variant="Secondary" />
                                ) : (
                                  <Icon src={Icons.Link} size="100" />
                                )
                              }
                            >
                              <Text size="B300">{t('links.connectWorkspace')}</Text>
                            </Button>
                          }
                        />
                      ) : (
                        <SettingTile
                          title={t('links.desktopOnly')}
                          description={t('links.desktopOnlyDesc')}
                        />
                      )}
                    </>
                  )}
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
