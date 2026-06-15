import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Icon, Spinner, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as panelCss from './RoomSidePanel.css';
import * as css from './TasksPanel.css';
import { useStateEvent } from '../../hooks/useStateEvent';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { ELEVO_WORKSPACES_STATE_KEY, WorkspaceItem } from './WorkspacesModal';
import { CreateTaskModal } from './CreateTaskModal';
import { PlusIcon } from '../../icons/PlusIcon';
import { useOpenTaskBoard } from '../task-board/useOpenTaskBoard';
import { fetchWorkspaceTaskStats, getTaskBoardBaseUrl } from '../task-board/api';
import { STATUS_ICON } from '../task-board/statusIcons';
import { TASK_STATUSES, type TaskStats, type TaskStatus } from '../task-board/types';
import { refreshMatrixToken } from '../../utils/matrixTokenRefresh';
import { RefreshCwIcon } from '../../icons/RefreshCwIcon';
import { CheckIcon } from '../../icons/CheckIcon';

type TasksPanelProps = {
  room: Room;
};

const STATUS_TONE: Record<TaskStatus, string> = {
  backlog: css.toneBacklog,
  planned: css.tonePlanned,
  in_progress: css.toneInProgress,
  completed: css.toneCompleted,
};

export function TasksPanel({ room }: TasksPanelProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const openTaskBoard = useOpenTaskBoard();

  const workspacesStateEvent = useStateEvent(room, ELEVO_WORKSPACES_STATE_KEY as never);
  // MVP: a room may bind several workspaces; surface the first bridge-provider
  // one, consistent with RoomViewHeader's `firstWorkspace` logic.
  const workspace = useMemo(() => {
    const linkedWorkspaces: WorkspaceItem[] =
      (workspacesStateEvent?.getContent() as { workspaces?: WorkspaceItem[] } | undefined)
        ?.workspaces ?? [];
    return linkedWorkspaces.find((ws) => ws.bridge_provider);
  }, [workspacesStateEvent]);

  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSucceeded, setRefreshSucceeded] = useState(false);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const refreshSuccessTimerRef = useRef<number | undefined>(undefined);

  const homeserverUrl = mx.getHomeserverUrl();

  const clearRefreshSuccess = useCallback(() => {
    if (refreshSuccessTimerRef.current !== undefined) {
      window.clearTimeout(refreshSuccessTimerRef.current);
      refreshSuccessTimerRef.current = undefined;
    }
    setRefreshSucceeded(false);
  }, []);

  const showRefreshSuccess = useCallback(() => {
    clearRefreshSuccess();
    setRefreshSucceeded(true);
    refreshSuccessTimerRef.current = window.setTimeout(() => {
      setRefreshSucceeded(false);
      refreshSuccessTimerRef.current = undefined;
    }, 2000);
  }, [clearRefreshSuccess]);

  const loadStats = useCallback(
    (mode: 'initial' | 'refresh', isCancelled: () => boolean = () => false) => {
      if (!workspace?.bridge_provider || !homeserverUrl) return;
      const token = mx.getAccessToken();
      if (!token) {
        setError(true);
        return;
      }
      clearRefreshSuccess();
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(false);
      const baseUrl = getTaskBoardBaseUrl(homeserverUrl, workspace.bridge_provider);
      // The side panel lives in the main window and holds the live Matrix token
      // directly, so provide the Matrix-client refresh path explicitly rather
      // than relying on the board window's SDK-bridge token cache.
      fetchWorkspaceTaskStats(baseUrl, workspace.id, {
        token,
        refresh: () => refreshMatrixToken(mx),
      })
        .then((data) => {
          if (!isCancelled()) {
            setStats(data);
            if (mode === 'refresh') {
              showRefreshSuccess();
            }
          }
        })
        .catch(() => {
          if (!isCancelled()) setError(true);
        })
        .finally(() => {
          if (!isCancelled()) {
            if (mode === 'initial') {
              setLoading(false);
            } else {
              setRefreshing(false);
            }
          }
        });
    },
    [
      workspace?.id,
      workspace?.bridge_provider,
      homeserverUrl,
      mx,
      clearRefreshSuccess,
      showRefreshSuccess,
    ],
  );

  useEffect(
    () => () => {
      if (refreshSuccessTimerRef.current !== undefined) {
        window.clearTimeout(refreshSuccessTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!workspace?.bridge_provider || !homeserverUrl) return undefined;
    const token = mx.getAccessToken();
    if (!token) {
      setError(true);
      return undefined;
    }
    let cancelled = false;
    loadStats('initial', () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [workspace?.bridge_provider, homeserverUrl, mx, loadStats]);

  // Shown wherever the room is bound to a bridge workspace (desktop + web).
  if (!workspace?.bridge_provider) return null;

  return (
    <Box direction="Column" gap="100">
      <Box className={css.HeaderRow} alignItems="Center">
        <Text className={panelCss.MembersGroupLabel} size="L400" priority="300">
          {t('taskBoard.panelTitle')}
        </Text>
        <Box className={css.HeaderActions} alignItems="Center">
          <Box
            as="button"
            type="button"
            className={css.CreateButton}
            disabled={refreshing}
            title={t('taskBoard.refreshStats')}
            aria-label={t('taskBoard.refreshStats')}
            onClick={() => loadStats('refresh')}
          >
            <Icon
              className={
                refreshing
                  ? css.RefreshingIcon
                  : refreshSucceeded
                    ? css.RefreshSuccessIcon
                    : undefined
              }
              size="100"
              src={refreshSucceeded ? CheckIcon : RefreshCwIcon}
            />
          </Box>
          <Box
            as="button"
            type="button"
            className={css.CreateButton}
            title={t('taskBoard.createTask.title')}
            aria-label={t('taskBoard.createTask.title')}
            onClick={() => setCreateOpen(true)}
          >
            <Icon size="100" src={PlusIcon} />
          </Box>
        </Box>
      </Box>

      {loading && (
        <Box justifyContent="Center" className={css.StateBox}>
          <Spinner size="100" />
        </Box>
      )}

      {!loading && error && (
        <Box className={css.StateBox}>
          <Text className={css.ErrorText} size="T200" priority="400">
            {t('taskBoard.statsFailed')}
          </Text>
        </Box>
      )}

      {!loading && !error && (
        <Box className={css.StatsGrid}>
          {TASK_STATUSES.map((status) => {
            const inner = (
              <>
                <Box className={css.StatValueRow} alignItems="Center">
                  <Text className={css.StatCount} size="H3">
                    {stats?.byStatus?.[status] ?? 0}
                  </Text>
                  <Icon
                    className={`${css.StatIcon} ${STATUS_TONE[status]}`}
                    size="200"
                    src={STATUS_ICON[status]}
                  />
                </Box>
                <Text size="T200" priority="400">
                  {t(`taskBoard.status_${status}`)}
                </Text>
              </>
            );

            // Cards open the board window on desktop; web stays read-only.
            if (isDesktopTauri) {
              return (
                <Box
                  key={status}
                  as="button"
                  type="button"
                  className={`${css.StatCard} ${css.StatCardClickable}`}
                  onClick={() => openTaskBoard(workspace, { initialStatus: status })}
                >
                  {inner}
                </Box>
              );
            }
            return (
              <Box key={status} className={css.StatCard}>
                {inner}
              </Box>
            );
          })}
        </Box>
      )}

      {createOpen && <CreateTaskModal room={room} requestClose={() => setCreateOpen(false)} />}
    </Box>
  );
}
