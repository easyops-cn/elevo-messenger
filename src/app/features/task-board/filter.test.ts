import { describe, expect, it } from 'vitest';
import {
  boardStatuses,
  filterTasks,
  initialStatusFilter,
  normalizeInitialView,
  parseTaskBoardSelectMessage,
} from './filter';
import type { TaskSummary } from './types';

const tasks: TaskSummary[] = [
  {
    slug: 'done',
    title: 'Done',
    status: 'completed',
    author: '@a:example',
    summary: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  },
  {
    slug: 'plan',
    title: 'Plan',
    status: 'planned',
    author: '@a:example',
    summary: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-03T00:00:00Z',
  },
  {
    slug: 'unknown',
    title: 'Unknown',
    status: 'blocked',
    author: '@a:example',
    summary: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
  },
];

describe('task board filtering', () => {
  it('defaults to list view and active tasks', () => {
    expect(normalizeInitialView(undefined)).toBe('list');
    expect(normalizeInitialView('board')).toBe('board');
    expect(initialStatusFilter(undefined)).toBe('active');
  });

  it('excludes completed tasks from the active filter', () => {
    expect(filterTasks(tasks, 'active').map((task) => task.slug)).toEqual(['unknown', 'plan']);
  });

  it('allows explicit completed filtering', () => {
    expect(filterTasks(tasks, 'completed').map((task) => task.slug)).toEqual(['done']);
  });

  it('hides the completed board column until explicitly enabled', () => {
    expect(boardStatuses(false)).toEqual(['backlog', 'planned', 'in_progress']);
    expect(boardStatuses(true)).toEqual(['backlog', 'planned', 'in_progress', 'completed']);
  });

  it('parses old and new select-task messages', () => {
    expect(parseTaskBoardSelectMessage('plan')).toEqual({ initialTaskSlug: 'plan' });
    expect(
      parseTaskBoardSelectMessage({
        initialTaskSlug: 'done',
        initialStatus: 'completed',
        initialView: 'board',
      }),
    ).toEqual({
      initialTaskSlug: 'done',
      initialStatus: 'completed',
      initialView: 'board',
    });
    expect(parseTaskBoardSelectMessage({ initialStatus: 'blocked' })).toBeUndefined();
  });
});
