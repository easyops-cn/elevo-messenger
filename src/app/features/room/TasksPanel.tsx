import React, { useEffect, useMemo, useState } from 'react';
import { Box, Icon, Spinner, Text } from 'folds';
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
import { STATUS_ICON } from '../task-board/statusIcons';
import { TASK_STATUSES, type TaskStats, type TaskStatus } from '../task-board/types';

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

  // Shown wherever the room is bound to a bridge workspace (desktop + web).
  if (!workspace?.bridge_provider) return null;

  return (
    <Box direction="Column" gap="100">
      <Text className={panelCss.MembersGroupLabel} size="L400" priority="300">
        {t('taskBoard.panelTitle')}
      </Text>

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
                <Box grow="Yes" direction="Column" gap="100">
                  <Text className={css.StatCount} size="H3">
                    {stats?.byStatus?.[status] ?? 0}
                  </Text>
                  <Text size="T200" priority="400">
                    {t(`taskBoard.status_${status}`)}
                  </Text>
                </Box>
                <Icon
                  className={`${css.StatIcon} ${STATUS_TONE[status]}`}
                  size="200"
                  src={STATUS_ICON[status]}
                />
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
                  alignItems="Center"
                  onClick={() => openTaskBoard(workspace)}
                >
                  {inner}
                </Box>
              );
            }
            return (
              <Box key={status} className={css.StatCard} alignItems="Center">
                {inner}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
