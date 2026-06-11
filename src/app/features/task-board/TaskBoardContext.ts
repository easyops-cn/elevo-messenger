import { createContext, useContext } from 'react';
import { initToken } from '../bridge-explorer/tokenRefresh';
import { getTaskBoardBaseUrl } from './api';
import type { TaskBoardPayload } from './types';

export type TaskBoardContextValue = {
  workspaceId: string;
  workspaceName: string;
  /** Base URL: `${homeserverUrl}/${bridgeProvider}/workspaces`. */
  baseUrl: string;
};

const TaskBoardContext = createContext<TaskBoardContextValue | null>(null);

export function createContextValue(payload: TaskBoardPayload): TaskBoardContextValue {
  // Seed the shared token cache; subsequent expiry is refreshed transparently
  // via the main window over the SDK bridge (same path as bridge-explorer).
  initToken(payload.matrixToken);
  return {
    workspaceId: payload.workspaceId,
    workspaceName: payload.workspaceName,
    baseUrl: getTaskBoardBaseUrl(payload.homeserverUrl, payload.bridgeProvider),
  };
}

export const TaskBoardProvider = TaskBoardContext.Provider;

export function useTaskBoard(): TaskBoardContextValue {
  const ctx = useContext(TaskBoardContext);
  if (!ctx) {
    throw new Error('useTaskBoard must be used within TaskBoardProvider');
  }
  return ctx;
}
