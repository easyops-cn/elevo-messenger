import { useCallback } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useElevoConfig } from '../../hooks/useElevoConfig';
import { openBridgeExplorer, openWorkspacePanel } from '../../plugins/useTauriOpener';
import { refreshMatrixTokenOrCurrent } from '../../utils/matrixTokenRefresh';
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
export function useOpenWorkspace(): (ws: WorkspaceItem, roomId: string) => Promise<boolean> {
  const mx = useMatrixClient();
  const elevoConfig = useElevoConfig();

  return useCallback(
    async (ws: WorkspaceItem, roomId: string): Promise<boolean> => {
      if (ws.bridge_provider) {
        const homeserverUrl = mx.getHomeserverUrl();
        if (!homeserverUrl) return false;
        let matrixToken: string;
        try {
          matrixToken = await refreshMatrixTokenOrCurrent(mx);
        } catch (error) {
          console.error('Failed to get Matrix token for bridge explorer:', error);
          return false;
        }
        if (!matrixToken) return false;
        return openBridgeExplorer({
          workspaceId: ws.id,
          workspaceName: ws.name,
          bridgeProvider: ws.bridge_provider,
          matrixToken,
          homeserverUrl,
        });
      }

      const explorerUrl = elevoConfig.workspaces?.explorerUrl;
      if (!explorerUrl) return false;
      openWorkspacePanel(`${explorerUrl}?ids=${encodeURIComponent(ws.id)}`, roomId);
      return true;
    },
    [mx, elevoConfig],
  );
}
