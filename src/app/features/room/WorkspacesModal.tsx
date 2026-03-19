import FocusTrap from 'focus-trap-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Text,
  Icon,
  Icons,
  IconButton,
  Button,
  Input,
  Spinner,
  config,
  MenuItem,
  Modal,
  Overlay,
  OverlayCenter,
  Scroll,
  Line,
  toRem,
} from 'folds';
import { Modal500 } from '../../components/Modal500';
import { Page, PageContent, PageHeader } from '../../components/page';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../common-settings/styles.css';
import { SettingTile } from '../../components/setting-tile';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { useStateEvent } from '../../hooks/useStateEvent';
import { usePowerLevelsContext, readPowerLevel } from '../../hooks/usePowerLevels';
import { useClientConfig } from '../../hooks/useClientConfig';

const ELEVO_WORKSPACES_STATE_KEY = 'vip.elevo.workspaces';
const ELEVO_TOKEN_STORAGE_KEY = 'elevo_workspaces_api_token';
const PAGE_SIZE = 100;

export type WorkspaceItem = {
  id: string;
  name: string;
  description: string;
  source_path: string;
  owner_tenant_id: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

type WorkspacesStateContent = {
  workspaces: WorkspaceItem[];
};

type AddWorkspaceModalProps = {
  linkedIds: Set<string>;
  baseUrl: string;
  token: string;
  tenantNames: Record<string, string>;
  onAdd: (ws: WorkspaceItem) => Promise<void>;
  requestClose: () => void;
};

function AddWorkspaceModal({ linkedIds, baseUrl, token, tenantNames, onAdd, requestClose }: AddWorkspaceModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [availablePage, setAvailablePage] = useState(1);
  const [availableTotal, setAvailableTotal] = useState(0);
  const [query, setQuery] = useState('');

  const fetchAvailable = useCallback(
    async (page: number) => {
      if (!baseUrl || !token) return;
      setLoadingAvailable(true);
      setAvailableError(null);
      try {
        const res = await fetch(
          `${baseUrl}/api/v1/me/accessible-shares?page=${page}&page_size=${PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAvailableWorkspaces(data.items ?? []);
        setAvailableTotal(data.total ?? 0);
        setAvailablePage(page);
      } catch (e: any) {
        setAvailableError(e.message ?? 'Failed to fetch workspaces');
      } finally {
        setLoadingAvailable(false);
      }
    },
    [baseUrl, token]
  );

  useEffect(() => {
    fetchAvailable(1);
  }, [fetchAvailable]);

  const totalPages = Math.ceil(availableTotal / PAGE_SIZE);

  const filteredWorkspaces = availableWorkspaces
    .filter((ws) => !linkedIds.has(ws.id))
    .filter((ws) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return ws.name.toLowerCase().includes(q) || ws.description?.toLowerCase().includes(q);
    });

  return (
    <Overlay open>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => inputRef.current,
            returnFocusOnDeactivate: false,
            allowOutsideClick: true,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: (evt) => {
              evt.stopPropagation();
              return true;
            },
          }}
        >
          <Modal size="400" style={{ maxHeight: toRem(480), borderRadius: config.radii.R500 }}>
            <Box shrink="No" style={{ padding: config.space.S400, paddingBottom: 0 }} direction="Column" gap="200">
              <Input
                ref={inputRef}
                size="500"
                variant="Background"
                radii="400"
                outlined
                placeholder="Search workspaces"
                before={<Icon size="200" src={Icons.Search} />}
                value={query}
                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              />
            </Box>
            <Box grow="Yes">
              {loadingAvailable && (
                <Box justifyContent="Center" alignItems="Center" grow="Yes" style={{ padding: config.space.S700 }}>
                  <Spinner size="200" variant="Secondary" />
                </Box>
              )}
              {availableError && (
                <Box justifyContent="Center" alignItems="Center" grow="Yes" direction="Column" gap="100" style={{ padding: config.space.S700 }}>
                  <Text size="H6" align="Center">Failed to load</Text>
                  <Text size="T200" align="Center">{availableError}</Text>
                </Box>
              )}
              {!loadingAvailable && !availableError && filteredWorkspaces.length === 0 && (
                <Box justifyContent="Center" alignItems="Center" grow="Yes" direction="Column" gap="100" style={{ padding: config.space.S700 }}>
                  <Text size="H6" align="Center">{query.trim() ? 'No Match Found' : 'No Workspaces'}</Text>
                  <Text size="T200" align="Center">
                    {query.trim() ? `No match found for "${query.trim()}".` : 'No accessible workspaces found.'}
                  </Text>
                </Box>
              )}
              {!loadingAvailable && filteredWorkspaces.length > 0 && (
                <Scroll ref={scrollRef} size="300" hideTrack>
                  <div style={{ padding: config.space.S400, paddingRight: config.space.S200 }}>
                    {filteredWorkspaces.map((ws) => (
                      <MenuItem
                        key={ws.id}
                        as="button"
                        variant="Surface"
                        radii="400"
                        onClick={() => onAdd(ws)}
                        after={
                          tenantNames[ws.owner_tenant_id] ? (
                            <Text size="T200" priority="300" truncate>
                              <b>{tenantNames[ws.owner_tenant_id]}</b>
                            </Text>
                          ) : undefined
                        }
                      >
                        <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
                          <Text size="T300" truncate>{ws.name}</Text>
                          {ws.description ? (
                            <Text size="T200" priority="300" truncate>{ws.description}</Text>
                          ) : null}
                        </Box>
                      </MenuItem>
                    ))}
                  </div>
                </Scroll>
              )}
            </Box>
            {totalPages > 1 && (
              <>
                <Line size="300" />
                <Box shrink="No" gap="200" justifyContent="Center" alignItems="Center" style={{ padding: config.space.S200 }}>
                  <Button
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    outlined
                    disabled={availablePage <= 1}
                    onClick={() => fetchAvailable(availablePage - 1)}
                  >
                    <Text size="B300">Prev</Text>
                  </Button>
                  <Text size="T300">{availablePage} / {totalPages}</Text>
                  <Button
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    outlined
                    disabled={availablePage >= totalPages}
                    onClick={() => fetchAvailable(availablePage + 1)}
                  >
                    <Text size="B300">Next</Text>
                  </Button>
                </Box>
              </>
            )}
            <Line size="300" />
            <Box shrink="No" justifyContent="Center" style={{ padding: config.space.S200 }}>
              <Text size="T200" priority="300">
                Type to filter workspaces by name or description
              </Text>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type WorkspacesModalProps = {
  requestClose: () => void;
};

export function WorkspacesModal({ requestClose }: WorkspacesModalProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const powerLevels = usePowerLevelsContext();
  const clientConfig = useClientConfig();
  const baseUrl = clientConfig.elevoWorkspacesApiBaseUrl ?? '';

  const userId = mx.getSafeUserId();
  const userPower = readPowerLevel.user(powerLevels, userId);
  const isModerator = userPower >= 50;

  const stateEvent = useStateEvent(room, ELEVO_WORKSPACES_STATE_KEY as any);
  const stateContent = stateEvent?.getContent<WorkspacesStateContent>();
  const linkedWorkspaces: WorkspaceItem[] = stateContent?.workspaces ?? [];

  const [token, setToken] = useState(() => localStorage.getItem(ELEVO_TOKEN_STORAGE_KEY) ?? '');
  const [tokenInput, setTokenInput] = useState(token);
  const [tokenSaved, setTokenSaved] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSaveToken = () => {
    localStorage.setItem(ELEVO_TOKEN_STORAGE_KEY, tokenInput);
    setToken(tokenInput);
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
  };

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
      setSyncError(e.message ?? 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const linkedIds = new Set(linkedWorkspaces.map((w) => w.id));

  return (
    <>
      <Modal500 requestClose={requestClose}>
        <Page>
          <PageHeader outlined={false}>
            <Box grow="Yes" gap="200">
              <Box grow="Yes" alignItems="Center" gap="200">
                <Text size="H3" truncate>
                  Workspaces
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

                  {/* Workspaces API Token */}
                  <Box direction="Column" gap="100">
                    <Text size="L400">Settings</Text>
                    <SequenceCard
                      className={SequenceCardStyle}
                      variant="SurfaceVariant"
                      direction="Column"
                      gap="400"
                    >
                      <SettingTile
                        title="Workspaces API Token"
                        description={
                          !baseUrl
                            ? 'elevoWorkspacesApiBaseUrl is not configured in config.json'
                            : 'Token is stored locally in your browser'
                        }
                        after={
                          <Box gap="200" alignItems="Center">
                            <Input
                              type="password"
                              value={tokenInput}
                              onChange={(e) => setTokenInput((e.target as HTMLInputElement).value)}
                              placeholder="Enter token"
                              style={{ width: 200 }}
                            />
                            <Button
                              size="300"
                              variant="Secondary"
                              fill="Soft"
                              radii="300"
                              outlined
                              onClick={handleSaveToken}
                            >
                              <Text size="B300">{tokenSaved ? 'Saved!' : 'Save'}</Text>
                            </Button>
                          </Box>
                        }
                      />
                    </SequenceCard>
                  </Box>

                  {/* Linked Workspaces */}
                  <Box direction="Column" gap="100">
                    <Text size="L400">Linked Workspaces</Text>
                    {linkedWorkspaces.length === 0 ? (
                      <SequenceCard
                        className={SequenceCardStyle}
                        variant="SurfaceVariant"
                        direction="Column"
                        gap="400"
                      >
                        <SettingTile
                          title="No workspaces linked"
                          description={isModerator ? 'Use the Add Workspace button below to link one.' : undefined}
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
                                    fill="Soft"
                                    radii="300"
                                    onClick={() => handleSync(ws)}
                                    disabled={syncingId === ws.id}
                                    title="Sync"
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
                                    title="Remove"
                                  >
                                    <Icon src={Icons.Cross} size="100" />
                                  </IconButton>
                                </Box>
                              ) : undefined
                            }
                          >
                            {clientConfig.elevoTenantNames?.[ws.owner_tenant_id] && (
                              <Text size="T200" priority="300">
                                {clientConfig.elevoTenantNames[ws.owner_tenant_id]}
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
                      <Text size="L400">Add Workspace</Text>
                      <SequenceCard
                        className={SequenceCardStyle}
                        variant="SurfaceVariant"
                        direction="Column"
                        gap="400"
                      >
                        <SettingTile
                          title="Browse available workspaces"
                          description="Fetch workspaces accessible to your account"
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
                              <Text size="B300">Add</Text>
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
      </Modal500>
      {showAddModal && (
        <AddWorkspaceModal
          linkedIds={linkedIds}
          baseUrl={baseUrl}
          token={token}
          tenantNames={clientConfig.elevoTenantNames ?? {}}
          onAdd={handleAdd}
          requestClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
