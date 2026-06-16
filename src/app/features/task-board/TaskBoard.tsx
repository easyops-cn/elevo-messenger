import React, { useEffect, useMemo, useState } from 'react';
import { Box, Icon, Scroll, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';
import { relativeTimeFromNow } from '../../utils/time';
import { TaskBoardProvider, createContextValue } from './TaskBoardContext';
import { TaskDetailDialog } from './TaskDetailDialog';
import { InlineError, useErrorMessage } from './InlineError';
import { fetchWorkspaceTasks } from './api';
import { STATUS_ICON } from './statusIcons';
import {
  TASK_STATUSES,
  type TaskBoardPayload,
  type TaskBoardView,
  type TaskStatus,
  type TaskStatusFilter,
  type TaskSummary,
} from './types';
import { onSdkMessage, TASK_BOARD_SELECT_TASK_CHANNEL } from '../bridge-explorer/sdkBridge';
import {
  boardStatuses,
  filterTasks,
  getUserLocalpart,
  initialStatusFilter,
  parseTaskBoardSelectMessage,
  resolveInitialView,
} from './filter';
import * as css from './TaskBoard.css';

type TaskBoardProps = {
  payload: TaskBoardPayload;
};

const STATUS_TONE: Record<TaskStatus, string> = {
  backlog: css.toneBacklog,
  planned: css.tonePlanned,
  in_progress: css.toneInProgress,
  completed: css.toneCompleted,
};

function TaskCard({ task, onOpen }: { task: TaskSummary; onOpen: (task: TaskSummary) => void }) {
  return (
    <Box
      as="button"
      type="button"
      className={css.TaskCard}
      direction="Column"
      gap="200"
      shrink="No"
      onClick={() => onOpen(task)}
    >
      <Text className={css.ClampTwo} size="T300" title={task.title}>
        {task.title}
      </Text>
      {task.summary && (
        <Text className={css.ClampThree} size="T200" priority="300">
          {task.summary}
        </Text>
      )}
    </Box>
  );
}

function StatusPill({
  status,
  active,
  onClick,
}: {
  status: TaskStatusFilter;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const label = status === 'active' ? t('taskBoard.filterActive') : t(`taskBoard.status_${status}`);
  return (
    <Box
      as="button"
      type="button"
      className={`${css.ControlButton} ${active ? css.ControlButtonActive : ''}`}
      onClick={onClick}
    >
      <Text size="B300">{label}</Text>
    </Box>
  );
}

function ViewButton({
  view,
  active,
  onClick,
}: {
  view: TaskBoardView;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Box
      as="button"
      type="button"
      className={`${css.ControlButton} ${active ? css.ControlButtonActive : ''}`}
      onClick={onClick}
    >
      <Text size="B300">{t(`taskBoard.view_${view}`)}</Text>
    </Box>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const knownStatus = TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : null;
  return (
    <Box
      className={`${css.StatusBadge} ${knownStatus ? STATUS_TONE[knownStatus] : ''}`}
      alignItems="Center"
      gap="100"
    >
      {knownStatus && (
        <Icon className={css.StatusBadgeIcon} size="50" src={STATUS_ICON[knownStatus]} />
      )}
      <Text size="T200">{knownStatus ? t(`taskBoard.status_${knownStatus}`) : status}</Text>
    </Box>
  );
}

function TaskList({
  tasks,
  onOpen,
}: {
  tasks: TaskSummary[];
  onOpen: (task: TaskSummary) => void;
}) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return (
      <Box className={css.EmptyState} justifyContent="Center" alignItems="Center">
        <Text size="T300" priority="300">
          {t('taskBoard.emptyList')}
        </Text>
      </Box>
    );
  }

  return (
    <Scroll className={css.ListScroll} size="300" hideTrack visibility="Hover">
      <Box className={css.TaskTable} direction="Column">
        <Box className={`${css.TaskRow} ${css.TaskHeaderRow}`} alignItems="Center">
          <Text size="L400">{t('taskBoard.title')}</Text>
          <Text size="L400">{t('taskBoard.status')}</Text>
          <Text size="L400">{t('taskBoard.assignee')}</Text>
          <Text size="L400">{t('taskBoard.updatedAt')}</Text>
        </Box>
        {tasks.map((task) => (
          <Box
            key={task.slug}
            as="button"
            type="button"
            className={`${css.TaskRow} ${css.TaskDataRow}`}
            alignItems="Center"
            onClick={() => onOpen(task)}
          >
            <Box direction="Column" gap="100" className={css.ListTitleCell}>
              <Text size="T300" truncate title={task.title}>
                {task.title}
              </Text>
            </Box>
            <TaskStatusBadge status={task.status} />
            <Text className={css.TableCellText} size="T200" priority="300" truncate>
              {getUserLocalpart(task.assignee)}
            </Text>
            <Text
              className={css.TableCellText}
              size="T200"
              priority="300"
              truncate
              title={task.updatedAt}
            >
              {task.updatedAt ? relativeTimeFromNow(task.updatedAt) : '-'}
            </Text>
          </Box>
        ))}
      </Box>
    </Scroll>
  );
}

export function TaskBoard({ payload }: TaskBoardProps) {
  const { t } = useTranslation();
  const ctx = useMemo(() => createContextValue(payload), [payload]);
  const toMessage = useErrorMessage();

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<TaskSummary | null>(null);
  const [pendingTaskSlug, setPendingTaskSlug] = useState<string | undefined>(
    payload.initialTaskSlug,
  );
  const [view, setView] = useState<TaskBoardView>(() => resolveInitialView(payload));
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>(() =>
    initialStatusFilter(payload.initialStatus),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWorkspaceTasks(ctx.baseUrl, ctx.workspaceId)
      .then((data) => {
        if (!cancelled) setTasks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ctx.baseUrl, ctx.workspaceId, reloadKey]);

  useEffect(
    () =>
      onSdkMessage(TASK_BOARD_SELECT_TASK_CHANNEL, (data) => {
        const message = parseTaskBoardSelectMessage(data);
        if (!message) return;
        if (message.initialView) {
          setView(message.initialView);
        }
        if (message.initialStatus) {
          setView('list');
          setStatusFilter(message.initialStatus);
        }
        if (message.initialTaskSlug) {
          setPendingTaskSlug(message.initialTaskSlug);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!pendingTaskSlug || loading || error != null) return;
    const task = tasks.find((item) => item.slug === pendingTaskSlug);
    setPendingTaskSlug(undefined);
    if (task) {
      setSelected(task);
    }
  }, [error, loading, pendingTaskSlug, tasks]);

  const filteredTasks = useMemo(() => filterTasks(tasks, statusFilter), [statusFilter, tasks]);
  const visibleBoardStatuses = useMemo(() => boardStatuses(), []);

  // Group by the known board statuses; unknown statuses are shown in the list
  // but not in board columns, matching the workspace-explorer board behavior.
  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, TaskSummary[]>();
    TASK_STATUSES.forEach((s) => map.set(s, []));
    tasks.forEach((task) => {
      const bucket = map.get(task.status as TaskStatus);
      if (bucket) bucket.push(task);
    });
    map.forEach((list) =>
      list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    );
    return map;
  }, [tasks]);

  return (
    <TaskBoardProvider value={ctx}>
      <Box className={css.Shell} direction="Column">
        <Box className={css.Header} shrink="No" alignItems="Center" gap="200">
          <Icon size="100" src={FolderOpenIcon} />
          <Text size="H6" truncate title={ctx.workspaceName}>
            {ctx.workspaceName}
          </Text>
          <Box className={css.HeaderControls} alignItems="Center" gap="200">
            <Box className={css.Segmented} alignItems="Center">
              <ViewButton view="list" active={view === 'list'} onClick={() => setView('list')} />
              <ViewButton view="board" active={view === 'board'} onClick={() => setView('board')} />
            </Box>
          </Box>
        </Box>
        {view === 'list' && (
          <Box className={css.FilterBar} shrink="No" alignItems="Center" gap="200">
            <Box className={css.FilterScroll} alignItems="Center" gap="100">
              <StatusPill
                status="active"
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              />
              {TASK_STATUSES.map((status) => (
                <StatusPill
                  key={status}
                  status={status}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                />
              ))}
            </Box>
          </Box>
        )}
        <Box className={css.Body} grow="Yes">
          {loading && (
            <Box className={css.Centered} justifyContent="Center" alignItems="Center">
              <Spinner />
            </Box>
          )}

          {!loading && error != null && (
            <InlineError message={toMessage(error)} onRetry={() => setReloadKey((k) => k + 1)} />
          )}

          {!loading && error == null && (
            <>
              {view === 'list' && <TaskList tasks={filteredTasks} onOpen={setSelected} />}
              {view === 'board' && (
                <Scroll className={css.BoardScroll} size="300" hideTrack visibility="Hover">
                  <Box
                    className={css.Board}
                    style={{
                      gridTemplateColumns: `repeat(${visibleBoardStatuses.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {visibleBoardStatuses.map((status) => {
                      const list = grouped.get(status) ?? [];
                      return (
                        <Box key={status} className={css.Column} direction="Column">
                          <Box className={css.ColumnHeader} alignItems="Center">
                            <Icon
                              className={`${css.ColumnIcon} ${STATUS_TONE[status]}`}
                              size="100"
                              src={STATUS_ICON[status]}
                            />
                            <Text size="T300">{t(`taskBoard.status_${status}`)}</Text>
                            <Text className={css.ColumnCount} size="T200" priority="300">
                              {list.length}
                            </Text>
                          </Box>
                          <Box className={css.ColumnBody} direction="Column">
                            {list.map((task) => (
                              <TaskCard key={task.slug} task={task} onOpen={setSelected} />
                            ))}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Scroll>
              )}
            </>
          )}
        </Box>
        {selected && <TaskDetailDialog task={selected} requestClose={() => setSelected(null)} />}
      </Box>
    </TaskBoardProvider>
  );
}
