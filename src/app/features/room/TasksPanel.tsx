import React, { useEffect, useMemo, useState } from 'react';
import { Box, Spinner, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as panelCss from './RoomSidePanel.css';
import * as css from './TasksPanel.css';
import { useStateEvent } from '../../hooks/useStateEvent';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { ELEVO_WORKSPACES_STATE_KEY, WorkspaceItem } from './WorkspacesModal';
import { useOpenTaskBoard } from '../task-board/useOpenTaskBoard';
import { fetchWorkspaceTaskStats, getTaskBoardBaseUrl } from '../task-board/api';
import { TASK_STATUSES, type TaskStats, type TaskStatus } from '../task-board/types';

type TasksPanelProps = {
  room: Room;
};

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: css.dotBacklog,
  planned: css.dotPlanned,
  in_progress: css.dotInProgress,
  completed: css.dotCompleted,
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
  const [error, setError] = useState(false);

  const homeserverUrl = mx.getHomeserverUrl();

  useEffect(() => {
    if (!workspace?.bridge_provider || !homeserverUrl) return undefined;
    const token = mx.getAccessToken();
    if (!token) {
      setError(true);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    const baseUrl = getTaskBoardBaseUrl(homeserverUrl, workspace.bridge_provider);
    // The side panel lives in the main window and holds the live Matrix token
    // directly, so pass it explicitly rather than relying on the board
    // window's SDK-bridge token cache.
    fetchWorkspaceTaskStats(baseUrl, workspace.id, token)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id, workspace?.bridge_provider, homeserverUrl, mx]);

  // The board window can only be opened on desktop; hide the panel elsewhere.
  if (!workspace?.bridge_provider || !isDesktopTauri) return null;

  return (
    <Box direction="Column" gap="100">
      <Text className={panelCss.MembersGroupLabel} size="L400" priority="300">
        {t('taskBoard.panelTitle')}
      </Text>

      <Box
        as="button"
        type="button"
        className={css.StatsCard}
        direction="Column"
        gap="300"
        onClick={() => openTaskBoard(workspace)}
      >
        <Box alignItems="Center" justifyContent="SpaceBetween">
          <Text size="T200" priority="300">
            {t('taskBoard.totalTasks')}
          </Text>
          {loading ? (
            <Spinner size="100" />
          ) : (
            <Text size="H4">{error ? '—' : (stats?.total ?? 0)}</Text>
          )}
        </Box>

        {!error && (
          <Box className={css.StatusGrid}>
            {TASK_STATUSES.map((status) => (
              <Box key={status} alignItems="Center" gap="200">
                <span className={`${css.StatusDot} ${STATUS_DOT[status]}`} />
                <Text size="T200" priority="400">
                  {t(`taskBoard.status_${status}`)}
                </Text>
                <Text className={css.StatusCount} size="T200" priority="300">
                  {stats?.byStatus?.[status] ?? 0}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {error && (
          <Text className={css.ErrorText} size="T200" priority="400">
            {t('taskBoard.statsFailed')}
          </Text>
        )}
      </Box>
    </Box>
  );
}
