import React from 'react';
import { Box, Icon, Text } from 'folds';
import classNames from 'classnames';
import * as css from './TaskReferenceCard.css';
import { taskRefStatusColor } from './taskStatus';
import { ListTodoIcon } from '../../../icons/ListTodoIcon';

export type TaskReference = {
  slug: string;
  title: string;
  status?: string;
};

export function parseTaskReference(content: Record<string, unknown>): TaskReference | undefined {
  const raw = content['vip.elevo.task_reference'];
  if (typeof raw !== 'object' || raw === null) return undefined;

  const { slug, id, title, status } = raw as Record<string, unknown>;
  // Backward compatibility: older clients sent `id` instead of `slug`.
  const resolvedSlug =
    typeof slug === 'string' && slug.trim() !== ''
      ? slug
      : typeof id === 'string' && id.trim() !== ''
        ? id
        : undefined;
  if (!resolvedSlug) return undefined;

  return {
    slug: resolvedSlug,
    title: typeof title === 'string' && title.trim() !== '' ? title : resolvedSlug,
    status: typeof status === 'string' ? status : undefined,
  };
}

type TaskReferenceCardProps = {
  taskReference: TaskReference;
  onClick?: () => void;
};

export function TaskReferenceCard({ taskReference, onClick }: TaskReferenceCardProps) {
  const accent = taskRefStatusColor(taskReference.status);
  const tooltip = taskReference.status
    ? `${taskReference.title} (${taskReference.status})`
    : taskReference.title;
  const interactiveProps = onClick
    ? ({
        as: 'button',
        type: 'button',
        onClick,
      } as const)
    : {};

  return (
    <Box
      className={classNames(css.TaskReferenceCard, onClick && css.InteractiveTaskReferenceCard)}
      shrink="No"
      alignItems="Center"
      title={tooltip}
      {...interactiveProps}
    >
      <Icon style={{ color: accent }} size="50" src={ListTodoIcon} />
      <Text size="T200" truncate>
        {taskReference.title}
      </Text>
    </Box>
  );
}
