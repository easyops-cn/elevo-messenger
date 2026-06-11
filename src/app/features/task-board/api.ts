// API client for the matrix-llm-bot workspaces proxy (read-only tasks API).
//
// All requests go to `${homeserverUrl}/${bridgeProvider}/workspaces/:id/tasks*`
// with the user's Matrix access token as a Bearer token. The bot validates the
// token via the homeserver `whoami` endpoint and forwards to the coding-agent
// manager.
//
// `bridgeProvider` is taken verbatim from room state and already includes the
// `-bridge` segment, so we never append it here.
//
// Auth and transparent token refresh are shared with the bridge-explorer
// window: the refresh SDK channels are handled generically by the main window
// for any source window, so we reuse those modules rather than duplicate them.

import { trimLeadingSlash, trimTrailingSlash } from '../../utils/common';
import { getToken, refreshToken } from '../bridge-explorer/tokenRefresh';
import type { TaskDetail, TaskListResponse, TaskStats, TaskSummary } from './types';

/** A typed error carrying the HTTP status for inline error rendering. */
export class TaskApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TaskApiError';
    this.status = status;
  }
}

/** Build the workspaces base URL: `${homeserverUrl}/${bridgeProvider}/workspaces`. */
export function getTaskBoardBaseUrl(homeserverUrl: string, bridgeProvider: string): string {
  return `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(
    trimTrailingSlash(bridgeProvider),
  )}/workspaces`;
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data && typeof data === 'object' && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // ignore JSON parse errors and fall back to status text
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function rawFetch(url: string, token: string): Promise<Response> {
  try {
    return await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    throw new TaskApiError(e instanceof Error ? e.message : 'Network error', 0);
  }
}

/**
 * Fetch with the current Matrix access token. On a 401 (token expired), ask the
 * main window for a fresh token and retry once, so refresh is transparent.
 */
async function authedFetch(url: string): Promise<Response> {
  let res = await rawFetch(url, getToken());
  if (res.status === 401) {
    try {
      const token = await refreshToken();
      res = await rawFetch(url, token);
    } catch {
      // Refresh failed; fall through and surface the original 401 below.
    }
  }
  if (!res.ok) {
    throw new TaskApiError(await extractErrorMessage(res), res.status);
  }
  return res;
}

const tasksApiBase = (baseUrl: string, workspaceId: string): string =>
  `${baseUrl}/${encodeURIComponent(workspaceId)}/tasks`;

/** GET `.../tasks/stats` — counts aggregated by status. */
export async function fetchWorkspaceTaskStats(
  baseUrl: string,
  workspaceId: string,
): Promise<TaskStats> {
  const res = await authedFetch(`${tasksApiBase(baseUrl, workspaceId)}/stats`);
  return res.json();
}

/** GET `.../tasks` — the full task list. */
export async function fetchWorkspaceTasks(
  baseUrl: string,
  workspaceId: string,
): Promise<TaskSummary[]> {
  const res = await authedFetch(tasksApiBase(baseUrl, workspaceId));
  const data = (await res.json()) as TaskListResponse;
  return data.tasks ?? [];
}

/** GET `.../tasks/detail?slug=<slug>` — task metadata + inline preset docs. */
export async function fetchWorkspaceTaskDetail(
  baseUrl: string,
  workspaceId: string,
  slug: string,
): Promise<TaskDetail> {
  const url = `${tasksApiBase(baseUrl, workspaceId)}/detail?slug=${encodeURIComponent(slug)}`;
  const res = await authedFetch(url);
  return res.json();
}
