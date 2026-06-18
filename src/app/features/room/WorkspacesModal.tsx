import { useTranslation } from 'react-i18next';
import FocusTrap from 'focus-trap-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Method, type MatrixClient } from 'matrix-js-sdk';
import {
  Box,
  Text,
  Icon,
  Icons,
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
import { SearchIcon } from '../../icons/SearchIcon';
import { BridgeProviderConfig } from '../../hooks/useElevoConfig';
import { trimLeadingSlash, trimTrailingSlash } from '../../utils/common';

export const ELEVO_WORKSPACES_STATE_KEY = 'vip.elevo.workspaces';
const PAGE_SIZE = 100;

export type WorkspaceItem = {
  id: string;
  name: string;
  description?: string;
  source_path?: string;
  owner_tenant_id?: string;
  visibility?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
  bridge_provider?: string;
};

type AddWorkspaceModalProps = {
  linkedIds: Set<string>;
  baseUrl: string;
  token: string;
  homeserverUrl: string;
  mx: MatrixClient;
  bridgeProvider?: BridgeProviderConfig;
  tenantNames: Map<string, string>;
  onAdd: (ws: WorkspaceItem) => Promise<void>;
  requestClose: () => void;
};

type BridgeWorkspace = {
  id: string;
  name: string;
};

export const getWorkspaceKey = (ws: WorkspaceItem): string =>
  `${ws.bridge_provider ? `bridge:${ws.bridge_provider}` : 'elevo'}:${ws.id}`;

export const getBridgeWorkspacesUrl = (homeserverUrl: string, bridgeProvider: string): string =>
  `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(trimTrailingSlash(bridgeProvider))}/workspaces`;

export function AddWorkspaceModal({
  linkedIds,
  baseUrl,
  token,
  homeserverUrl,
  mx,
  bridgeProvider,
  tenantNames,
  onAdd,
  requestClose,
}: AddWorkspaceModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [availablePage, setAvailablePage] = useState(1);
  const [availableTotal, setAvailableTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAvailable = useCallback(
    async (page: number) => {
      const canFetchElevo = !!baseUrl && !!token;
      const bridgeProviderId = bridgeProvider?.id;
      const canFetchBridge = !!homeserverUrl && !!bridgeProviderId;
      if (!canFetchElevo && !canFetchBridge) return;
      setLoadingAvailable(true);
      setAvailableError(null);
      try {
        let elevoRequest: Promise<{ items: WorkspaceItem[]; total: number }> | undefined;
        let bridgeRequest: Promise<WorkspaceItem[]> | undefined;

        if (canFetchElevo) {
          elevoRequest = fetch(
            `${baseUrl}/api/v1/me/accessible-shares?page=${page}&page_size=${PAGE_SIZE}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ).then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return { items: data.items ?? [], total: data.total ?? 0 };
          });
        }

        if (canFetchBridge) {
          const path = new URL(getBridgeWorkspacesUrl(homeserverUrl, bridgeProviderId)).pathname;
          bridgeRequest = (async () => {
            const data = await mx.http.authedRequest<{ workspaces?: BridgeWorkspace[] }>(
              Method.Get,
              path,
              undefined,
              undefined,
              { prefix: '' },
            );
            return (data.workspaces ?? []).map((ws) => ({
              id: ws.id,
              name: ws.name,
              bridge_provider: bridgeProviderId,
            }));
          })();
        }

        const [bridgeWorkspaces = [], elevoResult] = await Promise.all([
          bridgeRequest,
          elevoRequest,
        ]);
        setAvailableWorkspaces([...bridgeWorkspaces, ...(elevoResult?.items ?? [])]);
        setAvailableTotal(elevoResult?.total ?? 0);
        setAvailablePage(page);
      } catch (e: any) {
        setAvailableError(e.message ?? t('workspaces.failedToFetch'));
      } finally {
        setLoadingAvailable(false);
      }
    },
    [baseUrl, token, homeserverUrl, mx, bridgeProvider, t],
  );

  useEffect(() => {
    fetchAvailable(1);
  }, [fetchAvailable]);

  const canFetchWorkspaceSource =
    (!!baseUrl && !!token) || (!!homeserverUrl && !!bridgeProvider?.id);
  const totalPages = Math.ceil(availableTotal / PAGE_SIZE);

  const filteredWorkspaces = availableWorkspaces.filter((ws) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return ws.name.toLowerCase().includes(q) || ws.description?.toLowerCase().includes(q);
  });

  const getWorkspaceSourceName = (ws: WorkspaceItem): string | undefined => {
    if (ws.bridge_provider && ws.bridge_provider === bridgeProvider?.id) {
      return bridgeProvider.name;
    }
    return ws.owner_tenant_id ? tenantNames.get(ws.owner_tenant_id) : undefined;
  };

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
            <Box
              shrink="No"
              style={{ padding: config.space.S400, paddingBottom: 0 }}
              direction="Column"
              gap="200"
            >
              <Input
                ref={inputRef}
                size="500"
                variant="Background"
                radii="400"
                outlined
                placeholder={t('workspaces.searchWorkspaces')}
                before={<Icon size="200" src={SearchIcon} />}
                value={query}
                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              />
            </Box>
            <Box grow="Yes">
              {!canFetchWorkspaceSource ? (
                <Box
                  justifyContent="Center"
                  alignItems="Center"
                  grow="Yes"
                  direction="Column"
                  gap="100"
                  style={{ padding: config.space.S700 }}
                >
                  <Text size="H6" align="Center">
                    {t('workspaces.notConfigured')}
                  </Text>
                  <Text size="T200" align="Center">
                    {t('workspaces.notConfiguredDesc')}
                  </Text>
                </Box>
              ) : (
                <>
                  {loadingAvailable && (
                    <Box
                      justifyContent="Center"
                      alignItems="Center"
                      grow="Yes"
                      style={{ padding: config.space.S700 }}
                    >
                      <Spinner size="200" variant="Secondary" />
                    </Box>
                  )}
                  {availableError && (
                    <Box
                      justifyContent="Center"
                      alignItems="Center"
                      grow="Yes"
                      direction="Column"
                      gap="100"
                      style={{ padding: config.space.S700 }}
                    >
                      <Text size="H6" align="Center">
                        {t('workspaces.failedToLoad')}
                      </Text>
                      <Text size="T200" align="Center">
                        {availableError}
                      </Text>
                    </Box>
                  )}
                  {!loadingAvailable && !availableError && filteredWorkspaces.length === 0 && (
                    <Box
                      justifyContent="Center"
                      alignItems="Center"
                      grow="Yes"
                      direction="Column"
                      gap="100"
                      style={{ padding: config.space.S700 }}
                    >
                      <Text size="H6" align="Center">
                        {query.trim() ? t('workspaces.noMatchFound') : t('workspaces.noWorkspaces')}
                      </Text>
                      <Text size="T200" align="Center">
                        {query.trim()
                          ? t('workspaces.noMatchFoundDesc', { query: query.trim() })
                          : t('workspaces.noWorkspacesDesc')}
                      </Text>
                    </Box>
                  )}
                  {!loadingAvailable && filteredWorkspaces.length > 0 && (
                    <Scroll ref={scrollRef} size="300" hideTrack>
                      <div style={{ padding: config.space.S400, paddingRight: config.space.S200 }}>
                        {filteredWorkspaces.map((ws) => {
                          const sourceName = getWorkspaceSourceName(ws);

                          return (
                            <MenuItem
                              key={getWorkspaceKey(ws)}
                              as="button"
                              variant="Surface"
                              radii="400"
                              disabled={adding}
                              onClick={() => {
                                setAdding(true);
                                onAdd(ws)
                                  .then(requestClose)
                                  .finally(() => setAdding(false));
                              }}
                              before={
                                linkedIds.has(getWorkspaceKey(ws)) ? (
                                  <Icon size="200" src={Icons.Check} />
                                ) : (
                                  <span style={{ display: 'inline-block', width: toRem(20) }} />
                                )
                              }
                              after={
                                sourceName ? (
                                  <Text size="T200" priority="300" truncate>
                                    <b>{sourceName}</b>
                                  </Text>
                                ) : undefined
                              }
                            >
                              <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
                                <Text size="T300" truncate>
                                  {ws.name}
                                </Text>
                                {ws.description ? (
                                  <Text size="T200" priority="300" truncate>
                                    {ws.description}
                                  </Text>
                                ) : null}
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </div>
                    </Scroll>
                  )}
                </>
              )}
            </Box>
            {totalPages > 1 && (
              <>
                <Line size="300" />
                <Box
                  shrink="No"
                  gap="200"
                  justifyContent="Center"
                  alignItems="Center"
                  style={{ padding: config.space.S200 }}
                >
                  <Button
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    outlined
                    disabled={availablePage <= 1}
                    onClick={() => fetchAvailable(availablePage - 1)}
                  >
                    <Text size="B300">{t('workspaces.prev')}</Text>
                  </Button>
                  <Text size="T300">
                    {availablePage} / {totalPages}
                  </Text>
                  <Button
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    outlined
                    disabled={availablePage >= totalPages}
                    onClick={() => fetchAvailable(availablePage + 1)}
                  >
                    <Text size="B300">{t('workspaces.next')}</Text>
                  </Button>
                </Box>
              </>
            )}
            <Line size="300" />
            <Box shrink="No" justifyContent="Center" style={{ padding: config.space.S200 }}>
              <Text size="T200" priority="300">
                {t('workspaces.filterHint')}
              </Text>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
