import {
  TASK_STATUSES,
  type TaskBoardPayload,
  type TaskBoardView,
  type TaskStatus,
  type TaskStatusFilter,
  type TaskSummary,
} from './types';

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['backlog', 'planned', 'in_progress'];

export type TaskBoardSelectMessage = {
  initialTaskSlug?: string;
  initialStatus?: TaskStatus;
  initialView?: TaskBoardView;
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}

export function isTaskBoardView(value: unknown): value is TaskBoardView {
  return value === 'list' || value === 'board';
}

export function normalizeInitialView(value: TaskBoardPayload['initialView']): TaskBoardView {
  return isTaskBoardView(value) ? value : 'list';
}

export function initialStatusFilter(status: TaskBoardPayload['initialStatus']): TaskStatusFilter {
  return isTaskStatus(status) ? status : 'active';
}

export function parseTaskBoardSelectMessage(data: unknown): TaskBoardSelectMessage | undefined {
  if (typeof data === 'string') {
    return data.length > 0 ? { initialTaskSlug: data } : undefined;
  }

  if (!data || typeof data !== 'object') return undefined;
  const input = data as Record<string, unknown>;
  const message: TaskBoardSelectMessage = {};

  if (typeof input.initialTaskSlug === 'string' && input.initialTaskSlug.length > 0) {
    message.initialTaskSlug = input.initialTaskSlug;
  }
  if (isTaskStatus(input.initialStatus)) {
    message.initialStatus = input.initialStatus;
  }
  if (isTaskBoardView(input.initialView)) {
    message.initialView = input.initialView;
  }

  return Object.keys(message).length > 0 ? message : undefined;
}

export function filterTasks(tasks: TaskSummary[], filter: TaskStatusFilter): TaskSummary[] {
  return tasks
    .filter((task) => (filter === 'active' ? task.status !== 'completed' : task.status === filter))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function boardStatuses(showCompleted: boolean): TaskStatus[] {
  return showCompleted ? [...TASK_STATUSES] : ACTIVE_TASK_STATUSES;
}
