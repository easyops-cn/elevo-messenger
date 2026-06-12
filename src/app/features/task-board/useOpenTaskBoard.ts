import { useCallback } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { openTaskBoard } from '../../plugins/useTauriOpener';
import { refreshMatrixTokenOrCurrent } from '../../utils/matrixTokenRefresh';
import type { WorkspaceItem } from '../room/WorkspacesModal';

/**
 * Returns a handler that opens the standalone task board window for a
 * bridge-provider workspace, authenticated with the Matrix access token.
 *
 * Returns `false` if the board cannot be opened (no bridge provider, missing
 * homeserver/token, or non-desktop environment).
 */
export function useOpenTaskBoard(): (ws: WorkspaceItem) => Promise<boolean> {
  const mx = useMatrixClient();

  return useCallback(
    async (ws: WorkspaceItem): Promise<boolean> => {
      if (!ws.bridge_provider) return false;
      const homeserverUrl = mx.getHomeserverUrl();
      if (!homeserverUrl) return false;
      let matrixToken: string;
      try {
        matrixToken = await refreshMatrixTokenOrCurrent(mx);
      } catch (error) {
        console.error('Failed to get Matrix token for task board:', error);
        return false;
      }
      if (!matrixToken) return false;
      return openTaskBoard({
        workspaceId: ws.id,
        workspaceName: ws.name,
        bridgeProvider: ws.bridge_provider,
        matrixToken,
        homeserverUrl,
      });
    },
    [mx],
  );
}
