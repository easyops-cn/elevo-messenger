import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  Badge,
  Box,
  Text,
  Icon,
  Icons,
  IconButton,
  Button,
  Spinner,
  Scroll,
  color,
} from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { usePowerLevels, readPowerLevel } from '../../../hooks/usePowerLevels';
import { useElevoConfig } from '../../../hooks/useElevoConfig';
import { useWorkspaceToken } from '../../../hooks/useWorkspaceToken';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import {
  AddWorkspaceModal,
  WorkspaceItem,
  ELEVO_WORKSPACES_STATE_KEY,
} from '../../room/WorkspacesModal';

type WorkspacesProps = {
  requestClose: () => void;
};

export function Workspaces({ requestClose }: WorkspacesProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const powerLevels = usePowerLevels(room);
  const elevoConfig = useElevoConfig();
  const baseUrl = elevoConfig.workspaces?.apiBaseUrl ?? '';
  const tenantsById = new Map(
    (elevoConfig.workspaces?.tenants ?? []).map((tenant) => [tenant.id, tenant.name])
  );

  const userId = mx.getSafeUserId();
  const userPower = readPowerLevel.user(powerLevels, userId);
  const isModerator = userPower >= 50;

  const stateEvent = useStateEvent(room, ELEVO_WORKSPACES_STATE_KEY as any);
  const linkedWorkspaces: WorkspaceItem[] =
    (stateEvent?.getContent() as { workspaces?: WorkspaceItem[] } | undefined)?.workspaces ?? [];

  const { token, connected, expired, refreshing, connect } = useWorkspaceToken();
  const [connectError, setConnectError] = useState<string | null>(null);

  const [connectState, startConnect] = useAsyncCallback(
    React.useCallback(async () => {
      setConnectError(null);
      await connect();
    }, [connect])
  );

  const showAddModalState = useState(false);
  const showAddModal = showAddModalState[0];
  const setShowAddModal = showAddModalState[1];

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleAdd = async (ws: WorkspaceItem) => {
    if (linkedWorkspaces.some((w) => w.id === ws.id)) return;
    await mx.sendStateEvent(
      room.roomId,
      ELEVO_WORKSPACES_STATE_KEY as any,
      { workspaces: [...linkedWorkspaces, ws] },
      ''
    );
  };

  const handleRemove = async (id: string) => {
    await mx.sendStateEvent(
      room.roomId,
      ELEVO_WORKSPACES_STATE_KEY as any,
      { workspaces: linkedWorkspaces.filter((w) => w.id !== id) },
      ''
    );
  };

  const handleSync = async (ws: WorkspaceItem) => {
    if (!baseUrl || !token) return;
    setSyncingId(ws.id);
    setSyncError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/shares/${ws.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fresh: WorkspaceItem = data.share;
      await mx.sendStateEvent(
        room.roomId,
        ELEVO_WORKSPACES_STATE_KEY as any,
        { workspaces: linkedWorkspaces.map((w) => (w.id === ws.id ? fresh : w)) },
        ''
      );
    } catch (e: any) {
      setSyncError(e.message ?? t('workspaces.syncFailed'));
    } finally {
      setSyncingId(null);
    }
  };

  const linkedIds = new Set(linkedWorkspaces.map((w) => w.id));
  const isConnecting = connectState.status === AsyncStatus.Loading;

  return (
    <>
      <Page>
        <PageHeader outlined={false}>
          <Box grow="Yes" gap="200">
            <Box grow="Yes" alignItems="Center" gap="200">
              <Text size="H3" truncate>
                {t('workspaces.title')}
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

                {/* Workspace Connection */}
                <Box direction="Column" gap="100">
                  <Text size="L400">{t('workspaces.settings')}</Text>
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title={t('links.workspaceTitle')}
                      after={
                        connected ? (
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
                        ) : refreshing ? (
                          <Box as="span" gap="100" alignItems="Center">
                            <Spinner size="200" variant="Secondary" />
                            <Text
                              as="span"
                              size="L400"
                              style={{ color: color.Warning.Main }}
                            >
                              {t('links.refreshing')}
                            </Text>
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
                                  startConnect().catch((e) =>
                                    setConnectError(e.message ?? String(e))
                                  )
                                }
                                disabled={isConnecting}
                                before={
                                  isConnecting ? (
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
                              startConnect().catch((e) =>
                                setConnectError(e.message ?? String(e))
                              )
                            }
                            disabled={isConnecting}
                            before={
                              isConnecting ? (
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
                    {connectError && (
                      <Text size="T200" style={{ color: 'var(--mx-danger)' }}>
                        {connectError}
                      </Text>
                    )}
                  </SequenceCard>
                </Box>

                {/* Linked Workspaces */}
                <Box direction="Column" gap="100">
                  <Text size="L400">{t('workspaces.linkedWorkspaces')}</Text>
                  {linkedWorkspaces.length === 0 ? (
                    <SequenceCard
                      className={SequenceCardStyle}
                      variant="SurfaceVariant"
                      direction="Column"
                      gap="400"
                    >
                      <SettingTile
                        title={t('workspaces.noWorkspacesLinked')}
                        description={isModerator ? t('workspaces.noWorkspacesLinkedDesc') : undefined}
                      />
                    </SequenceCard>
                  ) : (
                    linkedWorkspaces.map((ws) => (
                      <SequenceCard
                        key={ws.id}
                        className={SequenceCardStyle}
                        variant="SurfaceVariant"
                        direction="Column"
                        gap="400"
                      >
                        <SettingTile
                          title={ws.name}
                          description={ws.description || undefined}
                          after={
                            isModerator ? (
                              <Box gap="100" shrink="No">
                                <IconButton
                                  size="300"
                                  variant="Secondary"
                                  fill="None"
                                  radii="300"
                                  onClick={() => handleSync(ws)}
                                  disabled={syncingId === ws.id}
                                  title={t('workspaces.sync')}
                                >
                                  {syncingId === ws.id ? (
                                    <Spinner size="100" variant="Secondary" />
                                  ) : (
                                    <Icon src={Icons.Reload} size="100" />
                                  )}
                                </IconButton>
                                <IconButton
                                  size="300"
                                  variant="Critical"
                                  fill="None"
                                  radii="300"
                                  onClick={() => handleRemove(ws.id)}
                                  title={t('workspaces.remove')}
                                >
                                  <Icon src={Icons.Cross} size="100" />
                                </IconButton>
                              </Box>
                            ) : undefined
                          }
                        >
                          {tenantsById.has(ws.owner_tenant_id) && (
                            <Text size="T200" priority="300">
                              {tenantsById.get(ws.owner_tenant_id)}
                            </Text>
                          )}
                        </SettingTile>
                      </SequenceCard>
                    ))
                  )}
                  {syncError && (
                    <Text size="T200" style={{ color: 'var(--mx-danger)' }}>
                      {syncError}
                    </Text>
                  )}
                </Box>

                {/* Add Workspace (Moderator only) */}
                {isModerator && (
                  <Box direction="Column" gap="100">
                    <Text size="L400">{t('workspaces.addWorkspace')}</Text>
                    <SequenceCard
                      className={SequenceCardStyle}
                      variant="SurfaceVariant"
                      direction="Column"
                      gap="400"
                    >
                      <SettingTile
                        title={t('workspaces.browseAvailable')}
                        description={t('workspaces.browseAvailableDesc')}
                        after={
                          <Button
                            onClick={() => setShowAddModal(true)}
                            variant="Secondary"
                            fill="Soft"
                            size="300"
                            radii="300"
                            outlined
                            before={<Icon src={Icons.Plus} size="100" filled />}
                          >
                            <Text size="B300">{t('workspaces.add')}</Text>
                          </Button>
                        }
                      />
                    </SequenceCard>
                  </Box>
                )}

              </Box>
            </PageContent>
          </Scroll>
        </Box>
      </Page>
      {showAddModal && (
        <AddWorkspaceModal
          linkedIds={linkedIds}
          baseUrl={baseUrl}
          token={token ?? ''}
          tenantNames={tenantsById}
          onAdd={handleAdd}
          requestClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
