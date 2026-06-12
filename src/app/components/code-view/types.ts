import type { DiffFileSummary } from '../message/elevo/diffSummary';

/** Bridge-provider workspace context for opening files in the bridge explorer. */
export type CodeViewBridgeContext = {
  workspaceId: string;
  workspaceName: string;
  /** Verbatim bridge provider segment from room state (already includes `-bridge`). */
  bridgeProvider: string;
  matrixToken: string;
  homeserverUrl: string;
};

export type CodeViewWorkspaceContext = {
  roomId: string;
  /**
   * Regular elevo workspace explorer URL (side panel). Present for non-bridge
   * workspaces.
   */
  workspaceExplorerUrl?: string;
  /**
   * Bridge-provider workspace context. When present, "view full file" opens the
   * standalone bridge explorer window instead of the side panel.
   */
  bridge?: CodeViewBridgeContext;
};

export type CodeViewPayload = {
  title?: string;
  files: DiffFileSummary[];
  added: number;
  deleted: number;
} & Partial<CodeViewWorkspaceContext>;
