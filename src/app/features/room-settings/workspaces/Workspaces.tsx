import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Method } from 'matrix-js-sdk';
import { Badge, Box, Text, Icon, Icons, IconButton, Button, Spinner, Scroll, color } from 'folds';
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
import { FolderOpenIcon } from '../../../icons/FolderOpenIcon';
import { useOpenWorkspace } from '../../workspaces/useOpenWorkspace';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import {
  AddWorkspaceModal,
  WorkspaceItem,
  ELEVO_WORKSPACES_STATE_KEY,
  getBridgeWorkspacesUrl,
  getWorkspaceKey,
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
  const homeserverUrl = mx.getHomeserverUrl();
  const bridgeProvider = elevoConfig.workspaces?.bridgeProvider;
  const tenantsById = new Map(
    (elevoConfig.workspaces?.tenants ?? []).map((tenant) => [tenant.id, tenant.name]),
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
    }, [connect]),
  );

  const showAddModalState = useState(false);
  const showAddModal = showAddModalState[0];
  const setShowAddModal = showAddModalState[1];

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const getWorkspaceSourceName = (ws: WorkspaceItem): string | undefined => {
    if (ws.bridge_provider && ws.bridge_provider === bridgeProvider?.id) {
      return bridgeProvider.name;
    }
    return ws.owner_tenant_id ? tenantsById.get(ws.owner_tenant_id) : undefined;
  };

  const handleAdd = async (ws: WorkspaceItem) => {
    if (
      linkedWorkspaces.length === 1 &&
      getWorkspaceKey(linkedWorkspaces[0]) === getWorkspaceKey(ws)
    ) {
      return;
    }
    await mx.sendStateEvent(
      room.roomId,
      ELEVO_WORKSPACES_STATE_KEY as any,
      { workspaces: [ws] },
      '',
    );
  };

  const handleRemove = async (id: string) => {
    await mx.sendStateEvent(
      room.roomId,
      ELEVO_WORKSPACES_STATE_KEY as any,
      { workspaces: linkedWorkspaces.filter((w) => w.id !== id) },
      '',
    );
  };

  const handleSync = async (ws: WorkspaceItem) => {
    if (ws.bridge_provider) {
      if (!homeserverUrl) return;
    } else if (!baseUrl || !token) return;

    setSyncingId(ws.id);
    setSyncError(null);
    try {
      let fresh: WorkspaceItem;
      if (ws.bridge_provider) {
        const workspacesPath = new URL(getBridgeWorkspacesUrl(homeserverUrl, ws.bridge_provider))
          .pathname;
        const path = `${workspacesPath}/${encodeURIComponent(ws.id)}`;
        const data = await mx.http.authedRequest<{ id: string; name: string }>(
          Method.Get,
          path,
          undefined,
          undefined,
          { prefix: '' },
        );
        fresh = {
          id: data.id,
          name: data.name,
          bridge_provider: ws.bridge_provider,
        };
      } else {
        const res = await fetch(`${baseUrl}/api/v1/shares/${ws.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        fresh = data.share;
      }
      await mx.sendStateEvent(
        room.roomId,
        ELEVO_WORKSPACES_STATE_KEY as any,
        {
          workspaces: linkedWorkspaces.map((w) =>
            getWorkspaceKey(w) === getWorkspaceKey(ws) ? fresh : w,
          ),
        },
        '',
      );
    } catch (e: any) {
      setSyncError(e.message ?? t('workspaces.syncFailed'));
    } finally {
      setSyncingId(null);
    }
  };

  const linkedIds = new Set(linkedWorkspaces.map((w) => getWorkspaceKey(w)));
  const isConnecting = connectState.status === AsyncStatus.Loading;

  const openWorkspace = useOpenWorkspace();
  const handleOpenExplorer = (ws: WorkspaceItem) => {
    openWorkspace(ws, room.roomId);
  };
  // Whether the "open" action should be shown for a workspace. Bridge
  // workspaces open a desktop-only explorer window; others open the elevo
  // workspace side panel, which needs a configured explorerUrl.
  const canOpenWorkspace = (ws: WorkspaceItem): boolean =>
    ws.bridge_provider ? isDesktopTauri : Boolean(elevoConfig.workspaces?.explorerUrl);

  return (
    <>
      <Page>
        <PageHeader outlined={false}>
          <Box grow="Yes" gap="200">
            <Box grow="Yes" alignItems="Center" gap="200">
              <Text size="H5" truncate>
                {t('workspaces.title')}
              </Text>
            </Box>
            <Box shrink="No">
              <IconButton size="300" onClick={requestClose} variant="Surface">
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
                            <Text as="span" size="L400" style={{ color: color.Success.Main }}>
                              {t('links.connected')}
                            </Text>
                          </Box>
                        ) : refreshing ? (
                          <Box as="span" gap="100" alignItems="Center">
                            <Spinner size="200" variant="Secondary" />
                            <Text as="span" size="L400" style={{ color: color.Warning.Main }}>
                              {t('links.refreshing')}
                            </Text>
                          </Box>
                        ) : expired ? (
                          <Box alignItems="Center" gap="200">
                            <Box as="span" gap="100" alignItems="Center">
                              <Badge variant="Critical" fill="Solid" size="200" radii="Pill" />
                              <Text as="span" size="L400" style={{ color: color.Critical.Main }}>
                                {t('links.expired')}
                              </Text>
                            </Box>
                            {isDesktopTauri ? (
                              <Button
                                size="300"
                                variant="Primary"
                                fill="Solid"
                                radii="300"
                                onClick={() =>
                                  startConnect().catch((e) =>
                                    setConnectError(e.message ?? String(e)),
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
                            ) : (
                              <Text size="T300" style={{ color: color.Warning.Main }}>
                                {t('links.desktopOnlyDesc')}
                              </Text>
                            )}
                          </Box>
                        ) : isDesktopTauri ? (
                          <Button
                            size="300"
                            variant="Primary"
                            fill="Solid"
                            radii="300"
                            onClick={() =>
                              startConnect().catch((e) => setConnectError(e.message ?? String(e)))
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
                        ) : (
                          <Text size="T300" style={{ color: color.Warning.Main }}>
                            {t('links.desktopOnlyDesc')}
                          </Text>
                        )
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
                        description={
                          isModerator ? t('workspaces.noWorkspacesLinkedDesc') : undefined
                        }
                      />
                    </SequenceCard>
                  ) : (
                    linkedWorkspaces.map((ws) => {
                      const sourceName = getWorkspaceSourceName(ws);

                      return (
                        <SequenceCard
                          key={getWorkspaceKey(ws)}
                          className={SequenceCardStyle}
                          variant="SurfaceVariant"
                          direction="Column"
                          gap="400"
                        >
                          <SettingTile
                            title={ws.name}
                            description={ws.description || undefined}
                            after={
                              isModerator || canOpenWorkspace(ws) ? (
                                <Box gap="100" shrink="No">
                                  {canOpenWorkspace(ws) && (
                                    <IconButton
                                      size="300"
                                      variant="Secondary"
                                      fill="None"
                                      radii="300"
                                      onClick={() => handleOpenExplorer(ws)}
                                      title={t('workspaces.openExplorer')}
                                    >
                                      <Icon src={FolderOpenIcon} size="100" />
                                    </IconButton>
                                  )}
                                  {isModerator && (
                                    <>
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
                                    </>
                                  )}
                                </Box>
                              ) : undefined
                            }
                          >
                            {sourceName && (
                              <Text size="T200" priority="300">
                                {sourceName}
                              </Text>
                            )}
                          </SettingTile>
                        </SequenceCard>
                      );
                    })
                  )}
                  {syncError && (
                    <Text size="T200" style={{ color: 'var(--mx-danger)' }}>
                      {syncError}
                    </Text>
                  )}
                </Box>

                {/* Bind Workspace (Moderator only) */}
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
          homeserverUrl={homeserverUrl}
          mx={mx}
          bridgeProvider={bridgeProvider}
          tenantNames={tenantsById}
          onAdd={handleAdd}
          requestClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
