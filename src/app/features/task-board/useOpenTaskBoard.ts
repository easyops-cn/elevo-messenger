import { useCallback } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { openTaskBoard } from '../../plugins/useTauriOpener';
import type { WorkspaceItem } from '../room/WorkspacesModal';

/**
 * Returns a handler that opens the standalone task board window for a
 * bridge-provider workspace, authenticated with the Matrix access token.
 *
 * Returns `false` if the board cannot be opened (no bridge provider, missing
 * homeserver/token, or non-desktop environment).
 */
export function useOpenTaskBoard(): (ws: WorkspaceItem) => boolean {
  const mx = useMatrixClient();

  return useCallback(
    (ws: WorkspaceItem): boolean => {
      if (!ws.bridge_provider) return false;
      const homeserverUrl = mx.getHomeserverUrl();
      const matrixToken = mx.getAccessToken() ?? '';
      if (!homeserverUrl || !matrixToken) return false;
      openTaskBoard({
        workspaceId: ws.id,
        workspaceName: ws.name,
        bridgeProvider: ws.bridge_provider,
        matrixToken,
        homeserverUrl,
      });
      return true;
    },
    [mx],
  );
}
