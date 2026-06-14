import type { WorkspaceItem } from './WorkspacesModal';

export function resolveBridgeReferenceWorkspace(
  workspaces: WorkspaceItem[],
  workspaceId?: string,
): WorkspaceItem | undefined {
  const bridgeWorkspaces = workspaces.filter((ws) => !!ws.bridge_provider);

  if (workspaceId) {
    return bridgeWorkspaces.find((ws) => ws.id === workspaceId);
  }

  return bridgeWorkspaces.length === 1 ? bridgeWorkspaces[0] : undefined;
}
