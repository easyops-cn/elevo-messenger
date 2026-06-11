import React, { useEffect, useMemo, useState } from 'react';
import { Box, Icon, Scroll, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';
import { TaskBoardProvider, createContextValue } from './TaskBoardContext';
import { TaskDetailDialog } from './TaskDetailDialog';
import { InlineError, useErrorMessage } from './InlineError';
import { fetchWorkspaceTasks } from './api';
import { STATUS_ICON } from './statusIcons';
import { TASK_STATUSES, type TaskStatus, type TaskBoardPayload, type TaskSummary } from './types';
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

export function TaskBoard({ payload }: TaskBoardProps) {
  const { t } = useTranslation();
  const ctx = useMemo(() => createContextValue(payload), [payload]);
  const toMessage = useErrorMessage();

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<TaskSummary | null>(null);

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

  // Group by the four known statuses; unknown statuses are not shown in a
  // column (they still count toward the side-panel total), matching the
  // workspace-explorer board behavior.
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
        </Box>
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
            <Scroll className={css.BoardScroll} size="300" hideTrack visibility="Hover">
              <Box className={css.Board}>
                {TASK_STATUSES.map((status) => {
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
        </Box>
        {selected && <TaskDetailDialog task={selected} requestClose={() => setSelected(null)} />}
      </Box>
    </TaskBoardProvider>
  );
}
