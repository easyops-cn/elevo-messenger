import type { IconSrc } from 'folds';
import { CircleIcon } from '../../icons/CircleIcon';
import { ClockIcon } from '../../icons/ClockIcon';
import { LoaderCircleIcon } from '../../icons/LoaderCircleIcon';
import { CircleCheckIcon } from '../../icons/CircleCheckIcon';
import type { TaskStatus } from './types';

/** Lucide icon component (folds `IconSrc`) for each known task status. */
export const STATUS_ICON: Record<TaskStatus, IconSrc> = {
  backlog: CircleIcon,
  planned: ClockIcon,
  in_progress: LoaderCircleIcon,
  completed: CircleCheckIcon,
};
