import { useCallback } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useElevoConfig } from '../../hooks/useElevoConfig';
import { openBridgeExplorer, openWorkspacePanel } from '../../plugins/useTauriOpener';
import type { WorkspaceItem } from '../room/WorkspacesModal';

/**
 * Returns a handler that opens a workspace, branching on whether it is backed
 * by a bridge provider:
 *
 * - `bridge_provider` set → open the standalone bridge explorer window
 *   (per-workspace), authenticated with the Matrix access token.
 * - otherwise → open the regular elevo workspace explorer side panel using the
 *   configured `explorerUrl`.
 *
 * Returns `false` if the workspace cannot be opened (missing config/token).
 */
export function useOpenWorkspace(): (ws: WorkspaceItem, roomId: string) => boolean {
  const mx = useMatrixClient();
  const elevoConfig = useElevoConfig();

  return useCallback(
    (ws: WorkspaceItem, roomId: string): boolean => {
      if (ws.bridge_provider) {
        const homeserverUrl = mx.getHomeserverUrl();
        const matrixToken = mx.getAccessToken() ?? '';
        if (!homeserverUrl || !matrixToken) return false;
        openBridgeExplorer({
          workspaceId: ws.id,
          workspaceName: ws.name,
          bridgeProvider: ws.bridge_provider,
          matrixToken,
          homeserverUrl,
        });
        return true;
      }

      const explorerUrl = elevoConfig.workspaces?.explorerUrl;
      if (!explorerUrl) return false;
      openWorkspacePanel(`${explorerUrl}?ids=${encodeURIComponent(ws.id)}`, roomId);
      return true;
    },
    [mx, elevoConfig],
  );
}
